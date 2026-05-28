import { useState } from 'react';
import {
  Box, Stack, Typography, Tabs, Tab, Paper,
} from '@mui/material';
import {
  IconFileInvoice,
  IconReceipt,
  IconMail,
  IconDashboard,
} from '@tabler/icons-react';
import { useBrand } from 'src/context/smartpos/BrandContext';

type PreviewTab = 'invoice' | 'receipt' | 'email' | 'dashboard';

const TABS: { value: PreviewTab; label: string; icon: React.ReactElement }[] = [
  { value: 'invoice', label: 'Invoice', icon: <IconFileInvoice size={16} /> },
  { value: 'receipt', label: 'Receipt', icon: <IconReceipt size={16} /> },
  { value: 'email', label: 'Email', icon: <IconMail size={16} /> },
  { value: 'dashboard', label: 'Dashboard', icon: <IconDashboard size={16} /> },
];

const SAMPLE_LINES = [
  { name: 'Premium Coffee Beans', qty: 2, price: '24,000' },
  { name: 'Organic Green Tea', qty: 1, price: '12,500' },
  { name: 'Honey Jar 500g', qty: 3, price: '18,000' },
];

export default function BrandPreviewPanel() {
  const [tab, setTab] = useState<PreviewTab>('invoice');
  const { profile } = useBrand();

  if (!profile) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '14px',
        border: '1px solid var(--bp-border-default, #E2E8F0)',
        overflow: 'hidden',
      }}
    >
      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{
          borderBottom: '1px solid var(--bp-border-default, #E2E8F0)',
          bgcolor: 'var(--bp-surface-card, #FFF)',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.75rem',
            minHeight: 42,
            color: 'var(--bp-text-secondary, #64748B)',
            '&.Mui-selected': { color: 'var(--bp-color-primary, #16A34A)' },
          },
          '& .MuiTabs-indicator': {
            backgroundColor: 'var(--bp-color-primary, #16A34A)',
          },
        }}
      >
        {TABS.map((t) => (
          <Tab
            key={t.value}
            value={t.value}
            icon={t.icon}
            label={t.label}
            iconPosition="start"
          />
        ))}
      </Tabs>

      {/* Preview area */}
      <Box sx={{ p: 2.5, bgcolor: 'var(--bp-surface-page, #F8FAFC)', minHeight: 340 }}>
        {tab === 'invoice' && <InvoicePreview />}
        {tab === 'receipt' && <ReceiptPreview />}
        {tab === 'email' && <EmailPreview />}
        {tab === 'dashboard' && <DashboardPreview />}
      </Box>
    </Paper>
  );
}

// ── Invoice Preview ──────────────────────────────────────────────────────

function InvoicePreview() {
  const { profile } = useBrand();
  const businessName = profile?.businessName || 'Your Business';

  return (
    <Box
      sx={{
        borderRadius: '10px',
        border: '1px solid var(--bp-border-default, #E2E8F0)',
        bgcolor: '#FFF',
        overflow: 'hidden',
        fontFamily: 'var(--bp-font-body)',
        maxWidth: 400,
        mx: 'auto',
      }}
    >
      {/* Header bar */}
      <Box
        sx={{
          px: 2, py: 1.5,
          background: 'linear-gradient(135deg, var(--bp-color-primary, #16A34A), var(--bp-color-primary-dark, #15803D))',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            {profile?.logoUrl && (
              <Box sx={{ width: 56, height: 28, borderRadius: '6px', bgcolor: 'rgba(255,255,255,0.9)', display: 'grid', placeItems: 'center', p: 0.3 }}>
                <Box component="img" src={profile.logoUrl} sx={{ maxHeight: 24, maxWidth: 50, objectFit: 'contain' }} />
              </Box>
            )}
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff', lineHeight: 1.2 }}>
                {businessName}
              </Typography>
              {profile?.tagline && (
                <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                  {profile.tagline}
                </Typography>
              )}
            </Box>
          </Stack>
          <Typography sx={{ fontWeight: 800, fontSize: '0.65rem', color: 'rgba(255,255,255,0.85)' }}>
            INVOICE
          </Typography>
        </Stack>
      </Box>

      {/* Meta */}
      <Box sx={{ px: 2, pt: 1.5 }}>
        <Stack direction="row" spacing={3} sx={{ mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: '0.58rem', color: 'var(--bp-text-secondary, #64748B)', fontWeight: 600 }}>DATE</Typography>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700 }}>22 May 2026</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.58rem', color: 'var(--bp-text-secondary, #64748B)', fontWeight: 600 }}>INVOICE #</Typography>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--bp-color-primary, #16A34A)' }}>INV-0042</Typography>
          </Box>
        </Stack>

        {/* Items */}
        <Box sx={{ borderTop: '1px solid var(--bp-border-default, #E2E8F0)', pt: 1 }}>
          <Stack direction="row" sx={{ mb: 0.5 }}>
            {['Item', 'Qty', 'Price'].map((h, i) => (
              <Typography key={h} sx={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--bp-text-secondary, #64748B)', textTransform: 'uppercase', flex: i === 0 ? 2 : 1, textAlign: i === 0 ? 'left' : 'right' }}>
                {h}
              </Typography>
            ))}
          </Stack>
          {SAMPLE_LINES.map((line, i) => (
            <Stack key={i} direction="row" sx={{ py: 0.3 }}>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, flex: 2 }}>{line.name}</Typography>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, flex: 1, textAlign: 'right' }}>{line.qty}</Typography>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, flex: 1, textAlign: 'right' }}>{line.price}</Typography>
            </Stack>
          ))}
        </Box>

        {/* Total */}
        <Box sx={{ mt: 1, pt: 1, borderTop: '2px solid var(--bp-color-primary-soft, rgba(22,163,74,0.08))', display: 'flex', justifyContent: 'flex-end' }}>
          <Stack direction="row" spacing={2} alignItems="baseline">
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--bp-text-secondary, #64748B)' }}>TOTAL</Typography>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--bp-color-primary, #16A34A)' }}>54,500</Typography>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ px: 2, py: 1, bgcolor: 'var(--bp-surface-page, #F8FAFC)', borderTop: '1px solid var(--bp-border-default, #E2E8F0)', mt: 1 }}>
        <Typography sx={{ fontSize: '0.58rem', color: 'var(--bp-text-secondary, #64748B)', textAlign: 'center', fontWeight: 600 }}>
          {businessName} — Thank you for your purchase
        </Typography>
      </Box>
    </Box>
  );
}

