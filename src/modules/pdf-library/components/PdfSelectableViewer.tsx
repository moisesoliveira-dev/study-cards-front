import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PdfHighlighter,
  PdfLoader,
  TextHighlight,
  useHighlightContainerContext,
  type PdfHighlighterUtils,
  type PdfScaleValue,
  type PdfSelection,
} from 'react-pdf-highlighter-plus';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { IonIcon } from '@ionic/react';
import {
  addOutline,
  chevronBackOutline,
  chevronForwardOutline,
  removeOutline,
  scanOutline,
} from 'ionicons/icons';
import 'react-pdf-highlighter-plus/style/style.css';

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
const ZOOM_STEP = 0.12;
const WORKER_SRC = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

const clampScale = (value: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value * 100) / 100));

function HighlightContainer() {
  const { highlight, isScrolledTo } = useHighlightContainerContext();
  if (highlight.type !== 'text') return null;
  return (
    <TextHighlight
      highlight={highlight}
      isScrolledTo={isScrolledTo}
      highlightColor="rgba(124, 92, 252, 0.38)"
    />
  );
}

type InnerProps = {
  pdfDocument: PDFDocumentProxy;
  scale: PdfScaleValue;
  onZoomChange: (scale: number) => void;
  onPageChange: (page: number) => void;
  onSelection: (selection: PdfSelection) => void;
  onUtils: (utils: PdfHighlighterUtils) => void;
  onNumPages: (n: number) => void;
};

function PdfHighlighterInner({
  pdfDocument,
  scale,
  onZoomChange,
  onPageChange,
  onSelection,
  onUtils,
  onNumPages,
}: InnerProps) {
  useEffect(() => {
    onNumPages(pdfDocument.numPages);
  }, [onNumPages, pdfDocument]);

  return (
    <PdfHighlighter
      pdfDocument={pdfDocument}
      highlights={[]}
      pdfScaleValue={scale}
      onZoomChange={onZoomChange}
      onPageChange={onPageChange}
      textSelectionColor="rgba(124, 92, 252, 0.28)"
      onSelection={onSelection}
      utilsRef={onUtils}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
      }}
    >
      <HighlightContainer />
    </PdfHighlighter>
  );
}

export function PdfSelectableViewer({
  url,
  title,
  onTextSelected,
  viewerRef,
}: Props) {
  const utilsRef = useRef<PdfHighlighterUtils | null>(null);
  const [scale, setScale] = useState<PdfScaleValue>('page-width');
  const [numericScale, setNumericScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);

  const clearSelection = useCallback(() => {
    utilsRef.current?.removeGhostHighlight();
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    if (!viewerRef) return;
    viewerRef.current = { clearSelection };
    return () => {
      viewerRef.current = null;
    };
  }, [clearSelection, viewerRef]);

  const zoomBy = (delta: number) => {
    setScale(clampScale(numericScale + delta));
  };

  const goToPage = (pageNumber: number) => {
    if (!numPages) return;
    const next = Math.min(numPages, Math.max(1, pageNumber));
    setCurrentPage(next);
    const pageEl = document.querySelector(
      `.sc-pdf-highlighter-host .page[data-page-number="${next}"]`,
    ) as HTMLElement | null;
    pageEl?.scrollIntoView({ block: 'start' });
  };

  const handleSelection = useCallback(
    (selection: PdfSelection) => {
      const text = selection.content?.text
        ?.replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (!text) return;
      // Trava o destaque exatamente no trecho da lib (evita “pegar além”).
      selection.makeGhostHighlight();
      onTextSelected?.(text);
    },
    [onTextSelected],
  );

  const handleZoomChange = useCallback((next: number) => {
    setNumericScale(next);
    setScale(next);
  }, []);

  const handleUtils = useCallback((utils: PdfHighlighterUtils) => {
    utilsRef.current = utils;
  }, []);

  return (
    <div className="sc-pdf-selectable" aria-label={title}>
      <div
        className="sc-pdf-viewer-bar"
        role="toolbar"
        aria-label="Controles do PDF"
      >
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

        <div className="sc-pdf-toolbar-group">
          <button
            type="button"
            className="sc-pdf-tool-btn"
            onClick={() => zoomBy(-ZOOM_STEP)}
            disabled={numericScale <= MIN_SCALE}
            aria-label="Diminuir zoom"
            title="Diminuir zoom"
          >
            <IonIcon icon={removeOutline} />
          </button>
          <button
            type="button"
            className="sc-pdf-zoom-value"
            onClick={() => setScale(1)}
            title="Zoom 100%"
          >
            {Math.round(numericScale * 100)}%
          </button>
          <button
            type="button"
            className="sc-pdf-tool-btn"
            onClick={() => zoomBy(ZOOM_STEP)}
            disabled={numericScale >= MAX_SCALE}
            aria-label="Aumentar zoom"
            title="Aumentar zoom"
          >
            <IonIcon icon={addOutline} />
          </button>
          <button
            type="button"
            className="sc-pdf-tool-btn"
            onClick={() => setScale('page-width')}
            aria-label="Ajustar à largura"
            title="Ajustar à largura"
          >
            <IonIcon icon={scanOutline} />
          </button>
        </div>
      </div>

      <div className="sc-pdf-highlighter-host">
        <PdfLoader
          document={url}
          workerSrc={WORKER_SRC}
          enableCache={false}
          beforeLoad={() => (
            <div className="sc-pdf-boot" aria-busy="true">
              <div className="sc-pdf-boot-skeleton" />
              <p>Abrindo documento…</p>
            </div>
          )}
          errorMessage={(error) => (
            <div className="sc-pdf-boot-error">
              <strong>Não foi possível abrir o PDF</strong>
              <span>{error.message}</span>
            </div>
          )}
        >
          {(pdfDocument) => (
            <PdfHighlighterInner
              pdfDocument={pdfDocument}
              scale={scale}
              onZoomChange={handleZoomChange}
              onPageChange={setCurrentPage}
              onSelection={handleSelection}
              onUtils={handleUtils}
              onNumPages={setNumPages}
            />
          )}
        </PdfLoader>
      </div>
    </div>
  );
}
