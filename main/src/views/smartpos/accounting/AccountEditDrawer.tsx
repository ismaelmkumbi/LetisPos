import { useEffect, useState } from 'react';
import {
  Alert, FormControlLabel, MenuItem, Stack, Switch, TextField,
} from '@mui/material';

import EditDrawer from 'src/components/smartpos/EditDrawer';
import {
  createAccount, updateAccount,
  type AccountClass, type ChartOfAccount, type CreateAccountBody, type NormalBalance,
} from 'src/api/smartpos/accounting';

const empty: CreateAccountBody = {
  code: '', name: '', accountClass: 'ASSET', normalBalance: 'DR', postable: true, active: true,
};

export interface AccountEditDrawerProps {
  open: boolean;
  initial?: ChartOfAccount | null;
  onClose: () => void;
  onSaved: (a: ChartOfAccount) => void;
}

export default function AccountEditDrawer({ open, initial, onClose, onSaved }: AccountEditDrawerProps) {
  const [body, setBody] = useState<CreateAccountBody>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setBody({
        code: initial.code, name: initial.name,
        accountClass: initial.accountClass, normalBalance: initial.normalBalance,
        postable: initial.postable, active: initial.active,
        description: initial.description ?? undefined,
        parentId: initial.parentId ?? undefined,
      });
    } else {
      setBody(empty);
    }
    setError(null);
  }, [initial, open]);

  const patch = <K extends keyof CreateAccountBody>(k: K, v: CreateAccountBody[K]) =>
    setBody((b) => ({ ...b, [k]: v }));

  const handleSubmit = async () => {
    if (!body.code.trim() || !body.name.trim()) {
      setError('Code and name are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const saved = initial
        ? await updateAccount(initial.id, body)
        : await createAccount(body);
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
      onSubmit={handleSubmit}
      submitting={submitting}
      title={initial ? 'Edit account' : 'New account'}
      subtitle={initial ? `${initial.code} — ${initial.name}` : 'Add a chart-of-accounts entry'}
    >
      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={2}>
        <TextField
          label="Code" value={body.code} required size="small" sx={{ width: 140 }}
          onChange={(e) => patch('code', e.target.value)}
        />
        <TextField
          label="Name" value={body.name} required size="small" fullWidth
          onChange={(e) => patch('name', e.target.value)}
        />
      </Stack>

      <Stack direction="row" spacing={2}>
        <TextField
          select label="Class" value={body.accountClass} size="small" fullWidth
          onChange={(e) => patch('accountClass', e.target.value as AccountClass)}
        >
          {(['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'] as AccountClass[]).map((c) =>
            <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField
          select label="Normal balance" value={body.normalBalance ?? 'DR'} size="small" sx={{ minWidth: 160 }}
          onChange={(e) => patch('normalBalance', e.target.value as NormalBalance)}
        >
          <MenuItem value="DR">Debit</MenuItem>
          <MenuItem value="CR">Credit</MenuItem>
        </TextField>
      </Stack>

      <TextField
        label="Description" value={body.description ?? ''} size="small" fullWidth
        onChange={(e) => patch('description', e.target.value)}
        multiline minRows={2}
      />

      <Stack direction="row" spacing={2}>
        <FormControlLabel
          control={<Switch checked={body.postable !== false} onChange={(e) => patch('postable', e.target.checked)} />}
          label="Postable (leaf account)"
        />
        <FormControlLabel
          control={<Switch checked={body.active !== false} onChange={(e) => patch('active', e.target.checked)} />}
          label="Active"
        />
      </Stack>
    </EditDrawer>
  );
}
