import { Grid } from '@mui/material';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/components/container/PageContainer';
import MostVisited from '../../../components/widgets/charts/MostVisited';
import PageImpressions from '../../../components/widgets/charts/PageImpressions';
import Followers from '../../../components/widgets/charts/Followers';
import Views from '../../../components/widgets/charts/Views';
import Earned from '../../../components/widgets/charts/Earned';
import CurrentValue from '../../../components/widgets/charts/CurrentValue';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Charts',
  },
];

const WidgetCharts = () => {
  return (
    <PageContainer title="Charts" description="this is Charts page">
      <Breadcrumb title="Charts" items={BCrumb} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Followers />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Views />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Earned />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <CurrentValue />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <MostVisited />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <PageImpressions />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default WidgetCharts;
