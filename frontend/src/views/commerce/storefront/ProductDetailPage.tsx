import React, { useEffect, useState } from 'react';
import {
  Container, Grid, Typography, Box, Button, IconButton,
  Chip, Breadcrumbs, Link, Skeleton,
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router';
import { storefront } from '../../../api/smartpos/commerce';
import { useStorefront } from '../../../context/CommerceContext';
import SeoHead from '../../../components/commerce/SeoHead';
import type { StorefrontProduct } from '../../../types/commerce';

const ProductDetailPage: React.FC = () => {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useStorefront();
  const [product, setProduct] = useState<StorefrontProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (!slug || !id) return;
    setLoading(true);
    storefront.getProduct(slug, id)
      .then(setProduct)
      .catch(() => setError('Product not found'))
      .finally(() => setLoading(false));
  }, [slug, id]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton variant="text" height={40} />
            <Skeleton variant="text" height={30} width="60%" />
            <Skeleton variant="text" height={100} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5">{error || 'Product not found'}</Typography>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>Go Back</Button>
      </Container>
    );
  }

  const images = product.images?.length ? product.images : [{ url: '/placeholder.png', alt: product.name, width: 600, height: 600 }];
  const stockStatus = product.stock?.status;
  const isOutOfStock = stockStatus === 'out_of_stock';

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      await addToCart({ productId: product.id, quantity });
    } finally {
      setAddingToCart(false);
    }
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
          offers: {
            '@type': 'Offer',
            price: product.price?.amount,
            priceCurrency: product.price?.currency,
            availability: isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          },
        }}
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link underline="hover" color="inherit" onClick={() => navigate(`/store/${slug}`)} sx={{ cursor: 'pointer' }}>
            Home
          </Link>
          {product.category && (
            <Link underline="hover" color="inherit" onClick={() => navigate(`/store/${slug}/categories/${product.category.id}`)} sx={{ cursor: 'pointer' }}>
              {product.category.name}
            </Link>
          )}
          <Typography color="text.primary">{product.name}</Typography>
        </Breadcrumbs>

        <Grid container spacing={4}>
          {/* Image Gallery */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              component="img"
              src={images[selectedImage]?.url}
              alt={images[selectedImage]?.alt || product.name}
              sx={{ width: '100%', height: 'auto', maxHeight: 500, objectFit: 'cover', borderRadius: 2, mb: 2 }}
            />
            {images.length > 1 && (
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
                {images.map((img, i) => (
                  <Box
                    key={i}
                    component="img"
                    src={img.url}
                    alt={img.alt || `${product.name} ${i + 1}`}
                    onClick={() => setSelectedImage(i)}
                    sx={{
                      width: 80, height: 80, objectFit: 'cover', borderRadius: 1, cursor: 'pointer',
                      border: i === selectedImage ? '2px solid var(--commerce-primary, #1976d2)' : '2px solid transparent',
                    }}
                  />
                ))}
              </Box>
            )}
          </Grid>

          {/* Product Info */}
          <Grid size={{ xs: 12, md: 6 }}>
            {product.brand && (
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {product.brand.name}
              </Typography>
            )}
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold"
              sx={{ fontFamily: 'var(--commerce-font-heading, inherit)' }}>
              {product.name}
            </Typography>
            <Typography variant="h5" color="var(--commerce-primary, #1976d2)" fontWeight="bold" gutterBottom>
              {product.price?.display || `$${product.price?.amount}`}
            </Typography>

            {/* Stock Status */}
            <Box sx={{ mb: 2 }}>
              {stockStatus === 'in_stock' && <Chip label="In Stock" color="success" size="small" />}
              {stockStatus === 'low_stock' && <Chip label={`Only ${product.stock?.quantity} left`} color="warning" size="small" />}
              {isOutOfStock && <Chip label="Out of Stock" color="error" size="small" />}
            </Box>

            {/* Variants */}
            {product.variants?.map((variant) => (
              <Box key={variant.name} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>{variant.name}</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {variant.values.map((value) => (
                    <Chip key={value} label={value} variant="outlined" onClick={() => {}} sx={{ cursor: 'pointer' }} />
                  ))}
                </Box>
              </Box>
            ))}

            {/* Quantity + Add to Cart */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <IconButton size="small" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={isOutOfStock}>
                  <RemoveIcon />
                </IconButton>
                <Typography sx={{ px: 2, minWidth: 40, textAlign: 'center' }}>{quantity}</Typography>
                <IconButton size="small" onClick={() => setQuantity(quantity + 1)} disabled={isOutOfStock}>
                  <AddIcon />
                </IconButton>
              </Box>
              <Button
                variant="contained"
                size="large"
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart}
                sx={{
                  bgcolor: 'var(--commerce-primary, #1976d2)',
                  '&:hover': { bgcolor: 'var(--commerce-primary, #1565c0)' },
                  px: 4,
                }}
              >
                {addingToCart ? 'Adding...' : 'Add to Cart'}
              </Button>
            </Box>

            {/* Description */}
            {product.description && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>Description</Typography>
                <Typography variant="body1" color="text.secondary" dangerouslySetInnerHTML={{ __html: product.description }} />
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default ProductDetailPage;
