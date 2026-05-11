import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconPlus,
  IconReceipt2,
  IconTrash,
  IconUsersGroup,
} from '@tabler/icons-react';

import type { PriceList } from 'src/api/smartpos/types';
import {
  createPriceList,
  deletePriceList,
  listPriceLists,
} from 'src/api/smartpos/priceLists';
import { brand } from 'src/theme/smartpos/brand';
import { PageHeader } from 'src/components/smartpos/PageHeader';

export default function PriceListsPage() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const fetch = () => {
    setLoading(true);
    listPriceLists({ size: 100 })
      .then((page) => setLists(page.content))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createPriceList({ name: newName.trim() });
      setNewName('');
      navigate(`/smartpos/products/price-lists/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePriceList(id);
      setLists((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (loading) {
    return (
      <Box sx={{ pb: 3 }}>
        <PageHeader title="Price Lists" subtitle="Tiered and group-based pricing" />
        <Grid container spacing={2}>
          {[1, 2, 3].map((n) => (
            <Grid key={n} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={180} sx={{ borderRadius: '12px' }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 3 }}>
      <PageHeader
        title="Price Lists"
        subtitle={`${lists.length} price list${lists.length !== 1 ? 's' : ''}`}
        actions={[
          {
            label: 'New Price List',
            icon: <IconPlus size={17} />,
            onClick: () => setNewName(''),
            variant: 'primary',
          },
        ]}
      />

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {lists.length === 0 ? (
        <Card
          sx={{
            borderRadius: '16px',
            border: `2px dashed ${brand.neutral[200]}`,
            bgcolor: brand.neutral[50],
            p: 6,
            textAlign: 'center',
          }}
        >
          <Stack alignItems="center" spacing={2}>
            <IconReceipt2 size={48} color={brand.neutral[400]} />
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 18, color: brand.neutral[700] }}>
                No price lists yet
              </Typography>
              <Typography sx={{ color: brand.neutral[500], mt: 0.5 }}>
                Create a price list to define tiered or group-based pricing.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                placeholder="Price list name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                sx={{ minWidth: 200 }}
                InputProps={{ sx: { borderRadius: '10px' } }}
              />
              <Button
                variant="contained"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                startIcon={<IconPlus size={16} />}
                sx={{
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 700,
                }}
              >
                Create
              </Button>
            </Stack>
          </Stack>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {lists.map((pl) => (
            <Grid key={pl.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card
                sx={{
                  borderRadius: '12px',
                  border: `1px solid ${brand.neutral[200]}`,
                  bgcolor: '#fff',
                  '&:hover': {
                    boxShadow: `0 4px 20px ${brand.neutral[900]}0D`,
                    borderColor: brand.primary[300],
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <CardActionArea
                  onClick={() => navigate(`/smartpos/products/price-lists/${pl.id}`)}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          noWrap
                          sx={{ fontWeight: 800, fontSize: 16, color: brand.neutral[900] }}
                        >
                          {pl.name}
                        </Typography>
                        {pl.description && (
                          <Typography
                            noWrap
                            sx={{ color: brand.neutral[500], fontSize: 13, mt: 0.25 }}
                          >
                            {pl.description}
                          </Typography>
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(pl.id);
                        }}
                        sx={{ color: brand.neutral[400], '&:hover': { color: brand.error.main } }}
                      >
                        <IconTrash size={16} />
                      </IconButton>
                    </Stack>

                    <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }}>
                      <Chip
                        icon={<IconUsersGroup size={14} />}
                        label={pl.customerGroup || 'All customers'}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: 11,
                          bgcolor: brand.primary[50],
                          color: brand.primary[700],
                          borderRadius: '8px',
                        }}
                      />
                      <Chip
                        label={pl.active ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: 11,
                          bgcolor: pl.active ? brand.success.light : brand.neutral[100],
                          color: pl.active ? brand.success.dark : brand.neutral[600],
                          borderRadius: '8px',
                        }}
                      />
                      <Chip
                        label={`${pl.lines?.length ?? 0} lines`}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: 11,
                          bgcolor: brand.neutral[100],
                          color: brand.neutral[600],
                          borderRadius: '8px',
                        }}
                      />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
