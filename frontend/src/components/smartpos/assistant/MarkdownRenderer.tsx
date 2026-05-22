import { useState } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useChatTheme } from './useChatTheme';

const darkStyle = {
  ...oneDark,
  'code[class*="language-"]': { ...oneDark['code[class*="language-"]'], background: 'transparent', fontFamily: '"JetBrains Mono", "DM Mono", "Courier New", monospace', fontSize: '0.78rem' },
  'pre[class*="language-"]': { ...oneDark['pre[class*="language-"]'], background: 'transparent', borderRadius: 10, margin: 0 },
};

interface Props { text: string }

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const c = useChatTheme();

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <Box sx={{ my: 1.5, borderRadius: 2, overflow: 'hidden', border: `1px solid ${c.border}` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 0.6, bgcolor: c.codeHeaderBg, borderBottom: `1px solid ${c.border}` }}>
        <Typography sx={{ fontSize: '0.68rem', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          {language || 'code'}
        </Typography>
        <Tooltip title={copied ? 'Copied' : 'Copy code'} placement="top">
          <IconButton size="small" onClick={handleCopy} sx={{ color: copied ? c.success : c.textMuted, p: 0.3, '&:hover': { color: c.text } }}>
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          </IconButton>
        </Tooltip>
      </Box>
      <SyntaxHighlighter language={language || 'text'} style={darkStyle} customStyle={{ padding: '12px 16px', margin: 0, background: c.codeBg }}>
        {code}
      </SyntaxHighlighter>
    </Box>
  );
}

function InlineCode({ children }: { children: string }) {
  const c = useChatTheme();
  return (
    <Box component="code" sx={{ px: 0.8, py: 0.2, borderRadius: 1, bgcolor: c.codeBg, color: c.accent, fontSize: '0.82em', fontFamily: '"JetBrains Mono", "DM Mono", monospace' }}>
      {children}
    </Box>
  );
}

export default function MarkdownRenderer({ text }: Props) {
  const c = useChatTheme();
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let inList: 'ol' | 'ul' | null = null;
  let listItems: React.ReactNode[] = [];
  let listIdx = 0;

  const flushList = () => {
    if (listItems.length > 0 && inList) {
      const Tag = inList === 'ol' ? 'ol' : 'ul';
      elements.push(<Box component={Tag} key={`l-${listIdx++}`} sx={{ m: 0, pl: 2.5, '& li': { mb: 0.3 } }}>{listItems}</Box>);
      listItems = []; inList = null;
    }
  };

  const flushCodeBlock = () => {
    if (inCodeBlock && codeLines.length > 0) {
      elements.push(<CodeBlock key={`cb-${elements.length}`} language={codeLang} code={codeLines.join('\n')} />);
      codeLines = []; codeLang = ''; inCodeBlock = false;
    }
  };

  const renderInline = (t: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    // Split on **bold**, `code`, [links](url), and escape sequences
    const regex = /(\*\*[^*]+\*\*)|(`[^`]+`)|(\[([^\]]+)\]\(([^)]+)\))/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(t)) !== null) {
      if (match.index > lastIdx) parts.push(t.slice(lastIdx, match.index));
      if (match[1]) parts.push(<Box component="strong" key={match.index} sx={{ fontWeight: 600, color: c.accent }}>{match[1].slice(2, -2)}</Box>);
      else if (match[2]) parts.push(<InlineCode key={match.index}>{match[2].slice(1, -1)}</InlineCode>);
      else if (match[3]) parts.push(<Box component="a" key={match.index} href={match[5]} target="_blank" sx={{ color: c.accent, textDecoration: 'underline', '&:hover': { opacity: 0.8 } }}>{match[4]}</Box>);
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < t.length) parts.push(t.slice(lastIdx));
    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block toggle
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) { flushCodeBlock(); }
      else { inCodeBlock = true; codeLang = trimmed.slice(3).trim(); }
      continue;
    }

    if (inCodeBlock) { codeLines.push(line); continue; }

    // Flush any running list if this line doesn't continue it
    if (!trimmed) { flushList(); elements.push(<Box key={`br-${i}`} sx={{ height: 8 }} />); continue; }

    // Headings
    const h1 = trimmed.match(/^# (.+)/);
    if (h1) { flushList(); elements.push(<Typography key={i} sx={{ fontSize: '1.1rem', fontWeight: 800, color: c.text, mt: 1, mb: 0.5, lineHeight: 1.3 }}>{renderInline(h1[1])}</Typography>); continue; }
    const h2 = trimmed.match(/^## (.+)/);
    if (h2) { flushList(); elements.push(<Typography key={i} sx={{ fontSize: '0.95rem', fontWeight: 700, color: c.text, mt: 0.8, mb: 0.4, lineHeight: 1.3 }}>{renderInline(h2[1])}</Typography>); continue; }
    const h3 = trimmed.match(/^### (.+)/);
    if (h3) { flushList(); elements.push(<Typography key={i} sx={{ fontSize: '0.85rem', fontWeight: 700, color: c.textSecondary, mt: 0.6, mb: 0.3 }}>{renderInline(h3[1])}</Typography>); continue; }

    // Blockquote
    const bq = trimmed.match(/^> (.+)/);
    if (bq) { flushList(); elements.push(<Box key={i} sx={{ pl: 2, borderLeft: `3px solid ${c.accent}60`, py: 0.3, my: 0.4 }}><Typography sx={{ fontSize: '0.82rem', color: c.textSecondary, fontStyle: 'italic' }}>{renderInline(bq[1])}</Typography></Box>); continue; }

    // Horizontal rule
    if (trimmed.match(/^(---|\*\*\*|___)$/)) { flushList(); elements.push(<Box key={i} sx={{ my: 1, borderTop: `1px solid ${c.border}` }} />); continue; }

    // Numbered list
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (olMatch) { if (inList !== 'ol') { flushList(); inList = 'ol'; } listItems.push(<li key={i}>{renderInline(olMatch[2])}</li>); continue; }

    // Bullet list
    const ulMatch = trimmed.match(/^[-*]\s+(.*)/);
    if (ulMatch) { if (inList !== 'ul') { flushList(); inList = 'ul'; } listItems.push(<li key={i}>{renderInline(ulMatch[1])}</li>); continue; }

    // Regular paragraph
    flushList();
    elements.push(<Typography key={i} sx={{ fontSize: '0.87rem', lineHeight: 1.6, color: c.text }}>{renderInline(trimmed)}</Typography>);
  }
  flushList();
  flushCodeBlock();

  return <>{elements}</>;
}
