import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { IconTrash, IconMessage, IconPlus } from '@tabler/icons-react';
import { useAssistant, type ConversationMeta } from 'src/context/smartpos/AssistantContext';
import { useChatTheme } from './useChatTheme';

function ago(ts: number): string {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function ConvItem({ conv, active, onSelect, onDelete }: {
  conv: ConversationMeta; active: boolean; onSelect: () => void; onDelete: () => void;
}) {
  const c = useChatTheme();
  return (
    <Box
      onClick={onSelect}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.1, mx: 1, mb: 0.3, borderRadius: 2,
        cursor: 'pointer', transition: 'background 0.15s',
        bgcolor: active ? `${c.accent}15` : 'transparent',
        border: active ? `1px solid ${c.accent}30` : '1px solid transparent',
        '&:hover': { bgcolor: active ? `${c.accent}20` : c.surfaceHover },
      }}
    >
      <IconMessage size={14} style={{ color: active ? c.accent : c.textMuted, flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.76rem', fontWeight: active ? 600 : 500, color: active ? c.text : c.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {conv.title}
        </Typography>
        <Typography sx={{ fontSize: '0.62rem', color: c.textMuted }}>
          {conv.messageCount} msgs · {ago(conv.timestamp)}
        </Typography>
      </Box>
      <Tooltip title="Delete" placement="left">
        <IconButton size="small" onClick={e => { e.stopPropagation(); onDelete(); }} sx={{ color: c.textMuted, p: 0.3, '&:hover': { color: '#ef4444' }, opacity: 0, transition: 'opacity 0.15s', '.MuiBox-root:hover &': { opacity: 1 } }}>
          <IconTrash size={13} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export default function ConversationSidebar() {
  const { conversations, conversationId, sidebarOpen, toggleSidebar, switchConversation, deleteConversation, newConversation } = useAssistant();
  const c = useChatTheme();

  if (!sidebarOpen) return null;

  return (
    <Box
      sx={{
        position: 'absolute', inset: 0, zIndex: 5,
        bgcolor: c.overlayBg, display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.2s ease-out',
        '@keyframes slideIn': { from: { opacity: 0, transform: 'translateX(-10px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: `1px solid ${c.border}` }}>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: c.text }}>Conversations</Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="New conversation">
            <IconButton size="small" onClick={newConversation} sx={{ color: c.accent, p: 0.5 }}><IconPlus size={16} /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {conversations.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
            <IconMessage size={28} style={{ color: c.textMuted, marginBottom: 8 }} />
            <Typography sx={{ fontSize: '0.78rem', color: c.textMuted }}>No recent conversations</Typography>
            <Typography sx={{ fontSize: '0.68rem', color: c.textMuted, mt: 0.5 }}>Your chats will appear here</Typography>
          </Box>
        ) : (
          conversations.map(conv => (
            <ConvItem
              key={conv.id}
              conv={conv}
              active={conv.id === conversationId}
              onSelect={() => switchConversation(conv.id)}
              onDelete={() => deleteConversation(conv.id)}
            />
          ))
        )}
      </Box>

      {/* Back button */}
      <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${c.border}` }}>
        <Box
          onClick={toggleSidebar}
          sx={{ textAlign: 'center', py: 1, borderRadius: 2, cursor: 'pointer', fontSize: '0.75rem', color: c.textSecondary, '&:hover': { bgcolor: c.surfaceHover, color: c.text } }}
        >
          ← Back to chat
        </Box>
      </Box>
    </Box>
  );
}
