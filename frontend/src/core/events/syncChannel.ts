export interface BusinessStatusEvent {
  type: 'PAYMENT_STATUS_UPDATE';
  businessId: string;
  paymentStatus: 'normal' | 'warning' | 'locked';
  isPaymentLocked: boolean;
  businessStatus?: string;
  amountDue?: string | number | null;
  reason?: string | null;
}

const CHANNEL_NAME = 'pos_business_status_sync';

let broadcastChannel: BroadcastChannel | null = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  broadcastChannel = null;
}

export const broadcastBusinessStatus = (
  data: Omit<BusinessStatusEvent, 'type'>
) => {
  const event: BusinessStatusEvent = {
    type: 'PAYMENT_STATUS_UPDATE',
    ...data,
  };

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(event);
    } catch (err) {
      console.error('Failed to post to BroadcastChannel:', err);
    }
  }

  // LocalStorage event fallback for cross-window sync
  try {
    localStorage.setItem(
      'pos_last_business_event',
      JSON.stringify({ ...event, _timestamp: Date.now() })
    );
  } catch {
    // Ignore storage quota errors
  }
};

export const subscribeToBusinessStatus = (
  callback: (event: BusinessStatusEvent) => void
) => {
  const handleMessage = (msg: MessageEvent) => {
    if (msg.data && msg.data.type === 'PAYMENT_STATUS_UPDATE') {
      callback(msg.data);
    }
  };

  const handleStorage = (storageEvent: StorageEvent) => {
    if (storageEvent.key === 'pos_last_business_event' && storageEvent.newValue) {
      try {
        const parsed = JSON.parse(storageEvent.newValue);
        if (parsed.type === 'PAYMENT_STATUS_UPDATE') {
          callback(parsed);
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleMessage);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleMessage);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
};
