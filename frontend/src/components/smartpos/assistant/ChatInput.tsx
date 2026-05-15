import { useState, useRef, useEffect } from 'react';
import { Box, IconButton } from '@mui/material';
import { IconPlayerStop, IconArrowUp } from '@tabler/icons-react';

interface Props { onSend: (msg: string) => void; onStop: () => void; streaming: boolean; }

export default function ChatInput({ onSend, onStop, streaming }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [value]);

  const handleSend = () => {
    const msg = value.trim();
    if (!msg) return;
    onSend(msg);
    setValue('');
  };

  return (
    <Box sx={{ px: 2, pt: 1, pb: 2.5 }}>
      <Box
        sx={{
          display: 'flex', alignItems: 'flex-end', gap: 1,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.08)',
          px: 0.5, py: 0.5,
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
          '&:focus-within': {
            borderColor: 'rgba(244,183,49,0.35)',
            boxShadow: '0 0 20px rgba(244,183,49,0.08), 0 0 0 1px rgba(244,183,49,0.1)',
          },
        }}
      >
        <Box
          component="textarea"
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder="Ask about your store..."
          rows={1}
          sx={{
            flex: 1,
            border: 'none', outline: 'none', resize: 'none',
            background: 'transparent',
            fontFamily: '"DM Sans", Inter, sans-serif',
            fontSize: '0.92rem', lineHeight: 1.5,
            color: '#f0efe9',
            px: 1.5, py: 1,
            '&::placeholder': { color: 'rgba(255,255,255,0.25)' },
          }}
        />
        {streaming ? (
          <IconButton
            onClick={onStop}
            sx={{
              width: 38, height: 38, mb: 0.2,
              background: 'rgba(239,68,68,0.15)',
              color: '#ef4444',
              '&:hover': { background: 'rgba(239,68,68,0.25)' },
            }}
          >
            <IconPlayerStop size={18} />
          </IconButton>
        ) : (
          <IconButton
            onClick={handleSend}
            disabled={!value.trim()}
            sx={{
              width: 38, height: 38, mb: 0.2,
              background: value.trim()
                ? 'linear-gradient(135deg, #f4b731 0%, #e5a820 100%)'
                : 'rgba(255,255,255,0.06)',
              color: value.trim() ? '#0f0f14' : 'rgba(255,255,255,0.2)',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: value.trim()
                  ? 'linear-gradient(135deg, #f5c04a 0%, #f4b731 100%)'
                  : 'rgba(255,255,255,0.08)',
              },
              '&:disabled': { opacity: 0.4 },
            }}
          >
            <IconArrowUp size={18} stroke={2.5} />
          </IconButton>
        )}
      </Box>
      <Box
        sx={{
          mt: 1.2, display: 'flex', gap: 2, justifyContent: 'center',
          opacity: 0.35, transition: 'opacity 0.3s',
          '&:hover': { opacity: 0.6 },
        }}
      >
        {['Enter to send', 'Shift+Enter new line', 'Esc to close'].map(hint => (
          <Box key={hint} component="span" sx={{ fontSize: '0.68rem', color: '#8b8b96' }}>
            {hint}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
