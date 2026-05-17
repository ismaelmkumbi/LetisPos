import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { cardSx, titleColor, muted } from './utils';
import EmptyPanel from './EmptyPanel';
import type { CustomerRetention, AtRiskCustomer } from 'src/api/smartpos/dashboardIntelligence';

interface CustomerRetentionCardProps {
  data: CustomerRetention | null;
  loading: boolean;
  isDark: boolean;
}

function segmentBadge(segment: string) {
  const isAtRisk = segment.toLowerCase().includes('at risk');
  return (
    <Chip
      size="small"
      label={segment}
      sx={{
        height: 22,
        fontSize: 11,
        fontWeight: 800,
        bgcolor: isAtRisk ? '#FEF3C7' : '#FEE2E2',
        color: isAtRisk ? '#B45309' : brand.error.main,
      }}
    />
  );
}

export default function CustomerRetentionCard({
  data,
  loading,
  isDark,
}: CustomerRetentionCardProps) {
  const navigate = useNavigate();

  const handleRowClick = (customer: AtRiskCustomer) => {
    navigate(`/smartpos/sales?customerId=${customer.customerId}`);
  };

  const hasCustomers = data && data.atRiskCustomers.length > 0;

  return (
    <Card
      elevation={0}
      sx={{
        ...cardSx(isDark),
        height: '100%',
        borderLeft: `4px solid ${brand.warning.main}`,
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Title */}
        <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18, mb: 0.5 }}>
          Customer Retention Alerts
        </Typography>

        {/* Loading */}
        {loading && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress sx={{ mb: 1, borderRadius: '4px' }} />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={40}
                sx={{ mb: 0.75, borderRadius: '8px' }}
              />
            ))}
          </Box>
        )}

        {/* Empty */}
        {!loading && !hasCustomers && (
          <EmptyPanel
            title="No at-risk customers"
            subtitle="All customers are engaged"
            height={160}
            compact
          />
        )}

        {/* Table */}
        {!loading && hasCustomers && (
          <>
            <Table size="small" sx={{ mt: 0.5 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11, color: brand.neutral[500], py: 1 }}>
                    Customer
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11, color: brand.neutral[500], py: 1 }}>
                    Segment
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11, color: brand.neutral[500], py: 1 }}>
                    Last Visit
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: brand.neutral[500], py: 1 }}>
                    Lifetime Value
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: brand.neutral[500], py: 1 }}>
                    Visits
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.atRiskCustomers.map((customer) => (
                  <TableRow
                    key={customer.customerId}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: isDark ? brand.neutral[800] : brand.neutral[50] },
                      '&:last-child td': { border: 0 },
                    }}
                    onClick={() => handleRowClick(customer)}
                  >
                    <TableCell sx={{ fontWeight: 700, fontSize: 13, color: titleColor, py: 1 }}>
                      {customer.name}
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      {segmentBadge(customer.segment)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: brand.neutral[600], py: 1 }}>
                      {customer.lastVisitDays}d ago
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 13, color: titleColor, py: 1 }}>
                      {formatMoney(customer.lifetimeValue)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 13, color: brand.neutral[600], py: 1 }}>
                      {customer.visits}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Footer */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[100]}` }}
            >
              <Typography sx={{ color: muted(isDark), fontSize: 12 }}>
                {data.atRiskCustomers.length} at-risk / {data.totalCustomers} total
              </Typography>
              <Chip
                size="small"
                label={`At-risk revenue: ${formatMoney(data.totalAtRiskRevenue)}`}
                sx={{
                  height: 24,
                  fontSize: 11,
                  fontWeight: 800,
                  bgcolor: brand.warning.light,
                  color: brand.warning.dark,
                }}
              />
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}
