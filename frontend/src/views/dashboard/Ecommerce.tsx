import { Box, Grid } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';

const Ecommerce = () => {
  return (
    <PageContainer title="eCommerce Dashboard" description="this is eCommerce Dashboard page">
      <Box mt={3}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            {/* Dashboard widgets coming soon */}
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Ecommerce;
