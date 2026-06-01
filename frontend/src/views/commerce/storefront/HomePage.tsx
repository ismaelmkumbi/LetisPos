import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Button, Grid, Chip, Skeleton,
  Card, Stack,
} from '@mui/material';
import {
  ArrowForward, Discount, Bolt, Star, VerifiedUser, Category as CategoryIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router';
import FeaturedProducts from '../../../components/commerce/FeaturedProducts';
import ProductCard from '../../../components/commerce/ProductCard';
import { storefront } from '../../../api/smartpos/commerce';
import { useStorefront } from '../../../context/CommerceContext';
import { safeHtml } from '../../../utils/sanitize';
import type { MarketingBanner, StorefrontProduct } from '../../../types/commerce';

interface CategoryPill {
  icon: React.ReactNode;
  label: string;
  categoryId: string;
}

const features = [
  { icon: <Discount sx={{ fontSize: 40 }} />, title: 'Flash Deals', sub: 'Up to 70% off', color: '#EF4444', href: '/search?q=&sort=discount' },
  { icon: <VerifiedUser sx={{ fontSize: 40 }} />, title: 'Verified Sellers', sub: 'Trusted quality', color: '#10B981', href: '/search?q=&sort=best-selling' },
  { icon: <Star sx={{ fontSize: 40 }} />, title: 'Top Rated', sub: 'Best reviewed picks', color: '#F59E0B', href: '/search?q=&sort=newest' },
  { icon: <Bolt sx={{ fontSize: 40 }} />, title: 'Fast Shipping', sub: '2-5 day delivery', color: '#6366F1', href: '/search?q=&sort=newest' },
];

const trustStats = [
  { value: '10K+', label: 'Happy Customers' },
  { value: '50K+', label: 'Products' },
  { value: '99.7%', label: 'Order Accuracy' },
  { value: '4.8★', label: 'Average Rating' },
];

const HomePage: React.FC = () => {
  const { slug, theme } = useStorefront();
  const navigate = useNavigate();
  const primary = theme?.settings?.colors?.primary || '#1a1a2e';
  const accent = theme?.settings?.colors?.accent || '#ff6b35';
  const [heroBanner, setHeroBanner] = useState<MarketingBanner | null>(null);
  const [newArrivals, setNewArrivals] = useState<StorefrontProduct[]>([]);
  const [loadingArrivals, setLoadingArrivals] = useState(true);
  const [categoryPills, setCategoryPills] = useState<CategoryPill[]>([]);

  useEffect(() => {
    storefront.getBanners(slug).then(banners => {
      const hero = banners.find(b => b.location === 'hero' && b.isActive);
      if (hero) setHeroBanner(hero);
    }).catch(() => {});

    storefront.getProducts(slug, { sort: 'newest', size: 8 })
      .then(data => setNewArrivals(data.content || []))
      .catch(() => {})
      .finally(() => setLoadingArrivals(false));

    storefront.getCategories(slug)
      .then((cats: Array<{ id: string; categoryId: string; nameOverride?: string }>) => {
        const pills: CategoryPill[] = (cats || [])
          .filter(c => c.categoryId)
          .slice(0, 12)
          .map(c => ({
            icon: <CategoryIcon sx={{ fontSize: 18 }} />,
            label: c.nameOverride || c.categoryId,
            categoryId: c.categoryId,
          }));
        setCategoryPills(pills);
      })
      .catch(() => {});
  }, [slug]);

  return (
    <Box>
      {/* Hero Banner */}
      <Box
        sx={{
          minHeight: { xs: 360, md: 500 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: '#fff',
          position: 'relative',
          background: heroBanner?.imageUrl
            ? `url(${heroBanner.imageUrl}) center/cover no-repeat`
            : `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`,
          '&:before': heroBanner?.imageUrl ? {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
          } : {},
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, py: 8 }}>
          <Chip
            icon={<Bolt sx={{ fontSize: 14 }} />}
            label="Limited Time Offer"
            size="small"
            sx={{ bgcolor: accent, color: '#fff', fontWeight: 700, mb: 2, fontSize: '0.75rem' }}
          />
          <Typography
            variant="h1"
            sx={{
              fontFamily: 'var(--commerce-font-heading, Outfit, sans-serif)',
              fontSize: { xs: '2.2rem', sm: '3rem', md: '4rem' },
              fontWeight: 900,
              lineHeight: 1.1,
              mb: 2,
              letterSpacing: '-0.02em',
            }}
          >
            {heroBanner?.contentHtml ? (
              <span dangerouslySetInnerHTML={{ __html: safeHtml(heroBanner.contentHtml) }} />
            ) : (
              <>Discover Amazing<br />Products Today</>
            )}
          </Typography>
          <Typography sx={{ opacity: 0.9, mb: 4, fontSize: { xs: '1rem', md: '1.2rem' }, fontWeight: 400 }}>
            Quality products, unbeatable prices, fast delivery — all in one place.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              onClick={() => navigate(`/store/${slug}/categories/all`)}
              sx={{
                bgcolor: accent,
                '&:hover': { bgcolor: accent, filter: 'brightness(1.1)' },
                px: 5, py: 1.75, borderRadius: '999px',
                fontSize: '1rem', fontWeight: 700, textTransform: 'none',
                boxShadow: `0 8px 32px ${accent}66`,
              }}
            >
              Shop Now
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate(`/store/${slug}/search?q=&sort=discount`)}
              sx={{
                borderColor: '#fff', color: '#fff',
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                px: 5, py: 1.75, borderRadius: '999px',
                fontSize: '1rem', fontWeight: 700, textTransform: 'none',
              }}
            >
              View Deals
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Category pills — dynamic from CMS */}
      {categoryPills.length > 0 && (
      <Box sx={{ borderBottom: '1px solid #e5e7eb', bgcolor: '#fafafa' }}>
        <Container maxWidth="lg" sx={{ py: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
            {categoryPills.map((cat) => (
              <Chip
                key={cat.categoryId}
                icon={<Box component="span" sx={{ display: 'flex', alignItems: 'center', '& .MuiSvgIcon-root': { fontSize: 18 } }}>{cat.icon}</Box>}
                label={cat.label}
                clickable
                onClick={() => navigate(`/store/${slug}/categories/${cat.categoryId}`)}
                variant="outlined"
                sx={{
                  borderColor: '#e5e7eb', bgcolor: '#fff',
                  fontWeight: 600, fontSize: '0.85rem', py: 2.5, px: 1,
                  '&:hover': { borderColor: primary, bgcolor: '#f0f4ff' },
                  flexShrink: 0,
                }}
              />
            ))}
          </Box>
        </Container>
      </Box>
      )}

      {/* Features grid */}
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Grid container spacing={2}>
          {features.map((feature) => (
            <Grid size={{ xs: 6, md: 3 }} key={feature.title}>
              <Card
                onClick={() => navigate(`/store/${slug}${feature.href}`)}
                sx={{
                  textAlign: 'center', py: 2.5,
                  bgcolor: '#fafafa', border: '1px solid #f0f0f0',
                  borderRadius: 2, cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: 1 },
                }}
              >
                <Box sx={{ color: feature.color, mb: 1 }}>{feature.icon}</Box>
                <Typography fontWeight={700} fontSize="0.9rem">{feature.title}</Typography>
                <Typography variant="caption" color="text.secondary">{feature.sub}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* New Arrivals section */}
      {!loadingArrivals && newArrivals.length > 0 && (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h2" fontWeight={800} fontSize={{ xs: '1.5rem', md: '2rem' }}
                sx={{ fontFamily: 'var(--commerce-font-heading, Outfit, sans-serif)' }}>
                New Arrivals
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fresh products just added to the store
              </Typography>
            </Box>
            <Button
              endIcon={<ArrowForward />}
              onClick={() => navigate(`/store/${slug}/search?q=&sort=newest`)}
              sx={{ fontWeight: 600, textTransform: 'none' }}
            >
              View All
            </Button>
          </Box>
          <Grid container spacing={2.5}>
            {newArrivals.map((product) => (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={product.id}>
                <ProductCard product={product} />
              </Grid>
            ))}
          </Grid>
        </Container>
      )}

      {/* Loading skeleton for new arrivals */}
      {loadingArrivals && (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Skeleton width={200} height={40} sx={{ mb: 3 }} />
          <Grid container spacing={2.5}>
            {[1, 2, 3, 4].map((i) => (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={i}>
                <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 3 }} />
                <Skeleton width="40%" height={16} sx={{ mt: 1 }} />
                <Skeleton width="80%" height={24} />
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                  <Skeleton width="40%" height={28} />
                  <Box sx={{ flex: 1 }} />
                  <Skeleton variant="circular" width={40} height={40} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      )}

      {/* Featured Products */}
      <Box sx={{ bgcolor: '#fafafa', py: 2 }}>
        <FeaturedProducts />
      </Box>

      {/* Trust badges strip */}
      <Box sx={{ bgcolor: primary, py: 4 }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 4,
              color: '#fff',
              textAlign: 'center',
            }}
          >
            {trustStats.map((stat) => (
              <Box key={stat.label}>
                <Typography variant="h4" fontWeight={900}>{stat.value}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>{stat.label}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Bottom CTA */}
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={800} gutterBottom
          sx={{ fontFamily: 'var(--commerce-font-heading, Outfit, sans-serif)' }}>
          Ready to start shopping?
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Browse thousands of products from trusted sellers. Fast shipping, easy returns.
        </Typography>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          onClick={() => navigate(`/store/${slug}/categories/all`)}
          sx={{
            bgcolor: accent, borderRadius: '999px', px: 5, py: 1.5,
            fontSize: '1rem', fontWeight: 700, textTransform: 'none',
            '&:hover': { bgcolor: accent, filter: 'brightness(1.1)' },
          }}
        >
          Explore All Products
        </Button>
      </Container>
    </Box>
  );
};

export default HomePage;
