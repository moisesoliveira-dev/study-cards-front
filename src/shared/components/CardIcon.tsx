import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { IonIcon } from '@ionic/react';
import {
  airplaneOutline,
  alarmOutline,
  analyticsOutline,
  apertureOutline,
  archiveOutline,
  barChartOutline,
  basketballOutline,
  batteryChargingOutline,
  beakerOutline,
  bicycleOutline,
  bluetoothOutline,
  bookOutline,
  briefcaseOutline,
  brushOutline,
  bugOutline,
  buildOutline,
  bulbOutline,
  busOutline,
  cafeOutline,
  calculatorOutline,
  calendarOutline,
  cameraOutline,
  carOutline,
  cartOutline,
  chatbubbleOutline,
  checkboxOutline,
  clipboardOutline,
  cloudOutline,
  cloudyOutline,
  codeSlashOutline,
  colorPaletteOutline,
  compassOutline,
  constructOutline,
  cubeOutline,
  desktopOutline,
  diamondOutline,
  documentTextOutline,
  earthOutline,
  extensionPuzzleOutline,
  eyeOutline,
  fitnessOutline,
  flashOutline,
  flaskOutline,
  flowerOutline,
  folderOutline,
  footstepsOutline,
  flagOutline,
  gameControllerOutline,
  gitBranchOutline,
  gitNetworkOutline,
  globeOutline,
  hammerOutline,
  hardwareChipOutline,
  headsetOutline,
  heartOutline,
  helpBuoyOutline,
  homeOutline,
  hourglassOutline,
  infiniteOutline,
  informationCircleOutline,
  journalOutline,
  keyOutline,
  languageOutline,
  layersOutline,
  leafOutline,
  libraryOutline,
  linkOutline,
  listOutline,
  locationOutline,
  lockClosedOutline,
  magnetOutline,
  mailOutline,
  mapOutline,
  medalOutline,
  medicalOutline,
  micOutline,
  moonOutline,
  musicalNotesOutline,
  navigateOutline,
  newspaperOutline,
  notificationsOutline,
  nuclearOutline,
  nutritionOutline,
  optionsOutline,
  paperPlaneOutline,
  peopleOutline,
  personOutline,
  pieChartOutline,
  planetOutline,
  playOutline,
  prismOutline,
  pulseOutline,
  pushOutline,
  radioOutline,
  rainyOutline,
  readerOutline,
  receiptOutline,
  refreshOutline,
  ribbonOutline,
  rocketOutline,
  schoolOutline,
  searchOutline,
  serverOutline,
  settingsOutline,
  shapesOutline,
  shareSocialOutline,
  shieldCheckmarkOutline,
  shirtOutline,
  sparklesOutline,
  speedometerOutline,
  starOutline,
  statsChartOutline,
  storefrontOutline,
  sunnyOutline,
  syncOutline,
  telescopeOutline,
  terminalOutline,
  thermometerOutline,
  timeOutline,
  timerOutline,
  trailSignOutline,
  trainOutline,
  trophyOutline,
  umbrellaOutline,
  videocamOutline,
  walletOutline,
  warningOutline,
  watchOutline,
  waterOutline,
  wifiOutline,
  wineOutline,
  closeOutline,
  gridOutline,
  boatOutline,
  colorWandOutline,
  ellipseOutline,
} from 'ionicons/icons';
import { fadeIn, scaleIn, tapScale } from '../motion';

export type CardIconCategory =
  | 'tech'
  | 'study'
  | 'science'
  | 'people'
  | 'nature'
  | 'objects'
  | 'symbols';

export type CardIconOption = {
  id: string;
  label: string;
  category: CardIconCategory;
  icon: string;
};

export const CARD_ICON_CATEGORIES: {
  id: CardIconCategory | 'all';
  label: string;
}[] = [
  { id: 'all', label: 'Todos' },
  { id: 'tech', label: 'Tech' },
  { id: 'study', label: 'Estudo' },
  { id: 'science', label: 'Ciência' },
  { id: 'people', label: 'Pessoas' },
  { id: 'nature', label: 'Natureza' },
  { id: 'objects', label: 'Objetos' },
  { id: 'symbols', label: 'Símbolos' },
];

