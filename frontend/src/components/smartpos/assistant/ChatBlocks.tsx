import { keyframes } from '@emotion/react';
import { Box, Typography, Button, IconButton, Tooltip } from '@mui/material';
import { IconCheck, IconX, IconSparkles, IconAlertTriangle, IconArrowUpRight, IconArrowDownRight, IconCopy, IconRefresh, IconThumbUp, IconThumbDown, IconPencil } from '@tabler/icons-react';
import { useState as useReactState } from 'react';
import type { ToolResult, DraftResponse } from 'src/api/smartpos/assistant';
import { useAssistant } from 'src/context/smartpos/AssistantContext';
import { useChatTheme } from './useChatTheme';
import MarkdownRenderer from './MarkdownRenderer';

const messageIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

function asNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatValue(value: unknown, currency?: unknown): string {
  const numeric = asNumber(value);
  if (numeric === 0 && value !== 0 && value !== '0') return String(value ?? '');
  const compact = Math.abs(numeric) >= 1000;
  const formatted = new Intl.NumberFormat('en-US', {
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2,
  }).format(numeric);
  return currency ? `${currency} ${formatted}` : formatted;
}

function formatPercent(value: unknown): string {
  if (value === null || value === undefined) return 'New';
  const numeric = asNumber(value);
  return `${numeric >= 0 ? '+' : ''}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numeric)}%`;
}

function MessageActions({ id, content, isUser, onRegenerate }: { id: string; content: string; isUser?: boolean; onRegenerate?: () => void }) {
  const c = useChatTheme();
  const { editAndResend } = useAssistant();
  const [copied, setCopied] = useReactState(false);
  const [feedback, setFeedback] = useReactState<'up' | 'down' | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleEdit = () => {
    const newText = window.prompt('Edit message:', content);
    if (newText && newText.trim()) editAndResend(id, newText.trim());
  };

  return (
    <Box sx={{ display: 'flex', gap: 0.2, opacity: 0, transition: 'opacity 0.15s', '.msg-row:hover &': { opacity: 1 }, justifyContent: isUser ? 'flex-end' : 'flex-start', px: 1 }}>
      <Tooltip title="Copy" placement="top"><IconButton size="small" onClick={handleCopy} sx={{ p: 0.3, color: copied ? c.success : c.textMuted, '&:hover': { color: c.text } }}>{copied ? <IconCheck size={12} /> : <IconCopy size={12} />}</IconButton></Tooltip>
      {!isUser && (
        <>
          <Tooltip title="Regenerate" placement="top"><IconButton size="small" onClick={onRegenerate} sx={{ p: 0.3, color: c.textMuted, '&:hover': { color: c.text } }}><IconRefresh size={12} /></IconButton></Tooltip>
          <Tooltip title={feedback === 'up' ? 'Thanks!' : 'Helpful'} placement="top"><IconButton size="small" onClick={() => setFeedback(f => f === 'up' ? null : 'up')} sx={{ p: 0.3, color: feedback === 'up' ? c.success : c.textMuted, '&:hover': { color: c.success } }}><IconThumbUp size={12} /></IconButton></Tooltip>
          <Tooltip title={feedback === 'down' ? 'Noted' : 'Not helpful'} placement="top"><IconButton size="small" onClick={() => setFeedback(f => f === 'down' ? null : 'down')} sx={{ p: 0.3, color: feedback === 'down' ? c.error : c.textMuted, '&:hover': { color: c.error } }}><IconThumbDown size={12} /></IconButton></Tooltip>
        </>
      )}
      {isUser && (
        <Tooltip title="Edit" placement="top"><IconButton size="small" onClick={handleEdit} sx={{ p: 0.3, color: c.textMuted, '&:hover': { color: c.text } }}><IconPencil size={12} /></IconButton></Tooltip>
      )}
    </Box>
  );
}

