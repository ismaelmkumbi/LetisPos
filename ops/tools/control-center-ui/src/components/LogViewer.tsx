import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Box,
  Typography, TextField, MenuItem, Chip, IconButton, CircularProgress,
} from '@mui/material';
import { Refresh, Close, DeleteSweep, DeleteForever } from '@mui/icons-material';
import type { ServerId } from '../api/hub';
import { getLogs, clearLogs } from '../api/hub';
import { brand } from '../theme';

interface LogEntry {
  time: string; host: string; proc: string; pid: string; message: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
}

function parseLogLine(line: string): LogEntry | null {
  const re = /^(\S+) (\S+) (\S+?)(?:\[(\d+)\])?: (.*)/;
  const m = line.match(re);
  if (!m) return { time: '', host: '', proc: '', pid: '', message: line, level: 'INFO' };

  let level: LogEntry['level'] = 'INFO';
  const msg = m[5];
  if (/ERROR|FATAL|CRITICAL|fail/i.test(msg)) level = 'ERROR';
  else if (/WARN|WARNING/i.test(msg)) level = 'WARN';
  else if (/DEBUG|TRACE/i.test(msg)) level = 'DEBUG';

  const time = m[1].split('T')[1]?.split('+')[0]?.substring(0, 8) || m[1];

  return { time, host: m[2], proc: m[3], pid: m[4] || '', message: msg, level };
}

const LEVEL_COLORS: Record<string, string> = {
  ERROR: '#EF4444', WARN: '#F59E0B', INFO: '#64748B', DEBUG: '#475569',
};
const LEVEL_BG: Record<string, string> = {
  ERROR: '#3b1111', WARN: '#451a03', INFO: '#0f172a', DEBUG: '#0f172a',
};

interface Props {
  open: boolean;
  server: ServerId;
  service: string;
  grep?: boolean;
  onClose: () => void;
}

