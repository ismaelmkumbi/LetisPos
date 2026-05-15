import { keyframes } from '@emotion/react';
import { Box, Typography, Button } from '@mui/material';
import { IconCheck, IconX, IconSparkles, IconAlertTriangle } from '@tabler/icons-react';
import type { ToolResult, DraftResponse } from 'src/api/smartpos/assistant';
import { useChatTheme } from './useChatTheme';

const messageIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export function TextBlock({ content, isUser }: { content: string; isUser?: boolean }) {
  const c = useChatTheme();
  return (
    <Box
      sx={{
        display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 1.2, px: 1,
        animation: `${messageIn} 0.35s cubic-bezier(0.16, 1, 0.3, 1)`,
      }}
    >
      {!isUser && (
        <IconSparkles size={14} style={{ color: c.accent, marginRight: 8, marginTop: 10, opacity: 0.6 }} />
      )}
      <Box
        sx={{
          maxWidth: '82%', px: 2, py: 1.2,
          background: isUser ? c.userBg : c.aiBg,
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          border: '1px solid',
          borderColor: isUser ? c.userBorder : c.aiBorder,
          color: isUser ? c.userText : c.text,
          fontFamily: '"DM Sans", Inter, sans-serif',
          fontSize: '0.9rem', lineHeight: 1.55,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}
      >
        {content}
      </Box>
    </Box>
  );
}

export function StreamingBlock() {
  const c = useChatTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, mb: 1 }}>
      <IconSparkles size={14} style={{ color: c.accent, opacity: 0.5 }} />
      <Box
        sx={{
          width: 120, height: 18, borderRadius: 1,
          background: `linear-gradient(90deg, ${c.accent}0d 0%, ${c.accent}1f 50%, ${c.accent}0d 100%)`,
          backgroundSize: '200% 100%',
          animation: `${shimmer} 1.8s ease-in-out infinite`,
        }}
      />
    </Box>
  );
}

