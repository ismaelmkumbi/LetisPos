import { useState } from 'react';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { IconFileInvoice, IconFileText, IconMail, IconAlertCircle, IconFileDescription, IconCash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateDebtDocument } from 'src/api/smartpos/debt';
import { api } from 'src/api/smartpos/client';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { useDynamicBrand } from 'src/theme/smartpos/dynamicBrand';
interface DocumentTemplate {
  id: string;
  label: string;
  icon: React.ReactNode;
  documentType: string;
  referenceType: string;
  description: string;
}

const TEMPLATES: DocumentTemplate[] = [
  { id: 'customer-statement', label: 'Customer Statement', icon: <IconFileInvoice size={28} />, documentType: 'customer-statement', referenceType: 'sale', description: 'Itemised statement of all outstanding invoices for a customer' },
  { id: 'payment-reminder', label: 'Payment Reminder', icon: <IconMail size={28} />, documentType: 'payment-receipt', referenceType: 'sale', description: 'Friendly reminder for overdue payments' },
  { id: 'overdue-notice', label: 'Overdue Notice', icon: <IconAlertCircle size={28} />, documentType: 'debit-note', referenceType: 'sale', description: 'Formal notice for severely overdue accounts' },
  { id: 'credit-note', label: 'Credit Note', icon: <IconFileText size={28} />, documentType: 'credit-note', referenceType: 'sale', description: 'Credit note for a customer return or adjustment' },
  { id: 'debit-note', label: 'Debit Note', icon: <IconFileDescription size={28} />, documentType: 'debit-note', referenceType: 'purchase', description: 'Debit note for supplier billing adjustment' },
  { id: 'payment-receipt', label: 'Payment Receipt', icon: <IconCash size={28} />, documentType: 'payment-receipt', referenceType: 'sale', description: 'Official receipt for a payment received' },
];

interface DebtDoc {
  id: string;
  documentNumber: string;
  documentType: string;
  status: string;
  createdAt: string;
}

function GenerateDialog({ open, onClose, template }: { open: boolean; onClose: () => void; template: DocumentTemplate | null }) {
  const [referenceId, setReferenceId] = useState('');
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      if (!template) throw new Error('No template selected');
      if (!referenceId) throw new Error('Reference ID is required');
      // Basic UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(referenceId)) throw new Error('Invalid reference ID format (expected UUID)');
      return generateDebtDocument({ documentType: template.documentType, referenceType: template.referenceType, referenceId });
    },
    onSuccess: (data) => {
      alert(`Document ${data.documentNumber} generated`);
      queryClient.invalidateQueries({ queryKey: ['debt-documents'] });
      onClose();
      setReferenceId('');
    },
    onError: (e) => {
      console.error('Document generation failed:', e);
      alert(`Generation failed: ${(e as Error).message}`);
    },
  });
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate {template?.label}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">{template?.description}</Typography>
          <TextField label="Customer / Supplier ID" value={referenceId} onChange={(e) => setReferenceId(e.target.value)} fullWidth size="small" placeholder="Paste UUID from Debtors or Creditors page" helperText="Find the UUID in the Debtors or Creditors page" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => mutation.mutate()} disabled={!referenceId || mutation.isPending}>{mutation.isPending ? 'Generating...' : 'Generate'}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function DebtDocumentsPage() {
  const brand = useDynamicBrand();
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: recentDocs } = useQuery({
    queryKey: ['debt-documents'],
    queryFn: async (): Promise<DebtDoc[]> => {
      const { data } = await api.get('/api/v1/documents', { params: { documentType: 'customer-statement,payment-receipt,credit-note,debit-note', size: 20, sort: 'createdAt,desc' } });
      return data?.content || [];
    },
    staleTime: 30_000,
  });

  const columns: Column<DebtDoc>[] = [
    { key: 'documentNumber', label: 'Document #', render: (row: DebtDoc) => <Typography variant="body2" fontWeight={500}>{row.documentNumber}</Typography> },
    { key: 'type', label: 'Type', render: (row: DebtDoc) => <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{row.documentType}</Typography> },
    { key: 'status', label: 'Status', render: (row: DebtDoc) => <Typography variant="body2" color={row.status === 'sent' ? brand.success.main : 'text.secondary'}>{row.status}</Typography> },
    { key: 'date', label: 'Date', render: (row: DebtDoc) => <Typography variant="body2">{new Date(row.createdAt).toLocaleDateString()}</Typography> },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader title="Debt Documents" subtitle="Generate statements, reminders, and debt collection documents" />
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Document Templates</Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {TEMPLATES.map((tpl) => (
          <Card key={tpl.id} sx={{ flex: '1 1 300px', maxWidth: 380, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { boxShadow: 4 } }}
            onClick={() => { setSelectedTemplate(tpl); setDialogOpen(true); }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ color: 'primary.main' }}>{tpl.icon}</Box>
                <Box><Typography variant="subtitle2">{tpl.label}</Typography><Typography variant="caption" color="text.secondary">{tpl.description}</Typography></Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
      {recentDocs && recentDocs.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>Recently Generated</Typography>
          <DataTable columns={columns} rows={recentDocs} />
        </Box>
      )}
      <GenerateDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setSelectedTemplate(null); }} template={selectedTemplate} />
    </Box>
  );
}
