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
      <Stack direction="row" spacing={0.5} sx={{ mb: 0.75, alignItems: 'center' }}>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: brand.neutral[400], textTransform: 'uppercase', letterSpacing: '0.04em', mr: 0.5 }}>
          Logs
        </Typography>
        <TextField
          size="small" placeholder="Filter..." value={logFilter}
          onChange={(e) => setLogFilter(e.target.value)}
          sx={{ flex: 1, '& .MuiInputBase-root': { height: 22, fontSize: '0.6rem', bgcolor: brand.neutral[900], borderRadius: '4px' } }}
        />
        <Chip
          label="grep" size="small" variant={logGrep ? 'filled' : 'outlined'}
          onClick={() => setLogGrep(!logGrep)}
          sx={{ height: 18, fontSize: '0.55rem', cursor: 'pointer', borderRadius: '4px' }}
        />
        <TextField
          size="small" type="number" value={logTail}
          onChange={(e) => setLogTail(Number(e.target.value))}
          sx={{ width: 48, '& .MuiInputBase-root': { height: 22, fontSize: '0.6rem', bgcolor: brand.neutral[900], borderRadius: '4px' } }}
        />
        <Button
          size="small" variant="outlined" onClick={fetchLogs}
          sx={{ minWidth: 18, height: 22, p: '0 6px', fontSize: '0.55rem', fontWeight: 700, borderRadius: '4px' }}
        >
          Load
        </Button>
        <Button
          size="small" variant="outlined" color="error"
          onClick={() => { clearLogs(server, svcName).then(() => setLogs('')).catch(() => {}); }}
          sx={{ minWidth: 18, height: 22, p: '0 6px', fontSize: '0.55rem', fontWeight: 700, borderRadius: '4px' }}
        >
          Clear
        </Button>
      </Stack>
      {logLoading ? (
        <LinearProgress sx={{ borderRadius: 1.5, height: 2 }} />
      ) : logs ? (
        <Box sx={{
          bgcolor: brand.neutral[900], borderRadius: '6px', p: 1, maxHeight: 200, overflow: 'auto',
          fontFamily: "'DM Mono', monospace", fontSize: '0.55rem', color: brand.neutral[300],
          whiteSpace: 'pre-wrap', lineHeight: 1.4,
        }}>
          {logs}
        </Box>
      ) : (
        <Typography sx={{ fontSize: '0.6rem', color: brand.neutral[400], textAlign: 'center', py: 1 }}>
          Click "Load" to view logs
        </Typography>
      )}
    </Box>
  );
}
