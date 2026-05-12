import React from 'react';
import { Outlet, useParams } from 'react-router';
import { StorefrontProvider } from '../../context/CommerceContext';
import { Box } from '@mui/material';

const StorefrontLayout: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) return null;

  return (
    <StorefrontProvider slug={slug}>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* StoreHeader and StoreFooter will be added in a later task */}
        <Box component="main" sx={{ flex: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </StorefrontProvider>
  );
};

export default StorefrontLayout;
