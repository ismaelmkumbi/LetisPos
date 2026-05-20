import { Box, Typography, Chip } from '@mui/material';
import { IconSparkles, IconChartBar, IconPackage, IconReceipt } from '@tabler/icons-react';
import { useAssistant } from 'src/context/smartpos/AssistantContext';
import { useChatTheme } from './useChatTheme';
import { TextBlock, StreamingBlock, ToolLoadingBlock, ChartBlock, MetricBlock, TableBlock, ToolTextBlock, ExecutiveBriefingBlock, DraftBlock, ErrorBlock } from './ChatBlocks';
import { useEffect, useRef } from 'react';

export default function ChatMessages() {
  const { messages, streaming, error, send, confirmDraftAction, rejectDraftAction } = useAssistant();
  const bottomRef = useRef<HTMLDivElement>(null);
  const c = useChatTheme();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  if (messages.length === 0) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 3 }}>
        <Box
          sx={{
            width: 64, height: 64, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(circle, ${c.accent}26 0%, transparent 70%)`,
            mb: 2.5,
          }}
        >
          <IconSparkles size={28} style={{ color: c.accent }} />
        </Box>
        <Typography
          sx={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: '1.3rem', color: c.text, mb: 1,
          }}
        >
          How can I help?
        </Typography>
        <Typography sx={{ fontSize: '0.84rem', color: c.textSecondary, textAlign: 'center', mb: 3, lineHeight: 1.6 }}>
          Ask me about sales, inventory, customers,<br />or anything about your store.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 300 }}>
          {[
            { icon: IconChartBar, label: 'Today\'s sales' },
            { icon: IconSparkles, label: 'Executive briefing' },
            { icon: IconPackage, label: 'Low stock items' },
            { icon: IconReceipt, label: 'Recent orders' },
          ].map(({ icon: Icon, label }) => (
            <Chip
              key={label}
              icon={<Icon size={14} style={{ color: c.textSecondary }} />}
              label={label}
              onClick={() => send(label)}
              sx={{
                border: `1px solid ${c.border}`,
                background: c.inputBg,
                color: c.textSecondary,
                fontSize: '0.8rem',
                fontFamily: '"DM Sans", Inter, sans-serif',
                borderRadius: 2.5, py: 0.3,
                '&:hover': {
                  background: c.accentBg,
                  borderColor: c.accentBorder,
                  color: c.accent,
                },
              }}
            />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1, overflowY: 'auto', pt: 2, pb: 1,
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: c.border, borderRadius: 4 },
      }}
    >
      {messages.map(msg => {
        if (msg.role === 'user') return <TextBlock key={msg.id} content={msg.content} isUser />;
        if (msg.role === 'assistant') {
          if (msg.streaming && !msg.content) return <StreamingBlock key={msg.id} />;
          return <TextBlock key={msg.id} content={msg.content} />;
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
          return <ToolLoadingBlock key={msg.id} label={msg.content} />;
        }
        if (msg.role === 'draft' && msg.draft) {
          return (
            <DraftBlock
              key={msg.id}
              draft={msg.draft}
              onConfirm={() => confirmDraftAction(msg.draft!.draftId)}
              onReject={() => rejectDraftAction(msg.draft!.draftId)}
            />
          );
        }
        return null;
      })}
      {streaming && messages[messages.length - 1]?.role === 'user' && <StreamingBlock />}
      {error && <ErrorBlock message={error} />}
      <div ref={bottomRef} />
    </Box>
  );
}