export function MetricBlock({ result }: { result: ToolResult }) {
  const c = useChatTheme();
  const data = result.data as Record<string, unknown>;
  const total = data.totalSales ?? data.total ?? data.totalRevenue ?? data.value ?? null;
  const subtitle = (data.period ?? data.note ?? '') as string;

  return (
    <Box
      sx={{
        mx: 1, mb: 1.5, p: 2.5,
        animation: `${messageIn} 0.35s cubic-bezier(0.16, 1, 0.3, 1)`,
        background: c.metricBg,
        borderRadius: 3,
        border: `1px solid ${c.accentBorder}`,
        textAlign: 'center',
      }}
    >
      {total !== null && total !== undefined && (
        <Typography
          sx={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: '2rem', fontWeight: 400,
            color: c.accent, lineHeight: 1.2,
          }}
        >
          {String(total)}
        </Typography>
      )}
      <Typography sx={{ fontSize: '0.82rem', color: c.textSecondary, mt: 0.5 }}>
        {result.title}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: '0.7rem', color: c.textMuted, mt: 0.3 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

export function TableBlock({ result }: { result: ToolResult }) {
  const c = useChatTheme();
  const data = result.data as Record<string, unknown>;
  const columns: string[] = (data.columns as string[]) ?? [];
  const rows: unknown[][] = (data.rows as unknown[][]) ?? [];

  return (
    <Box
      sx={{
        mx: 1, mb: 1.5,
        animation: `${messageIn} 0.35s cubic-bezier(0.16, 1, 0.3, 1)`,
        background: c.surfaceHover,
        borderRadius: 3,
        border: `1px solid ${c.border}`,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2, py: 1.2,
          borderBottom: `1px solid ${c.tableHeaderBg}`,
          fontSize: '0.8rem', fontWeight: 600, color: c.textSecondary,
          fontFamily: '"DM Sans", Inter, sans-serif',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}
      >
        {result.title}
      </Box>
      <Box sx={{ overflowX: 'auto', maxHeight: 280 }}>
        <Box
          component="table"
          sx={{
            width: '100%', borderCollapse: 'collapse',
            fontSize: '0.82rem', fontFamily: '"DM Sans", Inter, sans-serif',
            '& th': {
              textAlign: 'left', p: '8px 14px',
              borderBottom: `1px solid ${c.tableHeaderBg}`,
              fontWeight: 600, color: c.textMuted, fontSize: '0.72rem',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            },
            '& td': {
              p: '8px 14px', color: c.text,
              borderBottom: `1px solid ${c.tableRowBorder}`,
            },
            '& tr:last-child td': { borderBottom: 'none' },
          }}
        >
          <thead><tr>{columns.map((col: string) => <th key={col}>{col}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, i: number) => (
              <tr key={i}>{(row as unknown[]).map((cell: unknown, j: number) => <td key={j}>{String(cell)}</td>)}</tr>
            ))}
          </tbody>
        </Box>
      </Box>
    </Box>
  );
}

export function ChartBlock({ result }: { result: ToolResult }) {
  const c = useChatTheme();
  const data = result.data as Record<string, unknown>;
  const items = (data.items as Array<Record<string, unknown>>) ?? [];

  return (
    <Box
      sx={{
        mx: 1, mb: 1.5, p: 2,
        animation: `${messageIn} 0.35s cubic-bezier(0.16, 1, 0.3, 1)`,
        background: c.surfaceHover,
        borderRadius: 3,
        border: `1px solid ${c.border}`,
      }}
    >
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: c.textSecondary, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {result.title}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
        {items.map((item, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ flex: 1, fontSize: '0.84rem', color: c.text, textAlign: 'right' }}>
              {String(item.name ?? '')}
            </Typography>
            <Box sx={{ flex: 2, height: 6, borderRadius: 3, background: c.inputBg, overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%', borderRadius: 3,
                  width: `${Math.min(100, Math.max(5, i < items.length ? 100 - i * 20 : 30))}%`,
                  background: `linear-gradient(90deg, ${c.accent} 0%, ${c.accent}dd 100%)`,
                }}
              />
            </Box>
            <Typography sx={{ fontSize: '0.78rem', color: c.accent, fontWeight: 500, minWidth: 50 }}>
              {String(item.value ?? item.subtitle ?? '')}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function DraftBlock({ draft, onConfirm, onReject }: {
  draft: DraftResponse; onConfirm: () => void; onReject: () => void;
}) {
  const c = useChatTheme();
  return (
    <Box
      sx={{
        mx: 1, mb: 1.5, p: 2,
        animation: `${messageIn} 0.35s cubic-bezier(0.16, 1, 0.3, 1)`,
        background: c.accentBg,
        borderRadius: 3,
        border: `1px solid ${c.accentBorder}`,
        boxShadow: `0 0 20px ${c.accent}0d`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconAlertTriangle size={16} style={{ color: c.accent }} />
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: c.accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Confirm Action
        </Typography>
      </Box>
      <Typography sx={{ fontSize: '0.86rem', color: c.text, mb: 2, lineHeight: 1.5 }}>
        {draft.summary}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.2 }}>
        <Button
          size="small" onClick={onConfirm}
          sx={{
            px: 2.5, py: 0.8, borderRadius: 2,
            background: c.sendBg, color: c.sendText,
            fontWeight: 600, fontSize: '0.8rem', textTransform: 'none',
            '&:hover': { filter: 'brightness(1.05)' },
          }}
          startIcon={<IconCheck size={16} />}
        >
          Confirm
        </Button>
        <Button
          size="small" onClick={onReject}
          sx={{
            px: 2.5, py: 0.8, borderRadius: 2,
            background: 'transparent',
            border: `1px solid ${c.border}`,
            color: c.textSecondary, fontWeight: 500, fontSize: '0.8rem', textTransform: 'none',
            '&:hover': { background: c.surfaceHover, color: c.text },
          }}
          startIcon={<IconX size={16} />}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <Box
      sx={{
        mx: 1, mb: 1.5, px: 2, py: 1.2,
        background: 'rgba(239,68,68,0.08)',
        borderRadius: 2,
        border: '1px solid rgba(239,68,68,0.15)',
        fontSize: '0.82rem', color: '#fca5a5',
        fontFamily: '"DM Sans", Inter, sans-serif',
        lineHeight: 1.5,
      }}
    >
      {message}
    </Box>
  );
}
