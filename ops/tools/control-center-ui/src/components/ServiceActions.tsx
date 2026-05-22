import { Stack, Button } from '@mui/material';
import type { ServerId } from '../api/hub';
import { serviceAction } from '../api/hub';

interface Props {
  server: ServerId;
  svcName: string;
}

export default function ServiceActions({ server, svcName }: Props) {
  const doAction = (action: string) => {
    serviceAction(server, svcName, action).catch(() => {});
  };

  return (
    <Stack direction="row" spacing={1}>
      <Button
        size="small" variant="outlined" color="success"
        onClick={() => doAction('start')}
        sx={{ fontWeight: 700, borderRadius: '6px', fontSize: '0.7rem', textTransform: 'none' }}
      >
        ▶ Start
      </Button>
      <Button
        size="small" variant="outlined" color="error"
        onClick={() => doAction('stop')}
        sx={{ fontWeight: 700, borderRadius: '6px', fontSize: '0.7rem', textTransform: 'none' }}
      >
        ■ Stop
      </Button>
      <Button
        size="small" variant="outlined" color="warning"
        onClick={() => doAction('restart')}
        sx={{ fontWeight: 700, borderRadius: '6px', fontSize: '0.7rem', textTransform: 'none' }}
      >
        ↻ Restart
      </Button>
    </Stack>
  );
}
