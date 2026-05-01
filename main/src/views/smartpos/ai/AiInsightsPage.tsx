/**
 * AI Insights — sales-trend narrative + free-form chat backed by Claude / OpenAI.
 * The "model" / "tokens" footer makes it obvious which provider answered.
 */
import { useState } from 'react';
import {
  Alert, Box, Button, Card, CircularProgress, MenuItem, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { IconSparkles } from '@tabler/icons-react';

import { aiChat, aiSalesTrend, type InsightResponse } from 'src/api/smartpos/ai';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function AiInsightsPage() {
  const [tab, setTab] = useState<'trend' | 'chat'>('trend');

  return (
    <>
      <PageHeader
        title="AI insights"
        subtitle="Claude / OpenAI–powered narratives over your real KPIs"
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="trend" label="Sales trend" />
        <Tab value="chat"  label="Ask anything" />
      </Tabs>

      {tab === 'trend' && <SalesTrendTab />}
      {tab === 'chat'  && <ChatTab />}
    </>
  );
}

// ----------------------------------------------------------------

function SalesTrendTab() {
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo]     = useState(todayIso());
  const [tone, setTone] = useState<'executive' | 'casual' | 'alert'>('executive');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InsightResponse | null>(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await aiSalesTrend({ dateFrom: from, dateTo: to, tone });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI call failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField type="date" label="From" size="small" value={from}
          onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="date" label="To" size="small" value={to}
          onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField select size="small" label="Tone" value={tone}
          onChange={(e) => setTone(e.target.value as 'executive' | 'casual' | 'alert')}
          sx={{ minWidth: 140 }}>
          <MenuItem value="executive">Executive</MenuItem>
          <MenuItem value="casual">Casual</MenuItem>
          <MenuItem value="alert">Alert</MenuItem>
        </TextField>
        <Button
          variant="contained" startIcon={loading ? <CircularProgress size={14} /> : <IconSparkles size={16} />}
          onClick={handleRun} disabled={loading}
          sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}
        >
          {loading ? 'Generating…' : 'Generate insight'}
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {result && <ResultCard result={result} />}
    </Stack>
  );
}

// ----------------------------------------------------------------

function ChatTab() {
  const [system, setSystem] = useState('You are a helpful retail-analytics assistant for a POS / ERP system.');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InsightResponse | null>(null);

  const handleAsk = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await aiChat({ prompt, systemPrompt: system });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI call failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <TextField label="System prompt" size="small" multiline minRows={2}
        value={system} onChange={(e) => setSystem(e.target.value)} fullWidth />
      <TextField label="Your question" size="small" multiline minRows={4} required
        value={prompt} onChange={(e) => setPrompt(e.target.value)} fullWidth
        placeholder="e.g. Why did our top product's sales drop last week?" />

      <Stack direction="row" justifyContent="flex-end">
        <Button variant="contained" startIcon={loading ? <CircularProgress size={14} /> : <IconSparkles size={16} />}
          onClick={handleAsk} disabled={loading || !prompt.trim()}
          sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>
          {loading ? 'Thinking…' : 'Ask AI'}
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {result && <ResultCard result={result} />}
    </Stack>
  );
}

// ----------------------------------------------------------------

function ResultCard({ result }: { result: InsightResponse }) {
  return (
    <Card elevation={0} sx={{
      border: `1px solid ${brand.neutral[200]}`, borderRadius: 3, p: 3,
      bgcolor: brand.neutral[50],
    }}>
      <Box sx={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: 1.6, color: brand.neutral[900] }}>
        {result.narrative}
      </Box>
      <Stack direction="row" spacing={2} sx={{ mt: 2, pt: 2, borderTop: `1px solid ${brand.neutral[200]}` }}>
        <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
          Provider: <strong>{result.provider}</strong>
        </Typography>
        <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
          Model: <strong>{result.model}</strong>
        </Typography>
        {(result.promptTokens != null || result.completionTokens != null) && (
          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
            Tokens: {result.promptTokens ?? 0} in / {result.completionTokens ?? 0} out
          </Typography>
        )}
        <Typography variant="caption" sx={{ color: brand.neutral[500], ml: 'auto' }}>
          {new Date(result.generatedAt).toLocaleString()}
        </Typography>
      </Stack>
    </Card>
  );
}
