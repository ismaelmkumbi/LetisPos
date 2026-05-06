import { useState } from 'react';
import { Box, Button, Fab, Paper, Stack, TextField, Typography, CircularProgress } from '@mui/material';
import { IconSparkles, IconX, IconSend } from '@tabler/icons-react';
import { aiChat } from 'src/api/smartpos/ai';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  contextPrompt: string;
}

export default function AiReportChat({ contextPrompt }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    const q = question;
    setQuestion('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const r = await aiChat({ prompt: q, systemPrompt: contextPrompt });
      setMessages((m) => [...m, { role: 'ai', text: r.narrative }]);
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: 'Sorry, I could not process that question.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Fab variant="extended" onClick={() => setOpen((o) => !o)}
        sx={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1200,
          bgcolor: brand.accent[500], color: '#fff', fontWeight: 700, fontSize: 13,
          '&:hover': { bgcolor: brand.accent[600] },
        }}>
        <IconSparkles size={18} style={{ marginRight: 8 }} />
        Ask AI
      </Fab>

      {open && (
        <Paper elevation={8} sx={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 1200,
          width: 380, maxHeight: 480, borderRadius: '14px', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center"
            sx={{ px: 2, py: 1.5, bgcolor: brand.accent[500], color: '#fff' }}>
            <Typography sx={{ fontWeight: 800, fontSize: 14 }}>Ask about this report</Typography>
            <IconX size={18} sx={{ cursor: 'pointer' }} onClick={() => setOpen(false)} />
          </Stack>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, maxHeight: 320 }}>
            {messages.map((m, i) => (
              <Box key={i} sx={{ mb: 1.5, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                <Typography sx={{
                  display: 'inline-block', px: 1.5, py: 0.75, borderRadius: '10px', fontSize: 12,
                  bgcolor: m.role === 'user' ? brand.primary[50] : brand.neutral[100],
                  color: brand.neutral[900], maxWidth: '90%', whiteSpace: 'pre-wrap',
                }}>{m.text}</Typography>
              </Box>
            ))}
            {loading && <CircularProgress size={16} sx={{ color: brand.accent[500] }} />}
          </Box>
          <Stack direction="row" spacing={1} sx={{ p: 1.5, borderTop: `1px solid ${brand.neutral[200]}` }}>
            <TextField size="small" fullWidth placeholder="Ask about this data…" value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13 } }} />
            <Button variant="contained" size="small" onClick={handleAsk} disabled={loading || !question.trim()}
              sx={{ minWidth: 44, bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>
              <IconSend size={16} />
            </Button>
          </Stack>
        </Paper>
      )}
    </>
  );
}
