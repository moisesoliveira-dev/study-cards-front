import { cardLevelsApi } from '../api/card-levels.api';

export const cardLevelsFacade = {
  list: cardLevelsApi.list,
  create: cardLevelsApi.create,
  update: cardLevelsApi.update,
  delete: cardLevelsApi.delete,
};
