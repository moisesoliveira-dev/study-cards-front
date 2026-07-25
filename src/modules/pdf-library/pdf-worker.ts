import { GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist';

/**
 * pdf.js carrega o worker via `import()` / module Worker.
 * O asset hashado do Vite (`/assets/pdf.worker-*.mjs`) falha com frequência no
 * Railway (SPA devolvendo HTML, MIME, cache). Preferimos:
 * 1) cópia estática em /public (mesmo origin, gerada no build)
 * 2) CDN jsDelivr com a mesma versão do pacote
 */
const LOCAL_WORKER = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;
const CDN_WORKER = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

let setupPromise: Promise<void> | null = null;

async function canLoadAsModule(src: string): Promise<boolean> {
  try {
    const res = await fetch(src, { method: 'GET', cache: 'no-store' });
    if (!res.ok) return false;
    const type = (res.headers.get('content-type') || '').toLowerCase();
    // SPA fallback devolve text/html — não serve como worker
    if (type.includes('text/html')) return false;
    const head = (await res.clone().text()).slice(0, 64);
    if (head.includes('<!DOCTYPE') || head.includes('<html')) return false;
    return true;
  } catch {
    return false;
  }
}

export function ensurePdfWorker(): Promise<void> {
  if (!setupPromise) {
    setupPromise = (async () => {
      if (await canLoadAsModule(LOCAL_WORKER)) {
        GlobalWorkerOptions.workerSrc = LOCAL_WORKER;
        return;
      }
      GlobalWorkerOptions.workerSrc = CDN_WORKER;
    })();
  }
  return setupPromise;
}
