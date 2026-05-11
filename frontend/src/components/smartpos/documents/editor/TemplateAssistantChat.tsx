import { useState, useRef } from 'react';
import { Box, TextField, IconButton, Typography, Button, Paper, CircularProgress } from '@mui/material';
import { IconSend, IconSparkles, IconCheck } from '@tabler/icons-react';
import { assistTemplate } from '../../../../api/smartpos/documents';

interface Message { role: 'user' | 'assistant'; content: string; config?: Record<string, unknown>; }

interface TemplateAssistantChatProps {
  documentType: string;
  currentConfig: string;
  onApplyConfig: (config: Record<string, unknown>) => void;
}

export default function TemplateAssistantChat({ documentType, currentConfig, onApplyConfig }: TemplateAssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const result = await assistTemplate(documentType, input, currentConfig);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Done! Updated template ready.', config: result }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconSparkles size={16} /> AI Assistant
      </Typography>
      <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
        {messages.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 2 }}>
            Describe what you want to change, e.g. "Make the header navy blue with the logo on the right side"
          </Typography>
        )}
        {messages.map((msg, i) => (
          <Paper key={i} sx={{ p: 1.5, mb: 1, maxWidth: '90%', ml: msg.role === 'assistant' ? 0 : 'auto',
            bgcolor: msg.role === 'assistant' ? '#f0f4ff' : '#f0fdf4' }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{msg.content}</Typography>
            {msg.config && (
              <Button size="small" startIcon={<IconCheck size={14} />} sx={{ mt: 1 }}
                onClick={() => onApplyConfig(msg.config!)}>Apply Changes</Button>
            )}
          </Paper>
        ))}
        {loading && <CircularProgress size={16} sx={{ mx: 'auto', display: 'block' }} />}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField size="small" fullWidth placeholder="Describe the change you want..." value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
          inputRef={inputRef} disabled={loading} />
        <IconButton onClick={handleSend} disabled={loading || !input.trim()} color="primary">
          <IconSend size={16} />
        </IconButton>
      </Box>
    </Box>
  );
}
