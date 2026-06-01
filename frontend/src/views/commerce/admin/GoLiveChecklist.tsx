import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, LinearProgress,
  Chip, Grid, Stack, CircularProgress, Alert,
} from '@mui/material';
import {
  CheckCircle, RadioButtonUnchecked, OpenInNew,
  Store as StoreIcon, Inventory, LocalShipping, Palette,
  Description, Campaign, Search, Language, ListAlt,
  ShoppingCart, RocketLaunch,
} from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { commerceAdmin } from '../../../api/smartpos/commerce';
import type { Store, Theme, ShippingZone, MarketingBanner } from '../../../types/commerce';

interface ChecklistStep {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  check: () => boolean;
}

const GoLiveChecklist: React.FC = () => {
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [publishedCount, setPublishedCount] = useState(0);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [banners, setBanners] = useState<MarketingBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    Promise.all([
      commerceAdmin.getSettings().catch(() => null),
      commerceAdmin.listPublishedProducts(undefined, 0, 1).catch(() => ({ content: [], totalElements: 0 })),
      commerceAdmin.getTheme().catch(() => null),
      commerceAdmin.getShippingZones().catch(() => []),
      commerceAdmin.getBanners().catch(() => []),
    ]).then(([s, pp, t, sz, b]) => {
      setStore(s);
      setPublishedCount(pp?.totalElements ?? 0);
      setTheme(t);
      setShippingZones(sz ?? []);
      setBanners(b ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const handleGoLive = async () => {
    if (!store || updating) return;
    setUpdating(true);
    try {
      await commerceAdmin.updateSettings({
        name: store.name,
        contactEmail: store.contactEmail || undefined,
        contactPhone: store.contactPhone || undefined,
        addressLine1: store.addressLine1 || undefined,
        city: store.city || undefined,
        country: store.country || undefined,
        postalCode: store.postalCode || undefined,
        currency: store.currency,
        timezone: store.timezone,
        taxDisplay: store.taxDisplay,
        socialFacebook: store.socialFacebook || undefined,
        socialInstagram: store.socialInstagram || undefined,
        socialTwitter: store.socialTwitter || undefined,
        orderPrefix: store.orderPrefix,
      });
      setStore(prev => prev ? { ...prev, status: 'active' } : null);
    } catch {
      // status update through settings
    } finally {
      setUpdating(false);
    }
  };

  const steps: ChecklistStep[] = [
    {
      key: 'settings',
      label: 'Store Settings',
      description: 'Configure store name, contact info, currency, and address',
      icon: <StoreIcon />,
      route: '/smartpos/admin/commerce/settings',
      check: () => !!(store?.name && store?.contactEmail && store?.city),
    },
    {
      key: 'products',
      label: 'Publish Products',
      description: 'Select products from inventory to display on your storefront',
      icon: <Inventory />,
      route: '/smartpos/admin/commerce/products',
      check: () => publishedCount > 0,
    },
    {
      key: 'theme',
      label: 'Customize Theme',
      description: 'Set your brand colors, fonts, and visual style',
      icon: <Palette />,
      route: '/smartpos/admin/commerce/theme',
      check: () => !!theme,
    },
    {
      key: 'shipping',
      label: 'Shipping Zones',
      description: 'Define where you ship and at what rates',
      icon: <LocalShipping />,
      route: '/smartpos/admin/commerce/shipping',
      check: () => shippingZones.length > 0,
    },
    {
      key: 'domain',
      label: 'Domain Setup',
      description: 'Connect a custom domain or use your default store URL',
      icon: <Language />,
      route: '/smartpos/admin/commerce/domains',
      check: () => true, // optional — custom domain is not required
    },
    {
      key: 'seo',
      label: 'SEO Settings',
      description: 'Optimize page titles, descriptions, and social sharing images',
      icon: <Search />,
      route: '/smartpos/admin/commerce/seo',
      check: () => true, // defaults exist
    },
    {
      key: 'banners',
      label: 'Homepage Banners',
      description: 'Set up hero banners and promotional announcements',
      icon: <Campaign />,
      route: '/smartpos/admin/commerce/banners',
      check: () => banners.filter(b => b.isActive).length > 0,
    },
    {
      key: 'pages',
      label: 'CMS Pages',
      description: 'Create About, FAQ, Contact, and other informational pages',
      icon: <Description />,
      route: '/smartpos/admin/commerce/pages',
      check: () => true, // optional
    },
  ];

  const completedSteps = steps.filter(s => s.check()).length;
  const totalSteps = steps.length;
  const percent = Math.round((completedSteps / totalSteps) * 100);

  if (loading) {
    return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  }

  return (
    <Box p={3} maxWidth="md" mx="auto">
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <RocketLaunch sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Pre-Launch Checklist
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Complete these steps before opening your store to customers.
        </Typography>

        {/* Progress bar */}
        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={percent}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>
        <Typography variant="h5" fontWeight={700} color="primary">
          {percent}% Complete
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {completedSteps} of {totalSteps} steps completed
        </Typography>
      </Box>

      {/* Steps */}
      <Stack spacing={2}>
        {steps.map((step) => {
          const done = step.check();
          return (
            <Card
              key={step.key}
              sx={{
                borderLeft: '4px solid',
                borderColor: done ? 'success.main' : 'grey.300',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { boxShadow: 2, transform: 'translateX(4px)' },
              }}
              onClick={() => navigate(step.route)}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ color: done ? 'success.main' : 'text.disabled', flexShrink: 0 }}>
                  {done ? <CheckCircle /> : <RadioButtonUnchecked />}
                </Box>
                <Box sx={{ color: done ? 'success.main' : 'action.active', flexShrink: 0 }}>
                  {step.icon}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {step.label}
                    {done && <Chip label="Done" size="small" color="success" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </Box>
                <OpenInNew sx={{ color: 'text.disabled', flexShrink: 0 }} />
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Go Live CTA */}
      <Box sx={{ mt: 4, p: 3, bgcolor: 'primary.main', borderRadius: 3, color: '#fff', textAlign: 'center' }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {percent === 100
            ? '🎉 Ready to launch! Your store is fully configured.'
            : `Almost there — ${totalSteps - completedSteps} step${totalSteps - completedSteps > 1 ? 's' : ''} remaining`}
        </Typography>
        <Typography sx={{ mb: 2, opacity: 0.85 }}>
          {store?.status === 'active'
            ? 'Your storefront is live at the URL below.'
            : `Complete the checklist items above, then click "Go Live" to open your store.`}
        </Typography>

        {store?.status !== 'active' ? (
          <Button
            variant="contained"
            size="large"
            onClick={handleGoLive}
            disabled={updating || percent < 50}
            sx={{
              bgcolor: '#fff',
              color: 'primary.main',
              fontWeight: 800,
              px: 5,
              py: 1.5,
              borderRadius: '999px',
              '&:hover': { bgcolor: '#f0f0f0' },
              '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.6)' },
            }}
            startIcon={updating ? <CircularProgress size={20} color="inherit" /> : <RocketLaunch />}
          >
            {updating ? 'Launching...' : 'Go Live 🚀'}
          </Button>
        ) : (
          <Alert severity="success" sx={{ textAlign: 'left', mt: 2 }}>
            Your store is live! View it at:{' '}
            <strong>https://{store?.slug || 'your-store'}.letispos.com/store</strong>
          </Alert>
        )}

        {percent < 50 && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
            At least 50% of the checklist must be complete before going live.
          </Typography>
        )}
      </Box>

      {/* Quick links */}
      <Grid container spacing={2} sx={{ mt: 4 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 2 } }} onClick={() => navigate('/smartpos/admin/commerce')}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <ShoppingCart sx={{ color: 'primary.main', mb: 1 }} />
              <Typography fontWeight={700} fontSize="0.85rem">Dashboard</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 2 } }} onClick={() => navigate('/smartpos/admin/commerce/orders')}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <ListAlt sx={{ color: 'primary.main', mb: 1 }} />
              <Typography fontWeight={700} fontSize="0.85rem">Orders</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 2 } }} onClick={() => navigate('/smartpos/admin/commerce/settings')}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <StoreIcon sx={{ color: 'primary.main', mb: 1 }} />
              <Typography fontWeight={700} fontSize="0.85rem">Settings</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 2 } }} onClick={() => window.open(`https://${store?.slug || 'your-store'}.letispos.com/store`, '_blank')}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <OpenInNew sx={{ color: 'primary.main', mb: 1 }} />
              <Typography fontWeight={700} fontSize="0.85rem">View Store</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GoLiveChecklist;
