/**
 * Journal entry editor — DR / CR lines with live balance check.
 *
 * Constraints (mirror backend):
 *   • each line must have DR XOR CR > 0 (never both, never neither)
 *   • sum(DR) must equal sum(CR) before posting
 *   • only postable (leaf) accounts are allowed in the picker
 *
 * "Save & post" creates DRAFT then immediately calls /post.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, IconButton, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlus, IconTrash } from '@tabler/icons-react';

import EditDrawer from 'src/components/smartpos/EditDrawer';
import {
  createJournalEntry, listAccounts,
  type ChartOfAccount, type JournalEntry, type JournalLineInput,
} from 'src/api/smartpos/accounting';
import type { UUID } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';

interface Row extends JournalLineInput {
  // local key — we don't have ids until persistence
  _key: number;
  _accountLabel?: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export interface JournalEntryEditDrawerProps {
  open: boolean;
  initial?: JournalEntry | null;
  onClose: () => void;
  onSaved: (j: JournalEntry) => void;
}

export default function JournalEntryEditDrawer({
  open, initial, onClose, onSaved,
}: JournalEntryEditDrawerProps) {
  const [ref, setRef]   = useState('');
  const [date, setDate] = useState(todayIso());
  const [memo, setMemo] = useState('');
  const [source, setSource] = useState('MANUAL');
  const [rows, setRows] = useState<Row[]>([
    { _key: 1, accountId: '' as UUID, debit: 0, credit: 0 },
    { _key: 2, accountId: '' as UUID, debit: 0, credit: 0 },
  ]);
  const [postableAccounts, setPostableAccounts] = useState<ChartOfAccount[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listAccounts().then((all) => setPostableAccounts(all.filter((a) => a.postable && a.active))).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (initial) {
      setRef(initial.ref);
      setDate(initial.entryDate);
      setMemo(initial.memo ?? '');
      setSource(initial.source ?? 'MANUAL');
      setRows(initial.lines.map((l, i) => ({
        _key: i + 1,
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        memo: l.memo ?? '',
        position: l.position,
      })));
    } else {
      setRef('');
      setDate(todayIso());
      setMemo('');
      setSource('MANUAL');
      setRows([
        { _key: 1, accountId: '' as UUID, debit: 0, credit: 0 },
        { _key: 2, accountId: '' as UUID, debit: 0, credit: 0 },
      ]);
    }
    setError(null);
  }, [initial, open]);

  const totalDr = useMemo(() => rows.reduce((s, r) => s + (Number(r.debit)  || 0), 0), [rows]);
  const totalCr = useMemo(() => rows.reduce((s, r) => s + (Number(r.credit) || 0), 0), [rows]);
  const balanced = Math.abs(totalDr - totalCr) < 0.005 && totalDr > 0;

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => r._key === key ? { ...r, ...patch } : r));

  const addRow = () =>
    setRows((rs) => [...rs, { _key: Date.now(), accountId: '' as UUID, debit: 0, credit: 0 }]);

  const removeRow = (key: number) =>
    setRows((rs) => rs.length > 2 ? rs.filter((r) => r._key !== key) : rs);

  const handleSave = async (postNow: boolean) => {
    if (!ref.trim()) { setError('Reference is required.'); return; }
    if (!balanced) { setError('Debits and credits must balance.'); return; }
    if (rows.some((r) => !r.accountId)) { setError('Pick an account for every line.'); return; }
    for (const r of rows) {
      const dr = Number(r.debit) || 0, cr = Number(r.credit) || 0;
      if ((dr > 0) === (cr > 0)) { setError('Each line must have either a debit OR a credit, not both.'); return; }
    }
    setSubmitting(true);
    setError(null);
    try {
      const saved = await createJournalEntry({
        ref, entryDate: date, memo, source,
        lines: rows.map((r, i) => ({
          accountId: r.accountId,
          debit: Number(r.debit) || 0,
          credit: Number(r.credit) || 0,
          memo: r.memo,
          position: i,
        })),
        postImmediately: postNow,
      });
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      onSubmit={() => handleSave(false)}
      submitting={submitting}
      title={initial ? 'Edit journal entry' : 'New journal entry'}
      subtitle={initial ? `${initial.ref} · ${initial.status}` : 'Manual GL posting'}
      submitLabel="Save draft"
      extraActions={(
        <Button
          variant="contained"
          disabled={submitting || !balanced}
          onClick={() => handleSave(true)}
          sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}
        >
          Save & post
        </Button>
      )}
    >
      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={2}>
        <TextField label="Ref" value={ref} onChange={(e) => setRef(e.target.value)}
          required size="small" sx={{ width: 160 }} />
        <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
          size="small" InputLabelProps={{ shrink: true }} />
        <TextField label="Source" value={source} onChange={(e) => setSource(e.target.value)}
          size="small" sx={{ minWidth: 140 }} />
      </Stack>
      <TextField label="Memo" value={memo} onChange={(e) => setMemo(e.target.value)}
        size="small" fullWidth />

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, color: brand.neutral[700], fontWeight: 700 }}>Lines</Typography>
        <Stack spacing={1}>
          {rows.map((r) => {
            const acc = postableAccounts.find((a) => a.id === r.accountId);
            return (
              <Stack key={r._key} direction="row" spacing={1} alignItems="center">
                <Autocomplete
                  sx={{ flex: 1, minWidth: 200 }}
                  options={postableAccounts}
                  value={acc ?? null}
                  onChange={(_, v) => updateRow(r._key, { accountId: v?.id ?? ('' as UUID), _accountLabel: v ? `${v.code} · ${v.name}` : undefined })}
                  getOptionLabel={(a) => `${a.code} — ${a.name}`}
                  renderInput={(params) => <TextField {...params} placeholder="Account…" size="small" />}
                  size="small"
                />
                <TextField
                  type="number" placeholder="DR" size="small" sx={{ width: 110 }}
                  value={r.debit ?? 0}
                  onChange={(e) => updateRow(r._key, { debit: Number(e.target.value), credit: 0 })}
                  InputProps={{ startAdornment: <InputAdornment position="start">DR</InputAdornment> }}
                />
                <TextField
                  type="number" placeholder="CR" size="small" sx={{ width: 110 }}
                  value={r.credit ?? 0}
                  onChange={(e) => updateRow(r._key, { credit: Number(e.target.value), debit: 0 })}
                  InputProps={{ startAdornment: <InputAdornment position="start">CR</InputAdornment> }}
                />
                <IconButton size="small" onClick={() => removeRow(r._key)} disabled={rows.length <= 2}>
                  <IconTrash size={16} />
                </IconButton>
              </Stack>
            );
          })}
        </Stack>
        <Button startIcon={<IconPlus size={16} />} size="small" onClick={addRow} sx={{ mt: 1 }}>
          Add line
        </Button>
      </Box>

      <Stack direction="row" justifyContent="space-between" sx={{
        bgcolor: balanced ? brand.success.light : brand.warning.light,
        color: balanced ? brand.success.dark : brand.warning.dark,
        p: 1.5, borderRadius: 2,
      }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {balanced ? '✓ Balanced' : `Out of balance · diff ${(totalDr - totalCr).toFixed(2)}`}
        </Typography>
        <Typography variant="body2">
          DR <strong>{totalDr.toFixed(2)}</strong> · CR <strong>{totalCr.toFixed(2)}</strong>
        </Typography>
      </Stack>
    </EditDrawer>
  );
}
