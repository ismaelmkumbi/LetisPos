import { useState } from 'react';
import { Alert, Box, Button, Chip, IconButton, Stack, TextField, Typography } from '@mui/material';
import { IconMail, IconPlus, IconTrash, IconUsers } from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  onComplete: () => void;
}

interface InviteRow {
  id: number;
  email: string;
  role: string;
}

export default function StaffInviteSetup({ onComplete }: Props) {
  const [rows, setRows] = useState<InviteRow[]>([{ id: 1, email: '', role: 'CASHIER' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRow = () => setRows((prev) => [...prev, { id: Date.now(), email: '', role: 'CASHIER' }]);
  const removeRow = (id: number) => setRows((prev) => prev.filter((r) => r.id !== id));
  const updateRow = (id: number, patch: Partial<InviteRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const validRows = rows.filter((r) => r.email.trim().includes('@'));

  const handleSubmit = async () => {
    if (validRows.length === 0) {
      setError('Please enter at least one valid email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // TODO: wire to user invite API when available
      // await Promise.all(validRows.map(r => inviteUser(r.email, r.role)));
      onComplete();
    } catch {
      setError('Could not send invites. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.5 }}>Invite your team</Typography>
      <Typography sx={{ color: brand.neutral[500], fontSize: 14, mb: 3 }}>
        Add cashiers, managers, or stock keepers. You can invite more later.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      <Stack spacing={1.5}>
        {rows.map((row) => (
          <Stack key={row.id} direction="row" spacing={1.5} alignItems="center">
            <TextField
              placeholder="colleague@company.com"
              fullWidth
              size="small"
              value={row.email}
              onChange={(e) => updateRow(row.id, { email: e.target.value })}
              InputProps={{
                startAdornment: (
                  <IconMail size={16} color={brand.neutral[400]} style={{ marginRight: 8 }} />
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': { borderColor: brand.neutral[200] },
                },
              }}
            />
            <Chip
              label={row.role === 'CASHIER' ? 'Cashier' : 'Manager'}
              size="small"
              sx={{
                bgcolor: row.role === 'CASHIER' ? brand.warning.light : brand.warning.light,
                color: row.role === 'CASHIER' ? brand.warning.dark : brand.warning.dark,
                fontWeight: 700,
                borderRadius: '6px',
                cursor: 'pointer',
              }}
              onClick={() =>
                updateRow(row.id, { role: row.role === 'CASHIER' ? 'MANAGER' : 'CASHIER' })
              }
            />
            {rows.length > 1 && (
              <IconButton
                size="small"
                onClick={() => removeRow(row.id)}
                sx={{ color: brand.error.main }}
              >
                <IconTrash size={16} />
              </IconButton>
            )}
          </Stack>
        ))}
      </Stack>

      <Button
        startIcon={<IconPlus size={16} />}
        onClick={addRow}
        sx={{ mt: 1, textTransform: 'none', fontWeight: 700, color: brand.primary[600] }}
      >
        Add another
      </Button>

      <Button
        variant="contained"
        fullWidth
        disabled={validRows.length === 0 || submitting}
        onClick={handleSubmit}
        startIcon={<IconUsers size={18} />}
        sx={{
          mt: 2,
          py: 1.4,
          fontWeight: 700,
          textTransform: 'none',
          borderRadius: 2,
          bgcolor: brand.primary[600],
        }}
      >
        {submitting
          ? 'Sending...'
          : `Send ${validRows.length} invite${validRows.length !== 1 ? 's' : ''}`}
      </Button>
    </Box>
  );
}
