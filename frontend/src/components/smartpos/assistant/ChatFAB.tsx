import { keyframes } from '@emotion/react';
import { Box, IconButton } from '@mui/material';
import { IconSparkles } from '@tabler/icons-react';
import { useAssistant } from 'src/context/smartpos/AssistantContext';
import { useChatTheme } from './useChatTheme';

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
  const c = useChatTheme();

  return (
    <Box
      sx={{
        position: 'fixed', bottom: 100, right: 28, zIndex: 1300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {!open && (
        <Box
          sx={{
            position: 'absolute', inset: -6, borderRadius: '50%',
            background: `radial-gradient(circle, ${c.accent}4d 0%, transparent 70%)`,
            animation: `${pulseRing} 2.5s ease-in-out infinite`,
          }}
        />
      )}
      {streaming && !open && (
        <Box
          sx={{
            position: 'absolute', inset: -10, borderRadius: '50%',
            background: `radial-gradient(circle, ${c.accent}33 0%, transparent 60%)`,
            animation: `${pulseRing} 1.5s ease-in-out infinite`,
          }}
        />
      )}
      <IconButton
        onClick={toggle}
        aria-label="AI Assistant"
        sx={{
          width: 56, height: 56,
          background: open
            ? c.accentBg
            : c.fabBg,
          backdropFilter: 'blur(20px)',
          border: '1px solid',
          borderColor: open ? c.accentBorder : c.fabBorder,
          borderRadius: '50%',
          boxShadow: open
            ? `0 0 24px ${c.accent}26`
            : '0 4px 24px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.05) inset',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            background: open
              ? c.accentBg
              : c.surfaceHover,
            borderColor: open ? c.accentBorder : c.accentBorder,
            boxShadow: open
              ? `0 0 32px ${c.accent}33`
              : '0 0 32px rgba(0,0,0,0.2)',
          },
        }}
      >
        <IconSparkles
          size={24}
          style={{
            color: open ? c.accent : c.fabIcon,
            animation: streaming && !open ? `${shimmer} 1.2s ease-in-out infinite` : 'none',
          }}
        />
      </IconButton>
    </Box>
  );
}
