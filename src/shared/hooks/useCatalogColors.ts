import { useCallback, useEffect, useState } from 'react';
import { colorsFacade } from '../../modules/colors/facades/colors.facade';
import type { CatalogColor } from '../../modules/colors/types/color.types';

/** Carrega o catálogo global de cores (Cadastros → Cores). */
export function useCatalogColors() {
  const [colors, setColors] = useState<CatalogColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await colorsFacade.list();
      setColors(list);
    } catch (err) {
      setError(err);
      setColors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { colors, loading, error, reload };
}
