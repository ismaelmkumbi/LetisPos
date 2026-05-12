import React, { useState, useCallback } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useStorefront } from '../../context/CommerceContext';

const SearchBar: React.FC = () => {
  const { slug } = useStorefront();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/store/${slug}/search?q=${encodeURIComponent(trimmed)}`);
    }
  }, [query, slug, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <TextField
      fullWidth
      size="small"
      placeholder="Search products..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={handleKeyDown}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={handleSearch}>
                <SearchIcon />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
      sx={{
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 1,
        '& .MuiOutlinedInput-root': { color: 'white' },
        '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.7)' },
      }}
    />
  );
};

export default SearchBar;
