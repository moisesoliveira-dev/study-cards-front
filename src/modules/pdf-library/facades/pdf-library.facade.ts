import { pdfLibraryApi } from '../api/pdf-library.api';

export const pdfLibraryFacade = {
  list: pdfLibraryApi.list,
  createGroup: pdfLibraryApi.createGroup,
  updateGroup: pdfLibraryApi.updateGroup,
  removeGroup: pdfLibraryApi.removeGroup,
  upload: pdfLibraryApi.upload,
  updateDocument: pdfLibraryApi.updateDocument,
  removeDocument: pdfLibraryApi.removeDocument,
  open: async (id: string) => {
    const blob = await pdfLibraryApi.file(id);
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (!popup) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
