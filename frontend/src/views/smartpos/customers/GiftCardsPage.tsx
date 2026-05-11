import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlus, IconCash } from '@tabler/icons-react';

import {
  issueGiftCard, listGiftCards, redeemGiftCard,
  type GiftCard, type IssueGiftCardRequest, type RedeemGiftCardRequest,
} from 'src/api/smartpos/giftCards';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

function maskCard(cardNumber: string): string {
  if (cardNumber.length <= 4) return '****';
  return '****' + cardNumber.slice(-4);
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: brand.success.light, color: brand.success.dark },
  REDEEMED: { bg: brand.neutral[100], color: brand.neutral[600] },
  EXPIRED: { bg: brand.warning?.light ?? '#FFF3E0', color: brand.warning?.dark ?? '#E65100' },
};

export default function GiftCardsPage() {
  const [rows, setRows] = useState<GiftCard[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Issue dialog
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState<IssueGiftCardRequest>({ amount: 100 });
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issuedCard, setIssuedCard] = useState<GiftCard | null>(null);

  // Redeem dialog
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemTarget, setRedeemTarget] = useState<GiftCard | null>(null);
  const [redeemForm, setRedeemForm] = useState<RedeemGiftCardRequest>({ amount: 0 });
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listGiftCards(page, 50)
      .then((p) => { setRows(p.content); setTotalPages(p.totalPages || 1); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [page, refreshToken]);

  const handleIssue = async () => {
    if (!issueForm.amount || issueForm.amount <= 0) {
      setIssueError('Amount must be positive.');
      return;
    }
    setIssuing(true);
    setIssueError(null);
    try {
      const card = await issueGiftCard(issueForm);
      setIssuedCard(card);
      setRefreshToken((n) => n + 1);
    } catch (e: unknown) {
      setIssueError(e instanceof Error ? e.message : 'Issue failed');
    } finally {
      setIssuing(false);
    }
  };

  const openIssue = () => {
    setIssueForm({ amount: 100 });
    setIssueError(null);
    setIssuedCard(null);
    setIssueOpen(true);
  };

  const handleRedeem = async () => {
    if (!redeemTarget || !redeemForm.amount || redeemForm.amount <= 0) {
      setRedeemError('Amount must be positive.');
      return;
    }
    if (redeemForm.amount > redeemTarget.currentBalance) {
      setRedeemError('Amount exceeds current balance.');
      return;
    }
    setRedeeming(true);
    setRedeemError(null);
    try {
      await redeemGiftCard(redeemTarget.id, redeemForm);
      setRedeemOpen(false);
      setRefreshToken((n) => n + 1);
    } catch (e: unknown) {
      setRedeemError(e instanceof Error ? e.message : 'Redeem failed');
    } finally {
      setRedeeming(false);
    }
  };

  const openRedeem = (g: GiftCard) => {
    setRedeemTarget(g);
    setRedeemForm({ amount: 0 });
    setRedeemError(null);
    setRedeemOpen(true);
  };

  const columns: Column<GiftCard>[] = [
    {
      key: 'cardNumber', label: 'Card Number',
      render: (g) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {maskCard(g.cardNumber)}
        </Typography>
      ),
    },
    {
      key: 'currentBalance', label: 'Balance', align: 'right',
      render: (g) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {fmt(g.currentBalance)}
        </Typography>
      ),
    },
    {
      key: 'expiryDate', label: 'Expiry',
      render: (g) => (
        <Typography variant="body2">
          {g.expiryDate ? new Date(g.expiryDate).toLocaleDateString() : 'No expiry'}
        </Typography>
      ),
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (g) => {
        const c = STATUS_COLORS[g.status] || STATUS_COLORS.ACTIVE;
        return (
          <Chip
            label={g.status}
            size="small"
            sx={{ bgcolor: c.bg, color: c.color, fontWeight: 600 }}
          />
        );
      },
    },
    {
      key: 'actions',
      label: '',
      align: 'right' as const,
      width: 120,
      enableHiding: false,
      render: (g) => (
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end"
          onClick={(e) => e.stopPropagation()}>
          {g.status === 'ACTIVE' && (
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); openRedeem(g); }}
              sx={{ color: brand.accent[500], '&:hover': { color: brand.accent[700] } }}
            >
              <IconCash size={16} />
            </IconButton>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Gift Cards"
        subtitle="Issue and manage stored-value gift cards"
        action={{
          label: 'Issue Card',
          icon: <IconPlus size={18} />,
          onClick: openIssue,
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No gift cards issued yet."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowKey={(g) => g.id}
        tableKey="gift-cards"
        enableSorting
        toolbarTitle="Gift cards"
      />

      {/* Issue Card dialog */}
      <Dialog open={issueOpen} onClose={() => setIssueOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {issuedCard ? 'Card Issued!' : 'Issue New Gift Card'}
        </DialogTitle>
        <DialogContent>
          {issuedCard ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="success">
                Gift card issued successfully.
              </Alert>
              <TextField
                label="Card Number"
                value={issuedCard.cardNumber}
                fullWidth
                InputProps={{ readOnly: true }}
                sx={{ '& input': { fontFamily: 'monospace', fontWeight: 700 } }}
              />
              <Typography variant="body2" sx={{ color: brand.neutral[500] }}>
                Please save this card number — it cannot be recovered.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {issueError && <Alert severity="error">{issueError}</Alert>}
              <TextField
                label="Initial Amount"
                type="number"
                value={issueForm.amount}
                onChange={(e) => setIssueForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                size="small"
                required
                fullWidth
              />
              <TextField
                label="Expiry Date"
                type="date"
                value={issueForm.expiryDate ?? ''}
                onChange={(e) => setIssueForm((f) => ({ ...f, expiryDate: e.target.value || undefined }))}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Customer ID (optional)"
                value={issueForm.customerId ?? ''}
                onChange={(e) => setIssueForm((f) => ({ ...f, customerId: e.target.value || undefined }))}
                size="small"
                fullWidth
                helperText="Link this card to a customer"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {issuedCard ? (
            <Button variant="contained" onClick={() => setIssueOpen(false)} sx={{ fontWeight: 700 }}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="outlined" onClick={() => setIssueOpen(false)} disabled={issuing}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleIssue}
                disabled={issuing}
                sx={{ fontWeight: 700 }}
              >
                {issuing ? 'Issuing…' : 'Issue'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Redeem dialog */}
      <Dialog open={redeemOpen} onClose={() => setRedeemOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Redeem Gift Card</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {redeemError && <Alert severity="error">{redeemError}</Alert>}
            <Typography variant="body2">
              Card: <strong>{redeemTarget ? maskCard(redeemTarget.cardNumber) : ''}</strong>
            </Typography>
            <Typography variant="body2">
              Available balance: <strong>{redeemTarget ? fmt(redeemTarget.currentBalance) : ''}</strong>
            </Typography>
            <TextField
              label="Redeem Amount"
              type="number"
              value={redeemForm.amount}
              onChange={(e) => setRedeemForm((f) => ({ ...f, amount: Number(e.target.value) }))}
              size="small"
              required
              fullWidth
            />
            <TextField
              label="POS Reference"
              value={redeemForm.posReference ?? ''}
              onChange={(e) => setRedeemForm((f) => ({ ...f, posReference: e.target.value }))}
              size="small"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setRedeemOpen(false)} disabled={redeeming}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRedeem}
            disabled={redeeming}
            sx={{ fontWeight: 700 }}
          >
            {redeeming ? 'Redeeming…' : 'Redeem'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
