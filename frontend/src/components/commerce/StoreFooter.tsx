import React from 'react';
import { Box, Container, Typography } from '@mui/material';

const StoreFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#1a1a2e',
        color: '#ccc',
        py: 6,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' } }}>
            <Typography variant="h6" color="white" gutterBottom>
              About
            </Typography>
            <Typography variant="body2">
              Welcome to our online store. We offer quality products at great prices.
            </Typography>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' } }}>
            <Typography variant="h6" color="white" gutterBottom>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Links populated from navigation API in later task */}
            </Box>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' } }}>
            <Typography variant="h6" color="white" gutterBottom>
              Contact
            </Typography>
            <Typography variant="body2">
              Email: support@example.com
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" textAlign="center" sx={{ mt: 4, color: '#666' }}>
          &copy; {currentYear} Powered by Letis Commerce
        </Typography>
      </Container>
    </Box>
  );
};

export default StoreFooter;