export const CARD_ICON_OPTIONS: CardIconOption[] = [
  // Tech
  { id: 'code', label: 'Código', category: 'tech', icon: codeSlashOutline },
  { id: 'terminal', label: 'Terminal', category: 'tech', icon: terminalOutline },
  { id: 'server', label: 'Servidor', category: 'tech', icon: serverOutline },
  { id: 'cloud', label: 'Nuvem', category: 'tech', icon: cloudOutline },
  { id: 'database', label: 'Banco', category: 'tech', icon: cubeOutline },
  { id: 'network', label: 'Rede', category: 'tech', icon: gitNetworkOutline },
  { id: 'git', label: 'Git', category: 'tech', icon: gitBranchOutline },
  { id: 'hardware', label: 'Chip', category: 'tech', icon: hardwareChipOutline },
  { id: 'chip', label: 'Processador', category: 'tech', icon: hardwareChipOutline },
  { id: 'wifi', label: 'Wi‑Fi', category: 'tech', icon: wifiOutline },
  { id: 'bluetooth', label: 'Bluetooth', category: 'tech', icon: bluetoothOutline },
  { id: 'desktop', label: 'Desktop', category: 'tech', icon: desktopOutline },
  { id: 'bug', label: 'Bug', category: 'tech', icon: bugOutline },
  { id: 'settings', label: 'Config', category: 'tech', icon: settingsOutline },
  { id: 'sync', label: 'Sync', category: 'tech', icon: syncOutline },
  { id: 'link', label: 'Link', category: 'tech', icon: linkOutline },
  { id: 'lock', label: 'Lock', category: 'tech', icon: lockClosedOutline },
  { id: 'shield', label: 'Shield', category: 'tech', icon: shieldCheckmarkOutline },
  { id: 'key', label: 'Chave', category: 'tech', icon: keyOutline },
  { id: 'radio', label: 'Rádio', category: 'tech', icon: radioOutline },
  { id: 'aperture', label: 'Lente', category: 'tech', icon: apertureOutline },
  { id: 'layers', label: 'Camadas', category: 'tech', icon: layersOutline },
  { id: 'puzzle', label: 'Plugin', category: 'tech', icon: extensionPuzzleOutline },
  { id: 'rocket', label: 'Deploy', category: 'tech', icon: rocketOutline },
  { id: 'flash', label: 'Flash', category: 'tech', icon: flashOutline },
  { id: 'speed', label: 'Velocidade', category: 'tech', icon: speedometerOutline },
  { id: 'analytics', label: 'Analytics', category: 'tech', icon: analyticsOutline },
  { id: 'chart', label: 'Gráfico', category: 'tech', icon: statsChartOutline },
  { id: 'pie', label: 'Pizza', category: 'tech', icon: pieChartOutline },
  { id: 'options', label: 'Opções', category: 'tech', icon: optionsOutline },

  // Study
  { id: 'bulb', label: 'Ideia', category: 'study', icon: bulbOutline },
  { id: 'book', label: 'Livro', category: 'study', icon: bookOutline },
  { id: 'library', label: 'Biblioteca', category: 'study', icon: libraryOutline },
  { id: 'journal', label: 'Diário', category: 'study', icon: journalOutline },
  { id: 'reader', label: 'Leitura', category: 'study', icon: readerOutline },
  { id: 'school', label: 'Escola', category: 'study', icon: schoolOutline },
  { id: 'document', label: 'Documento', category: 'study', icon: documentTextOutline },
  { id: 'clipboard', label: 'Prancheta', category: 'study', icon: clipboardOutline },
  { id: 'list', label: 'Lista', category: 'study', icon: listOutline },
  { id: 'language', label: 'Idioma', category: 'study', icon: languageOutline },
  { id: 'calculator', label: 'Cálculo', category: 'study', icon: calculatorOutline },
  { id: 'formula', label: 'Fórmula', category: 'study', icon: ellipseOutline },
  { id: 'brain', label: 'Conceito', category: 'study', icon: sparklesOutline },
  { id: 'sparkles', label: 'Insight', category: 'study', icon: sparklesOutline },
  { id: 'help', label: 'Ajuda', category: 'study', icon: helpBuoyOutline },
  { id: 'info', label: 'Info', category: 'study', icon: informationCircleOutline },
  { id: 'search', label: 'Busca', category: 'study', icon: searchOutline },
  { id: 'newspaper', label: 'Notícia', category: 'study', icon: newspaperOutline },
  { id: 'archive', label: 'Arquivo', category: 'study', icon: archiveOutline },
  { id: 'folder', label: 'Pasta', category: 'study', icon: folderOutline },
  { id: 'hourglass', label: 'Tempo', category: 'study', icon: hourglassOutline },
  { id: 'timer', label: 'Timer', category: 'study', icon: timerOutline },
  { id: 'alarm', label: 'Alarme', category: 'study', icon: alarmOutline },
  { id: 'calendar', label: 'Agenda', category: 'study', icon: calendarOutline },

  // Science
  { id: 'atom', label: 'Átomo', category: 'science', icon: colorWandOutline },
  { id: 'flask', label: 'Frasco', category: 'science', icon: flaskOutline },
  { id: 'beaker', label: 'Becker', category: 'science', icon: beakerOutline },
  { id: 'telescope', label: 'Telescópio', category: 'science', icon: telescopeOutline },
  { id: 'planet', label: 'Planeta', category: 'science', icon: planetOutline },
  { id: 'earth', label: 'Terra', category: 'science', icon: earthOutline },
  { id: 'nuclear', label: 'Nuclear', category: 'science', icon: nuclearOutline },
  { id: 'magnet', label: 'Ímã', category: 'science', icon: magnetOutline },
  { id: 'thermometer', label: 'Temperatura', category: 'science', icon: thermometerOutline },
  { id: 'pulse', label: 'Pulso', category: 'science', icon: pulseOutline },
  { id: 'medical', label: 'Médico', category: 'science', icon: medicalOutline },
  { id: 'fitness', label: 'Fitness', category: 'science', icon: fitnessOutline },
  { id: 'nutrition', label: 'Nutrição', category: 'science', icon: nutritionOutline },
  { id: 'prism', label: 'Prisma', category: 'science', icon: prismOutline },

  // People
  { id: 'person', label: 'Pessoa', category: 'people', icon: personOutline },
  { id: 'people', label: 'Equipe', category: 'people', icon: peopleOutline },
  { id: 'chat', label: 'Chat', category: 'people', icon: chatbubbleOutline },
  { id: 'mail', label: 'E-mail', category: 'people', icon: mailOutline },
  { id: 'mic', label: 'Microfone', category: 'people', icon: micOutline },
  { id: 'headset', label: 'Headset', category: 'people', icon: headsetOutline },
  { id: 'videocam', label: 'Vídeo', category: 'people', icon: videocamOutline },
  { id: 'camera', label: 'Câmera', category: 'people', icon: cameraOutline },
  { id: 'share', label: 'Compartilhar', category: 'people', icon: shareSocialOutline },
  { id: 'notifications', label: 'Alerta', category: 'people', icon: notificationsOutline },
  { id: 'home', label: 'Casa', category: 'people', icon: homeOutline },
  { id: 'briefcase', label: 'Trabalho', category: 'people', icon: briefcaseOutline },
  { id: 'store', label: 'Loja', category: 'people', icon: storefrontOutline },
  { id: 'cart', label: 'Carrinho', category: 'people', icon: cartOutline },
  { id: 'wallet', label: 'Carteira', category: 'people', icon: walletOutline },
  { id: 'receipt', label: 'Recibo', category: 'people', icon: receiptOutline },

  // Nature
  { id: 'globe', label: 'Mundo', category: 'nature', icon: globeOutline },
  { id: 'leaf', label: 'Folha', category: 'nature', icon: leafOutline },
  { id: 'flower', label: 'Flor', category: 'nature', icon: flowerOutline },
  { id: 'water', label: 'Água', category: 'nature', icon: waterOutline },
  { id: 'sunny', label: 'Sol', category: 'nature', icon: sunnyOutline },
  { id: 'moon', label: 'Lua', category: 'nature', icon: moonOutline },
  { id: 'cloudy', label: 'Nublado', category: 'nature', icon: cloudyOutline },
  { id: 'rainy', label: 'Chuva', category: 'nature', icon: rainyOutline },
  { id: 'umbrella', label: 'Guarda-chuva', category: 'nature', icon: umbrellaOutline },
  { id: 'footsteps', label: 'Passos', category: 'nature', icon: footstepsOutline },
  { id: 'compass', label: 'Bússola', category: 'nature', icon: compassOutline },
  { id: 'map', label: 'Mapa', category: 'nature', icon: mapOutline },
  { id: 'location', label: 'Local', category: 'nature', icon: locationOutline },
  { id: 'navigate', label: 'Navegar', category: 'nature', icon: navigateOutline },
  { id: 'trail', label: 'Trilha', category: 'nature', icon: trailSignOutline },

  // Objects
  { id: 'construct', label: 'Ferramenta', category: 'objects', icon: constructOutline },
  { id: 'build', label: 'Build', category: 'objects', icon: buildOutline },
  { id: 'hammer', label: 'Martelo', category: 'objects', icon: hammerOutline },
  { id: 'brush', label: 'Pincel', category: 'objects', icon: brushOutline },
  { id: 'palette', label: 'Paleta', category: 'objects', icon: colorPaletteOutline },
  { id: 'shapes', label: 'Formas', category: 'objects', icon: shapesOutline },
  { id: 'diamond', label: 'Diamante', category: 'objects', icon: diamondOutline },
  { id: 'watch', label: 'Relógio', category: 'objects', icon: watchOutline },
  { id: 'time', label: 'Hora', category: 'objects', icon: timeOutline },
  { id: 'battery', label: 'Bateria', category: 'objects', icon: batteryChargingOutline },
  { id: 'cafe', label: 'Café', category: 'objects', icon: cafeOutline },
  { id: 'wine', label: 'Taça', category: 'objects', icon: wineOutline },
  { id: 'shirt', label: 'Roupa', category: 'objects', icon: shirtOutline },
  { id: 'game', label: 'Game', category: 'objects', icon: gameControllerOutline },
  { id: 'music', label: 'Música', category: 'objects', icon: musicalNotesOutline },
  { id: 'radio-show', label: 'Áudio', category: 'objects', icon: radioOutline },
  { id: 'play', label: 'Play', category: 'objects', icon: playOutline },
  { id: 'car', label: 'Carro', category: 'objects', icon: carOutline },
  { id: 'bus', label: 'Ônibus', category: 'objects', icon: busOutline },
  { id: 'train', label: 'Trem', category: 'objects', icon: trainOutline },
  { id: 'bicycle', label: 'Bike', category: 'objects', icon: bicycleOutline },
  { id: 'boat', label: 'Barco', category: 'objects', icon: boatOutline },
  { id: 'airplane', label: 'Avião', category: 'objects', icon: airplaneOutline },
  { id: 'paperplane', label: 'Enviar', category: 'objects', icon: paperPlaneOutline },
  { id: 'push', label: 'Push', category: 'objects', icon: pushOutline },
  { id: 'bag', label: 'Mochila', category: 'objects', icon: briefcaseOutline },

  // Symbols
  { id: 'star', label: 'Estrela', category: 'symbols', icon: starOutline },
  { id: 'heart', label: 'Coração', category: 'symbols', icon: heartOutline },
  { id: 'flag', label: 'Bandeira', category: 'symbols', icon: flagOutline },
  { id: 'medal', label: 'Medalha', category: 'symbols', icon: medalOutline },
  { id: 'trophy', label: 'Troféu', category: 'symbols', icon: trophyOutline },
  { id: 'ribbon', label: 'Fita', category: 'symbols', icon: ribbonOutline },
  { id: 'checkbox', label: 'Check', category: 'symbols', icon: checkboxOutline },
  { id: 'warning', label: 'Atenção', category: 'symbols', icon: warningOutline },
  { id: 'eye', label: 'Olho', category: 'symbols', icon: eyeOutline },
  { id: 'infinite', label: 'Infinito', category: 'symbols', icon: infiniteOutline },
  { id: 'refresh', label: 'Atualizar', category: 'symbols', icon: refreshOutline },
  { id: 'grid', label: 'Grade', category: 'symbols', icon: gridOutline },
  { id: 'basketball', label: 'Esporte', category: 'symbols', icon: basketballOutline },
  { id: 'bar', label: 'Barras', category: 'symbols', icon: barChartOutline },
];

