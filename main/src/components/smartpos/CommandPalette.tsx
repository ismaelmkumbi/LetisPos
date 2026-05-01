/**
 * Letis POS — Enterprise Command Palette (Cmd+K)
 *
 * Quick navigation to any page, action, or record.
 * Inspired by Linear, GitHub, and Vercel command palettes.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Dialog, InputAdornment, List, ListItemButton,
  ListItemIcon, ListItemText, TextField, Typography,
  Divider, Chip, useMediaQuery
} from '@mui/material';
import {
  IconSearch, IconDashboard, IconCashRegister, IconPackage,
  IconUsers, IconShoppingCart, IconReceipt, IconBuildingWarehouse,
  IconChartBar, IconSettings, IconArrowRight, IconSparkles
} from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  path: string;
  category: 'Navigation' | 'Actions' | 'Reports' | 'Settings';
  keywords: string[];
  badge?: string;
}

const COMMANDS: CommandItem[] = [
  // Navigation
  { id: 'dashboard', label: 'Dashboard', icon: <IconDashboard size={18} />, path: '/smartpos/dashboard', category: 'Navigation', keywords: ['home', 'overview', 'stats'] },
  { id: 'pos', label: 'POS Terminal', icon: <IconCashRegister size={18} />, path: '/smartpos/pos', category: 'Navigation', keywords: ['sale', 'checkout', 'register'], badge: 'LIVE' },
  { id: 'products', label: 'Products', icon: <IconPackage size={18} />, path: '/smartpos/products', category: 'Navigation', keywords: ['items', 'catalog', 'inventory'] },
  { id: 'customers', label: 'Customers', icon: <IconUsers size={18} />, path: '/smartpos/customers', category: 'Navigation', keywords: ['clients', 'buyers', 'contacts'] },
  { id: 'sales', label: 'Sales Orders', icon: <IconReceipt size={18} />, path: '/smartpos/sales', category: 'Navigation', keywords: ['orders', 'transactions', 'invoices'] },
  { id: 'purchases', label: 'Purchases', icon: <IconShoppingCart size={18} />, path: '/smartpos/purchases', category: 'Navigation', keywords: ['orders', 'buying', 'procurement'] },
  { id: 'stock', label: 'Stock Levels', icon: <IconBuildingWarehouse size={18} />, path: '/smartpos/stock', category: 'Navigation', keywords: ['inventory', 'warehouse', 'quantity'] },
  { id: 'reports', label: 'Reports', icon: <IconChartBar size={18} />, path: '/smartpos/reports', category: 'Navigation', keywords: ['analytics', 'data', 'export'] },

  // Quick Actions
  { id: 'new-sale', label: 'New Sale', icon: <IconCashRegister size={18} />, path: '/smartpos/pos', category: 'Actions', keywords: ['create', 'transaction', 'sell'] },
  { id: 'new-product', label: 'New Product', icon: <IconPackage size={18} />, path: '/smartpos/products', category: 'Actions', keywords: ['create', 'add', 'item'] },
  { id: 'new-customer', label: 'New Customer', icon: <IconUsers size={18} />, path: '/smartpos/customers', category: 'Actions', keywords: ['create', 'add', 'client'] },
  { id: 'new-purchase', label: 'New Purchase', icon: <IconShoppingCart size={18} />, path: '/smartpos/purchases/new', category: 'Actions', keywords: ['create', 'order', 'buy'] },

  // AI
  { id: 'ai-insights', label: 'AI Insights', icon: <IconSparkles size={18} />, path: '/smartpos/ai', category: 'Reports', keywords: ['analytics', 'predictions', 'forecast'], badge: 'NEW' },

  // Settings
  { id: 'settings', label: 'Settings', icon: <IconSettings size={18} />, path: '/smartpos/settings', category: 'Settings', keywords: ['preferences', 'configuration', 'options'] },
];

const CATEGORY_ORDER = ['Navigation', 'Actions', 'Reports', 'Settings'];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMediaQuery('(max-width:600px)');

  // Filter and group commands
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return COMMANDS;
    return COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.keywords.some(k => k.includes(q)) ||
      cmd.category.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filtered.forEach(cmd => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return CATEGORY_ORDER.map(cat => ({ category: cat, items: groups[cat] || [] }))
      .filter(g => g.items.length > 0);
  }, [filtered]);

  const flatItems = useMemo(() => grouped.flatMap(g => g.items), [grouped]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = flatItems[selectedIndex];
        if (item) {
          navigate(item.path);
          onClose();
          setQuery('');
        }
      } else if (e.key === 'Escape') {
        onClose();
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, flatItems, selectedIndex, navigate, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [open]);

  // Reset when pathname changes
  useEffect(() => {
    setQuery('');
    onClose();
  }, [location.pathname, onClose]);

  const handleSelect = (item: CommandItem) => {
    navigate(item.path);
    onClose();
    setQuery('');
  };

  let globalIndex = 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          mt: isMobile ? 2 : 8,
          maxHeight: '70vh',
        }
      }}
    >
      {/* Search input */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${brand.neutral[200]}` }}>
        <TextField
          fullWidth
          inputRef={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          placeholder="Search commands, pages, or actions..."
          variant="standard"
          InputProps={{
            disableUnderline: true,
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={20} color={brand.neutral[400]} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 500 }}>
                  ESC to close
                </Typography>
              </InputAdornment>
            ),
            sx: {
              fontSize: '1rem',
              '& input': { py: 1 },
            }
          }}
        />
      </Box>

      {/* Results list */}
      <Box sx={{ overflow: 'auto', maxHeight: '50vh' }}>
        {flatItems.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: brand.neutral[500] }}>
              No commands found for "{query}"
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ py: 0 }}>
            {grouped.map((group, groupIdx) => (
              <Box key={group.category}>
                {groupIdx > 0 && <Divider sx={{ my: 1 }} />}
                <Typography
                  variant="caption"
                  sx={{
                    px: 2,
                    py: 0.5,
                    display: 'block',
                    color: brand.neutral[400],
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {group.category}
                </Typography>
                {group.items.map((item) => {
                  const isSelected = globalIndex === selectedIndex;
                  const currentIndex = globalIndex++;
                  return (
                    <ListItemButton
                      key={item.id}
                      selected={isSelected}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      sx={{
                        py: 1,
                        px: 2,
                        mx: 1,
                        borderRadius: '8px',
                        mb: 0.5,
                        '&.Mui-selected': {
                          bgcolor: brand.primary[50],
                          '&:hover': { bgcolor: brand.primary[100] },
                        },
                        '&:hover': { bgcolor: brand.neutral[50] },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: isSelected ? brand.primary[600] : brand.neutral[500] }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: isSelected ? 600 : 500,
                                color: isSelected ? brand.primary[700] : brand.neutral[800],
                              }}
                            >
                              {item.label}
                            </Typography>
                            {item.badge && (
                              <Chip
                                label={item.badge}
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: '0.6rem',
                                  fontWeight: 700,
                                  bgcolor: item.badge === 'LIVE' ? brand.error.light : brand.success.light,
                                  color: item.badge === 'LIVE' ? brand.error.dark : brand.success.dark,
                                }}
                              />
                            )}
                          </Box>
                        }
                      />
                      {isSelected && (
                        <IconArrowRight size={16} color={brand.primary[500]} />
                      )}
                    </ListItemButton>
                  );
                })}
              </Box>
            ))}
          </List>
        )}
      </Box>

      {/* Footer tips */}
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: brand.neutral[50],
          borderTop: `1px solid ${brand.neutral[200]}`,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
          <Box component="kbd" sx={{ px: 0.5, py: 0.25, bgcolor: 'white', borderRadius: 1, border: `1px solid ${brand.neutral[200]}`, fontFamily: 'inherit' }}>↑↓</Box> to navigate
        </Typography>
        <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
          <Box component="kbd" sx={{ px: 0.5, py: 0.25, bgcolor: 'white', borderRadius: 1, border: `1px solid ${brand.neutral[200]}`, fontFamily: 'inherit' }}>↵</Box> to select
        </Typography>
      </Box>
    </Dialog>
  );
}

// Hook to trigger command palette
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    // This will be handled by the component that mounts the palette
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  }
});

export default CommandPalette;
