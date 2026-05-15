import { Box } from '@mui/material';
import { useAssistant } from 'src/context/smartpos/AssistantContext';
import { TextBlock, ChartBlock, MetricBlock, TableBlock, DraftBlock, ErrorBlock } from './ChatBlocks';

export default function ChatMessages() {
  const { messages, error, confirmDraftAction, rejectDraftAction } = useAssistant();

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', px: 1, pt: 2 }}>
      {messages.map(msg => {
        if (msg.role === 'user') return <TextBlock key={msg.id} content={msg.content} isUser />;
        if (msg.role === 'assistant') return <TextBlock key={msg.id} content={msg.content} />;
        if (msg.role === 'tool' && msg.toolResult) {
          const r = msg.toolResult;
          if (r.type === 'metric') return <MetricBlock key={msg.id} result={r} />;
          if (r.type === 'table') return <TableBlock key={msg.id} result={r} />;
          return <ChartBlock key={msg.id} result={r} />;
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
      {error && <ErrorBlock message={error} />}
    </Box>
  );
}
