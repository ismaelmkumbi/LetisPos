import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Box,
  Typography, TextField, MenuItem, Chip, IconButton, CircularProgress,
} from '@mui/material';
import { Refresh, Close } from '@mui/icons-material';
import { getLogs } from '../api/hub';
import { brand } from '../theme';

interface Props {
  open: boolean;
  server: string;
  service: string;
  onClose: () => void;
}

export default function LogViewer({ open, server, service, onClose }: Props) {
  const [tail, setTail] = useState(100);
  const [filter, setFilter] = useState('');
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    if (!open) return;
    setLoading(true); setError('');
    try {
      const data = await getLogs(server, service, tail, filter || undefined);
      setLogs(data);
    } catch {
      setError('Failed to fetch logs. Agent may be unreachable.');
    } finally { setLoading(false); }
  }, [open, server, service, tail, filter]);

  useEffect(() => { if (open) fetchLogs(); }, [open, tail, fetchLogs]);

  useEffect(() => {
    let t: ReturnType<typeof setInterval>;
    if (autoRefresh && open) t = setInterval(fetchLogs, 5000);
    return () => { if (t) clearInterval(t); };
  }, [autoRefresh, open, fetchLogs]);

  useEffect(() => { if (bottomRef.current) bottomRef.current.scrollTop = bottomRef.current.scrollHeight; }, [logs]);

  const highlightLogs = (text: string) => {
    const colors: Record<string, string> = {
      error: brand.error.main, warn: brand.warning.main, info: brand.success.main,
    };
    return text.split('\n').map((line, i) => {
      let c: string = brand.neutral[300];
      if (/error|fail|fatal|critical/i.test(line)) c = colors.error;
      else if (/warn|warning/i.test(line)) c = colors.warn;
      else if (/info|success|started|ready/i.test(line)) c = colors.info;
      return (
        <Box key={i} sx={{ fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.68rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', '&:hover': { bgcolor: `${brand.neutral[700]}30` }, px: 0.5 }} style={{ color: c }}>
          {line || ' '}
        </Box>
      );
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { borderRadius: '14px', bgcolor: brand.neutral[800], border: `1px solid ${brand.neutral[700]}`, height: '80vh' } } }}>
      <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          Logs — {service}
          <Chip label={server} size="small" sx={{ height: 22, fontWeight: 600, fontSize: '0.65rem', bgcolor: brand.primary[50], color: brand.primary[700], borderRadius: '6px' }} />
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: brand.neutral[400] }}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Controls */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, alignItems: 'center' }}>
          <TextField select size="small" value={tail} onChange={e => setTail(Number(e.target.value))}
            sx={{ width: 90, '& .MuiOutlinedInput-root': { height: 32, borderRadius: '8px', fontWeight: 600, fontSize: '0.72rem', color: brand.neutral[50], '& fieldset': { borderColor: brand.neutral[600] }, '&:hover fieldset': { borderColor: brand.neutral[400] } }, '& .MuiSelect-icon': { color: brand.neutral[400] } }}>
            {[50, 100, 200, 500, 1000].map(n => <MenuItem key={n} value={n} sx={{ fontSize: '0.75rem' }}>{n} lines</MenuItem>)}
          </TextField>
          <TextField size="small" placeholder="Filter (e.g. ERROR)" value={filter} onChange={e => setFilter(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchLogs(); }}
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { height: 32, borderRadius: '8px', fontWeight: 500, fontSize: '0.72rem', color: brand.neutral[50], '& fieldset': { borderColor: brand.neutral[600] }, '&:hover fieldset': { borderColor: brand.neutral[400] }, '&.Mui-focused fieldset': { borderColor: brand.primary[500] } }, '& .MuiInputBase-input::placeholder': { color: brand.neutral[500], opacity: 1 } }} />
          <IconButton size="small" onClick={fetchLogs} disabled={loading} sx={{ color: brand.neutral[400], border: `1px solid ${brand.neutral[600]}`, borderRadius: '8px' }}>
            {loading ? <CircularProgress size={14} sx={{ color: brand.primary[500] }} /> : <Refresh fontSize="small" />}
          </IconButton>
          <Chip label={autoRefresh ? 'Live' : 'Manual'} size="small" onClick={() => setAutoRefresh(!autoRefresh)}
            sx={{ height: 26, fontWeight: 700, fontSize: '0.65rem', cursor: 'pointer', bgcolor: autoRefresh ? brand.success.light : brand.neutral[700], color: autoRefresh ? brand.success.dark : brand.neutral[300], borderRadius: '8px', border: `1px solid ${autoRefresh ? brand.success.main : brand.neutral[600]}30` }} />
        </Stack>

        {/* Log output */}
        {error ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: brand.error.main, fontWeight: 500 }}>{error}</Typography>
          </Box>
        ) : (
          <Box ref={bottomRef} sx={{ flex: 1, bgcolor: '#0a0f1a', borderRadius: '10px', border: `1px solid ${brand.neutral[700]}`, p: 1.5, overflow: 'auto', fontFamily: "'DM Mono', 'Courier New', monospace" }}>
            {logs ? highlightLogs(logs) : (
              <Typography sx={{ color: brand.neutral[500], fontSize: '0.72rem', textAlign: 'center', mt: 4 }}>{loading ? 'Loading logs...' : 'No log data'}</Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ fontWeight: 600, borderRadius: '10px', textTransform: 'none', color: brand.neutral[400] }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
