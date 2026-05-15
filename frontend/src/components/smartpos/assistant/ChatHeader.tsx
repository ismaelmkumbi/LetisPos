import { Box, Typography, IconButton } from '@mui/material';
import { keyframes } from '@emotion/react';
import { IconTrash, IconX, IconSparkles } from '@tabler/icons-react';

const glowPulse = keyframes`
  0%, 100% { filter: drop-shadow(0 0 3px rgba(244,183,49,0.4)); }
  50% { filter: drop-shadow(0 0 8px rgba(244,183,49,0.7)); }
`;

interface Props { onClose: () => void; onClear: () => void; }

export default function ChatHeader({ onClose, onClear }: Props) {
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center',
        px: 2.5, py: 1.8,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(22,22,30,0.6)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <IconSparkles
        size={22}
        style={{ color: '#f4b731', animation: `${glowPulse} 3s ease-in-out infinite` }}
      />
      <Typography
        sx={{
          ml: 1.2, flex: 1,
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: '1.15rem', fontWeight: 400,
          color: '#f0efe9', letterSpacing: '0.02em',
        }}
      >
        AI Assistant
      </Typography>
      <IconButton
        size="small" onClick={onClear}
        sx={{
          color: 'rgba(255,255,255,0.35)', mr: 0.5,
          '&:hover': { color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.05)' },
        }}
      >
        <IconTrash size={16} />
      </IconButton>
      <IconButton
        size="small" onClick={onClose}
        sx={{
          color: 'rgba(255,255,255,0.35)',
          '&:hover': { color: '#f4b731', background: 'rgba(244,183,49,0.1)' },
        }}
      >
        <IconX size={18} />
      </IconButton>
    </Box>
  );
}
