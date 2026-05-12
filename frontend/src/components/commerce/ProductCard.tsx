import React from 'react';
import { Card, CardMedia, CardContent, Typography, IconButton, Box } from '@mui/material';
import { AddShoppingCart as CartIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useStorefront } from '../../context/CommerceContext';
import type { StorefrontProduct } from '../../types/commerce';

interface ProductCardProps {
  product: StorefrontProduct;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { slug, addToCart } = useStorefront();
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/store/${slug}/products/${product.slug || product.id}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({ productId: product.id, quantity: 1 });
  };

  const imageUrl = product.images?.[0]?.url || '/placeholder.png';
  const stockStatus = product.stock?.status;

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={handleClick}
    >
      {stockStatus === 'out_of_stock' && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            bgcolor: 'rgba(0,0,0,0.7)',
            color: 'white',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontSize: '0.75rem',
            zIndex: 1,
          }}
        >
          Out of Stock
        </Box>
      )}
      <CardMedia
        component="img"
        height={200}
        image={imageUrl}
        alt={product.name}
        sx={{ objectFit: 'cover' }}
      />
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {product.category?.name}
        </Typography>
        <Typography variant="h6" component="h3" noWrap>
          {product.name}
        </Typography>
        <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
          <Typography variant="h6" color="var(--commerce-primary, #1976d2)" fontWeight="bold">
            {product.price?.display || `$${product.price?.amount}`}
          </Typography>
          <IconButton
            color="primary"
            onClick={handleAddToCart}
            disabled={stockStatus === 'out_of_stock'}
            sx={{ bgcolor: 'var(--commerce-primary, #1976d2)', color: 'white', '&:hover': { bgcolor: 'var(--commerce-primary, #1565c0)' } }}
          >
            <CartIcon />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
