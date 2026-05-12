import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, CircularProgress } from '@mui/material';
import { useParams } from 'react-router';
import { storefront } from '../../../api/smartpos/commerce';
import SeoHead from '../../../components/commerce/SeoHead';
import type { StorePage } from '../../../types/commerce';

const StorePageRenderer: React.FC = () => {
  const { slug, key } = useParams<{ slug: string; key: string }>();
  const [page, setPage] = useState<StorePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !key) return;
    storefront.getPage(slug, key)
      .then(setPage)
      .catch(() => setError('Page not found'))
      .finally(() => setLoading(false));
  }, [slug, key]);

  if (loading) return <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Container>;
  if (error || !page) return <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}><Typography variant="h5">{error || 'Page not found'}</Typography></Container>;

  return (
    <>
      <SeoHead title={page.metaTitle || page.title} description={page.metaDescription} />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom
          sx={{ fontFamily: 'var(--commerce-font-heading, inherit)' }}>
          {page.title}
        </Typography>
        <Box dangerouslySetInnerHTML={{ __html: page.body }}
          sx={{
            '& img': { maxWidth: '100%', height: 'auto' },
            '& p': { mb: 2, lineHeight: 1.7 },
            '& h2, & h3': { mt: 3, mb: 1 },
          }} />
      </Container>
    </>
  );
};

export default StorePageRenderer;
