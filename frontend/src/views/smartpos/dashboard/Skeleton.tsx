import { Card, CardContent, Grid, Skeleton } from '@mui/material';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { cardSx } from './utils';

export default function DashboardSkeleton() {
  const { activeMode: _sk } = useContext(CustomizerContext);
  const isDark = _sk === 'dark';
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 10 }, (_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, lg: index === 0 ? 4 : 2 }}>
          <Card elevation={0} sx={{ ...cardSx(isDark), minHeight: index === 0 ? 250 : 160 }}>
            <CardContent>
              <Skeleton width="35%" />
              <Skeleton width="75%" height={36} />
              <Skeleton variant="rounded" height={90} sx={{ mt: 2, borderRadius: '10px' }} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
