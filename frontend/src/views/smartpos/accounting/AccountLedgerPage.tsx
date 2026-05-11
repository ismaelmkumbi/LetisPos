/**
 * Account Ledger (General Ledger) — shows all transactions for a selected
 * Chart of Account, with running balances and pagination.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Card,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { listAccounts, type ChartOfAccount } from 'src/api/smartpos/accounting';
import { getAccountLedger, type LedgerEntry } from 'src/api/smartpos/payments';
import type { Page } from 'src/api/smartpos/types';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const PAGE_SIZE = 25;
const fmt = formatMoney;

export default function AccountLedgerPage() {
  const { user } = useAuth();

  // ── Accounts dropdown ──────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAccountsLoading(true);
    listAccounts()
      .then((items) => { if (!cancelled) setAccounts(items); })
      .catch(() => { /* ignore — dropdown will just be empty */ })
      .finally(() => { if (!cancelled) setAccountsLoading(false); });
    return () => { cancelled = true; };
  }, [user?.tenantId]);

  // ── Ledger ─────────────────────────────────────────────────────────────
  const [ledgerPage, setLedgerPage] = useState<Page<LedgerEntry> | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const fetchLedger = useCallback(
    (accountId: string, pageNum: number) => {
      let cancelled = false;
      setLedgerLoading(true);
      setLedgerError(null);
      getAccountLedger(accountId, { page: pageNum, size: PAGE_SIZE })
        .then((p) => { if (!cancelled) setLedgerPage(p); })
        .catch((e) => {
          if (!cancelled) setLedgerError(e instanceof Error ? e.message : 'Failed to load ledger');
        })
        .finally(() => { if (!cancelled) setLedgerLoading(false); });
      return () => { cancelled = true; };
    },
    [],
  );

  useEffect(() => {
    if (!selectedAccount) {
      setLedgerPage(null);
      return;
    }
    setPage(0);
    const cancel = fetchLedger(selectedAccount.id, 0);
    return cancel;
  }, [selectedAccount, fetchLedger]);

  const handlePageChange = (newPage: number) => {
    if (!selectedAccount) return;
    setPage(newPage);
    fetchLedger(selectedAccount.id, newPage);
  };

  // ── Derived balance (last entry's balanceAfter, or 0) ──────────────────
  const currentBalance =
    ledgerPage && ledgerPage.content.length > 0
      ? ledgerPage.content[ledgerPage.content.length - 1].balanceAfter
      : 0;

  // ── Table columns ──────────────────────────────────────────────────────
  const cols: Column<LedgerEntry>[] = [
    {
      key: 'txnDate',
      label: 'Date',
      width: 120,
      render: (e) =>
        new Date(e.txnDate).toLocaleDateString('en-TZ', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    {
      key: 'reference',
      label: 'Reference',
      width: 160,
      render: (e) => {
        const type = e.referenceType ?? '';
        const id = e.referenceId ? e.referenceId.slice(0, 8) : '';
        return (
          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {type}{id ? ` #${id}` : ''}
          </span>
        );
      },
    },
    {
      key: 'description',
      label: 'Description',
      render: (e) => e.description ?? '—',
    },
    {
      key: 'debit',
      label: 'Debit',
      align: 'right',
      render: (e) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', color: e.debit ? brand.error.dark : brand.neutral[400] }}>
          {e.debit ? fmt(e.debit) : '—'}
        </span>
      ),
    },
    {
      key: 'credit',
      label: 'Credit',
      align: 'right',
      render: (e) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', color: e.credit ? brand.success.dark : brand.neutral[400] }}>
          {e.credit ? fmt(e.credit) : '—'}
        </span>
      ),
    },
    {
      key: 'balanceAfter',
      label: 'Running Balance',
      align: 'right',
      render: (e) => (
        <span style={{
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 600,
          color: e.balanceAfter >= 0 ? brand.neutral[800] : brand.error.dark,
        }}>
          {fmt(e.balanceAfter)}
        </span>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="General Ledger"
        subtitle="View all transactions for a selected general ledger account"
      />

      {/* Account selector */}
      <Autocomplete<ChartOfAccount>
        value={selectedAccount}
        onChange={(_, v) => setSelectedAccount(v)}
        options={accounts}
        loading={accountsLoading}
        getOptionLabel={(a) => `${a.code} — ${a.name}`}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Select account"
            size="small"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {accountsLoading && <CircularProgress size={18} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 },
              minWidth: 360,
            }}
          />
        )}
        sx={{ mb: 3, maxWidth: 480 }}
      />

      {selectedAccount && (
        <>
          {/* Account info header */}
          <Card
            elevation={0}
            sx={{
              mb: 3,
              p: 2.5,
              border: `1px solid ${brand.neutral[200]}`,
              borderRadius: '10px',
              bgcolor: brand.neutral[50],
            }}
          >
            <Stack direction="row" spacing={4} alignItems="center" flexWrap="wrap">
              <Box>
                <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Account
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: brand.neutral[900] }}>
                  {selectedAccount.code} — {selectedAccount.name}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Class
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                  {selectedAccount.accountClass}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Normal Balance
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                  {selectedAccount.normalBalance === 'DR' ? 'Debit' : 'Credit'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Current Balance
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: currentBalance >= 0 ? brand.success.dark : brand.error.dark,
                  }}
                >
                  {ledgerLoading && !ledgerPage ? '...' : fmt(currentBalance)}
                </Typography>
              </Box>
            </Stack>
          </Card>

          {/* Ledger table */}
          {ledgerError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLedgerError(null)}>
              {ledgerError}
            </Alert>
          )}

          <DataTable
            columns={cols}
            rows={ledgerPage?.content ?? []}
            loading={ledgerLoading}
            page={page}
            pageSize={PAGE_SIZE}
            totalPages={ledgerPage?.totalPages ?? 1}
            totalElements={ledgerPage?.totalElements ?? 0}
            onPageChange={handlePageChange}
            getRowKey={(e) => e.id}
            itemLabel="entries"
            tableKey="account-ledger"
            enableColumnVisibility
            enableExport
            exportFileName="general-ledger"
            toolbarTitle="Ledger entries"
            emptyText="No ledger entries found for this account"
          />
        </>
      )}
    </Box>
  );
}
