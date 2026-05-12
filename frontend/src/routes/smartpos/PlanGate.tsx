import { useAuth } from 'src/context/smartpos/AuthContext';
import { PLAN_LEVEL } from 'src/context/smartpos/AuthContext';
import { Box, Typography, Button } from '@mui/material';
import { IconLock } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

interface PlanGateProps {
  minPlan: string;
  featureName: string;
  children: React.ReactNode;
}

export default function PlanGate({ minPlan, featureName, children }: PlanGateProps) {
  const { tenants } = useAuth();
  const currentPlan = tenants[0]?.billingPlan ?? 'FREE';
  const hasAccess = (PLAN_LEVEL[currentPlan] ?? 0) >= (PLAN_LEVEL[minPlan] ?? 0);

  if (!hasAccess) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
        <IconLock size={48} color="#94A3B8" />
        <Typography variant="h5" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
          {featureName} requires {minPlan} plan or higher
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your current plan ({currentPlan}) doesn't include this feature.
          Upgrade to unlock it.
        </Typography>
        <Button variant="contained" component={Link} to="/smartpos/billing">
          Upgrade Plan
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
