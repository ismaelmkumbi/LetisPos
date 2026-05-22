import { useState } from 'react';
import {
  Box, Button, Chip, LinearProgress, Stack, TextField, Typography,
} from '@mui/material';
import type { ServerId } from '../api/hub';
import { getLogs, clearLogs } from '../api/hub';
import { brand } from '../theme';

interface Props {
  server: ServerId;
  svcName: string;
}

export default function ServiceLogViewer({ server, svcName }: Props) {
  const [logs, setLogs] = useState('');
  const [logFilter, setLogFilter] = useState('');
  const [logGrep, setLogGrep] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logTail, setLogTail] = useState(100);

  const fetchLogs = () => {
    setLogLoading(true);
    getLogs(server, svcName, logTail, logFilter || undefined, logGrep)
      .then(setLogs)
      .catch(() => setLogs('Failed to load logs'))
      .finally(() => setLogLoading(false));
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: brand.neutral[400], textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Logs
        </Typography>
        <TextField
          size="small" placeholder="Filter..." value={logFilter}
          onChange={(e) => setLogFilter(e.target.value)}
          sx={{ '& .MuiInputBase-root': { height: 24, fontSize: '0.65rem', bgcolor: brand.neutral[900], borderRadius: '4px' } }}
        />
        <Chip
          label="grep" size="small" variant={logGrep ? 'filled' : 'outlined'}
          onClick={() => setLogGrep(!logGrep)}
          sx={{ height: 20, fontSize: '0.6rem', cursor: 'pointer', borderRadius: '4px' }}
        />
        <TextField
          size="small" type="number" value={logTail}
          onChange={(e) => setLogTail(Number(e.target.value))}
          sx={{ width: 60, '& .MuiInputBase-root': { height: 24, fontSize: '0.65rem', bgcolor: brand.neutral[900], borderRadius: '4px' } }}
        />
        <Button
          size="small" variant="outlined" onClick={fetchLogs}
          sx={{ minWidth: 20, height: 24, p: '0 8px', fontSize: '0.6rem', fontWeight: 700, borderRadius: '4px' }}
        >
          Load
        </Button>
        <Button
          size="small" variant="outlined" color="error"
          onClick={() => { clearLogs(server, svcName).then(() => setLogs('')).catch(() => {}); }}
          sx={{ minWidth: 20, height: 24, p: '0 8px', fontSize: '0.6rem', fontWeight: 700, borderRadius: '4px' }}
        >
          Clear
        </Button>
      </Stack>
      {logLoading ? (
        <LinearProgress sx={{ borderRadius: 2, height: 3 }} />
      ) : logs ? (
        <Box sx={{
          bgcolor: brand.neutral[900], borderRadius: '8px', p: 1.5, maxHeight: 300, overflow: 'auto',
          fontFamily: "'DM Mono', monospace", fontSize: '0.6rem', color: brand.neutral[300],
          whiteSpace: 'pre-wrap', lineHeight: 1.5,
        }}>
          {logs}
        </Box>
      ) : (
        <Typography sx={{ fontSize: '0.65rem', color: brand.neutral[400], textAlign: 'center', py: 2 }}>
          Click "Load" to view logs
        </Typography>
      )}
    </Box>
  );
}