// ── Receipt Preview ──────────────────────────────────────────────────────

function ReceiptPreview() {
  const { profile } = useBrand();
  const businessName = profile?.businessName || 'Your Business';

  return (
    <Box
      sx={{
        borderRadius: '10px',
        border: '1px solid var(--bp-border-default, #E2E8F0)',
        bgcolor: '#FFFEF7',
        maxWidth: 280,
        mx: 'auto',
        p: 2,
        fontFamily: '"Courier New", monospace',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.03)',
      }}
    >
      {/* Paper edge effect */}
      <Box sx={{ textAlign: 'center', mb: 1 }}>
        {profile?.logoThermalUrl ? (
          <Box component="img" src={profile.logoThermalUrl} sx={{ height: 36, mb: 0.5 }} />
        ) : (
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: '#000', fontFamily: '"Courier New", monospace' }}>
            {businessName.toUpperCase()}
          </Typography>
        )}
        <Typography sx={{ fontSize: '0.5rem', color: '#555', fontFamily: '"Courier New", monospace' }}>
          {profile?.tagline || 'Your trusted partner'}
        </Typography>
      </Box>

      <Box sx={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', py: 0.5, mb: 0.5 }}>
        <Typography sx={{ fontSize: '0.48rem', fontFamily: '"Courier New", monospace', textAlign: 'center', color: '#333' }}>
          RECEIPT #RCP-0042
        </Typography>
        <Typography sx={{ fontSize: '0.48rem', fontFamily: '"Courier New", monospace', textAlign: 'center', color: '#666' }}>
          22 May 2026 14:32
        </Typography>
      </Box>

      {SAMPLE_LINES.map((line, i) => (
        <Stack key={i} direction="row" justifyContent="space-between" sx={{ mb: 0.2 }}>
          <Typography sx={{ fontSize: '0.5rem', fontFamily: '"Courier New", monospace', color: '#000' }}>
            {line.name.substring(0, 18)}
          </Typography>
          <Typography sx={{ fontSize: '0.5rem', fontFamily: '"Courier New", monospace', color: '#000' }}>
            x{line.qty}  {line.price}
          </Typography>
        </Stack>
      ))}

      <Box sx={{ borderTop: '1px solid #000', mt: 0.5, pt: 0.5 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, fontFamily: '"Courier New", monospace' }}>TOTAL</Typography>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, fontFamily: '"Courier New", monospace' }}>54,500</Typography>
        </Stack>
      </Box>

      <Typography sx={{ fontSize: '0.42rem', fontFamily: '"Courier New", monospace', textAlign: 'center', color: '#888', mt: 0.75 }}>
        Thank you for your purchase{'\n'}Powered by LetisPOS
      </Typography>
    </Box>
  );
}

// ── Email Preview ────────────────────────────────────────────────────────

