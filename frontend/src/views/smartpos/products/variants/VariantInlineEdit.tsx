import { useState, useRef, useEffect, useMemo } from 'react';
import { TextField, Typography } from '@mui/material';
import { formatMoney } from 'src/utils/smartpos/currency';
import { brand } from 'src/theme/smartpos/brand';

type EditType = 'text' | 'currency' | 'url' | 'number';

interface VariantInlineEditProps {
  value: string | number | null | undefined;
  onChange: (value: string | number | undefined) => void;
  type?: EditType;
  placeholder?: string;
  isDark?: boolean;
  sx?: Record<string, unknown>;
}

export function VariantInlineEdit({
  value,
  onChange,
  type = 'text',
  placeholder,
  isDark = false,
  sx,
}: VariantInlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const displayValue = useMemo(() => {
    if (value == null || value === '') return placeholder ?? '—';
    if (type === 'currency' && typeof value === 'number') return formatMoney(value);
    return String(value);
  }, [value, type, placeholder]);

  const startEdit = () => {
    setDraft(value != null ? String(value) : '');
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (type === 'currency' || type === 'number') {
      const num = Number(draft);
      if (draft === '' || Number.isNaN(num)) {
        onChange(undefined);
      } else {
        onChange(num);
      }
    } else {
      onChange(draft || undefined);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') {
      setDraft(value != null ? String(value) : '');
      setEditing(false);
    }
  };

  const emptyColor = isDark ? brand.neutral[600] : brand.neutral[300];

  if (!editing) {
    return (
      <Typography
        onClick={startEdit}
        sx={{
          cursor: 'pointer',
          minWidth: 40,
          minHeight: 20,
          borderRadius: '4px',
          px: 0.5,
          py: 0.25,
          transition: 'background-color 0.15s',
          '&:hover': { bgcolor: isDark ? 'rgba(22,163,74,0.15)' : brand.primary[50] },
          color: value == null || value === '' ? emptyColor : 'inherit',
          fontWeight: type === 'currency' ? 700 : 500,
          fontSize: '0.8125rem',
          ...sx,
        }}
      >
        {displayValue}
      </Typography>
    );
  }

  return (
    <TextField
      inputRef={inputRef}
      size="small"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKey}
      placeholder={placeholder}
      sx={{
        minWidth: 80,
        '& .MuiOutlinedInput-root': {
          borderRadius: '6px',
          fontSize: '0.8125rem',
          '& input': { py: 0.5, px: 1 },
        },
        ...sx,
      }}
    />
  );
}
