import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconCashRegister,
  IconDoorExit,
  IconDoorEnter,
  IconCoin,
  IconCash,
  IconReport,
} from '@tabler/icons-react';

import {
  getCurrentRegister,
  openRegister,
  closeRegister,
  getRegisterHistory,
  type CashRegisterSession,
} from 'src/api/smartpos/cashRegister';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

/** Tanzanian shilling denominations */
const DENOMINATIONS = [10000, 5000, 2000, 1000, 500, 200, 100, 50] as const;

interface DenomCount {
  denom: number;
  count: number;
}

export default function CashManagementPage() {
  const { user } = useAuth();
  const warehouseId = user?.warehouseIds?.[0] ?? '';

  // Current register
  const [current, setCurrent] = useState<CashRegisterSession | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  // History
  const [history, setHistory] = useState<CashRegisterSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Open dialog
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  // Close dialog
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [denomCounts, setDenomCounts] = useState<DenomCount[]>(
    DENOMINATIONS.map((d) => ({ denom: d, count: 0 })),
  );
  const [closeNotes, setCloseNotes] = useState('');
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  // Refresh trigger
  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = () => setRefreshToken((n) => n + 1);

  // Load current register & history
  useEffect(() => {
    if (!warehouseId) return;

    let cancelled = false;
    setLoadingCurrent(true);
    setLoadingHistory(true);
    setError(null);

    Promise.all([
      getCurrentRegister(warehouseId).catch(() => null),
      getRegisterHistory(warehouseId).catch(() => [] as CashRegisterSession[]),
    ])
      .then(([curr, hist]) => {
        if (!cancelled) {
          setCurrent(curr);
          setHistory(hist);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCurrent(false);
          setLoadingHistory(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [warehouseId, refreshToken]);

  const isOpen = current?.status === 'OPEN';

  // Stats
  const stats = useMemo(() => {
    const totalSessions = history.length;
    const totalCounted = history.reduce((s, r) => s + (r.countedCash ?? 0), 0);
    const totalExpected = history.reduce((s, r) => s + r.expectedCash, 0);
    const totalDifference = history.reduce(
      (s, r) => s + (r.countedCash ?? 0) - r.expectedCash,
      0,
    );
    return { totalSessions, totalCounted, totalExpected, totalDifference };
  }, [history]);

  // ---- Open Register ----
  const handleOpen = async () => {
    if (!warehouseId) return;
    setOpening(true);
    setOpenError(null);
    try {
      const session = await openRegister({ warehouseId, openingBalance });
      setCurrent(session);
      setOpenDialogOpen(false);
      refresh();
    } catch (e: unknown) {
      setOpenError(e instanceof Error ? e.message : 'Failed to open register');
    } finally {
      setOpening(false);
    }
  };

  // ---- Close Register ----
  const handleClose = async () => {
    if (!warehouseId) return;
    const totalCounted = denomCounts.reduce((s, d) => s + d.denom * d.count, 0);
    if (totalCounted <= 0 && !closeNotes) {
      setCloseError('Please enter denomination counts.');
      return;
    }
    setClosing(true);
    setCloseError(null);
    try {
      await closeRegister(warehouseId, {
        countedCash: totalCounted,
        notes: closeNotes || undefined,
      });
      setCurrent(null);
      setCloseDialogOpen(false);
      refresh();
    } catch (e: unknown) {
      setCloseError(e instanceof Error ? e.message : 'Failed to close register');
    } finally {
      setClosing(false);
    }
  };

  // Denom helpers
  const totalCounted = denomCounts.reduce((s, d) => s + d.denom * d.count, 0);
  const expectedCash = current?.expectedCash ?? 0;
  const difference = totalCounted - expectedCash;

  const setCount = (denom: number, val: number) => {
    setDenomCounts((prev) =>
      prev.map((d) => (d.denom === denom ? { ...d, count: Math.max(0, val) } : d)),
    );
  };

  // ---- History table columns ----
  const columns: Column<CashRegisterSession>[] = [
    {
      key: 'date',
      label: 'Date',
      render: (r) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: r.status === 'OPEN' ? brand.success.light : brand.neutral[200],
              color: r.status === 'OPEN' ? brand.success.dark : brand.neutral[600],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconCashRegister size={16} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>
              {new Date(r.openedAt).toLocaleDateString()}
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
              {new Date(r.openedAt).toLocaleTimeString()}
              {r.closedAt && ` - ${new Date(r.closedAt).toLocaleTimeString()}`}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (r) => (
        <Chip
          label={r.status === 'OPEN' ? 'Opening' : 'Closing'}
          size="small"
          sx={{
            bgcolor: r.status === 'OPEN' ? brand.info.light : brand.neutral[100],
            color: r.status === 'OPEN' ? brand.info.dark : brand.neutral[700],
            fontWeight: 600,
            borderRadius: '6px',
          }}
        />
      ),
    },
    {
      key: 'openingBalance',
      label: 'Opening Balance',
      align: 'right',
      render: (r) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {fmt(r.openingBalance)}
        </Typography>
      ),
    },
    {
      key: 'expectedCash',
      label: 'Expected',
      align: 'right',
      render: (r) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {fmt(r.expectedCash)}
        </Typography>
      ),
    },
    {
      key: 'countedCash',
      label: 'Counted',
      align: 'right',
      render: (r) =>
        r.countedCash != null ? (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color:
                r.countedCash >= r.expectedCash
                  ? brand.success.dark
                  : brand.error.dark,
            }}
          >
            {fmt(r.countedCash)}
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ color: brand.neutral[400] }}>
            —
          </Typography>
        ),
    },
    {
      key: 'difference',
      label: 'Diff',
      align: 'right',
      render: (r) => {
        if (r.countedCash == null) return <Typography variant="body2">—</Typography>;
        const diff = r.countedCash - r.expectedCash;
        return (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: diff >= 0 ? brand.success.dark : brand.error.dark,
            }}
          >
            {diff >= 0 ? '+' : ''}
            {fmt(diff)}
          </Typography>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <Chip
          label={r.status}
          size="small"
          sx={{
            bgcolor: r.status === 'OPEN' ? brand.success.light : brand.neutral[100],
            color: r.status === 'OPEN' ? brand.success.dark : brand.neutral[600],
            fontWeight: 700,
            borderRadius: '6px',
            fontSize: '0.7rem',
          }}
        />
      ),
    },
  ];

  // ---- Stat card ----
  const StatCard = ({
    icon,
    label,
    value,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
  }) => (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${brand.neutral[200]}`,
        borderRadius: 3,
        px: 2.5,
        py: 1.5,
        flex: 1,
        minWidth: 150,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color, lineHeight: 1.2 }}>
            {value}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
            {label}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Cash Management"
        subtitle="Track cash register sessions, open and close registers"
        status={{
          state: isOpen ? 'active' : 'closed',
          label: isOpen ? 'Register Open' : 'Register Closed',
        }}
        actions={[
          ...(isOpen
            ? [
                {
                  label: 'Close Register',
                  icon: <IconDoorExit size={18} />,
                  onClick: () => {
                    setDenomCounts(DENOMINATIONS.map((d) => ({ denom: d, count: 0 })));
                    setCloseNotes('');
                    setCloseError(null);
                    setCloseDialogOpen(true);
                  },
                  variant: 'accent' as const,
                },
              ]
            : [
                {
                  label: 'Open Register',
                  icon: <IconDoorEnter size={18} />,
                  onClick: () => {
                    setOpeningBalance(0);
                    setOpenError(null);
                    setOpenDialogOpen(true);
                  },
                  variant: 'primary' as const,
                },
              ]),
        ]}
      />

      {/* Stats section */}
      <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
        <StatCard
          icon={<IconCashRegister size={18} color={isOpen ? brand.success.main : brand.neutral[500]} />}
          label="Status"
          value={isOpen ? 'Open' : 'Closed'}
          color={isOpen ? brand.success.main : brand.neutral[500]}
        />
        <StatCard
          icon={<IconCoin size={18} color={brand.primary[600]} />}
          label="Opening Balance"
          value={fmt(current?.openingBalance ?? 0)}
          color={brand.primary[600]}
        />
        <StatCard
          icon={<IconCash size={18} color={brand.warning.main} />}
          label="Expected Cash"
          value={fmt(current?.expectedCash ?? 0)}
          color={brand.warning.main}
        />
        <StatCard
          icon={<IconReport size={18} color={brand.info.main} />}
          label="Total Sessions"
          value={stats.totalSessions}
          color={brand.info.main}
        />
      </Stack>

      {!warehouseId && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
          No warehouse assigned to your account. Contact an administrator to assign a warehouse.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* History table */}
      {warehouseId && (
      <DataTable
        columns={columns}
        rows={history}
        loading={loadingCurrent || loadingHistory}
        emptyText="No register sessions found. Open a register to get started."
        getRowKey={(r) => r.id}
        tableKey="cash-register-history"
        enableColumnVisibility
        enableExport
        exportFileName="cash-register-history"
        toolbarTitle="Register Sessions"
      />
      )}

      {/* ---- Open Register dialog ---- */}
      <Dialog
        open={openDialogOpen}
        onClose={() => setOpenDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Open Register</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {openError && (
              <Alert severity="error" sx={{ borderRadius: '8px' }}>
                {openError}
              </Alert>
            )}
            <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
              Enter the starting cash amount in the drawer.
            </Typography>
            <TextField
              size="small"
              type="number"
              label="Opening Balance"
              fullWidth
              value={openingBalance}
              onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleOpen}
            disabled={opening}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: brand.primary[600],
              '&:hover': { bgcolor: brand.primary[700] },
            }}
          >
            {opening ? 'Opening…' : 'Open Register'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Close Register dialog ---- */}
      <Dialog
        open={closeDialogOpen}
        onClose={() => setCloseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Close Register — Cash Count</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {closeError && (
              <Alert severity="error" sx={{ borderRadius: '8px' }}>
                {closeError}
              </Alert>
            )}

            <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[700] }}>
              Denomination Count
            </Typography>

            <Grid container spacing={1.5}>
              {denomCounts.map((d) => (
                <Grid size={{ xs: 6, sm: 3 }} key={d.denom}>
                  <TextField
                    size="small"
                    type="number"
                    label={`${d.denom.toLocaleString()} x`}
                    fullWidth
                    value={d.count || ''}
                    onChange={(e) => setCount(d.denom, Number(e.target.value) || 0)}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
              ))}
            </Grid>

            {/* Totals */}
            <Card
              elevation={0}
              sx={{
                border: `1px solid ${brand.neutral[200]}`,
                borderRadius: 2,
                p: 2,
                bgcolor: brand.neutral[50],
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
                    Total Counted
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {fmt(totalCounted)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
                    Expected Cash
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {fmt(expectedCash)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Difference
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: difference >= 0 ? brand.success.dark : brand.error.dark,
                    }}
                  >
                    {difference >= 0 ? '+' : ''}
                    {fmt(difference)}
                  </Typography>
                </Stack>
              </Stack>
            </Card>

            <TextField
              label="Notes"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="Any discrepancies or remarks..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCloseDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleClose}
            disabled={closing}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: brand.primary[600],
              '&:hover': { bgcolor: brand.primary[700] },
            }}
          >
            {closing ? 'Closing…' : 'Close Register'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
