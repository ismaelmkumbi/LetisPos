import { Box, Typography, IconButton } from '@mui/material';
import { IconTrash, IconX, IconSparkles } from '@tabler/icons-react';
import { useChatTheme } from './useChatTheme';

interface Props { onClose: () => void; onClear: () => void; }

export default function ChatHeader({ onClose, onClear }: Props) {
  const c = useChatTheme();

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center',
        px: 2.5, py: 1.8,
        borderBottom: `1px solid ${c.border}`,
        background: c.surface,
        backdropFilter: 'blur(20px)',
      }}
    >
      <IconSparkles
        size={22}
        style={{ color: c.accent }}
      />
      <Typography
        sx={{
          ml: 1.2, flex: 1,
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: '1.15rem', fontWeight: 400,
          color: c.text, letterSpacing: '0.02em',
        }}
      >
        AI Assistant
      </Typography>
      <IconButton
        size="small" onClick={onClear}
        sx={{
          color: c.textMuted, mr: 0.5,
          '&:hover': { color: c.textSecondary, background: c.surfaceHover },
        }}
      >
        <IconTrash size={16} />
      </IconButton>
      <IconButton
        size="small" onClick={onClose}
        sx={{
          color: c.textMuted,
          '&:hover': { color: c.accent, background: c.accentBg },
        }}
      >
        <IconX size={18} />
      </IconButton>
    </Box>
  );
}
