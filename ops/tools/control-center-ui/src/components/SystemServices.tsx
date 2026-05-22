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
    .slice(0, 40);

  return (
    <Box sx={{ mt: 2 }}>
      <Button
        onClick={() => setShow(!show)}
        endIcon={show ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', color: brand.neutral[400], '&:hover': { color: brand.neutral[50] } }}
      >
        System Services ({systemUnits.length} units)
      </Button>
      <Collapse in={show}>
        {systemUnits.length === 0 ? (
          <Typography sx={{ color: brand.neutral[500], fontSize: '0.72rem', mt: 1 }}>
            No systemd units found
          </Typography>
        ) : (
          <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, maxHeight: 300, overflow: 'auto' }}>
            {systemUnits.map((svc) => {
              const up = svc.status === 'active' || svc.status === 'running';
              const name = svc.name.replace('.service', '').replace(/\\x[0-9a-f]{2}/gi, '').substring(0, 35);
              return (
                <Box
                  key={svc.name}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.4, px: 1, borderRadius: '6px', '&:hover': { bgcolor: `${brand.neutral[700]}30` } }}
                >
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: up ? brand.success.main : brand.error.main, flexShrink: 0 }} />
                  <Typography variant="caption" noWrap sx={{ flex: 1, fontSize: '0.68rem', color: brand.neutral[300] }}>
                    {name}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => { serviceAction(server, svc.name, 'restart').catch(() => {}); }}
                    sx={{ minWidth: 20, height: 18, p: 0, fontSize: '0.55rem', fontWeight: 700, color: brand.warning.main, borderColor: `${brand.warning.main}30`, borderRadius: '4px' }}
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
