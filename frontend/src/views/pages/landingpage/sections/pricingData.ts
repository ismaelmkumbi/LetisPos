import type { PlanDefinition } from 'src/api/smartpos/billing';

export type BillingPeriod = 'monthly' | 'annual';

export interface PricingTier {
  name: string;
  planCode: string;
  monthlyPrice: string;
  annualPrice: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaVariant: 'primary' | 'secondary';
  highlighted: boolean;
}

const FEATURE_ICON = '✓ ';

function parseFeatures(featuresJson: string): string[] {
  try {
    const f = JSON.parse(featuresJson);
    const labels: Record<string, string> = {
      accounting: 'Accounting Suite',
      purchases: 'Purchases & Suppliers',
      reports: 'Advanced Reports',
      hrm: 'HR & Payroll',
      api: 'API Access',
      multi_currency: 'Multi-Currency',
      multi_company: 'Multi-Company',
      white_label: 'White-Label',
      support: 'Priority Support',
    };
    const result: string[] = [];
    for (const [key, label] of Object.entries(labels)) {
      const val = f[key];
      if (val === true || val === 'full' || val === 'full_export' || val === 'full_custom') {
        result.push(label);
      }
    }
    return result;
  } catch {
    return [];
  }
}

export function plansToTiers(plans: PlanDefinition[]): PricingTier[] {
  return plans
    .filter(p => p.isPublic && p.code !== 'FREE')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(p => {
      const isEnterprise = p.code === 'ENTERPRISE';
      const isBusiness = p.code === 'BUSINESS';
      return {
        name: p.label,
        planCode: p.code,
        monthlyPrice: p.monthlyPriceTzs > 0 ? `TZS ${p.monthlyPriceTzs.toLocaleString()}` : 'Free',
        annualPrice: isEnterprise ? 'Custom' : p.annualPriceTzs ? `TZS ${p.annualPriceTzs.toLocaleString()}` : 'Custom',
        period: '/month',
        description: p.description || '',
        features: [
          `${p.maxStores >= 2147483647 ? 'Unlimited' : p.maxStores} Store${p.maxStores !== 1 ? 's' : ''}`,
          `${p.maxUsers >= 2147483647 ? 'Unlimited' : p.maxUsers} Users`,
          `${p.maxProducts >= 2147483647 ? 'Unlimited' : p.maxProducts.toLocaleString()} Products`,
          'Inventory Management',
          'Sales & Purchases',
          ...parseFeatures(p.features),
          isEnterprise ? 'SLA Support' : p.code === 'PROFESSIONAL' ? 'Priority Support' : 'Email Support',
        ],
        cta: isEnterprise ? 'Contact sales' : 'Start free trial',
        ctaVariant: (isBusiness ? 'primary' : 'secondary') as 'primary' | 'secondary',
        highlighted: isBusiness,
      };
    });
}

export const pricingTiers: PricingTier[] = [
  // Starter — highlighted: false, ctaVariant: 'secondary'
  {
    name: 'Starter',
    monthlyPrice: 'TZS 15K',
    annualPrice: 'TZS 150K',
    period: '/month',
    description: 'Perfect for small shops and startups.',
    features: [
      '1 Store',
      '1 POS Terminal',
      'Up to 2 Users',
      'Inventory Management',
      'Sales & Purchases',
      'Basic Reports',
      'Customer Management',
      'WhatsApp Receipts',
      'Email Support',
    ],
    cta: 'Start free trial',
    ctaVariant: 'secondary' as const,
    highlighted: false,
  },
  // Business — highlighted: true, ctaVariant: 'primary'
  {
    name: 'Business',
    monthlyPrice: 'TZS 35K',
    annualPrice: 'TZS 350K',
    period: '/month',
    description: 'Perfect for growing businesses.',
    features: [
      'Up to 3 Stores',
      'Unlimited POS Terminals',
      'Up to 10 Users',
      'Advanced Inventory',
      'Accounting',
      'CRM',
      'Priority Support',
    ],
    cta: 'Start free trial',
    ctaVariant: 'primary' as const,
    highlighted: true,
  },
  // Professional — highlighted: false, ctaVariant: 'secondary'
  {
    name: 'Professional',
    monthlyPrice: 'TZS 79K',
    annualPrice: 'TZS 790K',
    period: '/month',
    description: 'Perfect for established businesses.',
    features: [
      'Up to 10 Stores',
      'Unlimited Users',
      'Full Accounting Suite',
      'HR & Payroll',
      'CRM',
      'AI Business Insights',
      'Advanced Reports',
      'Approval Workflows',
      'Priority Support',
    ],
    cta: 'Start free trial',
    ctaVariant: 'secondary' as const,
    highlighted: false,
  },
  // Enterprise — highlighted: false, ctaVariant: 'secondary', annualPrice: 'Custom'
  {
    name: 'Enterprise',
    monthlyPrice: 'TZS 250K',
    annualPrice: 'Custom',
    period: '/month',
    description: 'For supermarkets and large organizations.',
    features: [
      'Unlimited Stores',
      'Unlimited Users',
      'Multi-Company Support',
      'API Access',
      'Custom Integrations',
      'Dedicated Account Manager',
      'SLA Support',
    ],
    cta: 'Contact sales',
    ctaVariant: 'secondary' as const,
    highlighted: false,
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const pricingFaqs: FaqItem[] = [
  {
    question: 'Can I try Letis POS for free?',
    answer: 'Yes! We offer a 30-day free trial with full access to all features in your chosen plan. No credit card required.',
  },
  {
    question: 'Do I need a credit card to start?',
    answer: 'No. You can start your free trial without entering any payment information.',
  },
  {
    question: 'Can I upgrade or downgrade my plan later?',
    answer: 'Absolutely. You can change your plan at any time. Upgrades take effect immediately; downgrades apply at the next billing cycle.',
  },
  {
    question: 'Do you provide local support in Tanzania?',
    answer: 'Yes. We have a local support team in Tanzania available via phone, WhatsApp, and email during business hours.',
  },
  {
    question: 'Do the prices include VAT?',
    answer: 'Prices shown exclude VAT. VAT (18%) will be added at checkout where applicable.',
  },
];

export const trustItems: string[] = [
  '30-Day Free Trial',
  'No Credit Card Required',
  'Cancel Anytime',
  'Free Onboarding',
  'Local Support in Tanzania',
];
