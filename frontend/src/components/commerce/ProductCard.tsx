import React from 'react';
import { Card, CardMedia, CardContent, Typography, IconButton, Box, Chip } from '@mui/material';
import { AddShoppingCart as CartIcon, Star } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useStorefront } from '../../context/CommerceContext';
import { getProductRating } from '../../utils/productRating';
import type { StorefrontProduct } from '../../types/commerce';

interface ProductCardProps {
  product: StorefrontProduct;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { slug, addToCart, theme } = useStorefront();
  const navigate = useNavigate();
  const primary = theme?.settings?.colors?.primary || '#1a1a2e';

  const handleClick = () => {
    navigate(`/store/${slug}/products/${product.slug || product.id}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({ productId: product.id, quantity: 1 });
  };

  const imageUrl = product.images?.[0]?.url || '/placeholder.png';
  const stockStatus = product.stock?.status;
  const discountPercent = product.compareAtPrice
    ? Math.round((1 - product.price.amount / product.compareAtPrice) * 100)
    : 0;

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid #f0f0f0',
      }}
      onClick={handleClick}
    >
      {/* Badges */}
      <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1, display: 'flex', gap: 0.5, flexDirection: 'column' }}>
        {stockStatus === 'out_of_stock' && (
          <Chip label="Sold Out" size="small" sx={{ bgcolor: 'rgba(0,0,0,0.7)', color: '#fff', fontWeight: 600, fontSize: '0.7rem' }} />
        )}
        {discountPercent > 0 && (
          <Chip label={`-${discountPercent}%`} size="small" color="error" sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
        )}
      </Box>

      <CardMedia
        component="img"
        height={220}
        image={imageUrl}
        alt={product.name}
        sx={{ objectFit: 'cover', bgcolor: '#f5f5f5' }}
      />
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Typography variant="caption" color="text.secondary" gutterBottom fontWeight={600}>
          {product.category?.name}
        </Typography>
        <Typography variant="subtitle1" component="h3" noWrap fontWeight={700} sx={{ mb: 0.5 }}>
          {product.name}
        </Typography>

        {/* Rating */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <Star sx={{ fontSize: 14, color: '#F59E0B' }} />
          <Typography variant="caption" fontWeight={600} color="text.secondary">
            {getProductRating(product.id)}
          </Typography>
        </Box>

        <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={800} color={primary}>
              {product.price?.display || `$${product.price?.amount}`}
            </Typography>
            {product.compareAtPrice && (
              <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through', ml: 0.5 }}>
                ${product.compareAtPrice}
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={handleAddToCart}
            disabled={stockStatus === 'out_of_stock'}
            sx={{
              bgcolor: primary, color: '#fff',
              width: 40, height: 40,
              '&:hover': { bgcolor: primary, filter: 'brightness(1.1)' },
              '&.Mui-disabled': { bgcolor: '#e5e7eb', color: '#9ca3af' },
            }}
          >
            <CartIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
