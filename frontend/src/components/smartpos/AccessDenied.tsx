import { Box, Typography, Button, Chip } from '@mui/material';
import { Lock, ArrowLeft } from '@mui/icons-material';
import { Link } from 'react-router';
import { useAuth } from 'src/context/smartpos/AuthContext';

interface AccessDeniedProps {
  feature: string;
}

const planLabels: Record<string, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  BUSINESS: 'Business',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

export default function AccessDenied({ feature }: AccessDeniedProps) {
  const { user, tenants } = useAuth();
  const tenant = tenants.find((t) => t.id === user?.tenantId);
  const plan = tenant?.billingPlan ?? 'FREE';

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      textAlign="center"
      px={3}
    >
      <Lock sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h4" fontWeight={600} mb={1}>
        Access Restricted
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3} maxWidth={480}>
        Your current plan does not include access to this feature.
        Upgrade your subscription to unlock it.
      </Typography>

      <Box display="flex" alignItems="center" gap={1} mb={4}>
        <Typography variant="body2" color="text.secondary">
          Current plan:
        </Typography>
        <Chip
          label={planLabels[plan] ?? plan}
          color="primary"
          variant="outlined"
          size="small"
        />
        {feature && (
          <Chip
            label={`Requires: ${feature}`}
            variant="outlined"
            size="small"
            sx={{ color: 'text.secondary' }}
          />
        )}
      </Box>

      <Button
        variant="contained"
        component={Link}
        to="/smartpos/dashboard"
        startIcon={<ArrowLeft />}
        size="large"
      >
        Go to Dashboard
      </Button>
    </Box>
  );
}
