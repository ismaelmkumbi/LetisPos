import { useState, useMemo } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconChevronDown,
  IconSearch,
  IconPackage,
  IconCashRegister,
  IconChartBar,
  IconSettings,
  IconBuildingWarehouse,
  IconCalculator,
} from '@tabler/icons-react';

import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

interface FaqItem {
  q: string;
  a: string[];
}

interface FaqTopic {
  title: string;
  icon: React.ReactNode;
  items: FaqItem[];
}

const HELP_DATA: FaqTopic[] = [
  {
    title: 'Getting Started',
    icon: <IconPackage size={20} />,
    items: [
      {
        q: 'How do I add products?',
        a: [
          'Navigate to Products in the sidebar.',
          'Click the "Add Product" button at the top right.',
          'Fill in the product name, category, unit, and price.',
          'Optionally add a barcode, SKU, and stock quantity.',
          'Click "Save" to add the product to your catalog.',
        ],
      },
      {
        q: 'How do I process a sale?',
        a: [
          'Open the POS Terminal from the sidebar or click "LIVE".',
          'Scan a barcode or search for a product by name.',
          'Add items to the cart — adjust quantities as needed.',
          'Click "Checkout", select a payment method, and finalise the sale.',
          'A receipt will be printed (if a printer is connected) and the sale recorded.',
        ],
      },
      {
        q: 'How do I add users?',
        a: [
          'Go to Administration > Users & Roles.',
          'Click "Add User" and fill in their name, email, and phone.',
          'Assign a role (Admin, Manager, Cashier, etc.).',
          'The user will receive an invitation email to set their password.',
        ],
      },
      {
        q: 'How do I set up a warehouse?',
        a: [
          'Navigate to Inventory > Warehouses.',
          'Click "Add Warehouse" and enter a name and address.',
          'Assign a default warehouse for auto-stock allocation.',
          'Stock levels will now track per warehouse.',
        ],
      },
      {
        q: 'How do I configure receipt settings?',
        a: [
          'Go to Administration > Receipt Settings.',
          'Upload your shop logo and enter your business name / address.',
          'Choose a receipt template and customise the footer text.',
          'Test-print a receipt from the preview panel.',
        ],
      },
    ],
  },
  {
    title: 'Inventory',
    icon: <IconBuildingWarehouse size={20} />,
    items: [
      {
        q: 'How do I view stock levels?',
        a: [
          'Open Inventory > Stock Levels from the sidebar.',
          'Use the warehouse filter to see stock per location.',
          'The table shows current stock, committed stock, and available stock.',
          'Low-stock items are highlighted with a warning indicator.',
        ],
      },
      {
        q: 'How does batch tracking work?',
        a: [
          'Enable batch tracking in Settings > Preferences.',
          'When receiving stock, assign a batch/lot number.',
          'During sales, the system will track which batch was sold.',
          'Run the Batch Tracking report for full traceability.',
        ],
      },
      {
        q: 'How do I transfer stock between warehouses?',
        a: [
          'Go to Inventory > Stock Transfers.',
          'Click "New Transfer", select source and destination warehouses.',
          'Add items and quantities to transfer.',
          'Submit the transfer. It will be marked complete when the destination warehouse confirms receipt.',
        ],
      },
      {
        q: 'How do reorder rules work?',
        a: [
          'Go to Inventory > Reorder Rules.',
          'Set a minimum stock level for each product per warehouse.',
          'When stock drops below the minimum, the product appears on the reorder suggestions list.',
          'You can also set a reorder quantity to auto-generate purchase orders.',
        ],
      },
    ],
  },
  {
    title: 'Sales & POS',
    icon: <IconCashRegister size={20} />,
    items: [
      {
        q: 'How do I process a sale?',
        a: [
          'Open the POS Terminal (sidebar or quick-launch).',
          'Scan barcodes or search for products by name.',
          'Adjust quantities, apply discounts per line or cart-wide.',
          'Select payment method(s) — you can split payments across multiple methods.',
          'Complete the sale. A receipt prints and inventory is deducted automatically.',
        ],
      },
      {
        q: 'How do I issue a refund?',
        a: [
          'Go to Sales in the sidebar and find the sale you want to refund.',
          'Click on the sale to view details, then click "Refund".',
          'Select items to refund and quantities.',
          'Choose the refund payment method.',
          'Confirm the refund. Stock is returned to inventory automatically.',
        ],
      },
      {
        q: 'What are suspended sales?',
        a: [
          'Suspended sales allow you to pause a transaction in progress.',
          'In the POS terminal, click "Suspend" to park the current cart.',
          'Retrieve it later from Sales > Suspended Sales.',
          'Suspended sales do not affect inventory until completed.',
        ],
      },
      {
        q: 'How do I apply discounts?',
        a: [
          'In the POS terminal, add items to the cart.',
          'Click on a line item to apply a per-item discount (percentage or fixed).',
          'Use the "Discount" button at the bottom to apply a cart-wide discount.',
          'Discounts are reflected in the sale total and reported in the Discounts report.',
        ],
      },
    ],
  },
  {
    title: 'Finance',
    icon: <IconCalculator size={20} />,
    items: [
      {
        q: 'What is the chart of accounts?',
        a: [
          'The chart of accounts is a list of all financial accounts used by your business.',
          'It follows standard double-entry accounting with Assets, Liabilities, Equity, Income, and Expenses.',
          'Go to Finance > Chart of Accounts to view and manage your accounts.',
          'Each transaction in Letis POS posts to the appropriate accounts automatically.',
        ],
      },
      {
        q: 'How do I record a journal entry?',
        a: [
          'Navigate to Finance > Accounting > Journal Entries.',
          'Click "New Entry" and enter a date and description.',
          'Add at least two lines — one debit and one credit.',
          'The amounts must balance before you can save.',
        ],
      },
      {
        q: 'How are taxes handled?',
        a: [
          'Configure tax rates in Administration > Tax & Pricing.',
          'Assign tax rates to products (e.g. VAT 18%).',
          'Sales automatically calculate and collect tax.',
          'View tax reports under Reports > Tax Reports for filing.',
        ],
      },
      {
        q: 'What reports are available?',
        a: [
          'Profit & Loss, Balance Sheet, and Cash Flow statements are under Finance > Accounting > Financial Statements.',
          'Sales, purchase, inventory, and tax reports are under Reports.',
          'All reports support date-range filters and export to CSV/Excel.',
        ],
      },
    ],
  },
  {
    title: 'Settings',
    icon: <IconSettings size={20} />,
    items: [
      {
        q: 'How do I change preferences?',
        a: [
          'Go to Administration > Preferences.',
          'Set defaults for currency, date format, timezone, and language.',
          'Configure inventory costing method (FIFO, Average Cost).',
          'Enable or disable features like batch tracking, serial numbers, and loyalty.',
        ],
      },
      {
        q: 'How do users and roles work?',
        a: [
          'Administration > Users & Roles shows all users.',
          'Each user has a role: Admin (full access), Manager, Cashier, or a custom role.',
          'Custom roles let you grant fine-grained permissions per module.',
          'Users can only access what their role permits.',
        ],
      },
      {
        q: 'How do I customise receipts?',
        a: [
          'Go to Administration > Receipt Settings.',
          'Upload your logo and enter shop details.',
          'Choose a receipt template (thermal 80mm, A4, etc.).',
          'Customise header, footer, and displayed information.',
        ],
      },
      {
        q: 'How do integrations work?',
        a: [
          'Go to Integrations in the sidebar.',
          'Connect payment gateways (M-Pesa, card terminals, etc.).',
          'Set up TRA EFD for tax compliance in Tanzania.',
          'Connect accounting software, SMS providers, and WhatsApp API.',
          'Use webhooks to send data to external systems in real time.',
        ],
      },
    ],
  },
];

