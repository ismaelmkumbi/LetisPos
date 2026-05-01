/**
 * Global offline status banner — shown when the browser reports no network.
 * Pair with the offline-sync queue (POS terminal saves locally and uploads
 * via /api/v1/offline/sync once `online` fires).
 *
 * Usage: drop <OfflineBanner /> once near the root layout.
 */
import { useEffect, useState } from 'react';
import { Alert, Slide } from '@mui/material';
import { IconCloudOff } from '@tabler/icons-react';

/** Reactive online/offline flag. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export default function OfflineBanner() {
  const online = useOnlineStatus();
  return (
    <Slide in={!online} direction="down" mountOnEnter unmountOnExit>
      <Alert
        icon={<IconCloudOff size={18} />}
        severity="warning"
        sx={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1400,
          borderRadius: 0, justifyContent: 'center',
        }}
      >
        You're offline — POS sales are being queued locally and will sync when connectivity returns.
      </Alert>
    </Slide>
  );
}
