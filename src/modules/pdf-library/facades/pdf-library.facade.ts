import { pdfLibraryApi } from '../api/pdf-library.api';

export const pdfLibraryFacade = {
  list: pdfLibraryApi.list,
  createGroup: pdfLibraryApi.createGroup,
  updateGroup: pdfLibraryApi.updateGroup,
  removeGroup: pdfLibraryApi.removeGroup,
  upload: pdfLibraryApi.upload,
  updateDocument: pdfLibraryApi.updateDocument,
  setCover: pdfLibraryApi.setCover,
  removeCover: pdfLibraryApi.removeCover,
  removeDocument: pdfLibraryApi.removeDocument,
  fetchBlob: (id: string) => pdfLibraryApi.file(id),
  fetchCoverBlob: (id: string) => pdfLibraryApi.cover(id),
};
