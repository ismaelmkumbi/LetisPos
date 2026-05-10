import { Chip } from '@mui/material';

type Status =
  | 'draft'
  | 'sent'
  | 'approved'
  | 'paid'
  | 'partially_paid'
  | 'cancelled'
  | 'expired';

const statusConfig: Record<Status, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  draft: { label: 'Draft', color: 'default' },
  sent: { label: 'Sent', color: 'primary' },
  approved: { label: 'Approved', color: 'success' },
  paid: { label: 'Paid', color: 'success' },
  partially_paid: { label: 'Partially Paid', color: 'warning' },
  cancelled: { label: 'Cancelled', color: 'error' },
  expired: { label: 'Expired', color: 'error' },
};

export default function DocumentStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as Status] ?? { label: status, color: 'default' as const };
  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      variant="outlined"
      sx={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600 }}
    />
  );
}
