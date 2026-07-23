import { useIonToast } from '@ionic/react';
import { ApiError } from '../../core/api/http-client';

export function useAppToast() {
  const [present] = useIonToast();

  return {
    success: (message: string) =>
      present({ message, duration: 1800, color: 'success', position: 'top' }),
    error: (error: unknown) => {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Algo deu errado';
      present({ message, duration: 2600, color: 'danger', position: 'top' });
    },
  };
}
