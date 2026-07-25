import { useEffect, useState } from 'react';
import { pdfLibraryFacade } from '../facades/pdf-library.facade';

type Props = {
  documentId: string;
  hasCover: boolean;
  alt: string;
  className?: string;
};

/** Loads an authenticated cover image blob for a PDF document. */
export function PdfCoverImage({
  documentId,
  hasCover,
  alt,
  className,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasCover) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    void pdfLibraryFacade
      .fetchCoverBlob(documentId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId, hasCover]);

  if (!hasCover || !url) return null;
  return <img className={className} src={url} alt={alt} draggable={false} />;
}