export default function LogViewer({ open, server, service, grep, onClose }: Props) {
  const [tail, setTail] = useState(100);
  const [filter, setFilter] = useState('');
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    if (!open) return;
    setLoading(true); setError('');
    try {
      const data = await getLogs(server, service, tail, filter || undefined, grep);
      setEntries(data.split('\n').filter(Boolean).map(parseLogLine).filter(Boolean) as LogEntry[]);
    } catch {
      setError('Failed to fetch logs');
    } finally { setLoading(false); }
  }, [open, server, service, tail, filter, grep]);

  useEffect(() => { if (open) fetchLogs(); }, [open, tail, fetchLogs]);

  useEffect(() => {
    let t: ReturnType<typeof setInterval>;
    if (autoRefresh && open) t = setInterval(fetchLogs, 5000);
    return () => { if (t) clearInterval(t); };
  }, [autoRefresh, open, fetchLogs]);

  useEffect(() => { if (bottomRef.current) bottomRef.current.scrollTop = bottomRef.current.scrollHeight; }, [entries]);

  const errorCount = entries.filter((e) => e.level === 'ERROR').length;
  const warnCount = entries.filter((e) => e.level === 'WARN').length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth slotProps={{ paper: { sx: { borderRadius: '14px', bgcolor: brand.neutral[800], border: `1px solid ${brand.neutral[700]}`, height: '85vh' } } }}>
      <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          Logs — {service}
          <Chip label={server} size="small" sx={{ height: 22, fontWeight: 600, fontSize: '0.65rem', bgcolor: brand.primary[50], color: brand.primary[700], borderRadius: '6px' }} />
          {entries.length > 0 && (
            <>
              <Chip label={`${entries.length} lines`} size="small" sx={{ height: 22, fontWeight: 600, fontSize: '0.6rem', bgcolor: brand.neutral[700], color: brand.neutral[300], borderRadius: '6px' }} />
              {errorCount > 0 && <Chip label={`${errorCount} ERR`} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.6rem', bgcolor: LEVEL_BG.ERROR, color: LEVEL_COLORS.ERROR, borderRadius: '6px' }} />}
              {warnCount > 0 && <Chip label={`${warnCount} WRN`} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.6rem', bgcolor: LEVEL_BG.WARN, color: LEVEL_COLORS.WARN, borderRadius: '6px' }} />}
            </>
          )}
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: brand.neutral[400] }}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Controls */}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
          <TextField select size="small" value={tail} onChange={(e) => setTail(Number(e.target.value))}
            sx={{ width: 85, '& .MuiOutlinedInput-root': { height: 32, borderRadius: '8px', fontWeight: 600, fontSize: '0.7rem', color: brand.neutral[50], '& fieldset': { borderColor: brand.neutral[600] }, '&:hover fieldset': { borderColor: brand.neutral[400] } }, '& .MuiSelect-icon': { color: brand.neutral[400] } }}>
            {[50, 100, 200, 500, 1000].map((n) => <MenuItem key={n} value={n} sx={{ fontSize: '0.75rem' }}>{n}</MenuItem>)}
          </TextField>
          <TextField size="small" placeholder="Filter..." value={filter} onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchLogs(); }}
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { height: 32, borderRadius: '8px', fontWeight: 500, fontSize: '0.7rem', color: brand.neutral[50], '& fieldset': { borderColor: brand.neutral[600] }, '&:hover fieldset': { borderColor: brand.neutral[400] }, '&.Mui-focused fieldset': { borderColor: brand.primary[500] } }, '& .MuiInputBase-input::placeholder': { color: brand.neutral[500] } }} />
          <IconButton size="small" onClick={fetchLogs} disabled={loading} sx={{ color: brand.neutral[400], border: `1px solid ${brand.neutral[600]}`, borderRadius: '8px' }}>
            {loading ? <CircularProgress size={14} /> : <Refresh fontSize="small" />}
          </IconButton>
          <IconButton size="small" onClick={() => setEntries([])} sx={{ color: brand.neutral[400], border: `1px solid ${brand.neutral[600]}`, borderRadius: '8px' }}>
            <DeleteSweep fontSize="small" />
          </IconButton>
          <Chip label={autoRefresh ? 'Live' : 'Manual'} size="small" onClick={() => setAutoRefresh(!autoRefresh)}
            sx={{ height: 26, fontWeight: 700, fontSize: '0.6rem', cursor: 'pointer', bgcolor: autoRefresh ? brand.success.light : brand.neutral[700], color: autoRefresh ? brand.success.dark : brand.neutral[300], borderRadius: '8px', border: `1px solid ${autoRefresh ? brand.success.main : brand.neutral[600]}30` }} />
        </Stack>

        {/* Log output */}
        {error ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: brand.error.main }}>{error}</Typography>
          </Box>
        ) : (
          <Box ref={bottomRef} sx={{ flex: 1, bgcolor: '#080d16', borderRadius: '10px', border: `1px solid ${brand.neutral[700]}`, overflow: 'auto' }}>
            {entries.length === 0 ? (
              <Typography sx={{ color: brand.neutral[500], fontSize: '0.72rem', textAlign: 'center', mt: 6 }}>
                {loading ? 'Loading...' : 'No log entries'}
              </Typography>
            ) : (
              entries.map((e, i) => (
                <Box key={i} sx={{
                  display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.6, px: 1.5,
                  fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.66rem',
                  borderBottom: `1px solid ${brand.neutral[700]}20`,
                  bgcolor: i % 2 === 0 ? 'transparent' : `${brand.neutral[800]}40`,
                  '&:hover': { bgcolor: `${brand.neutral[700]}40` },
                }}>
                  <Box sx={{ minWidth: 42, textAlign: 'center', pt: 0.1 }}>
                    <Typography sx={{ fontSize: '0.55rem', fontWeight: 800, color: LEVEL_COLORS[e.level], letterSpacing: '0.03em' }}>
                      {e.level}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: brand.neutral[500], fontSize: '0.6rem', whiteSpace: 'nowrap', minWidth: 70, pt: 0.15 }}>
                    {e.time}
                  </Typography>
                  <Typography sx={{ color: brand.primary[400], fontSize: '0.6rem', whiteSpace: 'nowrap', minWidth: 100, pt: 0.15, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {e.proc}{e.pid ? `[${e.pid}]` : ''}
                  </Typography>
                  <Typography sx={{ color: e.level === 'ERROR' ? brand.error.main : e.level === 'WARN' ? brand.warning.main : brand.neutral[300], fontSize: '0.65rem', lineHeight: 1.5, wordBreak: 'break-all', flex: 1, pt: 0.15 }}>
                    {e.message}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => { if (confirm('Clear logs for ' + service + '?')) { clearLogs(server, service).then(() => setEntries([])).catch(() => {}); } }}
            startIcon={<DeleteSweep fontSize="small" />} size="small"
            sx={{ fontWeight: 600, borderRadius: '10px', textTransform: 'none', color: brand.warning.main, borderColor: `${brand.warning.main}30` }} variant="outlined">
            Clear Service
          </Button>
          <Button onClick={() => { if (confirm('DELETE ALL journald logs from server? This cannot be undone.')) { clearLogs(server, service).then(() => setEntries([])).catch(() => {}); } }}
            startIcon={<DeleteForever fontSize="small" />} size="small"
            sx={{ fontWeight: 600, borderRadius: '10px', textTransform: 'none', color: brand.error.main, borderColor: `${brand.error.main}30` }} variant="outlined">
            Clear All Logs
          </Button>
        </Stack>
        <Button onClick={onClose} sx={{ fontWeight: 600, borderRadius: '10px', textTransform: 'none', color: brand.neutral[400] }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
