import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getDocument,
  GlobalWorkerOptions,
  version as pdfjsVersion,
  type PDFDocumentProxy,
  type PDFPageProxy,
  type RenderTask,
} from 'pdfjs-dist';
import { IonIcon } from '@ionic/react';
import {
  addOutline,
  chevronBackOutline,
  chevronForwardOutline,
  removeOutline,
  scanOutline,
} from 'ionicons/icons';

type PdfJsTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

export type PdfViewerHandle = {
  clearSelection: () => void;
};

type Props = {
  url: string;
  title: string;
  onTextSelected?: (text: string) => void;
  viewerRef?: React.MutableRefObject<PdfViewerHandle | null>;
};

type PdfTextBox = {
  text: string;
  pageNumber: number;
  /** PDF user-space coords (origin bottom-left). */
  x: number;
  y: number;
  w: number;
  h: number;
};

type DragBox = {
  pageNumber: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const DEFAULT_SCALE = 1.15;
const ZOOM_STEP = 0.12;
// Query string evita worker antigo em cache (ex.: 6.x vs 4.x no Railway/CDN).
const WORKER_SRC = `${import.meta.env.BASE_URL}pdf.worker.min.mjs?v=${pdfjsVersion}`;

GlobalWorkerOptions.workerSrc = WORKER_SRC;

const clampScale = (value: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value * 100) / 100));

function isTextItem(item: unknown): item is PdfJsTextItem {
  return Boolean(
    item &&
      typeof item === 'object' &&
      'str' in item &&
      'transform' in item &&
      Array.isArray((item as PdfJsTextItem).transform),
  );
}

async function loadPageTextBoxes(
  page: PDFPageProxy,
  pageNumber: number,
): Promise<PdfTextBox[]> {
  const content = await page.getTextContent();
  const boxes: PdfTextBox[] = [];
  for (const raw of content.items) {
    if (!isTextItem(raw) || !raw.str.trim()) continue;
    const [, , , , e, f] = raw.transform;
    const fontHeight = Math.hypot(raw.transform[2], raw.transform[3]) || raw.height || 10;
    const width = raw.width || fontHeight * raw.str.length * 0.5;
    boxes.push({
      text: raw.str,
      pageNumber,
      x: e,
      y: f,
      w: Math.max(width, 1),
      h: Math.max(fontHeight, 1),
    });
  }
  return boxes;
}

