import { useState } from 'react';
import {
  Box, Button, Chip, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography, MenuItem,
} from '@mui/material';
import type { BackendService, ServerId } from '../api/hub';
import { serviceAction } from '../api/hub';
import { brand } from '../theme';

const CATEGORY_COLORS: Record<string, string> = {
  Core: brand.info.main, Catalog: brand.primary[500], Inventory: brand.warning.main,
  Sales: brand.success.main, Finance: brand.purple.main, Insight: '#06b6d4',
  People: '#f97316', Intelligence: '#ec4899', Platform: brand.neutral[400],
};

interface Props {
  server: ServerId;
  services: BackendService[];
  onSelect: (svc: BackendService) => void;
}

export default function ServicesTable({ server, services, onSelect }: Props) {
  const [filter, setFilter] = useState('All');
  const categories = ['All', ...new Set(services.map((s) => s.category))];
  const filtered = filter === 'All' ? services : services.filter((s) => s.category === filter);

  if (services.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography sx={{ color: brand.neutral[500], fontSize: '0.8rem', fontWeight: 500 }}>
          No backend services found
        </Typography>
        <Typography sx={{ color: brand.neutral[600], fontSize: '0.7rem', mt: 0.5 }}>
          Services will appear here once the agent reports them
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, color: brand.neutral[50], fontSize: 15 }}>
          Backend Services
        </Typography>
        <TextField
          select size="small" value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              height: 30, borderRadius: '8px', fontWeight: 600, fontSize: '0.7rem', color: brand.neutral[50],
              '& fieldset': { borderColor: brand.neutral[600] },
              '&:hover fieldset': { borderColor: brand.neutral[400] },
              '&.Mui-focused fieldset': { borderColor: brand.primary[500] },
            },
            '& .MuiSelect-icon': { color: brand.neutral[400] },
          }}
        >
          {categories.map((c) => <MenuItem key={c} value={c} sx={{ fontSize: '0.75rem' }}>{c}</MenuItem>)}
        </TextField>
      </Stack>

      <TableContainer sx={{ mb: 0 }}>
        <Table size="small" sx={{ '& .MuiTableCell-root': { borderColor: brand.neutral[700], py: 0.75, px: 1.5 } }}>
          <TableHead>
            <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 700, fontSize: '0.7rem', color: brand.neutral[400], textTransform: 'uppercase', letterSpacing: '0.04em', bgcolor: brand.neutral[900] } }}>
              <TableCell>Service</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Port</TableCell>
              <TableCell align="right">CPU</TableCell>
              <TableCell align="right">RAM</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>PID</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((svc) => (
              <TableRow
                key={svc.name}
                hover
                onClick={() => onSelect(svc)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { bgcolor: `${brand.neutral[700]}50` },
                  '& .MuiTableCell-root': { fontSize: '0.75rem', color: brand.neutral[50] },
                }}
              >
                <TableCell sx={{ fontWeight: 600 }}>{svc.name}</TableCell>
                <TableCell>
                  <Chip
                    label={svc.category}
                    size="small"
                    sx={{
                      height: 20, fontWeight: 600, fontSize: '0.6rem',
                      bgcolor: `${CATEGORY_COLORS[svc.category] || brand.primary[500]}20`,
                      color: CATEGORY_COLORS[svc.category] || brand.primary[500],
                      borderRadius: '6px',
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.75rem', color: brand.neutral[400] }}>
                  :{svc.port}
                </TableCell>
                <TableCell align="right" sx={{
                  fontFamily: "'DM Mono', monospace",
                  color: (svc.cpuPercent ?? 0) > 50 ? brand.error.main : (svc.cpuPercent ?? 0) > 20 ? brand.warning.main : brand.neutral[50],
                }}>
                  {(svc.cpuPercent ?? 0).toFixed(1)}%
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: "'DM Mono', monospace", color: brand.neutral[400] }}>
                  {((svc.memUsedBytes ?? 0) / 1048576).toFixed(0)} MB
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <Box sx={{
                      width: 7, height: 7, borderRadius: '50%',
                      bgcolor: svc.status === 'UP' ? brand.success.main : brand.error.main,
                      boxShadow: svc.status === 'UP' ? `0 0 6px ${brand.success.main}80` : 'none',
                    }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: svc.status === 'UP' ? brand.success.main : brand.error.main, fontSize: '0.7rem' }}>
                      {svc.status}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontFamily: "'DM Mono', monospace", color: brand.neutral[400] }}>
                  {svc.pid ?? '—'}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                    <Button
                      size="small" variant="outlined"
                      onClick={(e) => { e.stopPropagation(); serviceAction(server, svc.name.toLowerCase().replace(' ', '-'), 'restart').catch(() => {}); }}
                      sx={{ minWidth: 28, height: 26, p: 0, fontSize: '0.6rem', fontWeight: 700, color: brand.warning.main, borderColor: `${brand.warning.main}40`, borderRadius: '6px', '&:hover': { borderColor: brand.warning.main, bgcolor: `${brand.warning.main}15` } }}
                    >
                      ↻
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
