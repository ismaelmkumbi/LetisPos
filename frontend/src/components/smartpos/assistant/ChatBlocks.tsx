import { Box, Typography, Paper, Button } from '@mui/material';
import { IconCheck, IconX } from '@tabler/icons-react';
import type { ToolResult, DraftResponse } from 'src/api/smartpos/assistant';

export function TextBlock({ content, isUser }: { content: string; isUser?: boolean }) {
  return (
    <Box sx={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 1.5,
    }}>
      <Paper sx={{
        px: 2, py: 1.5, maxWidth: '85%',
        bgcolor: isUser ? 'primary.main' : 'grey.100',
        color: isUser ? 'white' : 'text.primary',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      }}>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{content}</Typography>
      </Paper>
    </Box>
  );
}

export function ChartBlock({ result }: { result: ToolResult }) {
  return (
    <Paper sx={{ p: 2, mb: 1.5, mx: 1, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>{result.title}</Typography>
      <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {result.type === 'ranking' && Array.isArray((result.data as Record<string, unknown>)?.items) &&
            ((result.data as Record<string, unknown>).items as Array<Record<string, unknown>>).map((item: Record<string, unknown>) =>
              `${item.name}: ${item.value}`
            ).join(', ')}
          {result.type !== 'ranking' && JSON.stringify(result.data)}
        </Typography>
      </Box>
    </Paper>
  );
}

export function MetricBlock({ result }: { result: ToolResult }) {
  const data = result.data as Record<string, unknown>;
  return (
    <Paper sx={{ p: 2, mb: 1.5, mx: 1, textAlign: 'center' }}>
      <Typography variant="h4" fontWeight={700} color="primary.main">
        {String(data.total ?? data.value ?? '-')}
      </Typography>
      <Typography variant="body2" color="text.secondary">{result.title}</Typography>
    </Paper>
  );
}

export function TableBlock({ result }: { result: ToolResult }) {
  const data = result.data as Record<string, unknown>;
  const columns: string[] = (data.columns as string[]) ?? [];
  const rows: unknown[][] = (data.rows as unknown[][]) ?? [];
  return (
    <Paper sx={{ p: 2, mb: 1.5, mx: 1, overflow: 'auto' }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>{result.title}</Typography>
      <Box component="table" sx={{
        width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem',
        '& th': { textAlign: 'left', p: '4px 8px', borderBottom: '1px solid', borderColor: 'divider', fontWeight: 600 },
        '& td': { p: '4px 8px' },
      }}>
        <thead><tr>{columns.map((col: string) => <th key={col}>{col}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i: number) => (
            <tr key={i}>{(row as unknown[]).map((cell: unknown, j: number) => <td key={j}>{String(cell)}</td>)}</tr>
          ))}
        </tbody>
      </Box>
    </Paper>
  );
}

export function DraftBlock({ draft, onConfirm, onReject }: {
  draft: DraftResponse; onConfirm: () => void; onReject: () => void;
}) {
  return (
    <Paper sx={{ p: 2, mb: 1.5, mx: 1, border: '2px solid', borderColor: 'warning.main' }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>Confirm Action</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{draft.summary}</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" variant="contained" color="primary" startIcon={<IconCheck size={16} />} onClick={onConfirm}>
          Confirm
        </Button>
        <Button size="small" variant="outlined" color="inherit" startIcon={<IconX size={16} />} onClick={onReject}>
          Cancel
        </Button>
      </Box>
    </Paper>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <Paper sx={{ p: 2, mb: 1.5, mx: 1, bgcolor: 'error.light' }}>
      <Typography variant="body2" color="error.contrastText">{message}</Typography>
    </Paper>
  );
}