const ICON_MAP = Object.fromEntries(
  CARD_ICON_OPTIONS.map((opt) => [opt.id, opt.icon]),
) as Record<string, string>;

const LABEL_MAP = Object.fromEntries(
  CARD_ICON_OPTIONS.map((opt) => [opt.id, opt.label]),
) as Record<string, string>;

export function resolveCardIcon(icon: string | null | undefined) {
  if (!icon) return null;
  return ICON_MAP[icon] ?? null;
}

export function cardIconLabel(icon: string | null | undefined) {
  if (!icon) return 'Sem ícone';
  return LABEL_MAP[icon] ?? icon;
}

type FaceIconProps = {
  icon: string | null | undefined;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

export function CardFaceIcon({
  icon,
  color,
  className = 'card-face-icon',
  style,
}: FaceIconProps) {
  const src = resolveCardIcon(icon);
  if (!src) return null;
  return (
    <div className={className} style={style} aria-hidden>
      <IonIcon icon={src} style={color ? { color } : undefined} />
    </div>
  );
}

type PickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  accent?: string;
};

export function CardIconPicker({ value, onChange, accent }: PickerProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CardIconCategory | 'all'>('all');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setCategory('all');
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CARD_ICON_OPTIONS.filter((opt) => {
      if (category !== 'all' && opt.category !== category) return false;
      if (!q) return true;
      return (
        opt.label.toLowerCase().includes(q) ||
        opt.id.includes(q) ||
        opt.category.includes(q)
      );
    });
  }, [category, query]);

  const selected = value ? resolveCardIcon(value) : null;

  const pick = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={`card-icon-trigger${value ? ' has-value' : ''}`}
        onClick={() => setOpen(true)}
        style={accent ? { color: accent } : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="card-icon-trigger-preview" aria-hidden>
          {selected ? (
            <IonIcon icon={selected} />
          ) : (
            <IonIcon icon={gridOutline} />
          )}
        </span>
        <span className="card-icon-trigger-copy">
          <strong>{value ? cardIconLabel(value) : 'Escolher ícone'}</strong>
          <small>{value ? 'Toque para trocar' : 'Central na face da carta'}</small>
        </span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              className="sc-icon-sheet-backdrop"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
              }}
              variants={reduce ? undefined : fadeIn}
              initial={reduce ? false : 'hidden'}
              animate="show"
              exit="exit"
            >
              <motion.div
                className="sc-icon-sheet"
                role="dialog"
                aria-modal="true"
                aria-label="Escolher ícone da carta"
                variants={reduce ? undefined : scaleIn}
                initial={reduce ? false : 'hidden'}
                animate="show"
                exit="exit"
              >
                <header className="sc-icon-sheet-head">
                  <div>
                    <p className="sc-icon-sheet-kicker">Carta</p>
                    <h2>Escolher ícone</h2>
                  </div>
                  <button
                    type="button"
                    className="sc-modal-x"
                    aria-label="Fechar"
                    onClick={() => setOpen(false)}
                  >
                    <IonIcon icon={closeOutline} />
                  </button>
                </header>

                <label className="sc-icon-sheet-search">
                  <IonIcon icon={searchOutline} aria-hidden />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar ícone…"
                    autoFocus
                    autoComplete="off"
                  />
                </label>

                <div className="sc-icon-sheet-cats" role="tablist" aria-label="Categorias">
                  {CARD_ICON_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={category === cat.id}
                      className={`sc-icon-sheet-cat${category === cat.id ? ' is-active' : ''}`}
                      onClick={() => setCategory(cat.id)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="sc-icon-sheet-grid" role="listbox" aria-label="Ícones">
                  <button
                    type="button"
                    role="option"
                    aria-selected={!value}
                    className={`sc-icon-sheet-item is-none${!value ? ' is-active' : ''}`}
                    onClick={() => pick(null)}
                  >
                    <span className="sc-icon-sheet-glyph">—</span>
                    <span>Nenhum</span>
                  </button>
                  {filtered.map((opt) => (
                    <motion.button
                      key={opt.id}
                      type="button"
                      role="option"
                      aria-selected={value === opt.id}
                      className={`sc-icon-sheet-item${value === opt.id ? ' is-active' : ''}`}
                      onClick={() => pick(opt.id)}
                      title={opt.label}
                      whileTap={reduce ? undefined : tapScale}
                      style={
                        value === opt.id && accent
                          ? { color: accent, borderColor: accent }
                          : undefined
                      }
                    >
                      <IonIcon icon={opt.icon} />
                      <span>{opt.label}</span>
                    </motion.button>
                  ))}
                </div>

                {!filtered.length ? (
                  <p className="sc-icon-sheet-empty">Nenhum ícone com esse nome.</p>
                ) : null}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        globalThis.document.body,
      )}
    </>
  );
}
