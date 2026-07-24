import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { IonIcon, IonSpinner } from '@ionic/react';
import { arrowBackOutline, documentTextOutline } from 'ionicons/icons';
import type { PdfDocument } from '../types/pdf-library.types';
import { pdfLibraryFacade } from '../facades/pdf-library.facade';
import { useAppToast } from '../../../shared/hooks/useAppToast';
import { docExpand, fadeIn } from '../../../shared/motion';

type Props = {
  pdf: PdfDocument | null;
  groupName?: string | null;
  onClose: () => void;
};

export function PdfReaderSheet({ pdf, groupName, onClose }: Props) {
  const toast = useAppToast();
  const reduce = useReducedMotion();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pdf) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const pdfId = pdf.id;
    setLoading(true);
    setUrl(null);

    void pdfLibraryFacade
      .fetchBlob(pdfId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error);
          onClose();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reopen only when PDF changes
  }, [pdf?.id]);

  useEffect(() => {
    if (!pdf) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      window.document.body.style.overflow = prevOverflow;
    };
  }, [pdf, onClose]);

  return createPortal(
    <AnimatePresence>
      {pdf ? (
        <motion.div
          key={pdf.id}
          className="sc-card-as-modal is-document sc-pdf-reader-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Leitura · ${pdf.title}`}
          variants={reduce ? undefined : fadeIn}
          initial={reduce ? false : 'hidden'}
          animate="show"
          exit="exit"
        >
          <motion.div
            className="sc-doc-shell sc-pdf-reader-shell"
            variants={reduce ? undefined : docExpand}
            initial={reduce ? false : 'hidden'}
            animate="show"
            exit="exit"
          >
            <header className="sc-doc-header sc-pdf-reader-header">
              <button
                type="button"
                className="sc-btn sc-btn-icon sc-doc-back"
                aria-label="Voltar à biblioteca"
                title="Voltar"
                onClick={onClose}
              >
                <IonIcon icon={arrowBackOutline} />
              </button>
              <div className="sc-doc-header-title">
                <h1 className="sc-doc-title-view">{pdf.title}</h1>
                <p className="sc-doc-tag-view">
                  {groupName?.trim() || 'Sem coleção'} · PDF
                </p>
              </div>
              <span className="sc-pdf-reader-badge" aria-hidden>
                <IonIcon icon={documentTextOutline} />
                Leitura
              </span>
            </header>

            <div className="sc-pdf-reader-body">
              {loading || !url ? (
                <div className="sc-pdf-reader-loading">
                  <IonSpinner name="crescent" />
                  <span>Abrindo documento…</span>
                </div>
              ) : (
                <iframe
                  className="sc-pdf-reader-frame"
                  title={pdf.title}
                  src={`${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    window.document.body,
  );
}
