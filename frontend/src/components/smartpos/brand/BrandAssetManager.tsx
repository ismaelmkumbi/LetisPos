/**
 * BrandAssetManager — dashboard view of all brand assets (logos, watermarks,
 * stamps, signatures, QR codes, favicons) with variant thumbnails,
 * download links, and delete actions.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconTrash,
  IconDownload,
  IconCopy,
  IconFilter,
  IconSparkles,
} from '@tabler/icons-react';
import { brand, brandTokens } from 'src/theme/smartpos/brand';
import {
  listBrandAssets,
  deleteBrandAsset,
  uploadBrandAsset,
  type BrandAsset,
} from 'src/api/smartpos/brand';

const CATEGORIES = ['all', 'logo', 'favicon', 'watermark', 'stamp', 'signature', 'qr', 'other'] as const;
const VARIANT_LABELS: Record<string, string> = {
  original: 'Original',
  monochrome: 'Monochrome',
  thermal: 'Thermal',
  favicon: 'Favicon',
  thumbnail: 'Thumbnail',
};

export default function BrandAssetManager() {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<BrandAsset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listBrandAssets(filter === 'all' ? undefined : (filter as BrandAsset['category']));
      setAssets(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const showInfo = (msg: string) => { setInfo(msg); setTimeout(() => setInfo(null), 3000); };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadBrandAsset({ file, category: 'logo' });
      showInfo('Asset uploaded.');
      fetchAssets();
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteBrandAsset(deleteConfirm.id);
      setDeleteConfirm(null);
      showInfo('Asset deleted.');
      fetchAssets();
    } catch {
      setError('Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => showInfo('URL copied to clipboard'));
  };

  const filteredAssets = filter === 'all'
    ? assets
    : assets.filter((a) => a.category === filter);

  const countByCategory = assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      {/* Toolbar */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <IconFilter size={18} color={brand.neutral[500]} />
          <TextField
            select
            size="small"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}
              </MenuItem>
            ))}
          </TextField>

          {/* Category counts */}
          <Stack direction="row" spacing={0.75} sx={{ ml: 1 }}>
            {Object.entries(countByCategory).map(([cat, count]) => (
              <Chip
                key={cat}
                label={`${cat} (${count})`}
                size="small"
                onClick={() => setFilter(cat)}
                sx={{
                  fontWeight: 600,
                  fontSize: '0.68rem',
                  bgcolor: filter === cat ? brand.primary[100] : brand.neutral[100],
                  color: filter === cat ? brand.primary[700] : brand.neutral[600],
                  cursor: 'pointer',
                }}
              />
            ))}
          </Stack>
        </Stack>

        <Button
          component="label"
          variant="contained"
          startIcon={uploading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <IconSparkles size={16} />}
          disabled={uploading}
          sx={{
            background: `linear-gradient(135deg, ${brandTokens.primary} 0%, ${brand.primary[700]} 100%)`,
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '10px',
            '&:hover': { background: `linear-gradient(135deg, ${brand.primary[700]} 0%, ${brand.primary[800]} 100%)` },
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Asset'}
          <input type="file" hidden accept="image/*" onChange={handleUpload} />
        </Button>
      </Stack>

      {/* Asset grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} sx={{ color: brandTokens.primary }} />
        </Box>
      ) : filteredAssets.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            borderRadius: '14px',
            border: `2px dashed ${brand.neutral[200]}`,
            bgcolor: brand.neutral[50],
          }}
        >
          <Typography sx={{ fontWeight: 700, color: brand.neutral[500] }}>
            No assets yet
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
            Upload logos, watermarks, stamps, signatures, and more.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 2,
          }}
        >
          {filteredAssets.map((asset) => (
            <Box
              key={asset.id}
              sx={{
                borderRadius: '12px',
                border: `1px solid ${brand.neutral[200]}`,
                bgcolor: '#fff',
                overflow: 'hidden',
                boxShadow: `0 2px 8px ${brand.neutral[900]}06`,
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: `0 8px 24px ${brand.neutral[900]}0C`,
                  borderColor: brand.neutral[300],
                },
              }}
            >
              {/* Thumbnail */}
              <Box
                sx={{
                  height: 140,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: asset.variant === 'thermal' ? '#000' : brand.neutral[50],
                  borderBottom: `1px solid ${brand.neutral[100]}`,
                  position: 'relative',
                }}
              >
                <Box
                  component="img"
                  src={asset.url}
                  alt={asset.name}
                  sx={{
                    maxHeight: 100,
                    maxWidth: '80%',
                    objectFit: 'contain',
                  }}
                />

                {/* AI badge */}
                {asset.aiGenerated && (
                  <Chip
                    label="AI"
                    size="small"
                    icon={<IconSparkles size={10} />}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      bgcolor: brand.primary[100],
                      color: brand.primary[700],
                    }}
                  />
                )}
              </Box>

              {/* Info */}
              <Box sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', flex: 1 }}>
                    {asset.name}
                  </Typography>
                  <Chip
                    label={VARIANT_LABELS[asset.variant] || asset.variant}
                    size="small"
                    sx={{ fontSize: '0.62rem', fontWeight: 600 }}
                  />
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  <Chip
                    label={asset.format.toUpperCase()}
                    size="small"
                    sx={{ fontSize: '0.6rem', fontWeight: 600, bgcolor: brand.neutral[100] }}
                  />
                  <Chip
                    label={asset.category}
                    size="small"
                    sx={{ fontSize: '0.6rem', fontWeight: 600, bgcolor: brand.neutral[100] }}
                  />
                  {asset.width && asset.height && (
                    <Chip
                      label={`${asset.width}×${asset.height}`}
                      size="small"
                      sx={{ fontSize: '0.6rem', fontWeight: 600, bgcolor: brand.neutral[100] }}
                    />
                  )}
                </Stack>

                {/* Actions */}
                <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                  <IconButton size="small" onClick={() => copyUrl(asset.url)} title="Copy URL">
                    <IconCopy size={14} />
                  </IconButton>
                  <IconButton
                    size="small"
                    component="a"
                    href={asset.url}
                    target="_blank"
                    download
                    title="Download"
                  >
                    <IconDownload size={14} />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleteConfirm(asset)}
                    title="Delete"
                  >
                    <IconTrash size={14} />
                  </IconButton>
                </Stack>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Asset</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
            Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
