import { keyframes } from '@emotion/react';
import { Box, IconButton } from '@mui/material';
import { IconSparkles } from '@tabler/icons-react';
import { useAssistant } from 'src/context/smartpos/AssistantContext';

const pulseRing = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.12); opacity: 0.2; }
  100% { transform: scale(1); opacity: 0.6; }
`;

const shimmer = keyframes`
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
`;

export default function ChatFAB() {
  const { open, toggle, streaming } = useAssistant();

  return (
    <Box
      sx={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 1300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Pulse ring */}
      {!open && (
        <Box
          sx={{
            position: 'absolute', inset: -6, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244,183,49,0.3) 0%, transparent 70%)',
            animation: `${pulseRing} 2.5s ease-in-out infinite`,
          }}
        />
      )}
      {streaming && !open && (
        <Box
          sx={{
            position: 'absolute', inset: -10, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244,183,49,0.2) 0%, transparent 60%)',
            animation: `${pulseRing} 1.5s ease-in-out infinite`,
          }}
        />
      )}
      {/* FAB */}
      <IconButton
        onClick={toggle}
        aria-label="AI Assistant"
        sx={{
          width: 56, height: 56,
          background: open
            ? 'rgba(244,183,49,0.15)'
            : 'linear-gradient(135deg, rgba(22,22,30,0.95) 0%, rgba(30,30,40,0.9) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid',
          borderColor: open ? 'rgba(244,183,49,0.3)' : 'rgba(255,255,255,0.08)',
          borderRadius: '50%',
          boxShadow: open
            ? '0 0 24px rgba(244,183,49,0.15)'
            : '0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            background: 'linear-gradient(135deg, rgba(244,183,49,0.15) 0%, rgba(30,30,40,0.95) 100%)',
            borderColor: 'rgba(244,183,49,0.4)',
            boxShadow: '0 0 32px rgba(244,183,49,0.2), 0 1px 0 rgba(255,255,255,0.08) inset',
          },
        }}
      >
        <IconSparkles
          size={24}
          style={{
            color: open ? '#f4b731' : '#e0ded5',
            animation: streaming && !open ? `${shimmer} 1.2s ease-in-out infinite` : 'none',
          }}
        />
      </IconButton>
    </Box>
  );
}
