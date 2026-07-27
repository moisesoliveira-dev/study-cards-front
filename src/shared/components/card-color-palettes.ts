import { CARD_ACCENT_COLORS } from '../../modules/cards/types/card.types';

export type ColorPalette = {
  id: string;
  name: string;
  colors: string[];
  /** Built-in palettes cannot be deleted or emptied. */
  builtin?: boolean;
};

const STORAGE_KEY = 'sc-card-color-palettes';
const ACTIVE_KEY = 'sc-card-color-palette-active';

export const DEFAULT_PALETTE_ID = 'default';

export const DEFAULT_PALETTE: ColorPalette = {
  id: DEFAULT_PALETTE_ID,
  name: 'Padrão',
  colors: [...CARD_ACCENT_COLORS],
  builtin: true,
};

function normalizeHex(raw: string): string | null {
  const value = raw.trim();
  const withHash = value.startsWith('#') ? value : `#${value}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(withHash)) return null;
  return withHash.toUpperCase();
}

function readUserPalettes(): ColorPalette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ColorPalette[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
      .map((p) => ({
        id: p.id,
        name: p.name.trim() || 'Paleta',
        colors: (p.colors ?? [])
          .map((c) => normalizeHex(String(c)))
          .filter((c): c is string => Boolean(c)),
        builtin: false,
      }))
      .filter((p) => p.id !== DEFAULT_PALETTE_ID);
  } catch {
    return [];
  }
}

function writeUserPalettes(palettes: ColorPalette[]) {
  const payload = palettes
    .filter((p) => !p.builtin && p.id !== DEFAULT_PALETTE_ID)
    .map(({ id, name, colors }) => ({ id, name, colors }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function listPalettes(): ColorPalette[] {
  return [DEFAULT_PALETTE, ...readUserPalettes()];
}

export function getActivePaletteId(): string {
  try {
    return localStorage.getItem(ACTIVE_KEY) || DEFAULT_PALETTE_ID;
  } catch {
    return DEFAULT_PALETTE_ID;
  }
}

export function setActivePaletteId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function getPalette(id: string): ColorPalette {
  return listPalettes().find((p) => p.id === id) ?? DEFAULT_PALETTE;
}

export function createPalette(
  name: string,
  colors?: string[],
): ColorPalette {
  const palette: ColorPalette = {
    id: `palette_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || 'Nova paleta',
    colors: (colors?.length ? colors : [...CARD_ACCENT_COLORS])
      .map((c) => normalizeHex(c))
      .filter((c): c is string => Boolean(c)),
  };
  const next = [...readUserPalettes(), palette];
  writeUserPalettes(next);
  setActivePaletteId(palette.id);
  return palette;
}

export function renamePalette(id: string, name: string): ColorPalette | null {
  if (id === DEFAULT_PALETTE_ID) return null;
  const palettes = readUserPalettes();
  const idx = palettes.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  palettes[idx] = {
    ...palettes[idx],
    name: name.trim() || palettes[idx].name,
  };
  writeUserPalettes(palettes);
  return palettes[idx];
}

export function deletePalette(id: string): boolean {
  if (id === DEFAULT_PALETTE_ID) return false;
  const next = readUserPalettes().filter((p) => p.id !== id);
  writeUserPalettes(next);
  if (getActivePaletteId() === id) setActivePaletteId(DEFAULT_PALETTE_ID);
  return true;
}

export function addColorToPalette(
  id: string,
  color: string,
): ColorPalette | null {
  if (id === DEFAULT_PALETTE_ID) return null;
  const hex = normalizeHex(color);
  if (!hex) return null;
  const palettes = readUserPalettes();
  const idx = palettes.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  if (palettes[idx].colors.some((c) => c.toUpperCase() === hex)) {
    return palettes[idx];
  }
  palettes[idx] = {
    ...palettes[idx],
    colors: [...palettes[idx].colors, hex],
  };
  writeUserPalettes(palettes);
  return palettes[idx];
}

export function removeColorFromPalette(
  id: string,
  color: string,
): ColorPalette | null {
  if (id === DEFAULT_PALETTE_ID) return null;
  const hex = normalizeHex(color);
  if (!hex) return null;
  const palettes = readUserPalettes();
  const idx = palettes.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  palettes[idx] = {
    ...palettes[idx],
    colors: palettes[idx].colors.filter((c) => c.toUpperCase() !== hex),
  };
  writeUserPalettes(palettes);
  return palettes[idx];
}

export function isValidHex(color: string): boolean {
  return normalizeHex(color) !== null;
}

export function toHex(color: string): string | null {
  return normalizeHex(color);
}
