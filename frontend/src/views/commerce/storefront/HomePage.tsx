import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router';
import FeaturedProducts from '../../../components/commerce/FeaturedProducts';
import { storefront } from '../../../api/smartpos/commerce';
import { useStorefront } from '../../../context/CommerceContext';
import type { MarketingBanner } from '../../../types/commerce';

const HomePage: React.FC = () => {
  const { slug } = useStorefront();
  const navigate = useNavigate();
  const [heroBanner, setHeroBanner] = useState<MarketingBanner | null>(null);

  useEffect(() => {
    storefront.getBanners(slug)
      .then(banners => {
        const hero = banners.find(b => b.location === 'hero' && b.isActive);
        if (hero) setHeroBanner(hero);
      })
      .catch(() => {});
  }, [slug]);

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          minHeight: { xs: 300, md: 450 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: heroBanner?.imageUrl
            ? `url(${heroBanner.imageUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg, var(--commerce-primary, #667eea) 0%, var(--commerce-secondary, #764ba2) 100%)',
          textAlign: 'center',
          color: 'white',
          position: 'relative',
        }}
      >
        <Container maxWidth="md" sx={{ py: 8 }}>
          <Typography variant="h2" component="h1" fontWeight="bold" gutterBottom
            sx={{ fontFamily: 'var(--commerce-font-heading, inherit)', fontSize: { xs: '2rem', md: '3.5rem' } }}>
            {heroBanner?.contentHtml ? (
              <span dangerouslySetInnerHTML={{ __html: heroBanner.contentHtml }} />
            ) : (
              'Welcome to Our Store'
            )}
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9, fontSize: { xs: '1rem', md: '1.25rem' } }}>
            Discover quality products at great prices
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate(`/store/${slug}/categories/all`)}
            sx={{
              bgcolor: 'white',
              color: 'var(--commerce-primary, #1976d2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              px: 4,
              py: 1.5,
            }}
          >
            Shop Now
          </Button>
        </Container>
      </Box>

      {/* Featured Products */}
      <Container maxWidth="lg">
        <FeaturedProducts />
      </Container>
    </Box>
  );
};

export default HomePage;
