import { Box, Typography, IconButton } from '@mui/material';
import { IconX, IconPlus, IconSparkles } from '@tabler/icons-react';

interface Props { onClose: () => void; onNew: () => void; }

export default function ChatHeader({ onClose, onNew }: Props) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', px: 2, py: 1.5,
      borderBottom: '1px solid', borderColor: 'divider',
    }}>
      <IconSparkles size={20} />
      <Typography variant="subtitle1" fontWeight={600} sx={{ ml: 1, flex: 1 }}>
        AI Assistant
      </Typography>
      <IconButton size="small" onClick={onNew}><IconPlus size={18} /></IconButton>
      <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
    </Box>
  );
}
