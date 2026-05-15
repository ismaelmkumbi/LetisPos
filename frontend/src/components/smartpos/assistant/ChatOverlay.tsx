import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import { keyframes } from '@emotion/react';
import { useAssistant } from 'src/context/smartpos/AssistantContext';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export default function ChatOverlay() {
  const { open, toggle, streaming, send, stop, clearMessages } = useAssistant();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={toggle}
      slotProps={{
        backdrop: {
          sx: {
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            animation: `${fadeIn} 0.3s ease`,
          },
        },
      }}
      sx={{
        '& .MuiDrawer-paper': {
          width: isMobile ? '100%' : 440,
          height: '100%',
          zIndex: 1300,
          background: '#0f0f14',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      }}
    >
      {/* Noise texture overlay */}
      <Box
        sx={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          opacity: 0.015,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle radial gradient */}
      <Box
        sx={{
          position: 'absolute', top: 0, right: 0, width: 300, height: 300, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(circle at top right, rgba(244,183,49,0.04) 0%, transparent 70%)',
        }}
      />

      {/* Main content */}
      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ChatHeader onClose={toggle} onClear={clearMessages} />
        <ChatMessages />
        <ChatInput onSend={send} onStop={stop} streaming={streaming} />
      </Box>
    </Drawer>
  );
}
