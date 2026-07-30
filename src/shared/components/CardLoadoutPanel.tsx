import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { IonIcon } from '@ionic/react';
import {
  closeOutline,
  colorPaletteOutline,
  searchOutline,
} from 'ionicons/icons';
import { Link } from 'react-router-dom';
import type { CardLevel } from '../../modules/cards/types/card-level.types';
import { CARD_ACCENT_COLORS } from '../../modules/cards/types/card.types';
import { CatalogColorPicker } from './CatalogColorPicker';
import { useCatalogColors } from '../hooks/useCatalogColors';
import { fadeIn, scaleIn } from '../motion';

type Tab = 'cor' | 'nivel';

type Props = {
  color: string | null;
  onColor: (color: string) => void;
  levelId: string | null;
  onLevelId: (levelId: string | null) => void;
  levels: CardLevel[];
  levelsLoading?: boolean;
  /** Optional class for the trigger button wrapper. */
  className?: string;
  style?: CSSProperties;
};

export function CardLoadoutPanel({
  color,
  onColor,
  levelId,
  onLevelId,
  levels,
  levelsLoading = false,
  className = '',
  style,
}: Props) {
  const reduce = useReducedMotion();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('cor');
  const [levelQuery, setLevelQuery] = useState('');
  const {
    colors: catalogColors,
    loading: colorsLoading,
  } = useCatalogColors();

  const currentColor = (
    color?.trim() ||
    catalogColors[0]?.hex ||
    CARD_ACCENT_COLORS[0]
  ).toUpperCase();

  const selectedLevel = levelId
    ? levels.find((l) => l.id === levelId) ?? null
    : null;

  const filteredLevels = useMemo(() => {
    const q = levelQuery.trim().toLocaleLowerCase('pt-BR');
    if (!q) return levels;
    return levels.filter((level) => {
      const name = level.name.toLocaleLowerCase('pt-BR');
      const desc = (level.description ?? '').toLocaleLowerCase('pt-BR');
      return name.includes(q) || desc.includes(q);
    });
  }, [levels, levelQuery]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`sc-loadout${className ? ` ${className}` : ''}`}
      style={style}
    >
      <button
        type="button"
        className={`sc-loadout-trigger${open ? ' is-open' : ''}`}
        aria-label="Aparência da carta"
        aria-expanded={open}
        aria-controls={panelId}
        title="Aparência"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <IonIcon icon={colorPaletteOutline} />
        <span
          className="sc-loadout-trigger-orb"
          style={{ background: currentColor }}
          aria-hidden
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              className="sc-loadout-backdrop"
              variants={reduce ? undefined : fadeIn}
              initial={reduce ? false : 'hidden'}
              animate="show"
              exit="exit"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
              }}
            >
              <motion.div
                id={panelId}
                role="dialog"
                aria-modal="true"
                aria-label="Aparência da carta"
                className="sc-loadout-panel"
                variants={reduce ? undefined : scaleIn}
                initial={reduce ? false : 'hidden'}
                animate="show"
                exit="exit"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <header className="sc-loadout-head">
                  <h3>Aparência</h3>
                  <button
                    type="button"
                    className="sc-loadout-close"
                    aria-label="Fechar"
                    onClick={() => setOpen(false)}
                  >
                    <IonIcon icon={closeOutline} />
                  </button>
                </header>

                <div className="sc-loadout-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'cor'}
                    className={tab === 'cor' ? 'active' : ''}
                    onClick={() => setTab('cor')}
                  >
                    Cor
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'nivel'}
                    className={tab === 'nivel' ? 'active' : ''}
                    onClick={() => setTab('nivel')}
                  >
                    Nível
                  </button>
                </div>

                {tab === 'cor' ? (
                  <div className="sc-loadout-body" role="tabpanel">
                    <div className="sc-loadout-section">
                      <div className="sc-loadout-section-head">
                        <span>Cor</span>
                        <Link
                          to="/cadastros/cores"
                          className="sc-loadout-manage"
                        >
                          Gerenciar
                        </Link>
                      </div>
                      <div className="sc-loadout-color-chosen">
                        <span
                          className="sc-loadout-preview-orb"
                          style={{ background: currentColor }}
                          title={currentColor}
                        />
                        <span className="sc-loadout-hex-label">{currentColor}</span>
                      </div>
                      <CatalogColorPicker
                        colors={catalogColors}
                        loading={colorsLoading}
                        value={color}
                        onChange={onColor}
                      />
                      <p className="sc-loadout-hint">
                        Novas cores só em Cadastros → Cores.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="sc-loadout-body" role="tabpanel">
                    <div className="sc-loadout-section">
                      <div className="sc-loadout-section-head">
                        <span>Nível</span>
                        <Link
                          to="/cadastros/niveis"
                          className="sc-loadout-manage"
                        >
                          Gerenciar
                        </Link>
                      </div>

                      {selectedLevel ? (
                        <div className="sc-loadout-level-chosen">
                          <div className="sc-loadout-level-chosen-copy">
                            <strong>{selectedLevel.name}</strong>
                            {selectedLevel.description ? (
                              <span>{selectedLevel.description}</span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="sc-btn sc-loadout-mini-btn"
                            onClick={() => onLevelId(null)}
                          >
                            Limpar
                          </button>
                        </div>
                      ) : levelId ? (
                        <div className="sc-loadout-level-chosen">
                          <div className="sc-loadout-level-chosen-copy">
                            <strong>Nível não encontrado</strong>
                            <span>
                              Esse nível pode ter sido removido. Escolha outro
                              abaixo.
                            </span>
                          </div>
                          <button
                            type="button"
                            className="sc-btn sc-loadout-mini-btn"
                            onClick={() => onLevelId(null)}
                          >
                            Limpar
                          </button>
                        </div>
                      ) : null}

                      {loadingGate(levelsLoading, levels.length) ? (
                        <p className="sc-loadout-empty">Carregando níveis…</p>
                      ) : !levels.length ? (
                        <p className="sc-loadout-empty">
                          Nenhum nível — cadastre em{' '}
                          <Link to="/cadastros/niveis">Cadastros → Níveis</Link>.
                        </p>
                      ) : (
                        <>
                          <div className="sc-loadout-level-search">
                            <IonIcon icon={searchOutline} aria-hidden />
                            <input
                              type="search"
                              value={levelQuery}
                              placeholder="Buscar nível…"
                              aria-label="Buscar nível"
                              onChange={(e) => setLevelQuery(e.target.value)}
                            />
                          </div>
                          <div className="sc-loadout-level-grid" role="listbox">
                            {filteredLevels.map((level) => {
                              const active = levelId === level.id;
                              return (
                                <button
                                  key={level.id}
                                  type="button"
                                  role="option"
                                  aria-selected={active}
                                  className={`sc-loadout-level-slot${active ? ' is-active' : ''}`}
                                  title={level.description ?? level.name}
                                  onClick={() => onLevelId(level.id)}
                                >
                                  <strong>{level.name}</strong>
                                  {level.description ? (
                                    <span>{level.description}</span>
                                  ) : null}
                                </button>
                              );
                            })}
                            {!filteredLevels.length ? (
                              <p className="sc-loadout-empty">
                                Nenhum nível encontrado.
                              </p>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        globalThis.document.body,
      )}
    </div>
  );
}

function loadingGate(loading: boolean, count: number) {
  return loading && !count;
}
