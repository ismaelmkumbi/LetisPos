import React, { useEffect, useState, useCallback } from 'react';
import {
  Container, Grid, Typography, Box, Button, IconButton, Chip,
  Skeleton, Divider, Stack, Snackbar, Alert,
} from '@mui/material';
import {
  Add as AddIcon, Remove as RemoveIcon,
  ShoppingCart as CartIcon,
  FlashOn as FlashIcon,
  LocalShipping, VerifiedUser, Autorenew, Star,
  FavoriteBorder, Favorite,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router';
import { storefront } from '../../../api/smartpos/commerce';
import { useStorefront } from '../../../context/CommerceContext';
import SeoHead from '../../../components/commerce/SeoHead';
import { safeHtml } from '../../../utils/sanitize';
import { getProductRating } from '../../../utils/productRating';
import type { StorefrontProduct } from '../../../types/commerce';

const ProductDetailPage: React.FC = () => {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const { addToCart, theme } = useStorefront();
  const primary = theme?.settings?.colors?.primary || '#1a1a2e';
  const accent = theme?.settings?.colors?.accent || '#ff6b35';
  const [product, setProduct] = useState<StorefrontProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [wishlisted, setWishlisted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!slug || !id) return;
    setLoading(true);
    storefront.getProduct(slug, id)
      .then(p => { setProduct(p); setError(null); })
      .catch(() => setError('Product not found'))
      .finally(() => setLoading(false));
  }, [slug, id]);

  // Sticky bar visibility on scroll
  const [showStickyBar, setShowStickyBar] = useState(false);
  useEffect(() => {
    const el = document.getElementById('pdp-actions');
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product]);

  const handleImageZoom = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 3 }} />
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rectangular" width={80} height={80} sx={{ borderRadius: 1 }} />)}
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton width={120} height={24} />
            <Skeleton width="80%" height={48} sx={{ mt: 1 }} />
            <Skeleton width={100} height={36} sx={{ mt: 1 }} />
            <Skeleton width="100%" height={120} sx={{ mt: 3 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>{error || 'Product not found'}</Typography>
        <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2, borderRadius: '999px' }}>
          Go Back
        </Button>
      </Container>
    );
  }

  const images = product.images?.length ? product.images : [{ url: '/placeholder.png', alt: product.name, width: 600, height: 600 }];
  const stockStatus = product.stock?.status;
  const isOutOfStock = stockStatus === 'out_of_stock';
  const discountPercent = product.compareAtPrice
    ? Math.round((1 - product.price.amount / product.compareAtPrice) * 100)
    : 0;
  const rating = getProductRating(product.id);

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      await addToCart({ productId: product.id, quantity, variantData: Object.keys(selectedVariants).length ? selectedVariants : undefined });
      setToast(`${product.name} added to cart`);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate(`/store/${slug}/cart`);
  };

  const handleVariantSelect = (variantName: string, value: string) => {
    setSelectedVariants(prev => ({ ...prev, [variantName]: value }));
  };

  return (
    <>
      <SeoHead
        title={product.seo?.title || product.name}
        description={product.seo?.description || product.description?.slice(0, 160)}
        ogImage={images[0]?.url}
        ogType="product"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.description,
          image: images[0]?.url,
          offers: { '@type': 'Offer', price: product.price?.amount, priceCurrency: product.price?.currency, availability: isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' },
        }}
      />

      {/* Breadcrumb */}
      <Box sx={{ bgcolor: 'var(--commerce-bg-muted, #fafafa)', borderBottom: '1px solid var(--commerce-border, #e5e7eb)', py: 1.5 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', fontSize: '0.82rem', color: 'var(--commerce-text-muted, #666)' }}>
            <Box component="span" role="button" tabIndex={0} onClick={() => navigate(`/store/${slug}`)} onKeyDown={e => e.key === 'Enter' && navigate(`/store/${slug}`)} sx={{ cursor: 'pointer', '&:hover': { color: primary } }}>Home</Box>
            <Box component="span" sx={{ mx: 0.5 }}>/</Box>
            {product.category && (
              <>
                <Box component="span" role="button" tabIndex={0} onClick={() => navigate(`/store/${slug}/categories/${product.category.id}`)} onKeyDown={e => e.key === 'Enter' && navigate(`/store/${slug}/categories/${product.category.id}`)} sx={{ cursor: 'pointer', '&:hover': { color: primary } }}>{product.category.name}</Box>
                <Box component="span" sx={{ mx: 0.5 }}>/</Box>
              </>
            )}
            <Box component="span" sx={{ color: 'var(--commerce-text, #333)', fontWeight: 600 }}>{product.name}</Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Grid container spacing={{ xs: 3, md: 6 }}>
          {/* Image Gallery */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              onMouseMove={handleImageZoom}
              onMouseLeave={() => setZoomPos(null)}
              sx={{
                position: 'sticky', top: 100,
                borderRadius: 3, overflow: 'hidden',
                bgcolor: '#f5f5f5', border: '1px solid var(--commerce-border, #e5e7eb)',
                cursor: zoomPos ? 'zoom-in' : 'default',
              }}
            >
              <Box
                component="img"
                src={images[selectedImage]?.url}
                alt={images[selectedImage]?.alt || product.name}
                sx={{
                  width: '100%', height: { xs: 320, md: 500 }, objectFit: 'contain', p: 2,
                  transform: zoomPos ? 'scale(2)' : 'scale(1)',
                  transformOrigin: zoomPos ? `${zoomPos.x}% ${zoomPos.y}%` : 'center center',
                  transition: zoomPos ? 'none' : 'transform 0.3s',
                }}
              />
              {discountPercent > 0 && (
                <Chip icon={<FlashIcon />} label={`${discountPercent}% OFF`} color="error" size="small" sx={{ position: 'absolute', top: 16, left: 16, fontWeight: 800 }} />
              )}
            </Box>
            {images.length > 1 && (
              <Box sx={{ display: 'flex', gap: 1, mt: 2, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
                {images.map((img, i) => (
                  <Box
                    key={i} component="img" src={img.url} alt={img.alt || `${product.name} ${i + 1}`}
                    onClick={() => setSelectedImage(i)}
                    sx={{
                      width: 80, height: 80, objectFit: 'cover', borderRadius: 2, cursor: 'pointer',
                      border: i === selectedImage ? `2px solid ${primary}` : '2px solid transparent',
                      opacity: i === selectedImage ? 1 : 0.6, transition: 'all 0.15s', '&:hover': { opacity: 1 },
                      flexShrink: 0,
                    }}
                  />
                ))}
              </Box>
            )}
          </Grid>

          {/* Product Info */}
          <Grid size={{ xs: 12, md: 6 }}>
            {product.brand && (
              <Typography variant="body2" color={primary} fontWeight={700} gutterBottom>
                {product.brand.name}
              </Typography>
            )}
            <Typography variant="h4" component="h1" fontWeight={900} gutterBottom
              sx={{ fontFamily: 'var(--commerce-font-heading, Outfit, sans-serif)', lineHeight: 1.2, fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
              {product.name}
            </Typography>

            {/* Rating — shown only when real reviews exist */}
            {rating != null && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 2 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} sx={{ fontSize: 16, color: star <= Math.round(rating) ? '#F59E0B' : '#e5e7eb' }} />
              ))}
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {rating}
              </Typography>
            </Stack>
            )}

            {/* Price */}
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 3 }}>
              <Typography variant="h4" fontWeight={900} color={primary} sx={{ fontSize: { xs: '1.75rem', md: '2.125rem' } }}>
                {product.price?.display || `$${product.price?.amount}`}
              </Typography>
              {product.compareAtPrice && (
                <>
                  <Typography variant="h6" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                    ${product.compareAtPrice}
                  </Typography>
                  <Chip label={`Save ${discountPercent}%`} color="success" size="small" sx={{ fontWeight: 700 }} />
                </>
              )}
            </Box>

            {/* Stock status */}
            <Box sx={{ mb: 3 }}>
              {stockStatus === 'in_stock' && (
                <Chip icon={<VerifiedUser />} label="In Stock — Ready to ship" color="success" variant="outlined" size="small" />
              )}
              {stockStatus === 'low_stock' && (
                <Chip label={`Only ${product.stock?.quantity} left — Order soon`} color="warning" size="small" sx={{ fontWeight: 600 }} />
              )}
              {isOutOfStock && (
                <Chip label="Out of Stock" color="error" size="small" sx={{ fontWeight: 600 }} />
              )}
            </Box>

            {/* Variants */}
            {product.variants?.map((variant) => (
              <Box key={variant.name} sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  {variant.name}: <Box component="span" color="text.secondary" fontWeight={400}>{selectedVariants[variant.name] || 'Select'}</Box>
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {variant.values.map((value) => {
                    const isSelected = selectedVariants[variant.name] === value;
                    return (
                      <Chip key={value} label={value}
                        onClick={() => handleVariantSelect(variant.name, value)}
                        variant={isSelected ? 'filled' : 'outlined'}
                        sx={{
                          fontWeight: 600, cursor: 'pointer',
                          bgcolor: isSelected ? primary : 'transparent', color: isSelected ? '#fff' : 'inherit',
                          borderColor: isSelected ? primary : 'var(--commerce-border, #d1d5db)',
                          '&:hover': { borderColor: primary },
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
            ))}

            {/* Quantity + Add to Cart — anchor for sticky bar detection */}
            <Box id="pdp-actions">
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', border: '2px solid var(--commerce-border, #e5e7eb)', borderRadius: '999px', overflow: 'hidden' }}>
                  <IconButton aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={isOutOfStock} size="small" sx={{ p: 1 }}>
                    <RemoveIcon />
                  </IconButton>
                  <Typography sx={{ px: 2.5, minWidth: 48, textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }}>{quantity}</Typography>
                  <IconButton aria-label="Increase quantity" onClick={() => setQuantity(quantity + 1)} disabled={isOutOfStock} size="small" sx={{ p: 1 }}>
                    <AddIcon />
                  </IconButton>
                </Box>
                <Button variant="contained" size="large" startIcon={<CartIcon />}
                  onClick={handleAddToCart} disabled={isOutOfStock || addingToCart}
                  sx={{ flex: 1, bgcolor: primary, borderRadius: '999px', fontWeight: 700, fontSize: '1rem', textTransform: 'none', py: 1.5, '&:hover': { bgcolor: primary, filter: 'brightness(1.1)' } }}>
                  {addingToCart ? 'Adding...' : 'Add to Cart'}
                </Button>
                <IconButton aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  onClick={() => setWishlisted(!wishlisted)}
                  sx={{ border: '2px solid var(--commerce-border, #e5e7eb)', borderRadius: '999px', width: 56, height: 56, color: wishlisted ? '#ef4444' : 'inherit' }}>
                  {wishlisted ? <Favorite /> : <FavoriteBorder />}
                </IconButton>
              </Stack>
              <Button variant="contained" size="large" fullWidth onClick={handleBuyNow} disabled={isOutOfStock}
                sx={{ bgcolor: accent, borderRadius: '999px', fontWeight: 700, fontSize: '1rem', textTransform: 'none', py: 1.5, mb: 3, '&:hover': { bgcolor: accent, filter: 'brightness(1.1)' }, boxShadow: `0 8px 24px ${accent}44` }}>
                Buy It Now
              </Button>
            </Box>

            {/* Trust badges */}
            <Divider sx={{ my: 3 }} />
            <Grid container spacing={2}>
              {[
                { icon: <LocalShipping fontSize="small" />, label: 'Free shipping on orders over $50', color: '#10B981' },
                { icon: <Autorenew fontSize="small" />, label: '30-day easy returns', color: '#6366F1' },
                { icon: <VerifiedUser fontSize="small" />, label: 'Secure checkout', color: '#F59E0B' },
              ].map((badge) => (
                <Grid size={{ xs: 12, sm: 4 }} key={badge.label}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: badge.color }}>
                    {badge.icon}
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>{badge.label}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        {/* Description section */}
        <Box sx={{ mt: 8 }}>
          <Typography variant="h5" fontWeight={800} gutterBottom
            sx={{ fontFamily: 'var(--commerce-font-heading, Outfit, sans-serif)' }}>
            Product Description
          </Typography>
          <Divider sx={{ mb: 3 }} />
          {product.description ? (
            <Box dangerouslySetInnerHTML={{ __html: safeHtml(product.description) }}
              sx={{ maxWidth: 800, lineHeight: 1.8, color: 'var(--commerce-text-secondary, #374151)', '& p': { mb: 2 }, '& ul, & ol': { pl: 3, mb: 2 }, '& img': { maxWidth: '100%', borderRadius: 2 } }} />
          ) : (
            <Typography color="text.secondary">No description available.</Typography>
          )}
        </Box>
      </Container>

      {/* Sticky Add-to-Cart Bar */}
      {showStickyBar && (
        <Box sx={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100,
          bgcolor: '#fff', borderTop: '1px solid var(--commerce-border, #e5e7eb)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.08)', px: 2, py: 1.5,
          display: { xs: 'flex', md: 'none' },
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', maxWidth: 600, mx: 'auto' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={800} noWrap fontSize="0.9rem">{product.name}</Typography>
              <Typography fontWeight={800} color={primary} fontSize="1rem">{product.price?.display || `$${product.price?.amount}`}</Typography>
            </Box>
            <Button variant="contained" startIcon={<CartIcon />} onClick={handleAddToCart} disabled={isOutOfStock || addingToCart}
              sx={{ bgcolor: primary, borderRadius: '999px', fontWeight: 700, textTransform: 'none', px: 3, whiteSpace: 'nowrap', '&:hover': { bgcolor: primary, filter: 'brightness(1.1)' } }}>
              {addingToCart ? 'Adding...' : 'Add to Cart'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Toast */}
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ fontWeight: 600 }}>{toast}</Alert>
      </Snackbar>
    </>
  );
};

export default ProductDetailPage;
