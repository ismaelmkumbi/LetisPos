/**
 * Customer-display screen — open in a second monitor / tablet next to the till.
 * Subscribes to the SSE stream broadcast by sales-service:
 *   GET /api/v1/pos-terminals/{id}/stream
 *
 * Event types we render specially:
 *   CART_UPDATE / TOTALS  → updates the shown cart + totals
 *   PAYMENT               → "thank you" + change
 *   CLEAR                 → reset
 *   MESSAGE               → free-form banner
 */
import { useEffect, useRef, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router';

import { openDisplayStream } from 'src/api/smartpos/posTerminals';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

interface Line { name: string; qty: number; price: number; total: number }
interface Totals { subtotal: number; tax: number; discount: number; grandTotal: number }
interface CartPayload { lines?: Line[]; totals?: Totals }
interface PaymentPayload { amount: number; method?: string; change?: number }
interface MessagePayload { text: string }

const fmt = formatMoney;

export default function CustomerDisplayPage() {
  const { id } = useParams<{ id: string }>();
  const [lines, setLines] = useState<Line[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [payment, setPayment] = useState<PaymentPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!id) return;
    const es = openDisplayStream(id);
    esRef.current = es;

    es.addEventListener('connected', () => setConnected(true));

    es.addEventListener('CART_UPDATE', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        const payload = (data?.payload ?? data) as CartPayload;
        if (payload.lines)  setLines(payload.lines);
        if (payload.totals) setTotals(payload.totals);
        setPayment(null); setMessage(null);
      } catch { /* malformed */ }
    });

    es.addEventListener('TOTALS', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        const payload = (data?.payload ?? data) as Totals;
        setTotals(payload);
      } catch { /* malformed */ }
    });

    es.addEventListener('PAYMENT', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        setPayment((data?.payload ?? data) as PaymentPayload);
      } catch { /* malformed */ }
    });

    es.addEventListener('CLEAR', () => {
      setLines([]); setTotals(null); setPayment(null); setMessage(null);
    });

    es.addEventListener('MESSAGE', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        const payload = (data?.payload ?? data) as MessagePayload;
        setMessage(payload.text);
      } catch { /* malformed */ }
    });

    es.onerror = () => setConnected(false);

    return () => { es.close(); };
  }, [id]);

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: brand.neutral[900],
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Status bar */}
      <Stack direction="row" sx={{ p: 2, borderBottom: `1px solid ${brand.neutral[700]}` }} justifyContent="space-between">
        <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
          Customer display · {id?.slice(0, 8)}…
        </Typography>
        <Typography variant="caption" sx={{ color: connected ? brand.success.light : brand.error.light }}>
          {connected ? '● Connected' : '○ Reconnecting…'}
        </Typography>
      </Stack>

      {payment && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Typography variant="h2" sx={{ fontWeight: 800, color: brand.success.light }}>Thank you!</Typography>
          <Typography variant="h5" sx={{ mt: 2 }}>Paid {fmt(payment.amount)} {payment.method ? `· ${payment.method}` : ''}</Typography>
          {payment.change != null && (
            <Typography variant="h6" sx={{ mt: 1, color: brand.neutral[300] }}>Change: {fmt(payment.change)}</Typography>
          )}
        </Box>
      )}

      {!payment && message && (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Typography variant="h3" sx={{ fontWeight: 700 }}>{message}</Typography>
        </Box>
      )}

      {!payment && !message && (
        <Box sx={{ flex: 1, p: 4, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {lines.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="h4" sx={{ color: brand.neutral[500] }}>Welcome — start scanning items</Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {lines.map((l, i) => (
                  <Stack key={i} direction="row" justifyContent="space-between" alignItems="center"
                    sx={{ borderBottom: `1px solid ${brand.neutral[700]}`, py: 1.5 }}>
                    <Box>
                      <Typography variant="h6">{l.name}</Typography>
                      <Typography variant="body2" sx={{ color: brand.neutral[400] }}>
                        {l.qty} × {fmt(l.price)}
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{fmt(l.total)}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>

          {totals && (
            <Box sx={{ borderTop: `2px solid ${brand.accent[500]}`, mt: 2, pt: 2 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body1" sx={{ color: brand.neutral[300] }}>Subtotal</Typography>
                <Typography variant="body1">{fmt(totals.subtotal)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body1" sx={{ color: brand.neutral[300] }}>Tax</Typography>
                <Typography variant="body1">{fmt(totals.tax)}</Typography>
              </Stack>
              {totals.discount > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1" sx={{ color: brand.neutral[300] }}>Discount</Typography>
                  <Typography variant="body1">-{fmt(totals.discount)}</Typography>
                </Stack>
              )}
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>Total</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: brand.accent[300] ?? brand.accent[500] }}>
                  {fmt(totals.grandTotal)}
                </Typography>
              </Stack>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
