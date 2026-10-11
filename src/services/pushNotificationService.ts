export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface PushAlertPayload {
  id: string;
  shopId: string;
  shopName: string;
  productName: string;
  source: 'product_card' | 'cart_checkout' | 'store_header';
  timestamp: number;
}

const PUSH_ENABLED_STORAGE_KEY = 'odrystudio_push_notifications_enabled';
const BROADCAST_CHANNEL_NAME = 'odrystudio_push_channel';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch {
  // BroadcastChannel not supported in this environment
}

export function getBrowserPushPermission(): PushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PushPermissionState;
}

export function isPushNotificationEnabled(): boolean {
  try {
    const saved = localStorage.getItem(PUSH_ENABLED_STORAGE_KEY);
    if (saved === null) return true;
    return saved === 'true';
  } catch {
    return true;
  }
}

export function setPushNotificationEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PUSH_ENABLED_STORAGE_KEY, String(enabled));
  } catch {
    // ignore storage errors
  }
}

export async function requestBrowserPushPermission(): Promise<PushPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPushNotificationEnabled(true);
    }
    return permission as PushPermissionState;
  } catch {
    return Notification.permission as PushPermissionState;
  }
}

export function playPushAlertChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.setValueAtTime(659.25, now + 0.09); // E5
    osc1.frequency.setValueAtTime(783.99, now + 0.18); // G5
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.008, now + 0.38);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.38);
  } catch {
    // AudioContext may require prior user gesture
  }
}

export async function dispatchBrowserPushNotification(
  payload: PushAlertPayload,
  language: 'sw' | 'en' = 'sw',
  onNavigateToDashboard?: () => void
): Promise<boolean> {
  playPushAlertChime();

  const timeStr = new Date(payload.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const title =
    language === 'sw'
      ? `🚀 Arifa ya Odry Studio: ${payload.productName}`
      : `🚀 Odry Studio Alert: ${payload.productName}`;

  const body =
    language === 'sw'
      ? `Mradi umesasishwa kwenye ${payload.shopName} • Saa ${timeStr}`
      : `Project activity recorded in ${payload.shopName} • ${timeStr}`;

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `odrystudio-alert-${payload.id}`,
          data: { url: window.location.href, shopId: payload.shopId },
        });
        return true;
      }
    }

    const notification = new Notification(title, {
      body,
      icon: '/icon-192.png',
      tag: `odrystudio-alert-${payload.id}`,
    });

    notification.onclick = () => {
      window.focus();
      if (onNavigateToDashboard) {
        onNavigateToDashboard();
      }
      notification.close();
    };

    return true;
  } catch {
    return false;
  }
}

export function broadcastWhatsAppClickPush(payload: PushAlertPayload): void {
  try {
    broadcastChannel?.postMessage({
      type: 'ODRYSTUDIO_PUSH_ALERT',
      payload,
    });
  } catch {
    // ignore broadcast errors
  }
}

export function subscribeToWhatsAppClickPush(
  callback: (payload: PushAlertPayload) => void
): () => void {
  if (!broadcastChannel) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'ODRYSTUDIO_PUSH_ALERT' && event.data?.payload) {
      callback(event.data.payload as PushAlertPayload);
    }
  };
  broadcastChannel.addEventListener('message', handler);
  return () => broadcastChannel?.removeEventListener('message', handler);
}
