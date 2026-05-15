import { Fab } from '@mui/material';
import { IconMessage } from '@tabler/icons-react';
import { useAssistant } from 'src/context/smartpos/AssistantContext';

export default function ChatFAB() {
  const { toggle } = useAssistant();

  return (
    <Fab
      color="primary"
      onClick={toggle}
      sx={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1300,
      }}
      aria-label="AI Assistant"
    >
      <IconMessage size={24} />
    </Fab>
  );
}