function EmailPreview() {
  const { profile } = useBrand();
  const businessName = profile?.businessName || 'Your Business';

  return (
    <Box
      sx={{
        borderRadius: '10px',
        border: '1px solid var(--bp-border-default, #E2E8F0)',
        bgcolor: '#F5F5F5',
        maxWidth: 400,
        mx: 'auto',
        overflow: 'hidden',
        fontFamily: 'var(--bp-font-body)',
      }}
    >
      {/* Email chrome */}
      <Box sx={{ bgcolor: '#E0E0E0', px: 1.5, py: 0.5 }}>
        <Typography sx={{ fontSize: '0.55rem', color: '#666', fontWeight: 600 }}>
          To: customer@example.com
        </Typography>
        <Typography sx={{ fontSize: '0.55rem', color: '#666', fontWeight: 600 }}>
          Subject: Your invoice INV-0042 from {businessName}
        </Typography>
      </Box>

      {/* Email body */}
      <Box sx={{ bgcolor: '#FFF', p: 2 }}>
        {/* Email header with brand */}
        <Box sx={{ textAlign: 'center', mb: 1.5, pb: 1.5, borderBottom: '3px solid var(--bp-color-primary, #16A34A)' }}>
          {profile?.logoUrl && (
            <Box component="img" src={profile.logoUrl} sx={{ height: 32, mb: 0.5, objectFit: 'contain' }} />
          )}
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--bp-color-primary, #16A34A)' }}>
            {businessName}
          </Typography>
        </Box>

        <Typography sx={{ fontSize: '0.65rem', color: '#333', mb: 1 }}>
          Dear Customer,
        </Typography>
        <Typography sx={{ fontSize: '0.65rem', color: '#333', mb: 1 }}>
          Thank you for your purchase. Your invoice <strong>INV-0042</strong> for <strong>54,500</strong> is attached.
        </Typography>

        {/* CTA button */}
        <Box
          sx={{
            textAlign: 'center',
            py: 0.6,
            px: 2,
            borderRadius: 'var(--bp-radius-md, 8px)',
            bgcolor: 'var(--bp-color-primary, #16A34A)',
            color: '#FFF',
            fontWeight: 700,
            fontSize: '0.62rem',
            display: 'inline-block',
            mb: 1,
          }}
        >
          View Invoice
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid #E2E8F0', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.5rem', color: '#999' }}>
            {businessName} | {profile?.website || 'www.example.com'}
          </Typography>
          {profile?.facebook && (
            <Typography sx={{ fontSize: '0.45rem', color: '#BBB' }}>
              Follow us on social media
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ── Dashboard Preview ────────────────────────────────────────────────────

function DashboardPreview() {
  return (
    <Box
      sx={{
        borderRadius: '10px',
        border: '1px solid var(--bp-border-default, #E2E8F0)',
        bgcolor: '#FFF',
        maxWidth: 400,
        mx: 'auto',
        overflow: 'hidden',
        fontFamily: 'var(--bp-font-body)',
      }}
    >
      {/* Sidebar + content layout */}
      <Box sx={{ display: 'flex', height: 220 }}>
        {/* Mini sidebar */}
        <Box sx={{ width: 56, bgcolor: 'var(--bp-surface-sidebar, #1E293B)', py: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 'var(--bp-radius-md, 8px)', bgcolor: 'var(--bp-color-primary, #16A34A)', mb: 0.5 }} />
          {[...Array(5)].map((_, i) => (
            <Box key={i} sx={{ width: 28, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
          ))}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, p: 1.5 }}>
          {/* Top bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 800 }}>
              Dashboard
            </Typography>
            <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'var(--bp-color-primary-soft, rgba(22,163,74,0.08))' }} />
          </Box>

          {/* KPI cards */}
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            {[
              { label: 'Sales', value: '54.5K', color: 'var(--bp-color-primary, #16A34A)' },
              { label: 'Orders', value: '142', color: 'var(--bp-color-accent, #F59E0B)' },
            ].map((kpi) => (
              <Box
                key={kpi.label}
                sx={{
                  flex: 1,
                  p: 1,
                  borderRadius: 'var(--bp-radius-md, 8px)',
                  border: '1px solid var(--bp-border-default, #E2E8F0)',
                }}
              >
                <Typography sx={{ fontSize: '0.48rem', color: 'var(--bp-text-secondary, #64748B)', fontWeight: 600 }}>
                  {kpi.label}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: kpi.color }}>
                  {kpi.value}
                </Typography>
              </Box>
            ))}
          </Stack>

          {/* Mini chart */}
          <Box
            sx={{
              height: 64,
              borderRadius: 'var(--bp-radius-md, 8px)',
              border: '1px solid var(--bp-border-default, #E2E8F0)',
              p: 1,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 0.5,
            }}
          >
            {[40, 65, 45, 80, 55, 70, 90, 60, 75, 50].map((h, i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: '2px 2px 0 0',
                  bgcolor: i === 6 ? 'var(--bp-color-primary, #16A34A)' : 'var(--bp-color-primary-soft, rgba(22,163,74,0.08))',
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