export function TextBlock({ content, isUser, msgId, onRegenerate }: { content: string; isUser?: boolean; msgId?: string; onRegenerate?: () => void }) {
  const c = useChatTheme();
  return (
    <Box className="msg-row" sx={{ mb: 0.5 }}>
      <Box
        sx={{
          display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
          px: 1,
          animation: `${messageIn} 0.35s cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      >
        {!isUser && (
          <IconSparkles size={14} style={{ color: c.accent, marginRight: 8, marginTop: 10, opacity: 0.6, flexShrink: 0 }} />
        )}
        <Box
          sx={{
            maxWidth: '85%', px: 2, py: 1.2,
            background: isUser ? c.userBg : c.aiBg,
            borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            border: '1px solid',
            borderColor: isUser ? c.userBorder : c.aiBorder,
            color: isUser ? c.userText : c.text,
            fontFamily: '"DM Sans", Inter, sans-serif',
            fontSize: '0.88rem', lineHeight: 1.55,
            wordBreak: 'break-word',
          }}
        >
          {isUser ? (
            <Typography sx={{ fontSize: '0.88rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{content}</Typography>
          ) : (
            <MarkdownRenderer text={content} />
          )}
        </Box>
      </Box>
      {!isUser && content && !content.startsWith('{') && (
        <MessageActions id={msgId || ''} content={content} onRegenerate={onRegenerate} />
      )}
      {isUser && (
        <MessageActions id={msgId || ''} content={content} isUser onRegenerate={onRegenerate} />
      )}
    </Box>
  );
}

const dotPulse = keyframes`
  0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
`;

export function StreamingBlock({ label = 'Thinking' }: { label?: string }) {
  const c = useChatTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, mb: 1.5, animation: `${messageIn} 0.3s ease-out` }}>
      <Box sx={{ display: 'flex', gap: 0.4, ml: 0.5 }}>
        {[0, 1, 2].map(i => (
          <Box key={i} sx={{
            width: 6, height: 6, borderRadius: '50%', bgcolor: c.accent,
            animation: `${dotPulse} 1.4s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </Box>
      <Typography sx={{ fontSize: '0.8rem', color: c.textSecondary, fontWeight: 500 }}>
        {label}…
      </Typography>
    </Box>
  );
}

export function ToolLoadingBlock({ label, step, total }: { label: string; step?: number; total?: number }) {
  const c = useChatTheme();
  const progressText = step && total && total > 1 ? `Step ${step} of ${total}` : null;
  return (
    <Box
      sx={{
        mx: 2, mb: 1, px: 2.5, py: 1.4,
        borderRadius: 2.5,
        border: `1px solid ${c.accentBorder}`,
        bgcolor: c.accentBg,
        display: 'flex', alignItems: 'center', gap: 1.5,
        animation: `${messageIn} 0.3s ease-out`,
      }}
    >
      <Box sx={{ position: 'relative', width: 20, height: 20, flexShrink: 0 }}>
        <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${c.border}`, borderTopColor: c.accent, animation: 'spin 0.8s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.78rem', color: c.text, fontWeight: 500, lineHeight: 1.3 }}>
          {label}
        </Typography>
        {progressText && (
          <Typography sx={{ fontSize: '0.65rem', color: c.textMuted, mt: 0.15 }}>
            {progressText}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export function MetricBlock({ result }: { result: ToolResult }) {
  const c = useChatTheme();
  const data = result.data as Record<string, unknown>;
  const total = data.totalSales ?? data.total ?? data.totalRevenue ?? data.value ?? null;
  const firstItem = Array.isArray(data.items) ? data.items[0] as Record<string, unknown> | undefined : undefined;
  const displayValue = total ?? firstItem?.value ?? null;
  const subtitle = (data.secondaryLabel ?? firstItem?.subtitle ?? data.period ?? data.note ?? '') as string;

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
      {displayValue !== null && displayValue !== undefined && (
        <Typography
          sx={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: '2rem', fontWeight: 400,
            color: c.accent, lineHeight: 1.2,
          }}
        >
          {formatValue(displayValue, data.currency)}
        </Typography>
      )}
      {Boolean(data.primaryLabel) && (
        <Typography sx={{ fontSize: '0.72rem', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {String(data.primaryLabel)}
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
  const rawItems = (data.items as Array<Record<string, unknown>>) ?? [];
  const labelValues: Array<Record<string, unknown>> = Array.isArray(data.labels) && Array.isArray(data.values)
    ? (data.labels as unknown[]).map((label, i) => ({ name: String(label), value: (data.values as unknown[])[i] }))
    : [];
  const items: Array<Record<string, unknown>> = rawItems.length ? rawItems : labelValues;
  const maxValue = Math.max(...items.map(item => Math.abs(asNumber(item.value))), 0);
  const totalValue = items.reduce((sum, item) => sum + Math.max(0, asNumber(item.value)), 0);

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
      {items.length === 0 && (
        <Typography sx={{ fontSize: '0.84rem', color: c.textMuted }}>
          No chart data returned for this question.
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
        {items.map((item, i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: 'minmax(84px, 1fr) minmax(120px, 2fr) auto', alignItems: 'center', gap: 1.2 }}>
            <Typography sx={{ fontSize: '0.82rem', color: c.text, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {String(item.name ?? item.label ?? '')}
            </Typography>
            <Box sx={{ height: 8, borderRadius: 4, background: c.inputBg, overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%', borderRadius: 4,
                  width: `${Math.min(100, Math.max(items.length > 1 ? 3 : 100, maxValue > 0 ? (Math.abs(asNumber(item.value)) / maxValue) * 100 : 0))}%`,
                  background: i === 0
                    ? `linear-gradient(90deg, ${c.accent} 0%, ${c.accent}dd 100%)`
                    : c.accent,
                  opacity: Math.max(0.48, 1 - i * 0.08),
                }}
              />
            </Box>
            <Box sx={{ minWidth: 74 }}>
              <Typography sx={{ fontSize: '0.78rem', color: c.accent, fontWeight: 600, textAlign: 'right' }}>
                {formatValue(item.value, data.currency)}
              </Typography>
              {result.type === 'proportion' && totalValue > 0 && (
                <Typography sx={{ fontSize: '0.68rem', color: c.textMuted, textAlign: 'right' }}>
                  {Math.round((Math.max(0, asNumber(item.value)) / totalValue) * 100)}%
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
      {Boolean(data.from || data.to || data.valueLabel) && (
        <Typography sx={{ fontSize: '0.7rem', color: c.textMuted, mt: 1.4, textAlign: 'right' }}>
          {[data.valueLabel ? String(data.valueLabel) : null, data.from && data.to ? `${String(data.from)} to ${String(data.to)}` : null].filter(Boolean).join(' · ')}
        </Typography>
      )}
    </Box>
  );
}

export function ToolTextBlock({ result }: { result: ToolResult }) {
  const c = useChatTheme();
  const data = result.data as Record<string, unknown>;
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
      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: c.textSecondary, mb: 0.8 }}>
        {result.title}
      </Typography>
      <Typography sx={{ fontSize: '0.86rem', color: c.text, lineHeight: 1.55 }}>
        {String(data.message ?? data.status ?? result.title)}
      </Typography>
    </Box>
  );
}

export function ExecutiveBriefingBlock({ result }: { result: ToolResult }) {
  const c = useChatTheme();
  const data = result.data as Record<string, unknown>;
  const metrics = (data.metrics as Array<Record<string, unknown>>) ?? [];
  const sections = (data.sections as Array<Record<string, unknown>>) ?? [];

  return (
    <Box
      sx={{
        mx: 1, mb: 1.5, p: 2,
        animation: `${messageIn} 0.35s cubic-bezier(0.16, 1, 0.3, 1)`,
        background: c.surfaceHover,
        borderRadius: 3,
        border: `1px solid ${c.accentBorder}`,
        boxShadow: `0 16px 38px ${c.accent}12`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
        <IconSparkles size={16} style={{ color: c.accent }} />
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: c.accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Executive Briefing
        </Typography>
        <Typography sx={{ ml: 'auto', fontSize: '0.72rem', color: c.textMuted }}>
          {String(data.date ?? '')}
        </Typography>
      </Box>

      <Typography sx={{ fontSize: '0.95rem', color: c.text, lineHeight: 1.45, fontWeight: 600, mb: 1.6 }}>
        {String(data.headline ?? result.title)}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, mb: 1.6 }}>
        {metrics.map((metric, i) => {
          const change = metric.changePct;
          const isPositive = change === null || change === undefined || asNumber(change) >= 0;
          const TrendIcon = isPositive ? IconArrowUpRight : IconArrowDownRight;
          return (
            <Box key={i} sx={{ p: 1.15, borderRadius: 2, border: `1px solid ${c.border}`, background: c.inputBg, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.68rem', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {String(metric.label ?? '')}
              </Typography>
              <Typography sx={{ fontSize: '1rem', color: c.text, fontWeight: 700, mt: 0.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatValue(metric.value, data.currency)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.4 }}>
                <TrendIcon size={13} style={{ color: isPositive ? c.success : c.error }} />
                <Typography sx={{ fontSize: '0.68rem', color: isPositive ? c.success : c.error, fontWeight: 600 }}>
                  {formatPercent(change)}
                </Typography>
                <Typography sx={{ fontSize: '0.66rem', color: c.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {String(metric.comparisonLabel ?? '')}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1 }}>
        {sections.map((section, idx) => {
          const items = (section.items as Array<Record<string, unknown>>) ?? [];
          return (
            <Box key={idx}>
              <Typography sx={{ fontSize: '0.74rem', color: c.textSecondary, fontWeight: 700, mb: 0.55, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {String(section.title ?? '')}
              </Typography>
              {items.length === 0 ? (
                <Typography sx={{ fontSize: '0.8rem', color: c.textMuted }}>No urgent items.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.45 }}>
                  {items.slice(0, 4).map((item, itemIdx) => (
                    <Box key={itemIdx} sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'baseline' }}>
                      <Typography sx={{ fontSize: '0.82rem', color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {String(item.name ?? '')}
                      </Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: c.accent, fontWeight: 600 }}>
                        {formatValue(item.value, section.title === 'Low-stock risks' || section.title === 'Expiry watch' ? undefined : data.currency)}
                      </Typography>
                      {Boolean(item.subtitle) && (
                        <Typography sx={{ gridColumn: '1 / -1', fontSize: '0.68rem', color: c.textMuted, mt: -0.2 }}>
                          {String(item.subtitle)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {Boolean(data.recommendedAction) && (
        <Box sx={{ mt: 1.6, p: 1.25, borderRadius: 2, background: c.accentBg, border: `1px solid ${c.accentBorder}` }}>
          <Typography sx={{ fontSize: '0.68rem', color: c.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.35 }}>
            Do this first
          </Typography>
          <Typography sx={{ fontSize: '0.84rem', color: c.text, lineHeight: 1.45 }}>
            {String(data.recommendedAction)}
          </Typography>
        </Box>
      )}
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
