import { Box } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import Welcome from 'src/layouts/full/shared/welcome/Welcome';

const Modern = () => {
  return (
    <PageContainer title="Modern Dashboard" description="this is Modern Dashboard page">
      <Box>
        <Welcome />
      </Box>
    </PageContainer>
  );
};

export default Modern;
