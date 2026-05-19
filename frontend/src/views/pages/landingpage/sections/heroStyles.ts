export type HeroTone = 'dark' | 'light';

export interface HeroStyleTokens {
  background: string;
  beforeBg: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  accent: string;
  bodyText: string;
  statusText: string;
  divider: string;
  trustDivider: string;
  trustTitle: string;
  trustText: string;
  productStageBg: string;
  productStageBorder: string;
  productStageShadow: string;
  monitorFrame: string;
  monitorBorder: string;
  monitorShadow: string;
  monitorStand: string;
  monitorBase: string;
  screenBorder: string;
}

export function darkHeroStyles(): HeroStyleTokens {
  return {
    background:
      'radial-gradient(circle at 8% 84%, rgba(34, 197, 94, 0.18), transparent 30%), radial-gradient(circle at 58% 16%, rgba(74, 222, 128, 0.14), transparent 25%), linear-gradient(115deg, var(--lp-hero-bg) 0%, #111827 52%, #07111F 100%)',
    beforeBg: 'rgba(74, 222, 128, 0.10)',
    badgeBg: 'rgba(34, 197, 94, 0.16)',
    badgeColor: '#86EFAC',
    badgeBorder: 'rgba(134, 239, 172, 0.28)',
    accent: '#86EFAC',
    bodyText: 'rgba(248, 250, 252, 0.78)',
    statusText: 'rgba(248, 250, 252, 0.72)',
    divider: 'rgba(248, 250, 252, 0.14)',
    trustDivider: 'rgba(248, 250, 252, 0.14)',
    trustTitle: '#F8FAFC',
    trustText: '#CBD5E1',
    productStageBg:
      'radial-gradient(circle at 78% 12%, rgba(74, 222, 128, 0.16), transparent 28%), radial-gradient(circle at 25% 82%, rgba(34, 197, 94, 0.13), transparent 28%), linear-gradient(180deg, rgba(15,23,42,0.68), rgba(15,23,42,0.30))',
    productStageBorder: 'rgba(134, 239, 172, 0.14)',
    productStageShadow: '0 32px 90px rgba(0, 0, 0, 0.26)',
    monitorFrame: 'linear-gradient(180deg, #26313E 0%, #0F172A 100%)',
    monitorBorder: 'rgba(255, 255, 255, 0.18)',
    monitorShadow: '0 38px 90px rgba(0, 0, 0, 0.34)',
    monitorStand: 'linear-gradient(180deg, #2B313A 0%, #121820 100%)',
    monitorBase: '#111827',
    screenBorder: 'rgba(255, 255, 255, 0.20)',
  };
}

export function lightHeroStyles(): HeroStyleTokens {
  return {
    background:
      'radial-gradient(circle at 8% 84%, rgba(22, 163, 74, 0.12), transparent 30%), radial-gradient(circle at 58% 16%, rgba(22, 163, 74, 0.10), transparent 25%), linear-gradient(115deg, #F6FFF9 0%, #FFFFFF 48%, #F8FAFC 100%)',
    beforeBg: 'rgba(22, 163, 74, 0.08)',
    badgeBg: '#DCFCE7',
    badgeColor: '#15803D',
    badgeBorder: 'rgba(22, 163, 74, 0.18)',
    accent: '#16A34A',
    bodyText: '#475569',
    statusText: '#475569',
    divider: 'rgba(15, 23, 42, 0.10)',
    trustDivider: 'rgba(15, 23, 42, 0.12)',
    trustTitle: '#0F172A',
    trustText: '#52637A',
    productStageBg:
      'radial-gradient(circle at 80% 10%, rgba(22, 163, 74, 0.14), transparent 28%), radial-gradient(circle at 20% 82%, rgba(21, 128, 61, 0.10), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.92), rgba(236,253,245,0.72))',
    productStageBorder: 'rgba(22, 163, 74, 0.16)',
    productStageShadow: '0 28px 80px rgba(22, 101, 52, 0.11)',
    monitorFrame: 'linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)',
    monitorBorder: 'rgba(15, 23, 42, 0.12)',
    monitorShadow: '0 36px 86px rgba(15, 23, 42, 0.16)',
    monitorStand: 'linear-gradient(180deg, #334155 0%, #101827 100%)',
    monitorBase: '#111827',
    screenBorder: 'rgba(15, 23, 42, 0.10)',
  };
}
