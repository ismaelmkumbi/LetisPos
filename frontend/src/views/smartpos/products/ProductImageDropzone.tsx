import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, CircularProgress, IconButton, Tooltip, Avatar } from '@mui/material';
import { IconCamera, IconTrash, IconUpload } from '@tabler/icons-react';
import { uploadProductImage } from 'src/api/smartpos/products';
import { brand } from 'src/theme/smartpos/brand';

export interface ProductImageDropzoneProps {
  imageUrl: string | undefined;
  onImageChange: (url: string | undefined) => void;
  disabled?: boolean;
}

export default function ProductImageDropzone({
  imageUrl, onImageChange, disabled = false,
}: ProductImageDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const result = await uploadProductImage(file);
      onImageChange(result.url);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Upload failed';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  }, [onImageChange]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onCameraChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so the same file can be re-selected if needed
    e.target.value = '';
  }, [handleFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
    maxFiles: 1,
    multiple: false,
    disabled: disabled || uploading,
    noClick: true, // we handle click ourselves
  });

  const handleRemove = () => {
    setUploadError(null);
    onImageChange(undefined);
  };

  if (imageUrl) {
    return (
      <Box sx={{ position: 'relative', display: 'inline-block', borderRadius: '12px', overflow: 'hidden' }}>
        <Avatar
          src={imageUrl}
          variant="rounded"
          sx={{ width: 120, height: 120, bgcolor: brand.neutral[100] }}
        />
        <Box
          sx={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 0.5,
            bgcolor: 'rgba(0,0,0,0.45)',
            opacity: 0, transition: 'opacity 0.2s',
            '&:hover': { opacity: 1 },
          }}
        >
          <Tooltip title="Change image">
            <Box
              {...getRootProps()}
              sx={{
                cursor: 'pointer', width: 36, height: 36,
                borderRadius: '8px', bgcolor: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <input {...getInputProps()} />
              {uploading ? <CircularProgress size={14} /> : <IconUpload size={16} color={brand.primary[600]} />}
            </Box>
          </Tooltip>
          <Tooltip title="Remove image">
            <IconButton
              size="small"
              onClick={handleRemove}
              sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#fff', '&:hover': { bgcolor: brand.error.light } }}
            >
              <IconTrash size={16} color={brand.error.main} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {/* Desktop dropzone */}
        <Box
          {...getRootProps()}
          sx={{
            flex: 1,
            height: 120,
            borderRadius: '12px',
            border: `2px dashed ${isDragActive ? brand.primary[400] : brand.neutral[300]}`,
            bgcolor: isDragActive ? brand.primary[50] : brand.neutral[50],
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            opacity: disabled || uploading ? 0.6 : 1,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: brand.primary[400],
              bgcolor: brand.primary[50],
            },
          }}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <>
              <CircularProgress size={24} sx={{ color: brand.primary[600] }} />
              <Typography variant="caption" sx={{ color: brand.neutral[500] }}>Uploading…</Typography>
            </>
          ) : (
            <>
              <Box sx={{ color: brand.neutral[400], display: 'flex' }}>
                <IconUpload size={24} />
              </Box>
              <Typography variant="caption" sx={{ color: brand.neutral[600], fontWeight: 600, textAlign: 'center', px: 1 }}>
                Drop image or click
              </Typography>
            </>
          )}
        </Box>

        {/* Mobile camera button — uses native input with capture="environment" */}
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: '12px',
            border: `2px solid ${brand.primary[200]}`,
            bgcolor: brand.primary[50],
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            opacity: disabled || uploading ? 0.6 : 1,
            transition: 'all 0.2s ease',
            flexShrink: 0,
            '&:hover': { borderColor: brand.primary[400], bgcolor: brand.primary[100] },
          }}
          component="label"
        >
          <IconCamera size={28} color={brand.primary[600]} />
          <Typography variant="caption" sx={{ color: brand.primary[700], fontWeight: 600, textAlign: 'center', lineHeight: 1.2, px: 0.5 }}>
            Take photo
          </Typography>
          {/* Native file input with capture — guaranteed camera on mobile */}
          <Box
            component="input"
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            disabled={disabled || uploading}
            onChange={onCameraChange}
            sx={{ display: 'none' }}
          />
        </Box>
      </Box>

      <Typography variant="caption" sx={{ color: brand.neutral[400], textAlign: 'center', display: 'block', mt: 0.75 }}>
        or paste URL below
      </Typography>

      {uploadError && (
        <Typography variant="caption" sx={{ color: brand.error.main, mt: 0.5, display: 'block' }}>
          {uploadError}
        </Typography>
      )}
    </Box>
  );
}
