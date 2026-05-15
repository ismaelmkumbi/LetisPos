import { keyframes } from '@emotion/react';
import { Box, Typography, Button } from '@mui/material';
import { IconCheck, IconX, IconSparkles, IconAlertTriangle } from '@tabler/icons-react';
import type { ToolResult, DraftResponse } from 'src/api/smartpos/assistant';

const messageIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ── Text bubble ──

export function TextBlock({ content, isUser }: { content: string; isUser?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 1.2, px: 1,
        animation: `${messageIn} 0.35s cubic-bezier(0.16, 1, 0.3, 1)`,
      }}
    >
      {!isUser && (
        <IconSparkles size={14} style={{ color: '#f4b731', marginRight: 8, marginTop: 10, opacity: 0.6 }} />
      )}
      <Box
        sx={{
          maxWidth: '82%', px: 2, py: 1.2,
          background: isUser
            ? 'rgba(255,255,255,0.06)'
            : 'linear-gradient(135deg, rgba(244,183,49,0.06) 0%, rgba(244,183,49,0.02) 100%)',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          border: '1px solid',
          borderColor: isUser ? 'rgba(255,255,255,0.06)' : 'rgba(244,183,49,0.1)',
          color: isUser ? '#e0ded5' : '#f0efe9',
          fontFamily: '"DM Sans", Inter, sans-serif',
          fontSize: '0.9rem', lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {content}
      </Box>
    </Box>
  );
}

// ── Streaming indicator ──

export function StreamingBlock() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, mb: 1 }}>
      <IconSparkles size={14} style={{ color: '#f4b731', opacity: 0.5 }} />
      <Box
        sx={{
          width: 120, height: 18, borderRadius: 1,
          background: 'linear-gradient(90deg, rgba(244,183,49,0.05) 0%, rgba(244,183,49,0.12) 50%, rgba(244,183,49,0.05) 100%)',
          backgroundSize: '200% 100%',
          animation: `${shimmer} 1.8s ease-in-out infinite`,
        }}
      />
    </Box>
  );
}

// ── Tool result cards ──

export function MetricBlock({ result }: { result: ToolResult }) {
  const data = result.data as Record<string, unknown>;
  const total = data.totalSales ?? data.total ?? data.totalRevenue ?? data.value ?? null;
  const subtitle = (data.period ?? data.note ?? '') as string;

  return (
    <Box
      sx={{
        mx: 1, mb: 1.5, p: 2.5,
        animation: `${messageIn} 0.35s cubic-bezier(0.16, 1, 0.3, 1)`,
        background: 'linear-gradient(135deg, rgba(244,183,49,0.08) 0%, rgba(244,183,49,0.02) 100%)',
        borderRadius: 3,
        border: '1px solid rgba(244,183,49,0.15)',
        textAlign: 'center',
      }}
    >
      {total !== null && total !== undefined && (
        <Typography
          sx={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: '2rem', fontWeight: 400,
            color: '#f4b731',
            lineHeight: 1.2,
          }}
        >
          {String(total)}
        </Typography>
      )}
      <Typography sx={{ fontSize: '0.82rem', color: '#8b8b96', mt: 0.5 }}>
        {result.title}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', mt: 0.3 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

export function TableBlock({ result }: { result: ToolResult }) {
  const data = result.data as Record<string, unknown>;
  const columns: string[] = (data.columns as string[]) ?? [];
  const rows: unknown[][] = (data.rows as unknown[][]) ?? [];

  return (
    <Box
      sx={{
        mx: 1, mb: 1.5,
        animation: `${messageIn} 0.35s cubic-bezier(0.16, 1, 0.3, 1)`,
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2, py: 1.2,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          fontSize: '0.8rem', fontWeight: 600, color: '#8b8b96',
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
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            },
            '& td': {
              p: '8px 14px', color: '#e0ded5',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
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
  const data = result.data as Record<string, unknown>;
  const items = (data.items as Array<Record<string, unknown>>) ?? [];

  return (
    <Box
      sx={{
        mx: 1, mb: 1.5, p: 2,
        animation: `${messageIn} 0.35s cubic-bezier(0.16, 1, 0.3, 1)`,
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#8b8b96', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {result.title}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
        {items.map((item, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ flex: 1, fontSize: '0.84rem', color: '#e0ded5', textAlign: 'right' }}>
              {String(item.name ?? '')}
            </Typography>
            <Box sx={{ flex: 2, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%', borderRadius: 3,
                  width: `${Math.min(100, Math.max(5, i < items.length ? 100 - i * 20 : 30))}%`,
                  background: 'linear-gradient(90deg, #f4b731 0%, #e5a820 100%)',
                }}
              />
            </Box>
            <Typography sx={{ fontSize: '0.78rem', color: '#f4b731', fontWeight: 500, minWidth: 50 }}>
              {String(item.value ?? item.subtitle ?? '')}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ── Draft card ──

export function DraftBlock({ draft, onConfirm, onReject }: {
  draft: DraftResponse; onConfirm: () => void; onReject: () => void;
}) {
  return (
    <Box
      sx={{
        mx: 1, mb: 1.5, p: 2,
        animation: `${messageIn} 0.35s cubic-bezier(0.16, 1, 0.3, 1)`,
        background: 'linear-gradient(135deg, rgba(244,183,49,0.1) 0%, rgba(244,183,49,0.03) 100%)',
        borderRadius: 3,
        border: '1px solid rgba(244,183,49,0.25)',
        boxShadow: '0 0 20px rgba(244,183,49,0.05)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconAlertTriangle size={16} style={{ color: '#f4b731' }} />
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#f4b731', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Confirm Action
        </Typography>
      </Box>
      <Typography sx={{ fontSize: '0.86rem', color: '#e0ded5', mb: 2, lineHeight: 1.5 }}>
        {draft.summary}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.2 }}>
        <Button
          size="small"
          onClick={onConfirm}
          sx={{
            px: 2.5, py: 0.8, borderRadius: 2,
            background: 'linear-gradient(135deg, #f4b731 0%, #e5a820 100%)',
            color: '#0f0f14', fontWeight: 600, fontSize: '0.8rem',
            textTransform: 'none',
            '&:hover': { background: 'linear-gradient(135deg, #f5c04a 0%, #f4b731 100%)' },
          }}
          startIcon={<IconCheck size={16} />}
        >
          Confirm
        </Button>
        <Button
          size="small"
          onClick={onReject}
          sx={{
            px: 2.5, py: 0.8, borderRadius: 2,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#8b8b96', fontWeight: 500, fontSize: '0.8rem',
            textTransform: 'none',
            '&:hover': { background: 'rgba(255,255,255,0.08)', color: '#e0ded5' },
          }}
          startIcon={<IconX size={16} />}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
}

// ── Error banner ──

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
