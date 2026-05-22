import { Box, Typography, IconButton } from '@mui/material';
import { IconTrash, IconX, IconSparkles, IconHistory } from '@tabler/icons-react';
import { useAssistant } from 'src/context/smartpos/AssistantContext';
import { useChatTheme } from './useChatTheme';

interface Props { onClose: () => void; onClear: () => void; }

export default function ChatHeader({ onClose, onClear }: Props) {
  const c = useChatTheme();
  const { toggleSidebar, sidebarOpen, conversations } = useAssistant();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.3, borderBottom: `1px solid ${c.border}`, background: c.surface, backdropFilter: 'blur(20px)' }}>
      {sidebarOpen ? (
        <Typography sx={{ flex: 1, fontFamily: '"DM Serif Display", Georgia, serif', fontSize: '1rem', fontWeight: 400, color: c.text, letterSpacing: '0.02em' }}>
          Conversations
        </Typography>
      ) : (
        <>
          <IconSparkles size={20} style={{ color: c.accent }} />
          <Typography sx={{ ml: 1, flex: 1, fontFamily: '"DM Serif Display", Georgia, serif', fontSize: '1.05rem', fontWeight: 400, color: c.text, letterSpacing: '0.02em' }}>
            Letis AI
          </Typography>
        </>
      )}
      {conversations.length > 0 && (
        <IconButton size="small" onClick={toggleSidebar} sx={{ color: sidebarOpen ? c.accent : c.textMuted, mr: 0.5, '&:hover': { color: c.accent, background: c.accentBg } }}>
          <IconHistory size={16} />
        </IconButton>
      )}
      <IconButton size="small" onClick={onClear} sx={{ color: c.textMuted, mr: 0.5, '&:hover': { color: c.textSecondary, background: c.surfaceHover } }}>
        <IconTrash size={16} />
      </IconButton>
      <IconButton size="small" onClick={onClose} sx={{ color: c.textMuted, '&:hover': { color: c.accent, background: c.accentBg } }}>
        <IconX size={18} />
      </IconButton>
    </Box>
  );
}
