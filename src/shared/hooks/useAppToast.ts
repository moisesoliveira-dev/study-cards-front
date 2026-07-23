import { useIonToast } from '@ionic/react';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  closeOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { ApiError } from '../../core/api/http-client';

function resolveMessage(input: unknown, fallback = 'Algo deu errado'): string {
  if (typeof input === 'string' && input.trim()) return input.trim();
  if (input instanceof ApiError || input instanceof Error) {
    return input.message || fallback;
  }
  return fallback;
}

type ToastKind = 'ok' | 'err' | 'info';

export function useAppToast() {
  const [present] = useIonToast();

  const show = (kind: ToastKind, message: string, duration: number) => {
    const icon =
      kind === 'ok'
        ? checkmarkCircleOutline
        : kind === 'err'
          ? alertCircleOutline
          : informationCircleOutline;

    return present({
      message,
      duration,
      position: 'top',
      cssClass: `sc-toast sc-toast--${kind}`,
      icon,
      swipeGesture: 'vertical',
      buttons: [
        {
          icon: closeOutline,
          role: 'cancel',
          htmlAttributes: { 'aria-label': 'Fechar' },
        },
      ],
    });
  };

  return {
    success: (message: string) => show('ok', resolveMessage(message), 2200),
    info: (message: string) => show('info', resolveMessage(message), 2400),
    error: (error: unknown) => show('err', resolveMessage(error), 3400),
  };
}
