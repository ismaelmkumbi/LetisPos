import React from 'react';
import { Outlet, useParams } from 'react-router';
import { StorefrontProvider } from '../../context/CommerceContext';
import { Box } from '@mui/material';
import StoreHeader from '../../components/commerce/StoreHeader';
import StoreFooter from '../../components/commerce/StoreFooter';

const StorefrontLayout: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) return null;

  return (
    <StorefrontProvider slug={slug}>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <StoreHeader />
        <Box component="main" sx={{ flex: 1 }}>
          <Outlet />
        </Box>
        <StoreFooter />
      </Box>
    </StorefrontProvider>
  );
};

export default StorefrontLayout;
