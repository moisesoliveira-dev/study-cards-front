import { useEffect, useRef, useState } from 'react';
import {
  getDocument,
  GlobalWorkerOptions,
  TextLayer,
  type PDFDocumentProxy,
} from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import 'pdfjs-dist/web/pdf_viewer.css';

GlobalWorkerOptions.workerSrc = pdfWorker;

type Props = {
  url: string;
  title: string;
  onTextSelected?: (text: string, rect: DOMRect) => void;
  onSelectionCleared?: () => void;
};

const BASE_SCALE = 1.15;

export function PdfSelectableViewer({
  url,
  title,
  onTextSelected,
  onSelectionCleared,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let pdf: PDFDocumentProxy | null = null;
    const textLayers: TextLayer[] = [];
    setError(null);
    setReady(false);
    setPageCount(0);
    host.replaceChildren();

    const loading = getDocument({ url });
    void (async () => {
      try {
        pdf = await loading.promise;
        if (cancelled) {
          await pdf.cleanup();
          await loading.destroy();
          return;
        }
        setPageCount(pdf.numPages);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: BASE_SCALE });

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

          await page.render({ canvasContext: context, viewport, canvas }).promise;
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

        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Falha ao renderizar o PDF',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const layer of textLayers) layer.cancel();
      void (async () => {
        try {
          await pdf?.cleanup();
        } catch {
          /* ignore */
        }
        try {
          await loading.destroy();
        } catch {
          /* ignore */
        }
      })();
      host.replaceChildren();
    };
  }, [url]);

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
    <div className="sc-pdf-selectable" aria-label={title}>
      {!ready ? (
        <div className="sc-pdf-reader-loading sc-pdf-selectable-loading">
          <span>
            Preparando leitura
            {pageCount ? ` · ${pageCount} páginas` : '…'}
          </span>
        </div>
      ) : null}
      <div ref={hostRef} className="sc-pdf-pages" />
    </div>
  );
}
