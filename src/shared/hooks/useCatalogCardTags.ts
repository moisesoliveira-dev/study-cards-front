import { useCallback, useEffect, useState } from 'react';
import { cardTagsFacade } from '../../modules/cards/facades/card-tags.facade';
import type { CardTag } from '../../modules/cards/types/card-tag.types';

/** Carrega o catálogo global de tags (Cadastros → Tags). */
export function useCatalogCardTags() {
  const [tags, setTags] = useState<CardTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await cardTagsFacade.list();
      setTags(list);
    } catch (err) {
      setError(err);
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tags, loading, error, reload };
}
