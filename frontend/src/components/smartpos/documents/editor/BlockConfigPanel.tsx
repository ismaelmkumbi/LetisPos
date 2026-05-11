import { Box, Typography, Switch, FormControlLabel, TextField, Chip } from '@mui/material';

interface BlockConfigPanelProps {
  blockId: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

const blockMeta: Record<string, { label: string; toggles: Record<string, string> }> = {
  header: { label: 'Header Block', toggles: { showLogo: 'Company Name', showAddress: 'Address', showTin: 'TIN', showPhone: 'Phone', showEmail: 'Email' } },
  meta: { label: 'Meta Block', toggles: { showNumber: 'Document Number', showDate: 'Date', showDueDate: 'Due Date', showCustomer: 'Customer Info' } },
  items: { label: 'Items Table Block', toggles: {} },
  totals: { label: 'Totals Block', toggles: { showSubtotal: 'Subtotal', showDiscount: 'Discount', showTax: 'Tax Lines' } },
  signature: { label: 'Signature Block', toggles: {} },
  terms: { label: 'Terms Block', toggles: { showTerms: 'Show Terms & Conditions' } },
  footer: { label: 'Footer Block', toggles: { showCompany: 'Company Info', showContact: 'Contact Info', showPageNumbers: 'Page Numbers' } },
};

export default function BlockConfigPanel({ blockId, config, onChange }: BlockConfigPanelProps) {
  const meta = blockMeta[blockId];
  if (!meta) return <Typography color="text.secondary">Select a block to configure</Typography>;

  const handleToggle = (key: string) => (_: unknown, checked: boolean) => onChange({ ...config, [key]: checked });

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 2, color: '#4f46e5' }}>{meta.label}</Typography>
      {Object.entries(meta.toggles).map(([key, label]) => (
        <FormControlLabel key={key} control={<Switch size="small" checked={config[key] !== false} onChange={handleToggle(key)} />}
          label={<Typography sx={{ fontSize: '0.8rem' }}>{label}</Typography>} sx={{ display: 'flex', mb: 0.5 }} />
      ))}
      {blockId === 'signature' && (
        <TextField label="Signature labels (comma-separated)" fullWidth size="small" margin="dense"
          defaultValue={(config.slots as string[])?.join(', ') ?? 'Prepared By, Approved By, Date'}
          onBlur={(e) => onChange({ ...config, slots: e.target.value.split(',').map(s => s.trim()) })} />
      )}
      {blockId === 'items' && (
        <Box sx={{ mt: 1 }}>
          <Typography sx={{ fontSize: '0.7rem', color: '#888', mb: 0.5 }}>Columns (click to toggle)</Typography>
          {['#', 'name', 'description', 'qty', 'unitPrice', 'taxRate', 'discount', 'total'].map(col => (
            <Chip key={col} label={col} size="small"
              variant={(config.columns as string[])?.includes(col) !== false ? 'filled' : 'outlined'}
              sx={{ m: 0.25 }} onClick={() => {
                const cols = (config.columns as string[]) ?? ['#', 'name', 'qty', 'unitPrice', 'total'];
                const idx = cols.indexOf(col);
                if (idx >= 0) onChange({ ...config, columns: cols.filter(c => c !== col) });
                else onChange({ ...config, columns: [...cols, col] });
              }} />
          ))}
        </Box>
      )}
    </Box>
  );
}
