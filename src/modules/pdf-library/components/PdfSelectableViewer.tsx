import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getDocument,
  GlobalWorkerOptions,
  TextLayer,
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

export type PdfViewerHandle = {
  clearSelection: () => void;
};

type Props = {
  url: string;
  title: string;
  onTextSelected?: (text: string) => void;
  viewerRef?: React.MutableRefObject<PdfViewerHandle | null>;
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

/** Normaliza o texto selecionado nativamente (colapsa espaços/quebras herdados dos spans). */
function normalizeSelection(raw: string) {
  return raw
    .replace(/\u00ad/g, '') // soft hyphen
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
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
  const pageViewsRef = useRef<Map<number, { el: HTMLElement; page: PDFPageProxy }>>(
    new Map(),
  );
  const scaleRef = useRef(DEFAULT_SCALE);
  const pendingPageRef = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [docToken, setDocToken] = useState(0);
  const [booting, setBooting] = useState(true);

  scaleRef.current = scale;

  const getScrollParent = useCallback(
    () => rootRef.current?.closest('.sc-pdf-reader-stage') as HTMLElement | null,
    [],
  );

  const clearSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) sel.removeAllRanges();
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

  // Progressive render (canvas + camada de texto nativa alinhada)
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

    void (async () => {
      try {
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: scaleRef.current });

          const pageEl = document.createElement('div');
          pageEl.className = 'sc-pdf-page';
          pageEl.dataset.page = String(pageNumber);
          pageEl.style.width = `${viewport.width}px`;
          pageEl.style.height = `${viewport.height}px`;
          // Variáveis exigidas pela camada de texto do pdf.js para escalar corretamente.
          pageEl.style.setProperty('--scale-factor', String(scaleRef.current));
          pageEl.style.setProperty('--total-scale-factor', String(scaleRef.current));
          pageEl.style.setProperty('--scale-round-x', '1px');
          pageEl.style.setProperty('--scale-round-y', '1px');

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', { alpha: false });
          if (!context) throw new Error('Canvas indisponível');

          const outputScale = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

          const textLayerDiv = document.createElement('div');
          textLayerDiv.className = 'textLayer';

          pageEl.append(canvas, textLayerDiv);
          host.append(pageEl);
          pageViewsRef.current.set(pageNumber, { el: pageEl, page });

          const task = page.render({ canvasContext: context, viewport, canvas });
          tasks.push(task);
          await task.promise;
          if (cancelled) break;

          const textContent = await page.getTextContent();
          if (cancelled) break;
          const textLayer = new TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
          });
          await textLayer.render();

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

  // Seleção nativa do navegador (como no Edge): captura ao soltar o mouse.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || booting) return;

    const emitSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const anchor = sel.anchorNode;
      if (anchor && !host.contains(anchor)) return;
      const text = normalizeSelection(sel.toString());
      if (text) onTextSelected?.(text);
    };

    const onPointerUp = () => {
      // Espera o navegador finalizar o range antes de ler.
      window.setTimeout(emitSelection, 0);
    };

    host.addEventListener('pointerup', onPointerUp);
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Shift' || e.ctrlKey || e.metaKey) emitSelection();
    });
    return () => {
      host.removeEventListener('pointerup', onPointerUp);
    };
  }, [booting, onTextSelected]);

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

        <p className="sc-pdf-select-hint">Selecione o texto com o mouse</p>

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
