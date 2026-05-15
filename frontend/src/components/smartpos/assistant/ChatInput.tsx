import { useState } from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import { IconSend, IconPlayerStop } from '@tabler/icons-react';

interface Props { onSend: (msg: string) => void; onStop: () => void; streaming: boolean; }

export default function ChatInput({ onSend, onStop, streaming }: Props) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const msg = value.trim();
    if (!msg) return;
    onSend(msg);
    setValue('');
  };

  return (
    <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          fullWidth multiline maxRows={4} size="small"
          placeholder="Ask about your store..."
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />
        {streaming ? (
          <IconButton color="error" onClick={onStop}><IconPlayerStop /></IconButton>
        ) : (
          <IconButton color="primary" onClick={handleSend} disabled={!value.trim()}>
            <IconSend />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}
