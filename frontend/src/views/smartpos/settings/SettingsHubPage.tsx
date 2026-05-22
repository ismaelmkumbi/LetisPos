/**
 * Settings Hub — card-based navigation landing page for all settings categories.
 * Replaces the old SettingsHome (Preferences) form at /smartpos/settings.
 */
import { Box, Stack, Typography, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router';
import {
  IconBuildingStore,
  IconReceipt,
  IconSettings,
  IconFileInvoice,
  IconPrinter,
  IconReceiptTax,
  IconGift,
  IconBell,
  IconLanguage,
  IconBuildingWarehouse,
  IconUsers,
  IconCreditCard,
  IconWorld,
  IconRocket,
  IconPalette,
  IconEye,
} from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand, brandGradients } from 'src/theme/smartpos/brand';

interface SettingsCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  tone: 'primary' | 'accent' | 'neutral';
  badge?: string;
}

const brandIcons: Record<string, React.ReactNode> = {
  'brand-identity':  <IconPalette size={22} />,
  'document-themes': <IconEye size={22} />,
  receipt:           <IconReceipt size={22} />,
  'pos-behaviour':   <IconSettings size={22} />,
  templates:         <IconFileInvoice size={22} />,
  printers:          <IconPrinter size={22} />,
  'tax-pricing':     <IconReceiptTax size={22} />,
  loyalty:           <IconGift size={22} />,
  notifications:     <IconBell size={22} />,
  i18n:              <IconLanguage size={22} />,
  branches:          <IconBuildingWarehouse size={22} />,
  users:             <IconUsers size={22} />,
  billing:           <IconCreditCard size={22} />,
  locale:            <IconWorld size={22} />,
  onboarding:        <IconRocket size={22} />,
};

const SETTINGS_CARDS: SettingsCard[] = [
  {
    title: 'Brand Identity',
    description: 'Business name, logo, colors, typography & social links. Flows into every document template.',
    icon: brandIcons['brand-identity'],
    href: '/smartpos/settings/brand-identity',
    tone: 'primary',
    badge: 'New',
  },
  {
    title: 'Document Themes',
    description: 'Per-document-type color & layout overrides for invoices, receipts, quotes & more.',
    icon: brandIcons['document-themes'],
    href: '/smartpos/settings/document-themes',
    tone: 'primary',
    badge: 'New',
  },
  {
    title: 'Receipt Settings',
    description: 'Thermal & A4 receipt layout, paper size, field visibility toggles & auto-print.',
    icon: brandIcons.receipt,
    href: '/smartpos/settings/receipt',
    tone: 'accent',
  },
  {
    title: 'POS Behaviour',
    description: 'Stock rules, product grid, kiosk timeout, sale reference numbering, tax & currency defaults.',
    icon: brandIcons['pos-behaviour'],
    href: '/smartpos/settings/pos-behaviour',
    tone: 'accent',
  },
  {
    title: 'Document Templates',
    description: 'Drag-and-drop template editor for invoices, receipts, quotations & more.',
    icon: brandIcons.templates,
    href: '/smartpos/settings/templates',
    tone: 'neutral',
  },
  {
    title: 'Printer Settings',
    description: 'Configure thermal & label printers, print servers & connection profiles.',
    icon: brandIcons.printers,
    href: '/smartpos/settings/printers',
    tone: 'neutral',
  },
  {
    title: 'Tax & Pricing',
    description: 'Tax rates, pricing rules, discount limits & manager approval thresholds.',
    icon: brandIcons['tax-pricing'],
    href: '/smartpos/settings/tax-pricing',
    tone: 'neutral',
  },
  {
    title: 'Loyalty Programme',
    description: 'Points-per-currency, redemption values, minimum thresholds & loyalty tiers.',
    icon: brandIcons.loyalty,
    href: '/smartpos/settings/loyalty',
    tone: 'neutral',
  },
  {
    title: 'Notifications',
    description: 'Low-stock alerts, daily summaries, email & in-app notification preferences.',
    icon: brandIcons.notifications,
    href: '/smartpos/settings/notifications',
    tone: 'neutral',
  },
  {
    title: 'Localization',
    description: 'Display language, date/time formats, currency formatting & regional defaults.',
    icon: brandIcons.i18n,
    href: '/smartpos/settings/i18n',
    tone: 'neutral',
  },
  {
    title: 'Branches',
    description: 'Manage warehouse locations, store addresses & regional settings.',
    icon: brandIcons.branches,
    href: '/smartpos/settings/branches',
    tone: 'neutral',
  },
  {
    title: 'Users & Roles',
    description: 'Invite team members, assign roles & manage permissions.',
    icon: brandIcons.users,
    href: '/smartpos/settings/users',
    tone: 'neutral',
  },
  {
    title: 'Billing & Plans',
    description: 'Current plan, usage limits, payment methods & invoice history.',
    icon: brandIcons.billing,
    href: '/smartpos/billing',
    tone: 'neutral',
  },
  {
    title: 'Onboarding',
    description: 'Track workspace setup progress & re-run guided configuration.',
    icon: brandIcons.onboarding,
    href: '/smartpos/settings/onboarding',
    tone: 'neutral',
  },
];

const TONE_COLORS = {
  primary: {
    bg: brand.primary[50],
    border: brand.primary[200],
    iconBg: brand.primary[100],
    iconColor: brand.primary[700],
    hoverBorder: brand.primary[400],
    hoverBg: brand.primary[50],
  },
  accent: {
    bg: '#fff',
    border: brand.neutral[200],
    iconBg: brand.accent[50],
    iconColor: brand.accent[600],
    hoverBorder: brand.accent[300],
    hoverBg: brand.accent[50],
  },
  neutral: {
    bg: '#fff',
    border: brand.neutral[200],
    iconBg: brand.neutral[50],
    iconColor: brand.neutral[600],
    hoverBorder: brand.primary[300],
    hoverBg: brand.neutral[50],
  },
};

export default function SettingsHubPage() {
  const navigate = useNavigate();

  return (
    <Box>
      <PageHeader
        title="Settings"
        subtitle="Configure your workspace, brand identity, documents & team"
        badge={{ label: 'Enterprise', tone: 'primary' }}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            lg: '1fr 1fr 1fr',
          },
          gap: 2,
          maxWidth: 1680,
          mx: 'auto',
        }}
      >
        {SETTINGS_CARDS.map((card) => {
          const c = TONE_COLORS[card.tone];

          return (
            <Box
              key={card.href}
              onClick={() => navigate(card.href)}
              sx={{
                p: 2.5,
                borderRadius: '14px',
                border: `1px solid ${c.border}`,
                bgcolor: c.bg,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                '&:hover': {
                  borderColor: c.hoverBorder,
                  bgcolor: c.hoverBg,
                  boxShadow: `0 4px 20px ${brand.primary[500]}10, 0 12px 40px -16px ${brand.neutral[900]}12`,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              {/* Badge */}
              {card.badge && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: 16,
                    px: 1,
                    py: 0.25,
                    borderRadius: '6px',
                    bgcolor: brand.primary[600],
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                  }}
                >
                  {card.badge}
                </Box>
              )}

              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: c.iconBg,
                  color: c.iconColor,
                  display: 'grid',
                  placeItems: 'center',
                  mb: 1.5,
                  mt: 0.5,
                }}
              >
                {card.icon}
              </Box>

              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  color: brand.neutral[900],
                  mb: 0.5,
                  lineHeight: 1.2,
                }}
              >
                {card.title}
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color: brand.neutral[500],
                  fontWeight: 500,
                  lineHeight: 1.45,
                  display: 'block',
                }}
              >
                {card.description}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