function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function textFromBoxesInPdfRect(
  boxes: PdfTextBox[],
  pageNumber: number,
  pdfRect: { x: number; y: number; w: number; h: number },
) {
  const hits = boxes
    .filter((box) => box.pageNumber === pageNumber && rectsIntersect(box, pdfRect))
    .sort((a, b) => {
      // Reading order: top-to-bottom, then left-to-right (PDF y grows up).
      const dy = b.y - a.y;
      if (Math.abs(dy) > Math.min(a.h, b.h) * 0.5) return dy;
      return a.x - b.x;
    });

  if (!hits.length) return '';

  let out = hits[0].text;
  for (let i = 1; i < hits.length; i++) {
    const prev = hits[i - 1];
    const cur = hits[i];
    const sameLine = Math.abs(prev.y - cur.y) <= Math.min(prev.h, cur.h) * 0.55;
    if (!sameLine) out += '\n';
    else if (!/\s$/.test(out) && !/^\s/.test(cur.text)) out += ' ';
    out += cur.text;
  }
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function PdfSelectableViewer({
  url,
  title,
  onTextSelected,
  viewerRef,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const textBoxesRef = useRef<PdfTextBox[]>([]);
  const pageViewsRef = useRef<
    Map<number, { el: HTMLElement; page: PDFPageProxy; viewportScale: number }>
  >(new Map());
  const dragOriginRef = useRef<{
    pageNumber: number;
    x: number;
    y: number;
  } | null>(null);
  const scaleRef = useRef(DEFAULT_SCALE);
  const pendingPageRef = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [docToken, setDocToken] = useState(0);
  const [booting, setBooting] = useState(true);
  const [dragBox, setDragBox] = useState<DragBox | null>(null);
  const [hitBoxes, setHitBoxes] = useState<DragBox[]>([]);

  scaleRef.current = scale;

  const getScrollParent = useCallback(
    () => rootRef.current?.closest('.sc-pdf-reader-stage') as HTMLElement | null,
    [],
  );

  const clearSelection = useCallback(() => {
    setDragBox(null);
    setHitBoxes([]);
    dragOriginRef.current = null;
  }, []);

  useEffect(() => {
    if (!viewerRef) return;
    viewerRef.current = { clearSelection };
    return () => {
      viewerRef.current = null;
    };
  }, [clearSelection, viewerRef]);

  const scrollToPage = useCallback(
    (pageNumber: number) => {
      const scroller = getScrollParent();
      const pageEl = pageViewsRef.current.get(pageNumber)?.el;
      if (!scroller || !pageEl) return;
      scroller.scrollTo({ top: Math.max(0, pageEl.offsetTop - 12) });
    },
    [getScrollParent],
  );

  // Load document
  useEffect(() => {
    let cancelled = false;
    let loading: ReturnType<typeof getDocument> | null = null;
    setError(null);
    setBooting(true);
    setNumPages(0);
    setCurrentPage(1);
    clearSelection();
    pdfRef.current = null;
    textBoxesRef.current = [];
    pageViewsRef.current.clear();

    void (async () => {
      try {
        loading = getDocument({ url });
        const pdf = await loading.promise;
        if (cancelled) {
          await pdf.cleanup();
          await loading.destroy();
          return;
        }
        pdfRef.current = pdf;

        const scroller = getScrollParent();
        const page1 = await pdf.getPage(1);
        const baseWidth = page1.getViewport({ scale: 1 }).width;
        if (scroller && baseWidth) {
          setScale(clampScale((scroller.clientWidth - 40) / baseWidth));
        }

        setNumPages(pdf.numPages);
        setDocToken((t) => t + 1);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao abrir o PDF');
          setBooting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      const pdf = pdfRef.current;
      pdfRef.current = null;
      void (async () => {
        try {
          await pdf?.cleanup();
        } catch {
          /* ignore */
        }
        try {
          await loading?.destroy();
        } catch {
          /* ignore */
        }
      })();
    };
  }, [clearSelection, getScrollParent, url]);

  // Progressive render (canvas only — no textLayer, evita desalinhamento)
  useEffect(() => {
    const host = hostRef.current;
    const pdf = pdfRef.current;
    if (!host || !pdf || !docToken) return;

    let cancelled = false;
    const tasks: RenderTask[] = [];
    setBooting(true);
    clearSelection();
    host.replaceChildren();
    pageViewsRef.current.clear();
    textBoxesRef.current = [];

    void (async () => {
      try {
        const allBoxes: PdfTextBox[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: scaleRef.current });

          const pageEl = document.createElement('div');
          pageEl.className = 'sc-pdf-page';
          pageEl.dataset.page = String(pageNumber);
          pageEl.style.width = `${viewport.width}px`;
          pageEl.style.height = `${viewport.height}px`;

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', { alpha: false });
          if (!context) throw new Error('Canvas indisponível');

          const outputScale = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

          const overlay = document.createElement('div');
          overlay.className = 'sc-pdf-page-overlay';

          pageEl.append(canvas, overlay);
          host.append(pageEl);
          pageViewsRef.current.set(pageNumber, {
            el: pageEl,
            page,
            viewportScale: scaleRef.current,
          });

          const task = page.render({ canvasContext: context, viewport, canvas });
          tasks.push(task);
          await task.promise;
          if (cancelled) break;

          const boxes = await loadPageTextBoxes(page, pageNumber);
          allBoxes.push(...boxes);
          textBoxesRef.current = allBoxes;

          if (pageNumber === 1) {
            setBooting(false);
            if (pendingPageRef.current) {
              const target = pendingPageRef.current;
              pendingPageRef.current = null;
              requestAnimationFrame(() => scrollToPage(target));
            }
          }
        }
      } catch (err) {
        const name = (err as { name?: string })?.name;
        if (!cancelled && name !== 'RenderingCancelledException') {
          setError(
            err instanceof Error ? err.message : 'Falha ao renderizar o PDF',
          );
          setBooting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const task of tasks) {
        try {
          task.cancel();
        } catch {
          /* ignore */
        }
      }
    };
  }, [clearSelection, docToken, scale, scrollToPage]);

  // Page tracking
  useEffect(() => {
    const scroller = getScrollParent();
    if (!scroller || booting) return;
    const onScroll = () => {
      const mid = scroller.scrollTop + scroller.clientHeight / 3;
      let best = 1;
      for (const [n, view] of pageViewsRef.current) {
        if (view.el.offsetTop <= mid) best = n;
      }
      setCurrentPage(best);
    };
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [booting, getScrollParent, numPages]);

  // Ctrl/⌘ + wheel zoom
  useEffect(() => {
    const scroller = getScrollParent();
    if (!scroller) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      pendingPageRef.current = currentPage;
      setScale((s) => clampScale(s + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP)));
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', onWheel);
  }, [currentPage, getScrollParent]);

  const clientToPageLocal = (pageNumber: number, clientX: number, clientY: number) => {
    const view = pageViewsRef.current.get(pageNumber);
    if (!view) return null;
    const rect = view.el.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      pageWidth: rect.width,
      pageHeight: rect.height,
      page: view.page,
      viewportScale: view.viewportScale,
    };
  };

  const pageLocalToPdfRect = (
    pageNumber: number,
    left: number,
    top: number,
    width: number,
    height: number,
  ) => {
    const view = pageViewsRef.current.get(pageNumber);
    if (!view) return null;
    const s = view.viewportScale;
    const pageHeight = view.page.getViewport({ scale: 1 }).height;
    // DOM y grows down; PDF y grows up.
    const pdfX = left / s;
    const pdfW = width / s;
    const pdfH = height / s;
    const pdfY = pageHeight - (top + height) / s;
    return { x: pdfX, y: pdfY, w: pdfW, h: pdfH };
  };

  const pageNumberFromPoint = (clientX: number, clientY: number) => {
    for (const [n, view] of pageViewsRef.current) {
      const r = view.el.getBoundingClientRect();
      if (
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom
      ) {
        return n;
      }
    }
    return null;
  };

  const finishDrag = useCallback(
    (box: DragBox) => {
      if (box.width < 4 || box.height < 4) {
        clearSelection();
        return;
      }
      const pdfRect = pageLocalToPdfRect(
        box.pageNumber,
        box.left,
        box.top,
        box.width,
        box.height,
      );
      if (!pdfRect) return;
      const text = textFromBoxesInPdfRect(
        textBoxesRef.current,
        box.pageNumber,
        pdfRect,
      );
      if (!text) {
        clearSelection();
        return;
      }

      // Highlight matched glyph boxes in page-local coords for feedback.
      const view = pageViewsRef.current.get(box.pageNumber);
      const s = view?.viewportScale ?? scaleRef.current;
      const pageHeight = view?.page.getViewport({ scale: 1 }).height ?? 0;
      const matched = textBoxesRef.current
        .filter(
          (b) =>
            b.pageNumber === box.pageNumber && rectsIntersect(b, pdfRect),
        )
        .map((b) => ({
          pageNumber: box.pageNumber,
          left: b.x * s,
          top: (pageHeight - b.y - b.h) * s,
          width: b.w * s,
          height: b.h * s,
        }));
      setHitBoxes(matched);
      setDragBox(null);
      onTextSelected?.(text);
    },
    [clearSelection, onTextSelected],
  );

  // Geometry selection (drag rectangle) — independente do textLayer
  useEffect(() => {
    const host = hostRef.current;
    if (!host || booting) return;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const pageNumber = pageNumberFromPoint(e.clientX, e.clientY);
      if (!pageNumber) return;
      const local = clientToPageLocal(pageNumber, e.clientX, e.clientY);
      if (!local) return;
      e.preventDefault();
      host.setPointerCapture(e.pointerId);
      dragOriginRef.current = {
        pageNumber,
        x: local.x,
        y: local.y,
      };
      setHitBoxes([]);
      setDragBox({
        pageNumber,
        left: local.x,
        top: local.y,
        width: 0,
        height: 0,
      });
    };

    const onMove = (e: PointerEvent) => {
      const origin = dragOriginRef.current;
      if (!origin) return;
      const local = clientToPageLocal(origin.pageNumber, e.clientX, e.clientY);
      if (!local) return;
      const left = Math.min(origin.x, local.x);
      const top = Math.min(origin.y, local.y);
      const width = Math.abs(local.x - origin.x);
      const height = Math.abs(local.y - origin.y);
      setDragBox({
        pageNumber: origin.pageNumber,
        left,
        top,
        width,
        height,
      });
    };

    const onUp = (e: PointerEvent) => {
      const origin = dragOriginRef.current;
      if (!origin) return;
      const local = clientToPageLocal(origin.pageNumber, e.clientX, e.clientY);
      dragOriginRef.current = null;
      try {
        host.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (!local) {
        clearSelection();
        return;
      }
      const box: DragBox = {
        pageNumber: origin.pageNumber,
        left: Math.min(origin.x, local.x),
        top: Math.min(origin.y, local.y),
        width: Math.abs(local.x - origin.x),
        height: Math.abs(local.y - origin.y),
      };
      finishDrag(box);
    };

    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', () => {
      dragOriginRef.current = null;
      setDragBox(null);
    });
    return () => {
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerup', onUp);
    };
  }, [booting, clearSelection, finishDrag]);

  // Paint overlays into the active page
  useEffect(() => {
    for (const [n, view] of pageViewsRef.current) {
      const overlay = view.el.querySelector('.sc-pdf-page-overlay');
      if (!overlay) continue;
      overlay.replaceChildren();
      const boxes = [
        ...(dragBox && dragBox.pageNumber === n ? [dragBox] : []),
        ...hitBoxes.filter((b) => b.pageNumber === n),
      ];
      for (const box of boxes) {
        const el = document.createElement('div');
        el.className =
          dragBox && box === dragBox
            ? 'sc-pdf-drag-rect'
            : 'sc-pdf-hit-rect';
        el.style.left = `${box.left}px`;
        el.style.top = `${box.top}px`;
        el.style.width = `${box.width}px`;
        el.style.height = `${box.height}px`;
        overlay.append(el);
      }
    }
  }, [dragBox, hitBoxes, docToken, scale, booting]);

  const zoomBy = (delta: number) => {
    pendingPageRef.current = currentPage;
    setScale((s) => clampScale(s + delta));
  };

  const fitWidth = () => {
    const scroller = getScrollParent();
    const page1 = pageViewsRef.current.get(1)?.page;
    if (!scroller || !page1) return;
    const baseWidth = page1.getViewport({ scale: 1 }).width;
    pendingPageRef.current = currentPage;
    setScale(clampScale((scroller.clientWidth - 40) / baseWidth));
  };

  const goToPage = (pageNumber: number) => {
    const next = Math.min(numPages, Math.max(1, pageNumber));
    setCurrentPage(next);
    scrollToPage(next);
  };

  if (error) {
    return (
      <div className="sc-pdf-boot-error">
        <strong>Não foi possível abrir o PDF</strong>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="sc-pdf-selectable" aria-label={title}>
      <div className="sc-pdf-viewer-bar" role="toolbar" aria-label="Controles do PDF">
        <div className="sc-pdf-toolbar-group">
          <button
            type="button"
            className="sc-pdf-tool-btn"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Página anterior"
            title="Página anterior"
          >
            <IonIcon icon={chevronBackOutline} />
          </button>
          <span className="sc-pdf-page-indicator">
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={currentPage}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isFinite(next)) goToPage(next);
              }}
              aria-label="Ir para a página"
            />
            <span>/ {numPages || '—'}</span>
          </span>
          <button
            type="button"
            className="sc-pdf-tool-btn"
            onClick={() => goToPage(currentPage + 1)}
            disabled={!numPages || currentPage >= numPages}
            aria-label="Próxima página"
            title="Próxima página"
          >
            <IonIcon icon={chevronForwardOutline} />
          </button>
        </div>

        <p className="sc-pdf-select-hint">Arraste sobre o texto para selecionar</p>

        <div className="sc-pdf-toolbar-group">
          <button
            type="button"
            className="sc-pdf-tool-btn"
            onClick={() => zoomBy(-ZOOM_STEP)}
            disabled={scale <= MIN_SCALE}
            aria-label="Diminuir zoom"
            title="Diminuir zoom"
          >
            <IonIcon icon={removeOutline} />
          </button>
          <button
            type="button"
            className="sc-pdf-zoom-value"
            onClick={() => {
              pendingPageRef.current = currentPage;
              setScale(DEFAULT_SCALE);
            }}
            title="Zoom padrão"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            className="sc-pdf-tool-btn"
            onClick={() => zoomBy(ZOOM_STEP)}
            disabled={scale >= MAX_SCALE}
            aria-label="Aumentar zoom"
            title="Aumentar zoom"
          >
            <IonIcon icon={addOutline} />
          </button>
          <button
            type="button"
            className="sc-pdf-tool-btn"
            onClick={fitWidth}
            aria-label="Ajustar à largura"
            title="Ajustar à largura"
          >
            <IonIcon icon={scanOutline} />
          </button>
        </div>
      </div>

      {booting ? (
        <div className="sc-pdf-boot" aria-busy="true">
          <div className="sc-pdf-boot-skeleton" />
          <p>Abrindo páginas…</p>
        </div>
      ) : null}

      <div
        ref={hostRef}
        className={`sc-pdf-pages${booting ? ' is-booting' : ''}`}
      />
    </div>
  );
}
