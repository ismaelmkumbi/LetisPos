import { Theme } from '@mui/material/styles';
import { brand } from './smartpos/brand';

const components: any = (theme: Theme) => {
  const isDark = theme.palette.mode === 'dark';

  return {
    MuiCssBaseline: {
      styleOverrides: {
        '*': { boxSizing: 'border-box' },
        html: { height: '100%', width: '100%' },
        a: { textDecoration: 'none' },
        body: {
          height: '100%',
          margin: 0,
          padding: 0,
          color: brand.neutral[900],
          background: brand.neutral[50],
          fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
        },
        '#root': { height: '100%' },

        // Custom scrollbar — thin, brand-tinted
        '::-webkit-scrollbar': { width: '6px', height: '6px' },
        '::-webkit-scrollbar-track': {
          background: isDark ? brand.neutral[800] : brand.neutral[100],
          borderRadius: '99px',
        },
        '::-webkit-scrollbar-thumb': {
          background: isDark ? brand.neutral[600] : brand.neutral[300],
          borderRadius: '99px',
          '&:hover': {
            background: isDark ? brand.neutral[500] : brand.neutral[400],
          },
        },

        // Simplebar
        '.simplebar-scrollbar:before': {
          background: `${theme.palette.grey[300]} !important`,
        },
        '.scrollbar-container': { borderRight: '0 !important' },

        // Misc template globals kept intact
        '.ql-container.ql-snow, .ql-toolbar.ql-snow': {
          border: '0 !important',
          borderRadius: '8px',
        },
        '.ql-editor, .ql-snow *': { fontFamily: 'inherit !important' },
        'pre': { background: `${theme.palette.grey[100]} !important` },
        '.btn-xs': {
          minWidth: '30px !important',
          width: '30px',
          height: '30px',
          borderRadius: '6px !important',
          padding: '0px !important',
        },
        '.hover-text-primary:hover .text-hover': {
          color: theme.palette.primary.main,
        },
        '.hoverCard:hover': { scale: '1.01', transition: '0.1s ease-in' },
        '.signup-bg': { position: 'absolute', top: 0, right: 0, height: '100%' },
        '.MuiCardHeader-action': { alignSelf: 'center !important' },
        ".MuiAlert-root .MuiAlert-icon": { color: 'inherit !important' },
        '.MuiTimelineConnector-root': { width: '1px !important' },
        '.theme-timeline .MuiTimelineOppositeContent-root': { minWidth: '90px' },

        '@keyframes gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        '@keyframes slide': {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(-2086px, 0, 0)' },
        },
        '@keyframes fadeInUp': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      },
    },

    // ────── Buttons ──────
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '8px',
          letterSpacing: 0,
        },
        sizeSmall: { padding: '5px 14px', fontSize: '0.8125rem' },
        sizeMedium: { padding: '8px 20px', fontSize: '0.875rem' },
        sizeLarge: { padding: '12px 28px', fontSize: '0.9375rem' },
        containedPrimary: {
          background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[700]} 100%)`,
          '&:hover': {
            background: brand.primary[700],
            boxShadow: `0 8px 20px -10px ${brand.primary[700]}`,
          },
        },
        containedSecondary: {
          background: brand.accent[500],
          '&:hover': {
            background: brand.accent[600],
          },
        },
        outlinedPrimary: {
          borderColor: brand.primary[300],
          '&:hover': {
            backgroundColor: brand.primary[50],
            borderColor: brand.primary[500],
          },
        },
        text: {
          padding: '6px 16px',
          '&:hover': {
            backgroundColor: isDark ? 'rgba(42, 143, 132,0.1)' : brand.primary[50],
          },
        },
        textPrimary: {
          '&:hover': {
            backgroundColor: brand.primary[50],
            color: brand.primary[700],
          },
        },
      },
    },
    MuiButtonGroup: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { boxShadow: 'none' } },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: isDark ? 'rgba(42, 143, 132,0.12)' : brand.primary[50],
            color: theme.palette.primary.main,
          },
        },
      },
    },

    // ────── Card ──────
    MuiCard: {
      styleOverrides: {
        root: {
          width: '100%',
          backgroundImage: 'none',
          borderRadius: '12px',
          border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
          boxShadow: isDark
            ? '0 1px 3px rgba(0,0,0,0.3)'
            : '0 10px 30px rgba(15,23,42,0.04)',
          transition: 'box-shadow 0.2s ease',
          '&:hover': {
            boxShadow: isDark
              ? '0 4px 12px rgba(0,0,0,0.3)'
              : '0 18px 42px rgba(15,23,42,0.07)',
          },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: { padding: '20px 24px 0' },
        title: { fontSize: '1rem', fontWeight: 600 },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px 24px',
          '&:last-child': { paddingBottom: '24px' },
        },
      },
    },

    // ────── Paper ──────
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: '12px' },
        elevation1: {
          boxShadow: isDark
            ? '0 2px 8px rgba(0,0,0,0.35)'
            : '0 1px 4px rgba(15,23,42,0.08)',
        },
      },
    },

    // ────── Inputs ──────
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          transition: 'box-shadow 0.2s ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark ? brand.neutral[600] : brand.neutral[300],
            transition: 'border-color 0.2s ease',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: brand.primary[400],
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: brand.primary[500],
            borderWidth: '1.5px',
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${brand.primary[50]}`,
          },
        },
        input: { padding: '10px 14px' },
        inputSizeSmall: { padding: '7px 12px' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 500,
          '&.Mui-focused': { color: brand.primary[600] },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { padding: '3px 9px' } },
        paper: { borderRadius: '12px', boxShadow: '0 8px 32px -8px rgba(15,23,42,0.15)' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiSelect: {
      styleOverrides: {
        select: { borderRadius: '10px' },
      },
    },

    // ────── Table ──────
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: isDark ? brand.neutral[800] : brand.neutral[50],
            color: isDark ? brand.neutral[300] : brand.neutral[600],
            fontWeight: 700,
            fontSize: '0.6875rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderBottom: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
            padding: '10px 16px',
            whiteSpace: 'nowrap',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          borderBottom: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[100]}`,
          fontSize: '0.8125rem',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background 0.15s ease',
          '&:last-child td, &:last-child th': { borderBottom: 0 },
          '&.MuiTableRow-hover:hover': {
            backgroundColor: isDark ? 'rgba(42, 143, 132,0.08)' : brand.primary[50],
          },
        },
      },
    },

    // ────── Chip ──────
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
          borderRadius: '8px',
          height: 26,
        },
        sizeSmall: { height: 20, fontSize: '0.6875rem' },
      },
    },

    // ────── Drawer / Sidebar ──────
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
          boxShadow: 'none',
        },
      },
    },

    // ────── AppBar ──────
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
          borderBottom: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
        },
      },
    },

    // ────── Dialog ──────
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '20px',
          boxShadow: '0 24px 80px -16px rgba(15,23,42,0.2)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontSize: '1.125rem', fontWeight: 700, padding: '24px 24px 16px' },
      },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: '8px 24px 24px' } },
    },

    // ────── Alerts ──────
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: '12px', fontWeight: 500 },
        standardSuccess: {
          backgroundColor: brand.success.light,
          color: brand.success.dark,
          '& .MuiAlert-icon': { color: brand.success.main },
        },
        standardError: {
          backgroundColor: brand.error.light,
          color: brand.error.dark,
          '& .MuiAlert-icon': { color: brand.error.main },
        },
        standardWarning: {
          backgroundColor: brand.warning.light,
          color: brand.warning.dark,
          '& .MuiAlert-icon': { color: brand.warning.main },
        },
        standardInfo: {
          backgroundColor: brand.info.light,
          color: brand.info.dark,
          '& .MuiAlert-icon': { color: brand.info.main },
        },
      },
    },

    // ────── Tooltip ──────
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '0.75rem',
          fontWeight: 500,
          backgroundColor: brand.neutral[900],
          color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        },
        arrow: { color: brand.neutral[900] },
      },
    },

    // ────── Pagination ──────
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 600,
          '&.Mui-selected': {
            backgroundColor: brand.primary[600],
            color: '#fff',
            '&:hover': { backgroundColor: brand.primary[700] },
          },
        },
      },
    },

    // ────── Misc ──────
    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: theme.palette.grey[200], borderRadius: '99px' },
        bar: { borderRadius: '99px' },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: isDark ? brand.neutral[700] : brand.neutral[200] },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: { boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '14px' },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: '14px',
          boxShadow: '0 8px 32px -8px rgba(15,23,42,0.18)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: '14px',
          boxShadow: '0 8px 32px -8px rgba(15,23,42,0.18)',
        },
        list: { padding: '6px' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: 500,
          padding: '8px 12px',
          gap: '10px',
          '&:hover': {
            backgroundColor: isDark ? 'rgba(42, 143, 132,0.1)' : brand.primary[50],
          },
          '&.Mui-selected': {
            backgroundColor: isDark ? 'rgba(42, 143, 132,0.15)' : brand.primary[100],
            '&:hover': {
              backgroundColor: isDark ? 'rgba(42, 143, 132,0.2)' : brand.primary[100],
            },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '10px',
          transition: 'all 0.15s ease',
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 700,
          fontSize: '0.625rem',
          minWidth: '18px',
          height: '18px',
          padding: '0 4px',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: '12px !important',
          border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
          '&:before': { display: 'none' },
          boxShadow: 'none',
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          '&.MuiSkeleton-wave::after': {
            background: `linear-gradient(90deg, transparent, ${brand.primary[100]}, transparent)`,
          },
        },
      },
    },
    MuiStepConnector: {
      styleOverrides: { line: { borderColor: theme.palette.divider } },
    },
    MuiTimelineConnector: {
      styleOverrides: { root: { backgroundColor: theme.palette.divider, width: '1px' } },
    },
    MuiGridItem: {
      styleOverrides: {
        root: { paddingTop: '24px', paddingLeft: '24px !important' },
      },
    },
  };
};

export default components;
