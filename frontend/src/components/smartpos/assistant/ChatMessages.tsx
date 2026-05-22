import { Box, Typography, Chip, IconButton } from '@mui/material';
import { IconSparkles, IconArrowDown } from '@tabler/icons-react';
import { useAssistant } from 'src/context/smartpos/AssistantContext';
import { useChatTheme } from './useChatTheme';
import { TextBlock, StreamingBlock, ToolLoadingBlock, ChartBlock, MetricBlock, TableBlock, ToolTextBlock, ExecutiveBriefingBlock, DraftBlock, ErrorBlock } from './ChatBlocks';
import { useEffect, useRef, useState } from 'react';

function SuggestedPrompts({ onSend }: { onSend: (msg: string) => void }) {
  const c = useChatTheme();
  const hour = new Date().getHours();
  const prompts = hour < 12
    ? ['Today\'s briefing', 'Overnight sales', 'Low stock items', 'Recent orders']
    : ['Today\'s performance', 'Pending orders', 'Top products', 'Executive briefing'];

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, px: 2, pb: 1.5 }}>
      {prompts.map(label => (
        <Chip
          key={label}
          label={label}
          onClick={() => onSend(label)}
          sx={{
            border: `1px solid ${c.border}`, background: c.inputBg, color: c.textSecondary,
            fontSize: '0.72rem', fontFamily: '"DM Sans", Inter, sans-serif', borderRadius: 2,
            py: 0.2, transition: 'all 0.15s',
            '&:hover': { background: c.accentBg, borderColor: c.accentBorder, color: c.accent },
          }}
        />
      ))}
    </Box>
  );
}

export default function ChatMessages() {
  const { messages, streaming, error, send, confirmDraftAction, rejectDraftAction, regenerateLast } = useAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const c = useChatTheme();

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages.length]);

  // Track scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(dist > 120);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const isEmpty = messages.length === 0;

  if (isEmpty) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 3 }}>
        <Box sx={{ width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle, ${c.accent}26 0%, transparent 70%)`, mb: 2.5 }}>
          <IconSparkles size={28} style={{ color: c.accent }} />
        </Box>
        <Typography sx={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: '1.3rem', color: c.text, mb: 1 }}>
          How can I help?
        </Typography>
        <Typography sx={{ fontSize: '0.84rem', color: c.textSecondary, textAlign: 'center', mb: 3, lineHeight: 1.6 }}>
          Ask me about sales, inventory, customers,<br />or anything about your store.
        </Typography>
        <SuggestedPrompts onSend={send} />
      </Box>
    );
  }

  // Find the last user message to identify which assistant text block is the "latest" for regenerate
  const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user');
  const isLatestResponse = (idx: number) => {
    const revIdx = messages.length - 1 - idx;
    return revIdx < lastUserIdx;
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <SuggestedPrompts onSend={send} />
      <Box
        ref={scrollRef}
        sx={{
          flex: 1, overflowY: 'auto', pt: 0.5, pb: 1,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: c.border, borderRadius: 4 },
        }}
      >
        {messages.map((msg, i) => {
          // Count tool steps in current round
          const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user');
          const roundStart = lastUserIdx >= 0 ? messages.length - lastUserIdx : 0;
          const roundTools = messages.slice(roundStart).filter(m => m.role === 'tool');
          const totalTools = roundTools.filter(m => m.streaming || m.toolResult).length;
          const doneTools = roundTools.filter(m => m.toolResult).length;

          if (msg.role === 'user') return <TextBlock key={msg.id} content={msg.content} isUser msgId={msg.id} />;
          if (msg.role === 'assistant') {
            if (!msg.content) {
              return msg.streaming && i === messages.length - 1
                ? <StreamingBlock key={msg.id} label="Analyzing your request" />
                : null;
            }
            return <TextBlock key={msg.id} content={msg.content} msgId={msg.id} onRegenerate={isLatestResponse(i) ? regenerateLast : undefined} />;
          }
          if (msg.role === 'tool' && msg.toolResult) {
            const r = msg.toolResult;
            if (r.type === 'briefing') return <ExecutiveBriefingBlock key={msg.id} result={r} />;
            if (r.type === 'metric') return <MetricBlock key={msg.id} result={r} />;
            if (r.type === 'table') return <TableBlock key={msg.id} result={r} />;
            if (r.type === 'text') return <ToolTextBlock key={msg.id} result={r} />;
            return <ChartBlock key={msg.id} result={r} />;
          }
          if (msg.role === 'tool' && msg.streaming) {
            const runningStep = doneTools + 1;
            return <ToolLoadingBlock key={msg.id} label={msg.content} step={runningStep} total={totalTools || undefined} />;
          }
          if (msg.role === 'draft' && msg.draft) {
            return <DraftBlock key={msg.id} draft={msg.draft} onConfirm={() => confirmDraftAction(msg.draft!.draftId)} onReject={() => rejectDraftAction(msg.draft!.draftId)} />;
          }
          return null;
        })}
        {streaming && messages[messages.length - 1]?.role === 'user' && <StreamingBlock label="Analyzing your request" />}
        {error && <ErrorBlock message={error} />}
        <div ref={bottomRef} />
      </Box>

      {/* Scroll to bottom FAB */}
      {showScrollBtn && (
        <IconButton
          onClick={scrollToBottom}
          sx={{
            position: 'absolute', bottom: 12, right: 12, zIndex: 2,
            width: 32, height: 32, borderRadius: '50%',
            bgcolor: c.accentBg, border: `1px solid ${c.accentBorder}`,
            color: c.accent, boxShadow: `0 2px 8px ${c.accent}1a`,
            '&:hover': { bgcolor: c.accent, color: c.sendText },
          }}
        >
          <IconArrowDown size={16} />
        </IconButton>
      )}
    </Box>
  );
}