export default function HelpCenterPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return HELP_DATA;
    const q = search.toLowerCase();
    return HELP_DATA
      .map((topic) => ({
        ...topic,
        items: topic.items.filter(
          (item) =>
            item.q.toLowerCase().includes(q) ||
            item.a.some((step) => step.toLowerCase().includes(q)),
        ),
      }))
      .filter((topic) => topic.items.length > 0);
  }, [search]);

  return (
    <Box>
      <PageHeader
        title="Help Center"
        subtitle="Find answers to common questions about Letis POS"
      />

      <TextField
        placeholder="Search help articles..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <IconSearch size={18} color={brand.neutral[400]} />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 3,
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            bgcolor: '#fff',
            '& fieldset': { borderColor: brand.neutral[200] },
            '&:hover fieldset': { borderColor: brand.primary[400] },
            '&.Mui-focused fieldset': { borderColor: brand.primary[600] },
          },
        }}
      />

      {filtered.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
            No articles found for "{search}"
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
            Try a different search term
          </Typography>
        </Box>
      )}

      {filtered.map((topic) => (
        <Box key={topic.title} sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Box sx={{ color: brand.primary[600] }}>{topic.icon}</Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: brand.neutral[800], fontSize: '1rem' }}
            >
              {topic.title}
            </Typography>
            <Box
              sx={{
                ml: 1,
                px: 1,
                py: 0.25,
                borderRadius: '6px',
                bgcolor: brand.primary[50],
                color: brand.primary[700],
                fontWeight: 700,
                fontSize: '0.6875rem',
              }}
            >
              {topic.items.length}
            </Box>
          </Stack>

          {topic.items.map((item) => (
            <Accordion
              key={item.q}
              elevation={0}
              sx={{
                mb: 0.5,
                border: `1px solid ${brand.neutral[200]}`,
                borderRadius: '10px !important',
                '&:before': { display: 'none' },
                '&.Mui-expanded': {
                  borderColor: brand.primary[300],
                  boxShadow: `0 4px 12px ${brand.neutral[900]}08`,
                },
              }}
            >
              <AccordionSummary
                expandIcon={<IconChevronDown size={18} color={brand.neutral[400]} />}
                sx={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: brand.neutral[700],
                  '&.Mui-expanded': { color: brand.primary[700] },
                }}
              >
                {item.q}
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Stack spacing={1}>
                  {item.a.map((step, i) => (
                    <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: '6px',
                          bgcolor: brand.primary[50],
                          color: brand.primary[700],
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.6875rem',
                          flexShrink: 0,
                          mt: 0.125,
                        }}
                      >
                        {i + 1}
                      </Box>
                      <Typography variant="body2" sx={{ color: brand.neutral[600], lineHeight: 1.6 }}>
                        {step}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ))}
    </Box>
  );
}
