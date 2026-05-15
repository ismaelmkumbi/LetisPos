import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import { useAssistant } from 'src/context/smartpos/AssistantContext';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

export default function ChatOverlay() {
  const { open, toggle, streaming, send, stop, clearMessages } = useAssistant();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={toggle}
      slotProps={{ backdrop: { invisible: true } }}
      sx={{
        '& .MuiDrawer-paper': {
          width: isMobile ? '100%' : 400,
          height: '100%',
          zIndex: 1300,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ChatHeader onClose={toggle} onNew={clearMessages} />
        <ChatMessages />
        <ChatInput onSend={send} onStop={stop} streaming={streaming} />
      </Box>
    </Drawer>
  );
}
