import { Box, Container, Typography, Button } from '@mui/material';
import { Link } from 'react-router';
import ErrorImg from 'src/assets/images/backgrounds/errorimg.svg';

const Error = () => (
  <Box
    display="flex"
    flexDirection="column"
    height="100vh"
    textAlign="center"
    justifyContent="center"
    sx={{ bgcolor: 'background.default' }}
  >
    <Container maxWidth="md">
      <img src={ErrorImg} alt="404" style={{ maxWidth: 280, marginBottom: 24 }} />
      <Typography variant="h3" fontWeight={700} mb={1}>
        Page Not Found
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        The page you are looking for does not exist or has been moved.
      </Typography>
      <Button
        color="primary"
        variant="contained"
        component={Link}
        to="/smartpos/dashboard"
        disableElevation
        size="large"
      >
        Go to Dashboard
      </Button>
    </Container>
  </Box>
);

export default Error;
