import { useState } from 'react';
import { Box, Button, Collapse, Typography } from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import type { ServiceInfo, ServerId } from '../api/hub';
import { serviceAction } from '../api/hub';
import { brand } from '../theme';

interface Props {
  server: ServerId;
  services: ServiceInfo[];
}

export default function SystemServices({ server, services }: Props) {
  const [show, setShow] = useState(false);
  const systemUnits = services
    .filter((s) => s.name?.endsWith('.service'))
    .filter((s) => !s.name.includes('\\x2d') && !s.name.includes('/'))
    .slice(0, 30);

  return (
    <Box sx={{ mt: 1 }}>
      <Button
        onClick={() => setShow(!show)}
        endIcon={show ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.65rem', color: brand.neutral[400], p: 0.25, '&:hover': { color: brand.neutral[50] } }}
      >
        System Services ({systemUnits.length} units)
      </Button>
      <Collapse in={show}>
        {systemUnits.length === 0 ? (
          <Typography sx={{ color: brand.neutral[500], fontSize: '0.62rem', mt: 0.5 }}>
            No systemd units found
          </Typography>
        ) : (
          <Box sx={{ mt: 0.5, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.25, maxHeight: 180, overflow: 'auto' }}>
            {systemUnits.map((svc) => {
              const up = svc.status === 'active' || svc.status === 'running';
              const name = svc.name.replace('.service', '').replace(/\\x[0-9a-f]{2}/gi, '').substring(0, 25);
              return (
                <Box
                  key={svc.name}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.15, px: 0.5, borderRadius: '4px', '&:hover': { bgcolor: `${brand.neutral[700]}20` } }}
                >
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: up ? brand.success.main : brand.error.main, flexShrink: 0 }} />
                  <Typography variant="caption" noWrap sx={{ flex: 1, fontSize: '0.58rem', color: brand.neutral[300] }}>
                    {name}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => { serviceAction(server, svc.name, 'restart').catch(() => {}); }}
                    sx={{ minWidth: 16, height: 16, p: 0, fontSize: '0.5rem', fontWeight: 700, color: brand.warning.main, borderColor: `${brand.warning.main}20`, borderRadius: '3px', lineHeight: 1 }}
                    variant="outlined"
                  >
                    ↻
                  </Button>
                </Box>
              );
            })}
          </Box>
        )}
      </Collapse>
    </Box>
  );
}
