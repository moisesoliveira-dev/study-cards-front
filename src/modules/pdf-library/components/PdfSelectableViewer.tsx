import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getDocument,
  TextLayer,
  type PDFDocumentProxy,
  type RenderTask,
} from 'pdfjs-dist';
import { IonIcon } from '@ionic/react';
import {
  addOutline,
  chevronDownOutline,
  chevronUpOutline,
  removeOutline,
  scanOutline,
} from 'ionicons/icons';
import 'pdfjs-dist/web/pdf_viewer.css';
import { ensurePdfWorker } from '../pdf-worker';

type Props = {
  url: string;
  title: string;
  onTextSelected?: (text: string, rect: DOMRect) => void;
  onSelectionCleared?: () => void;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const DEFAULT_SCALE = 1.15;
const ZOOM_STEP = 0.15;

const clampScale = (value: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value * 100) / 100));

export function PdfSelectableViewer({
  url,
  title,
  onTextSelected,
  onSelectionCleared,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const baseWidthRef = useRef(0);
  const pendingPageRef = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [docToken, setDocToken] = useState(0);
  const [ready, setReady] = useState(false);

  const getScrollParent = useCallback(
    () => rootRef.current?.parentElement ?? null,
    [],
  );

  const scrollToPage = useCallback((pageNumber: number) => {
    const host = hostRef.current;
    const scroller = rootRef.current?.parentElement;
    if (!host || !scroller) return;
    const pageEl = host.querySelector<HTMLElement>(
      `.sc-pdf-page[data-page="${pageNumber}"]`,
    );
    if (!pageEl) return;
    scroller.scrollTo({ top: Math.max(0, pageEl.offsetTop - 8) });
  }, []);

  // Load the document (only when the url changes).
  useEffect(() => {
    let cancelled = false;
    let loading: ReturnType<typeof getDocument> | null = null;
    setError(null);
    setReady(false);
    setNumPages(0);
    setCurrentPage(1);
    pdfRef.current = null;

    void (async () => {
      try {
        await ensurePdfWorker();
        if (cancelled) return;
        loading = getDocument({ url });
        const pdf = await loading.promise;
        if (cancelled) {
          await pdf.cleanup();
          await loading.destroy();
          return;
        }
        pdfRef.current = pdf;
        const page1 = await pdf.getPage(1);
        baseWidthRef.current = page1.getViewport({ scale: 1 }).width;
        setNumPages(pdf.numPages);
        setDocToken((t) => t + 1);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Falha ao abrir o PDF',
          );
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
  }, [url]);

  // Render every page for the current scale.
  useEffect(() => {
    const host = hostRef.current;
    const pdf = pdfRef.current;
    if (!host || !pdf || !docToken) return;

    let cancelled = false;
    const textLayers: TextLayer[] = [];
    const renderTasks: RenderTask[] = [];
    setReady(false);
    host.replaceChildren();

    void (async () => {
      try {
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale });

          const pageEl = document.createElement('div');
          pageEl.className = 'sc-pdf-page';
          pageEl.dataset.page = String(pageNumber);
          pageEl.style.width = `${viewport.width}px`;
          pageEl.style.height = `${viewport.height}px`;

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas indisponível');

          const outputScale = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

          const textLayerEl = document.createElement('div');
          textLayerEl.className = 'textLayer';
          textLayerEl.style.setProperty('--scale-factor', String(viewport.scale));
          textLayerEl.style.width = `${viewport.width}px`;
          textLayerEl.style.height = `${viewport.height}px`;

          pageEl.append(canvas, textLayerEl);
          host.append(pageEl);

          const task = page.render({ canvasContext: context, viewport, canvas });
          renderTasks.push(task);
          await task.promise;
          if (cancelled) break;

          const textContent = await page.getTextContent();
          const textLayer = new TextLayer({
            textContentSource: textContent,
            container: textLayerEl,
            viewport,
          });
          textLayers.push(textLayer);
          await textLayer.render();
        }

        if (!cancelled) {
          setReady(true);
          if (pendingPageRef.current) {
            const target = pendingPageRef.current;
            pendingPageRef.current = null;
            requestAnimationFrame(() => scrollToPage(target));
          }
        }
      } catch (err) {
        const name = (err as { name?: string })?.name;
        if (!cancelled && name !== 'RenderingCancelledException') {
          setError(
            err instanceof Error ? err.message : 'Falha ao renderizar o PDF',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const task of renderTasks) {
        try {
          task.cancel();
        } catch {
          /* ignore */
        }
      }
      for (const layer of textLayers) layer.cancel();
    };
  }, [docToken, scale, scrollToPage]);

  // Track the page currently in view.
  useEffect(() => {
    const scroller = getScrollParent();
    const host = hostRef.current;
    if (!scroller || !host || !ready) return;

    const onScroll = () => {
      const mid = scroller.scrollTop + scroller.clientHeight / 2;
      const pages = host.querySelectorAll<HTMLElement>('.sc-pdf-page');
      let best = 1;
      for (const pageEl of pages) {
        if (pageEl.offsetTop <= mid) best = Number(pageEl.dataset.page) || best;
        else break;
      }
      setCurrentPage(best);
    };

    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [getScrollParent, ready, numPages]);

  // Ctrl/⌘ + wheel to zoom.
  useEffect(() => {
    const scroller = getScrollParent();
    if (!scroller) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setScale((s) => clampScale(s + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP)));
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', onWheel);
  }, [getScrollParent]);

  const zoomBy = useCallback((delta: number) => {
    pendingPageRef.current = currentPage;
    setScale((s) => clampScale(s + delta));
  }, [currentPage]);

  const fitWidth = useCallback(() => {
    const scroller = getScrollParent();
    if (!scroller || !baseWidthRef.current) return;
    const available = scroller.clientWidth - 32;
    pendingPageRef.current = currentPage;
    setScale(clampScale(available / baseWidthRef.current));
  }, [currentPage, getScrollParent]);

  const goToPage = useCallback(
    (pageNumber: number) => {
      const clamped = Math.min(numPages, Math.max(1, pageNumber));
      setCurrentPage(clamped);
      scrollToPage(clamped);
    },
    [numPages, scrollToPage],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        onSelectionCleared?.();
        return;
      }
      const text = selection.toString().replace(/\s+\n/g, '\n').trim();
      if (!text) {
        onSelectionCleared?.();
        return;
      }
      const anchor = selection.anchorNode;
      if (!anchor || !host.contains(anchor)) {
        onSelectionCleared?.();
        return;
      }
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        onSelectionCleared?.();
        return;
      }
      onTextSelected?.(text, rect);
    };

    host.addEventListener('mouseup', handleMouseUp);
    return () => host.removeEventListener('mouseup', handleMouseUp);
  }, [onSelectionCleared, onTextSelected, ready]);

  if (error) {
    return (
      <div className="sc-pdf-reader-loading">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="sc-pdf-selectable" aria-label={title}>
      <div className="sc-pdf-toolbar" role="toolbar" aria-label="Controles do PDF">
        <div className="sc-pdf-toolbar-group">
          <button
            type="button"
            className="sc-pdf-tool-btn"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Página anterior"
            title="Página anterior"
          >
            <IonIcon icon={chevronUpOutline} />
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
            disabled={currentPage >= numPages}
            aria-label="Próxima página"
            title="Próxima página"
          >
            <IonIcon icon={chevronDownOutline} />
          </button>
        </div>

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
            title="Restaurar zoom (100%)"
          >
            {Math.round((scale / DEFAULT_SCALE) * 100)}%
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

      {!ready ? (
        <div className="sc-pdf-reader-loading sc-pdf-selectable-loading">
          <span>
            Preparando leitura
            {numPages ? ` · ${numPages} páginas` : '…'}
          </span>
        </div>
      ) : null}
      <div ref={hostRef} className="sc-pdf-pages" />
    </div>
  );
}
