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
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography sx={{ color: brand.neutral[500], fontSize: '0.7rem', fontWeight: 500 }}>
          No backend services found
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
        <Typography sx={{ fontWeight: 800, color: brand.neutral[50], fontSize: 12 }}>
          Backend Services
        </Typography>
        <TextField
          select size="small" value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              height: 24, borderRadius: '6px', fontWeight: 600, fontSize: '0.62rem', color: brand.neutral[50],
              '& fieldset': { borderColor: brand.neutral[600] },
              '&:hover fieldset': { borderColor: brand.neutral[400] },
              '&.Mui-focused fieldset': { borderColor: brand.primary[500] },
            },
            '& .MuiSelect-icon': { color: brand.neutral[400], fontSize: 16 },
          }}
        >
          {categories.map((c) => <MenuItem key={c} value={c} sx={{ fontSize: '0.65rem' }}>{c}</MenuItem>)}
        </TextField>
      </Stack>

      <TableContainer sx={{ mb: 0 }}>
        <Table size="small" sx={{ '& .MuiTableCell-root': { borderColor: `${brand.neutral[700]}60`, py: 0.35, px: 0.75 } }}>
          <TableHead>
            <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 700, fontSize: '0.58rem', color: brand.neutral[400], textTransform: 'uppercase', letterSpacing: '0.04em', bgcolor: `${brand.neutral[900]}60` } }}>
              <TableCell>Service</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">CPU</TableCell>
              <TableCell align="right">RAM</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center" sx={{ width: 40 }}>↻</TableCell>
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
                  '&:hover': { bgcolor: `${brand.neutral[700]}40` },
                  '& .MuiTableCell-root': { fontSize: '0.65rem', color: brand.neutral[50] },
                }}
              >
                <TableCell sx={{ fontWeight: 600 }}>{svc.name}</TableCell>
                <TableCell>
                  <Chip
                    label={svc.category}
                    size="small"
                    sx={{
                      height: 16, fontWeight: 600, fontSize: '0.55rem',
                      bgcolor: `${CATEGORY_COLORS[svc.category] || brand.primary[500]}20`,
                      color: CATEGORY_COLORS[svc.category] || brand.primary[500],
                      borderRadius: '4px',
                    }}
                  />
                </TableCell>
                <TableCell align="right" sx={{
                  fontFamily: "'DM Mono', monospace",
                  color: (svc.cpuPercent ?? 0) > 50 ? brand.error.main : (svc.cpuPercent ?? 0) > 20 ? brand.warning.main : brand.neutral[50],
                }}>
                  {(svc.cpuPercent ?? 0).toFixed(0)}%
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: "'DM Mono', monospace", color: brand.neutral[400] }}>
                  {((svc.memUsedBytes ?? 0) / 1048576).toFixed(0)}M
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Box sx={{
                      width: 5, height: 5, borderRadius: '50%',
                      bgcolor: svc.status === 'UP' ? brand.success.main : brand.error.main,
                      boxShadow: svc.status === 'UP' ? `0 0 4px ${brand.success.main}80` : 'none',
                    }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: svc.status === 'UP' ? brand.success.main : brand.error.main, fontSize: '0.6rem' }}>
                      {svc.status}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small" variant="outlined"
                    onClick={(e) => { e.stopPropagation(); serviceAction(server, svc.name.toLowerCase().replace(' ', '-'), 'restart').catch(() => {}); }}
                    sx={{ minWidth: 22, height: 20, p: 0, fontSize: '0.55rem', fontWeight: 700, color: brand.warning.main, borderColor: `${brand.warning.main}40`, borderRadius: '4px', '&:hover': { borderColor: brand.warning.main, bgcolor: `${brand.warning.main}15` } }}
                  >
                    ↻
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
