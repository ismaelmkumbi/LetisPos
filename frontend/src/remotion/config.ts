// Colors — match refinedEnterprise landing page theme
export const COLORS = {
  bg: '#0F172A',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  accent: '#4ADE80',
  accentHover: '#22C55E',
  accentSolid: '#16A34A',
  blue: '#3B82F6',
  surface: '#111827',
  surfaceHover: '#1E293B',
  border: 'rgba(226, 232, 240, 0.10)',
  warning: '#F59E0B',
  danger: '#EF4444',
  white: '#FFFFFF',
} as const;

// Video dimensions
export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 1800, // 60s * 30fps
} as const;

// Scene frame ranges (inclusive start, exclusive end)
export const SCENES = {
  brandOpen: { start: 0, end: 150 },
  theProblem: { start: 150, end: 360 },
  dashboardReveal: { start: 360, end: 660 },
  inventoryModule: { start: 660, end: 900 },
  posModule: { start: 900, end: 1140 },
  reportsAI: { start: 1140, end: 1380 },
  cloudMultistore: { start: 1380, end: 1560 },
  ctaClose: { start: 1560, end: 1800 },
} as const;

// Spring presets
export const SPRING = {
  gentle: { damping: 15, stiffness: 80 },
  text: { damping: 12, stiffness: 60 },
  snappy: { damping: 20, stiffness: 120 },
} as const;

export const FONT = {
  display: "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  body: "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
} as const;
