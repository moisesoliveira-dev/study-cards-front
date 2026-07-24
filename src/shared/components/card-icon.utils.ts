const MAX_EDGE = 128;
const MAX_FILE_BYTES = 1_500_000;

export function isCustomImageIcon(icon: string | null | undefined): boolean {
  return Boolean(icon?.startsWith('data:image/'));
}

export function isEmojiIcon(icon: string | null | undefined): boolean {
  return Boolean(icon?.startsWith('emoji:'));
}

export function getEmojiFromIcon(icon: string): string {
  return icon.slice(6);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Falha ao ler o arquivo'));
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Imagem inválida'));
    img.src = src;
  });
}

/** Resize raster images to a small square PNG data URL for card icons. */
export async function fileToCardIconDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione uma imagem (PNG, JPG, WEBP, GIF ou SVG).');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Arquivo muito grande (máx. 1,5 MB).');
  }

  if (file.type === 'image/svg+xml') {
    const raw = await file.text();
    if (raw.length > 40_000) {
      throw new Error('SVG muito grande.');
    }
    const base64 = btoa(unescape(encodeURIComponent(raw)));
    return `data:image/svg+xml;base64,${base64}`;
  }

  const original = await readFileAsDataUrl(file);
  const img = await loadImage(original);
  const scale = Math.min(MAX_EDGE / img.width, MAX_EDGE / img.height, 1);
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem.');
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const png = canvas.toDataURL('image/png');
  if (png.length > 90_000) {
    throw new Error('Ícone ainda ficou grande demais. Tente outra imagem.');
  }
  return png;
}
