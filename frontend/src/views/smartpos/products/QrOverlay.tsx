import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Box, Button, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import { IconChecks, IconLink, IconRefresh, IconX } from '@tabler/icons-react';
import {
  createCaptureSession,
  getCaptureSessionPhotos,
  deleteCaptureSession,
  type PhotoInfo,
} from 'src/api/smartpos/captureSession';
import { api, API_BASE_URL } from 'src/api/smartpos/client';

const POLL_INTERVAL_MS = 3_000;

export interface QrOverlayProps {
  onPhotosReceived: (dataUrls: string[]) => void;
  onUseWebcam: () => void;
  onClose: () => void;
}

export default function QrOverlay({ onPhotosReceived, onUseWebcam, onClose }: QrOverlayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<
    'creating' | 'waiting' | 'receiving' | 'downloading' | 'complete' | 'error'
  >('creating');
  const [photoCount, setPhotoCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelled = useRef(false);
  const latestPhotoCount = useRef(0);

  // Keep ref in sync so poll closure never reads a stale count
  latestPhotoCount.current = photoCount;

  // Create session + QR code on mount
  useEffect(() => {
    let createdSessionId: string | null = null;

    (async () => {
      try {
        const resp = await createCaptureSession();
        if (cancelled.current) return;
        createdSessionId = resp.sessionId;
        setSessionId(createdSessionId);

        // The backend's default base-url is http://localhost:5173, which
        // doesn't work from a phone. Rewrite the QR URL to use the same
        // origin the POS terminal is loaded from.
        const correctedQrUrl = rewriteQrUrl(resp.qrUrl);
        setQrUrl(correctedQrUrl);

        // Generate QR as data URL
        const dataUrl = await QRCode.toDataURL(correctedQrUrl, {
          width: 280,
          margin: 1,
          color: { dark: '#000', light: '#fff' },
        });
        if (cancelled.current) return;
        setQrDataUrl(dataUrl);
        setStatus('waiting');
      } catch (err: unknown) {
        if (cancelled.current) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to create session');
      }
    })();

    return () => {
      cancelled.current = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
      if (createdSessionId) deleteCaptureSession(createdSessionId).catch(() => {});
    };
  }, []);

  const fetchPhotos = useCallback(async () => {
    if (!sessionId) return;
    try {
      const resp = await getCaptureSessionPhotos(sessionId);
      return resp;
    } catch {
      return null;
    }
  }, [sessionId]);

  const downloadFullPhotos = useCallback(async (photos: PhotoInfo[], sid: string) => {
    return Promise.all(
      photos.map(async (p: PhotoInfo) => {
        try {
          const res = await api.get<Blob>(
            `/api/v1/ai/capture-sessions/${sid}/photos/${p.index}/full`,
            { responseType: 'blob', timeout: 15_000 },
          );
          return await blobToDataUrl(res.data);
        } catch {
          return p.fullUrl.startsWith('http') ? p.fullUrl : `${API_BASE_URL}${p.fullUrl}`;
        }
      }),
    );
  }, []);

  // Poll for photos
  useEffect(() => {
    // Only poll while waiting or receiving; stop once complete/error
    if (!sessionId || status === 'complete' || status === 'downloading' || status === 'error' || status === 'creating') return;

    let active = true;

    const poll = async () => {
      if (!active || cancelled.current) return;
      const resp = await fetchPhotos();
      if (!active || cancelled.current) return;
      if (!resp) {
        pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }

      setPhotoCount(resp.photoCount);

      if (resp.complete) {
        if (resp.photos.length === 0) {
          setError('Session marked complete but no photos were received. Try again or re-scan the QR code.');
          return;
        }
        setStatus('downloading');
        const dataUrls = await downloadFullPhotos(resp.photos, sessionId);
        if (active && !cancelled.current) {
          setStatus('complete');
          onPhotosReceived(dataUrls);
        }
        return;
      }

      if (resp.photoCount > 0 && resp.photoCount > latestPhotoCount.current) {
        setStatus('receiving');
      }

      pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    pollTimer.current = setTimeout(poll, 500); // first poll sooner

    return () => {
      active = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [sessionId, status, fetchPhotos, downloadFullPhotos, onPhotosReceived]);

  const handleManualRefresh = useCallback(async () => {
    if (!sessionId) return;
    const resp = await fetchPhotos();
    if (!resp) return;
    setPhotoCount(resp.photoCount);
    if (resp.photoCount > 0) setStatus('receiving');
    if (resp.complete) {
      if (resp.photos.length === 0) {
        setError('Session marked complete but no photos were received. Try again or re-scan the QR code.');
        return;
      }
      setStatus('downloading');
      const dataUrls = await downloadFullPhotos(resp.photos, sessionId);
      setStatus('complete');
      onPhotosReceived(dataUrls);
    }
  }, [sessionId, fetchPhotos, downloadFullPhotos, onPhotosReceived]);

  const statusLabel =
    status === 'creating'
      ? 'Creating session…'
      : status === 'waiting'
        ? 'Waiting for phone…'
        : status === 'receiving'
          ? `Receiving photos (${photoCount})…`
          : status === 'downloading'
            ? 'Preparing photos…'
            : status === 'complete'
              ? 'All photos received'
              : 'Error';

  return (
    <Box sx={{ py: 3, px: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Phone Camera
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <IconX size={16} />
        </IconButton>
      </Stack>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Stack alignItems="center" spacing={3}>
        {/* QR Code */}
        <Box
          sx={{
            p: 2,
            borderRadius: '14px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
          }}
        >
          {qrDataUrl ? (
            <Box
              component="img"
              src={qrDataUrl}
              alt="Scan to open camera"
              sx={{ width: 240, height: 240, display: 'block' }}
            />
          ) : (
            <Box
              sx={{
                width: 240,
                height: 240,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress size={40} />
            </Box>
          )}
        </Box>

        {/* Status */}
        <Stack direction="row" spacing={1} alignItems="center">
          {status === 'creating' || status === 'downloading' ? (
            <CircularProgress size={18} />
          ) : status === 'complete' ? (
            <IconChecks size={20} color="#4caf50" />
          ) : status === 'error' ? (
            <IconX size={20} color="#ef4444" />
          ) : (
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: status === 'receiving' ? '#4caf50' : '#f59e0b',
                animation: status === 'waiting' ? 'pulse 1.5s infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.4 },
                },
              }}
            />
          )}
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {statusLabel}
          </Typography>
        </Stack>

        {/* URL to copy */}
        {qrUrl && (
          <Box
            sx={{
              p: 1.5,
              borderRadius: '8px',
              bgcolor: 'action.hover',
              maxWidth: '100%',
              overflow: 'hidden',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '0.6875rem',
                  wordBreak: 'break-all',
                  color: 'text.secondary',
                }}
              >
                {qrUrl}
              </Typography>
              <IconButton
                size="small"
                onClick={() => navigator.clipboard.writeText(qrUrl)}
                sx={{ flexShrink: 0 }}
              >
                <IconLink size={14} />
              </IconButton>
            </Stack>
          </Box>
        )}

        {/* Actions */}
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconRefresh size={14} />}
            onClick={handleManualRefresh}
            disabled={status === 'creating'}
            sx={{ textTransform: 'none', borderRadius: '8px' }}
          >
            Check for photos
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={onUseWebcam}
            sx={{ textTransform: 'none', borderRadius: '8px' }}
          >
            Use this webcam instead
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

/**
 * Replace the origin in the backend-generated QR URL with the frontend's own
 * origin so the link works from a phone/tablet on the same LAN.
 *
 * Example: http://localhost:5173/capture/abc → http://192.168.1.100:5173/capture/abc
 */
function rewriteQrUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
