import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import axios from 'axios';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { IconCamera, IconCheck, IconChecks, IconX } from '@tabler/icons-react';
import { API_BASE_URL } from 'src/api/smartpos/client';

const MAX_PHOTOS = 20;
const publicCaptureApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  withCredentials: false,
});

export default function CameraPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captures, setCaptures] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setCameraError(msg);
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, [startCamera, stopStream]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    if (captures.length >= MAX_PHOTOS) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCaptures((prev) => [...prev, dataUrl]);
  }, [cameraReady, captures.length]);

  const removeCapture = (idx: number) => {
    setCaptures((prev) => prev.filter((_, i) => i !== idx));
  };

  const flipCamera = () => {
    setCameraReady(false);
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  };

  const uploadErrorMessage = (err: unknown, photoNumber: number): string => {
    if (err && typeof err === 'object' && 'response' in err) {
      const res = (err as { response?: { status?: number; data?: { error?: string; detail?: string; message?: string } } }).response;
      const detail = res?.data?.error || res?.data?.detail || res?.data?.message;
      if (detail) return detail;
      if (res?.status === 401 || res?.status === 403) {
        return 'This capture link is not allowed to upload. Refresh the QR code on the POS and scan again.';
      }
      if (res?.status === 410) {
        return 'This capture session expired. Refresh the QR code on the POS and scan again.';
      }
    }
    return `Failed to upload photo ${photoNumber}. Check your connection and try again.`;
  };

  const handleDone = async () => {
    if (captures.length === 0 || !sessionId) return;
    setUploading(true);
    setError(null);
    setUploaded(0);

    for (let i = 0; i < captures.length; i++) {
      try {
        const blob = dataUrlToBlob(captures[i]);
        const form = new FormData();
        form.append('photo', blob, `photo-${i}.jpg`);
        await publicCaptureApi.post(`/api/v1/ai/capture-sessions/${sessionId}/photos`, form);
        setUploaded((prev) => prev + 1);
      } catch (err) {
        setError(uploadErrorMessage(err, i + 1));
        setUploading(false);
        return;
      }
    }

    try {
      await publicCaptureApi.post(`/api/v1/ai/capture-sessions/${sessionId}/complete`);
    } catch {
      // complete is best-effort — photos are already uploaded
    }

    setUploading(false);
    setDone(true);
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {done ? (
        /* ── Success state ── */
        <Stack spacing={3} alignItems="center" sx={{ px: 3, py: 6, color: '#fff' }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'rgba(76,175,80,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconChecks size={40} color="#4caf50" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center' }}>
            Photos sent
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
            You can close this page
          </Typography>
        </Stack>
      ) : (
        /* ── Camera UI ── */
        <Box sx={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', height: '100dvh' }}>
          {/* Viewfinder */}
          <Box
            sx={{
              flex: 1,
              position: 'relative',
              bgcolor: '#111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {cameraError ? (
              <Stack spacing={2} alignItems="center" sx={{ px: 3 }}>
                <Typography color="error" variant="body2" textAlign="center">
                  {cameraError}
                </Typography>
                <Button variant="outlined" onClick={startCamera} sx={{ color: '#fff', borderColor: '#fff' }}>
                  Retry
                </Button>
              </Stack>
            ) : (
              <Box
                component="video"
                ref={videoRef}
                playsInline
                muted
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: cameraReady ? 'block' : 'none',
                }}
              />
            )}
            {!cameraReady && !cameraError && (
              <CircularProgress sx={{ color: 'rgba(255,255,255,0.5)' }} />
            )}
          </Box>

          {/* Controls bar */}
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="center"
            sx={{ py: 2, px: 2, bgcolor: '#000' }}
          >
            <IconButton onClick={flipCamera} sx={{ color: '#fff' }}>
              <IconCamera size={20} />
            </IconButton>
            <IconButton
              onClick={capture}
              disabled={!cameraReady || captures.length >= MAX_PHOTOS}
              sx={{
                width: 64,
                height: 64,
                border: '3px solid #fff',
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                '&:disabled': { opacity: 0.3, borderColor: '#666' },
              }}
            />
            <Box sx={{ width: 40 }} />
          </Stack>

          {/* Thumbnail strip + done */}
          <Box sx={{ bgcolor: '#111', px: 2, pb: 4, pt: 1 }}>
            {captures.length > 0 && (
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                  {captures.map((src, i) => (
                    <Box key={i} sx={{ position: 'relative', flexShrink: 0 }}>
                      <Box
                        component="img"
                        src={src}
                        alt={`Photo ${i + 1}`}
                        sx={{
                          width: 56,
                          height: 56,
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '2px solid rgba(255,255,255,0.2)',
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => removeCapture(i)}
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          width: 22,
                          height: 22,
                          bgcolor: '#ef4444',
                          color: '#fff',
                          '&:hover': { bgcolor: '#dc2626' },
                        }}
                      >
                        <IconX size={12} />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>

                {uploading && (
                  <Box sx={{ width: '100%' }}>
                    <LinearProgress
                      variant="determinate"
                      value={(uploaded / captures.length) * 100}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                      Sending {uploaded} of {captures.length}
                    </Typography>
                  </Box>
                )}

                {error && (
                  <Typography variant="caption" color="error">
                    {error}
                  </Typography>
                )}

                <Button
                  fullWidth
                  variant="contained"
                  disabled={uploading}
                  onClick={handleDone}
                  startIcon={uploading ? <CircularProgress size={16} /> : <IconCheck size={18} />}
                  sx={{
                    bgcolor: '#4caf50',
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: '10px',
                    py: 1.25,
                    '&:hover': { bgcolor: '#43a047' },
                  }}
                >
                  {uploading ? 'Sending…' : `Done — send ${captures.length} photo${captures.length !== 1 ? 's' : ''}`}
                </Button>
              </Stack>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
