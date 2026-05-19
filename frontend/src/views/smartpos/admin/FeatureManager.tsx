import { useState } from 'react';
import { Box, Tabs, Tab, Typography, Paper } from '@mui/material';
import PlanComparison from './PlanComparison';
import FeatureCatalog from './FeatureCatalog';
import TenantUserOverrides from './TenantUserOverrides';

export default function FeatureManager() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Feature & Menu Manager
      </Typography>
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Plan Comparison" />
          <Tab label="Feature Catalog" />
          <Tab label="Tenant & User Overrides" />
        </Tabs>
      </Paper>
      {tab === 0 && <PlanComparison />}
      {tab === 1 && <FeatureCatalog />}
      {tab === 2 && <TenantUserOverrides />}
    </Box>
  );
}
