# Remotion Advertising Video — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 60-second vertical Remotion ad video (1080×1920, 30fps) for LetisPos featuring 8 scenes with kinetic typography and animated UI components.

**Architecture:** Remotion project nested inside `frontend/src/remotion/` reusing existing React/TypeScript setup. Reusable animated components (KineticText, UICounter, UIChart, etc.) are built first, then assembled into 8 scene `<Sequence>` components orchestrated by `AdVideo.tsx`. A shared `config.ts` holds color tokens, durations, and spring presets.

**Tech Stack:** React 19, TypeScript, Remotion 4.x, MUI (theme tokens only via config.ts inline constants)

---

### Task 1: Install Remotion + scaffold project skeleton

**Files:**
- Modify: `frontend/package.json:22-23` (add remotion, @remotion/cli deps)
- Create: `frontend/src/remotion/config.ts`
- Create: `frontend/src/remotion/Root.tsx`
- Create: `frontend/src/remotion/AdVideo.tsx`
- Create: `frontend/src/remotion/index.ts`

- [ ] **Step 1: Install remotion dependencies**

Run: `cd frontend && npm install remotion && npm install -D @remotion/cli`
Expected: packages added to package.json and node_modules.

- [ ] **Step 2: Create config.ts with shared constants**

```typescript
// frontend/src/remotion/config.ts

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
```

- [ ] **Step 3: Create Root.tsx (composition registry)**

```typescript
// frontend/src/remotion/Root.tsx
import { Composition } from 'remotion';
import { AdVideo } from './AdVideo';
import { VIDEO } from './config';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LetisAd"
        component={AdVideo}
        durationInFrames={VIDEO.durationInFrames}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    </>
  );
};
```

- [ ] **Step 4: Create AdVideo.tsx (empty shell with all sequences)**

```typescript
// frontend/src/remotion/AdVideo.tsx
import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { SCENES, COLORS } from './config';

export const AdVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Scenes will be inserted here in subsequent tasks */}
      <Sequence from={SCENES.brandOpen.start} durationInFrames={SCENES.brandOpen.end - SCENES.brandOpen.start}>
        <AbsoluteFill style={{ backgroundColor: COLORS.bg }} />
      </Sequence>
      <Sequence from={SCENES.theProblem.start} durationInFrames={SCENES.theProblem.end - SCENES.theProblem.start}>
        <AbsoluteFill style={{ backgroundColor: COLORS.bg }} />
      </Sequence>
      <Sequence from={SCENES.dashboardReveal.start} durationInFrames={SCENES.dashboardReveal.end - SCENES.dashboardReveal.start}>
        <AbsoluteFill style={{ backgroundColor: COLORS.bg }} />
      </Sequence>
      <Sequence from={SCENES.inventoryModule.start} durationInFrames={SCENES.inventoryModule.end - SCENES.inventoryModule.start}>
        <AbsoluteFill style={{ backgroundColor: COLORS.bg }} />
      </Sequence>
      <Sequence from={SCENES.posModule.start} durationInFrames={SCENES.posModule.end - SCENES.posModule.start}>
        <AbsoluteFill style={{ backgroundColor: COLORS.bg }} />
      </Sequence>
      <Sequence from={SCENES.reportsAI.start} durationInFrames={SCENES.reportsAI.end - SCENES.reportsAI.start}>
        <AbsoluteFill style={{ backgroundColor: COLORS.bg }} />
      </Sequence>
      <Sequence from={SCENES.cloudMultistore.start} durationInFrames={SCENES.cloudMultistore.end - SCENES.cloudMultistore.start}>
        <AbsoluteFill style={{ backgroundColor: COLORS.bg }} />
      </Sequence>
      <Sequence from={SCENES.ctaClose.start} durationInFrames={SCENES.ctaClose.end - SCENES.ctaClose.start}>
        <AbsoluteFill style={{ backgroundColor: COLORS.bg }} />
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 5: Create index.ts (registerRoot entry)**

```typescript
// frontend/src/remotion/index.ts
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
```

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/remotion/
git commit -m "chore: scaffold Remotion project with config, Root, and AdVideo shell"
```

---

### Task 2: Create GlowEffect reusable component

**Files:**
- Create: `frontend/src/remotion/components/GlowEffect.tsx`

- [ ] **Step 1: Write GlowEffect component**

```typescript
// frontend/src/remotion/components/GlowEffect.tsx
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS } from '../config';

interface Props {
  size?: number;
  color?: string;
  x?: string | number;
  y?: string | number;
  opacity?: number;
  pulse?: boolean;
}

export const GlowEffect: React.FC<Props> = ({
  size = 300,
  color = COLORS.accent,
  x = '50%',
  y = '50%',
  opacity = 0.15,
  pulse = true,
}) => {
  const frame = useCurrentFrame();
  const pulseFactor = pulse ? Math.sin(frame * 0.08) * 0.3 + 0.7 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity: opacity * pulseFactor,
        pointerEvents: 'none',
      }}
    />
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/remotion/components/GlowEffect.tsx
git commit -m "feat: add GlowEffect reusable component"
```

---

### Task 3: Create SceneFrame reusable component

**Files:**
- Create: `frontend/src/remotion/components/SceneFrame.tsx`

- [ ] **Step 1: Write SceneFrame component**

```typescript
// frontend/src/remotion/components/SceneFrame.tsx
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../config';

interface Props {
  children: React.ReactNode;
  /** Fade in from 0 over this many frames. Default 10. */
  fadeIn?: number;
  /** Fade out to 0 over this many frames at end. Default 10. */
  fadeOut?: number;
  currentFrame: number;
  totalFrames: number;
}

export const SceneFrame: React.FC<Props> = ({
  children,
  fadeIn = 10,
  fadeOut = 10,
  currentFrame,
  totalFrames,
}) => {
  let opacity = 1;

  if (currentFrame < fadeIn) {
    opacity = currentFrame / fadeIn;
  }
  const fadeStart = totalFrames - fadeOut;
  if (currentFrame >= fadeStart) {
    opacity = 1 - (currentFrame - fadeStart) / fadeOut;
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        opacity,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/remotion/components/SceneFrame.tsx
git commit -m "feat: add SceneFrame reusable component with fade transitions"
```

---

### Task 4: Create KineticText reusable component

**Files:**
- Create: `frontend/src/remotion/components/KineticText.tsx`

- [ ] **Step 1: Write KineticText component**

```typescript
// frontend/src/remotion/components/KineticText.tsx
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';

interface Props {
  text: string;
  /** Frame at which this text starts animating in, relative to its sequence */
  startFrame?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
  style?: React.CSSProperties;
}

export const KineticText: React.FC<Props> = ({
  text,
  startFrame = 0,
  fontSize = 52,
  color = COLORS.text,
  fontWeight = 900,
  align = 'center',
  maxWidth = 800,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - startFrame);

  const scale = spring({
    frame: localFrame,
    fps,
    config: SPRING.text,
    from: 0.5,
    to: 1,
  });

  const opacity = spring({
    frame: localFrame,
    fps,
    config: SPRING.text,
    from: 0,
    to: 1,
  });

  return (
    <p
      style={{
        margin: 0,
        fontFamily: FONT.display,
        fontSize,
        fontWeight,
        color,
        textAlign: align,
        maxWidth,
        transform: `scale(${scale})`,
        opacity,
        lineHeight: 1.2,
        ...style,
      }}
    >
      {text}
    </p>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/remotion/components/KineticText.tsx
git commit -m "feat: add KineticText reusable component with spring animation"
```

---

### Task 5: Create UICounter reusable component

**Files:**
- Create: `frontend/src/remotion/components/UICounter.tsx`

- [ ] **Step 1: Write UICounter component**

```typescript
// frontend/src/remotion/components/UICounter.tsx
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONT } from '../config';

interface Props {
  value: number;
  /** Frame at which counting starts, relative to sequence */
  startFrame?: number;
  /** Number of frames over which to count up */
  duration?: number;
  prefix?: string;
  suffix?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  decimals?: number;
}

export const UICounter: React.FC<Props> = ({
  value,
  startFrame = 0,
  duration = 30,
  prefix = '',
  suffix = '',
  fontSize = 48,
  color = COLORS.text,
  fontWeight = 800,
  decimals = 0,
}) => {
  const frame = useCurrentFrame();
  const localFrame = Math.max(0, frame - startFrame);

  const current = interpolate(
    localFrame,
    [0, duration],
    [0, value],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
  );

  return (
    <span
      style={{
        fontFamily: FONT.display,
        fontSize,
        fontWeight,
        color,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {prefix}{current.toFixed(decimals)}{suffix}
    </span>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/remotion/components/UICounter.tsx
git commit -m "feat: add UICounter reusable component for animated number counting"
```

---

### Task 6: Create UIStatusBadge reusable component

**Files:**
- Create: `frontend/src/remotion/components/UIStatusBadge.tsx`

- [ ] **Step 1: Write UIStatusBadge component**

```typescript
// frontend/src/remotion/components/UIStatusBadge.tsx
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';

type StatusColor = 'green' | 'red' | 'orange' | 'blue';

const STATUS_COLORS: Record<StatusColor, { bg: string; fg: string }> = {
  green: { bg: 'rgba(22, 163, 74, 0.15)', fg: COLORS.accent },
  red: { bg: 'rgba(239, 68, 68, 0.15)', fg: COLORS.danger },
  orange: { bg: 'rgba(245, 158, 11, 0.15)', fg: COLORS.warning },
  blue: { bg: 'rgba(59, 130, 246, 0.15)', fg: COLORS.blue },
};

interface Props {
  text: string;
  status: StatusColor;
  startFrame?: number;
}

export const UIStatusBadge: React.FC<Props> = ({
  text,
  status,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = STATUS_COLORS[status];

  const localFrame = Math.max(0, frame - startFrame);
  const scale = spring({ frame: localFrame, fps, config: SPRING.snappy, from: 0, to: 1 });
  const opacity = spring({ frame: localFrame, fps, config: SPRING.snappy, from: 0, to: 1 });

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 999,
        backgroundColor: colors.bg,
        color: colors.fg,
        fontFamily: FONT.body,
        fontSize: 18,
        fontWeight: 700,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: colors.fg,
        }}
      />
      {text}
    </span>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/remotion/components/UIStatusBadge.tsx
git commit -m "feat: add UIStatusBadge reusable component for status indicators"
```

---

### Task 7: Create UIIconCard reusable component

**Files:**
- Create: `frontend/src/remotion/components/UIIconCard.tsx`

- [ ] **Step 1: Write UIIconCard component**

```typescript
// frontend/src/remotion/components/UIIconCard.tsx
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';

interface Props {
  icon: string;
  label: string;
  value: string;
  color?: string;
  startFrame?: number;
  index?: number;
}

export const UIIconCard: React.FC<Props> = ({
  icon,
  label,
  value,
  color = COLORS.accent,
  startFrame = 0,
  index = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const staggerFrame = startFrame + index * 8;
  const localFrame = Math.max(0, frame - staggerFrame);
  const scale = spring({ frame: localFrame, fps, config: SPRING.gentle, from: 0.8, to: 1 });
  const opacity = spring({ frame: localFrame, fps, config: SPRING.gentle, from: 0, to: 1 });

  return (
    <div
      style={{
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 16,
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        transform: `scale(${scale})`,
        opacity,
        minWidth: 280,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: `${color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            margin: 0,
            fontFamily: FONT.body,
            fontSize: 14,
            color: COLORS.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: FONT.display,
            fontSize: 24,
            fontWeight: 800,
            color: COLORS.text,
            marginTop: 2,
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/remotion/components/UIIconCard.tsx
git commit -m "feat: add UIIconCard reusable component for icon+metric cards"
```

---

### Task 8: Create UIChart reusable component

**Files:**
- Create: `frontend/src/remotion/components/UIChart.tsx`

- [ ] **Step 1: Write UIChart component (supports bar and line charts)**

```typescript
// frontend/src/remotion/components/UIChart.tsx
import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';

interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  type: 'bar';
  data: BarDatum[];
  maxValue?: number;
  startFrame?: number;
  width?: number;
  height?: number;
}

interface LineChartProps {
  type: 'line';
  data: number[];
  color?: string;
  startFrame?: number;
  width?: number;
  height?: number;
}

type Props = BarChartProps | LineChartProps;

export const UIChart: React.FC<Props> = (props) => {
  const { type, startFrame = 0, width = 700, height = 300 } = props;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - startFrame);

  if (type === 'bar') {
    const { data, maxValue } = props;
    const max = maxValue ?? Math.max(...data.map((d) => d.value));
    const barCount = data.length;
    const barWidth = (width - 80) / barCount - 12;
    const chartLeft = 60;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = height - 40 - (height - 60) * pct;
          return (
            <text
              key={pct}
              x={chartLeft - 10}
              y={y + 5}
              textAnchor="end"
              fill={COLORS.textMuted}
              fontFamily={FONT.body}
              fontSize={12}
            >
              {Math.round(max * pct)}
            </text>
          );
        })}
        {data.map((d, i) => {
          const barH = interpolate(
            localFrame,
            [i * 6, i * 6 + 20],
            [0, ((height - 60) * d.value) / max],
            { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
          );
          const barX = chartLeft + i * ((width - 80) / barCount);
          const barY = height - 40 - barH;

          return (
            <g key={d.label}>
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barH}
                rx={6}
                fill={d.color ?? COLORS.accent}
                opacity={interpolate(localFrame, [i * 6, i * 6 + 10], [0, 1], { extrapolateRight: 'clamp' })}
              />
              <text
                x={barX + barWidth / 2}
                y={height - 15}
                textAnchor="middle"
                fill={COLORS.textMuted}
                fontFamily={FONT.body}
                fontSize={13}
                fontWeight={600}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // Line chart
  const { data, color = COLORS.accentSolid } = props as LineChartProps;
  const max = Math.max(...data);
  const chartW = width - 60;
  const chartH = height - 60;
  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0;

  const drawProgress = spring({
    frame: localFrame,
    fps,
    config: SPRING.gentle,
    from: 0,
    to: 1,
  });

  const points = data.map((v, i) => {
    return `${60 + i * stepX},${30 + chartH - (v / max) * chartH}`;
  });

  // Dasharray trick for animating line draw
  const path = `M${points.join(' L')}`;
  const pathLen = data.length * stepX + chartH; // rough overestimate

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Grid lines */}
      {[0, 0.5, 1].map((pct) => {
        const y = 30 + chartH * (1 - pct);
        return (
          <line
            key={pct}
            x1={60} y1={y} x2={width - 20} y2={y}
            stroke={COLORS.border}
            strokeWidth={1}
          />
        );
      })}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${pathLen * drawProgress} ${pathLen}`}
      />
      {/* Endpoint dots */}
      {points.map((p, i) => {
        const [px, py] = p.split(',').map(Number);
        const dotOpacity = interpolate(
          localFrame,
          [i * 8 + 15, i * 8 + 22],
          [0, 1],
          { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
        );
        return (
          <circle
            key={i}
            cx={px} cy={py} r={5}
            fill={color}
            opacity={dotOpacity}
          />
        );
      })}
    </svg>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/remotion/components/UIChart.tsx
git commit -m "feat: add UIChart reusable component with bar and line chart modes"
```

---

### Task 9: Create UIDashboard reusable component

**Files:**
- Create: `frontend/src/remotion/components/UIDashboard.tsx`

- [ ] **Step 1: Write UIDashboard component**

```typescript
// frontend/src/remotion/components/UIDashboard.tsx
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';

interface Widget {
  title: string;
  width: number; // fraction of full width: 1, 0.5, 0.33
  content: React.ReactNode;
}

interface Props {
  widgets: Widget[];
  startFrame?: number;
}

export const UIDashboard: React.FC<Props> = ({ widgets, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - startFrame);

  const containerScale = spring({
    frame: localFrame,
    fps,
    config: SPRING.gentle,
    from: 0.92,
    to: 1,
  });

  return (
    <div
      style={{
        width: 960,
        transform: `scale(${containerScale})`,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 4px',
        }}
      >
        <span style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 800, color: COLORS.text }}>
          Letis POS
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{
            fontFamily: FONT.body, fontSize: 13, color: COLORS.accent, fontWeight: 700,
            backgroundColor: 'rgba(74, 222, 128, 0.12)', padding: '4px 14px', borderRadius: 999,
          }}>
            Online
          </span>
        </div>
      </div>

      {/* Widget grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {widgets.map((w, i) => {
          const widgetDelay = startFrame + i * 10;
          const widgetFrame = Math.max(0, frame - widgetDelay);
          const widgetOpacity = spring({
            frame: widgetFrame,
            fps,
            config: SPRING.gentle,
            from: 0,
            to: 1,
          });
          const widgetY = spring({
            frame: widgetFrame,
            fps,
            config: SPRING.gentle,
            from: 30,
            to: 0,
          });

          return (
            <div
              key={w.title}
              style={{
                width: `calc(${w.width * 100}% - ${16 * (1 - w.width) / w.width}px)`,
                minWidth: 200,
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                border: `1px solid ${COLORS.border}`,
                padding: 22,
                opacity: widgetOpacity,
                transform: `translateY(${widgetY}px)`,
                flex: '1 1 auto',
              }}
            >
              <p
                style={{
                  margin: 0,
                  marginBottom: 14,
                  fontFamily: FONT.body,
                  fontSize: 14,
                  color: COLORS.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                }}
              >
                {w.title}
              </p>
              {w.content}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/remotion/components/UIDashboard.tsx
git commit -m "feat: add UIDashboard reusable component with animated widget grid"
```

---

### Task 10: Scene 1 — BrandOpen (0–5s)

**Files:**
- Create: `frontend/src/remotion/scenes/BrandOpen.tsx`
- Modify: `frontend/src/remotion/AdVideo.tsx` (import and use BrandOpen)

- [ ] **Step 1: Write BrandOpen scene**

```typescript
// frontend/src/remotion/scenes/BrandOpen.tsx
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';
import { GlowEffect } from '../components/GlowEffect';

export const BrandOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: SPRING.text, from: 0, to: 1 });
  const taglineOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: 'clamp' });
  const subtitleOpacity = interpolate(frame, [90, 120], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <GlowEffect size={400} color={COLORS.accent} x="50%" y="42%" opacity={0.12} />

      {/* Logo mark — a teal rounded square with stylised L */}
      <div style={{ transform: `scale(${logoScale})`, marginBottom: 40 }}>
        <svg width={120} height={120} viewBox="0 0 64 64" role="img" aria-label="Letis POS">
          <defs>
            <linearGradient id="brand-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={COLORS.accentSolid} />
              <stop offset="1" stopColor={COLORS.accent} />
            </linearGradient>
          </defs>
          <rect x="1.5" y="1.5" width="61" height="61" rx="16" fill="none" stroke="rgba(74, 222, 128, 0.16)" strokeWidth="1" />
          <rect x="3" y="3" width="58" height="58" rx="15" fill="url(#brand-grad)" />
          <path d="M21 16 L21 40 L40 40 L46 34 L41 33 L31 33 L31 16 Z" fill={COLORS.white} opacity="0.97" />
          <path d="M40 40 L51 29 L46 24 L46 34 L40 34 Z" fill={COLORS.white} opacity="0.6" />
          <rect x="41" y="11" width="14" height="10" rx="3" fill={COLORS.accent} opacity="0.95" />
        </svg>
      </div>

      <h1
        style={{
          margin: 0,
          fontFamily: FONT.display,
          fontSize: 72,
          fontWeight: 900,
          color: COLORS.text,
          textAlign: 'center',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          opacity: taglineOpacity,
        }}
      >
        Smarter POS.
        <br />
        <span style={{ color: COLORS.accent }}>Stronger Business.</span>
      </h1>

      <p
        style={{
          margin: 0,
          marginTop: 24,
          fontFamily: FONT.body,
          fontSize: 24,
          color: COLORS.textMuted,
          opacity: subtitleOpacity,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        Retail · in one motion
      </p>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Wire BrandOpen into AdVideo.tsx**

Modify `frontend/src/remotion/AdVideo.tsx`:
- Add `import { BrandOpen } from './scenes/BrandOpen';` at top
- Replace the first Sequence placeholder (brandOpen) content: `<AbsoluteFill style={{ backgroundColor: COLORS.bg }} />` → `<BrandOpen />`

- [ ] **Step 3: Verify preview works**

Run: `cd frontend && npx remotion studio src/remotion/index.ts`
Expected: Remotion Studio opens in browser. LetisAd composition visible. Scene 1 animates logo + tagline.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/remotion/scenes/BrandOpen.tsx frontend/src/remotion/AdVideo.tsx
git commit -m "feat: add BrandOpen scene (0-5s) with logo bounce and tagline"
```

---

### Task 11: Scene 2 — TheProblem (5–12s)

**Files:**
- Create: `frontend/src/remotion/scenes/TheProblem.tsx`
- Modify: `frontend/src/remotion/AdVideo.tsx` (wire in TheProblem)

- [ ] **Step 1: Write TheProblem scene**

```typescript
// frontend/src/remotion/scenes/TheProblem.tsx
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';
import { SceneFrame } from '../components/SceneFrame';
import { KineticText } from '../components/KineticText';

export const TheProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = 210; // 7s * 30fps

  // Glitchy red background pulse
  const redPulse = Math.sin(frame * 0.3) * 0.05 + 0.05;

  // Floating numbers that glitch
  const numbers = ['1,247', '89', '3,602', '0', '512', '2,891', '—', 'ERR'];
  const numOpacity = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <SceneFrame currentFrame={frame} totalFrames={totalFrames}>
      <AbsoluteFill
        style={{
          backgroundColor: `rgba(239, 68, 68, ${redPulse})`,
          transition: 'background-color 0.5s ease',
        }}
      />

      {/* Glitching numbers in background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'center',
          justifyContent: 'center',
          gap: 40,
          opacity: numOpacity * 0.3,
          padding: '0 80px',
        }}
      >
        {numbers.map((n, i) => {
          const offset = spring({ frame: Math.max(0, frame - i * 6), fps, config: { damping: 8, stiffness: 50 }, from: 0, to: 1 });
          const glitchX = Math.sin(frame * 0.5 + i) * 8 * (1 - offset);
          return (
            <span
              key={i}
              style={{
                fontFamily: FONT.display,
                fontSize: 48 + Math.random() * 32,
                fontWeight: 800,
                color: i === 7 ? COLORS.danger : COLORS.textMuted,
                transform: `translateX(${glitchX}px) scale(${0.8 + offset * 0.2})`,
                opacity: offset,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {n}
            </span>
          );
        })}
      </div>

      {/* Text reveals */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <KineticText
          text="Running out of stock?"
          startFrame={20}
          fontSize={56}
          color={COLORS.white}
        />
        <div style={{ height: 28 }} />
        <KineticText
          text="Losing track of inventory?"
          startFrame={60}
          fontSize={44}
          color={COLORS.textMuted}
          fontWeight={700}
        />
        <div style={{ height: 40 }} />

        {/* Red flash at end */}
        <div
          style={{
            width: 120,
            height: 4,
            backgroundColor: COLORS.danger,
            borderRadius: 2,
            margin: '0 auto',
            opacity: interpolate(frame, [150, 170], [0, 0.8], { extrapolateRight: 'clamp' }),
            transform: `scaleX(${spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.snappy, from: 0, to: 1 })})`,
          }}
        />
        <p
          style={{
            margin: 0,
            marginTop: 16,
            fontFamily: FONT.body,
            fontSize: 20,
            color: COLORS.danger,
            fontWeight: 700,
            opacity: interpolate(frame, [170, 190], [1, 0], { extrapolateRight: 'clamp' }),
          }}
        >
          That ends now.
        </p>
      </div>
    </SceneFrame>
  );
};
```

- [ ] **Step 2: Wire TheProblem into AdVideo.tsx**

Modify `frontend/src/remotion/AdVideo.tsx`:
- Add `import { TheProblem } from './scenes/TheProblem';`
- Replace the second Sequence placeholder with `<TheProblem />`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/remotion/scenes/TheProblem.tsx frontend/src/remotion/AdVideo.tsx
git commit -m "feat: add TheProblem scene (5-12s) with glitch inventory chaos"
```

---

### Task 12: Scene 3 — DashboardReveal (12–22s)

**Files:**
- Create: `frontend/src/remotion/scenes/DashboardReveal.tsx`
- Modify: `frontend/src/remotion/AdVideo.tsx` (wire in DashboardReveal)

- [ ] **Step 1: Write DashboardReveal scene**

```typescript
// frontend/src/remotion/scenes/DashboardReveal.tsx
import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, SPRING } from '../config';
import { SceneFrame } from '../components/SceneFrame';
import { KineticText } from '../components/KineticText';
import { UIDashboard } from '../components/UIDashboard';
import { UICounter } from '../components/UICounter';
import { UIStatusBadge } from '../components/UIStatusBadge';
import { GlowEffect } from '../components/GlowEffect';

export const DashboardReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = 300; // 10s * 30fps

  const widgets = [
    {
      title: 'Today\'s Sales',
      width: 0.5,
      content: (
        <div>
          <UICounter value={1247000} startFrame={40} prefix="TZS " fontSize={40} color={COLORS.accent} />
          <div style={{ marginTop: 8 }}>
            <UIStatusBadge text="+12% vs last week" status="green" startFrame={55} />
          </div>
        </div>
      ),
    },
    {
      title: 'Active Products',
      width: 0.5,
      content: (
        <div>
          <UICounter value={1247} startFrame={50} fontSize={40} color={COLORS.blue} />
          <div style={{ marginTop: 8 }}>
            <UIStatusBadge text="Synced" status="green" startFrame={65} />
          </div>
        </div>
      ),
    },
    {
      title: 'Inventory Value',
      width: 0.5,
      content: (
        <div>
          <UICounter value={18500000} startFrame={60} prefix="TZS " fontSize={36} />
          <div style={{ marginTop: 8 }}>
            <span style={{ color: COLORS.textMuted, fontFamily: 'var(--lp-font-body)', fontSize: 14 }}>Across 3 warehouses</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Pending Orders',
      width: 0.5,
      content: (
        <div>
          <UICounter value={23} startFrame={70} fontSize={40} color={COLORS.warning} />
          <div style={{ marginTop: 8 }}>
            <UIStatusBadge text="Needs attention" status="orange" startFrame={85} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <SceneFrame currentFrame={frame} totalFrames={totalFrames}>
      <GlowEffect size={500} color={COLORS.accent} x="80%" y="20%" opacity={0.08} />
      <GlowEffect size={300} color={COLORS.blue} x="20%" y="80%" opacity={0.06} />

      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <KineticText
          text="Everything. In one place."
          startFrame={10}
          fontSize={48}
          fontWeight={800}
        />
      </div>

      <UIDashboard widgets={widgets} startFrame={30} />
    </SceneFrame>
  );
};
```

- [ ] **Step 2: Wire DashboardReveal into AdVideo.tsx**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/remotion/scenes/DashboardReveal.tsx frontend/src/remotion/AdVideo.tsx
git commit -m "feat: add DashboardReveal scene (12-22s) with animated KPI widgets"
```

---

### Task 13: Scene 4 — InventoryModule (22–30s)

**Files:**
- Create: `frontend/src/remotion/scenes/InventoryModule.tsx`
- Modify: `frontend/src/remotion/AdVideo.tsx` (wire in InventoryModule)

- [ ] **Step 1: Write InventoryModule scene**

```typescript
// frontend/src/remotion/scenes/InventoryModule.tsx
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';
import { SceneFrame } from '../components/SceneFrame';
import { KineticText } from '../components/KineticText';
import { UICounter } from '../components/UICounter';
import { UIStatusBadge } from '../components/UIStatusBadge';
import { UIIconCard } from '../components/UIIconCard';
import { GlowEffect } from '../components/GlowEffect';

const PRODUCTS = [
  { icon: '📦', label: 'Warehouse A', value: '842 units', color: COLORS.accent },
  { icon: '🏪', label: 'Shop Floor', value: '156 units', color: COLORS.blue },
  { icon: '🚚', label: 'In Transit', value: '34 units', color: COLORS.warning },
];

export const InventoryModule: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = 240; // 8s * 30fps

  // Alert card: low stock → resolved
  const alertOpacity = interpolate(frame, [20, 50], [1, 0], { extrapolateRight: 'clamp' });
  const resolvedOpacity = interpolate(frame, [140, 170], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <SceneFrame currentFrame={frame} totalFrames={totalFrames}>
      <GlowEffect size={350} color={COLORS.accent} x="50%" y="30%" opacity={0.08} />

      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <KineticText
          text="Real-time inventory."
          startFrame={10}
          fontSize={52}
        />
        <div style={{ marginTop: 10 }}>
          <KineticText
            text="Zero guesswork."
            startFrame={40}
            fontSize={38}
            color={COLORS.accent}
            fontWeight={700}
          />
        </div>
      </div>

      {/* Stock counters row */}
      <div style={{ display: 'flex', gap: 40, marginBottom: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <UICounter value={1032} startFrame={80} fontSize={64} color={COLORS.accentSolid} />
          <p style={{ margin: 0, marginTop: 8, fontFamily: FONT.body, fontSize: 18, color: COLORS.textMuted, fontWeight: 600 }}>
            Total Stock
          </p>
        </div>
        <div style={{ width: 2, backgroundColor: COLORS.border }} />
        <div style={{ textAlign: 'center' }}>
          <UICounter value={18} startFrame={100} fontSize={64} color={COLORS.warning} />
          <p style={{ margin: 0, marginTop: 8, fontFamily: FONT.body, fontSize: 18, color: COLORS.textMuted, fontWeight: 600 }}>
            Low Stock Alerts
          </p>
        </div>
      </div>

      {/* Alert → Resolved transition */}
      <div style={{ marginBottom: 30, height: 40 }}>
        <div style={{ opacity: alertOpacity }}>
          <UIStatusBadge text="⚠ Sugar — 2 units left" status="orange" startFrame={20} />
        </div>
        <div style={{ opacity: resolvedOpacity, marginTop: -40 }}>
          <UIStatusBadge text="Restocked — 50 units" status="green" startFrame={140} />
        </div>
      </div>

      {/* Location cards */}
      <div style={{ display: 'flex', gap: 20 }}>
        {PRODUCTS.map((p, i) => (
          <UIIconCard
            key={p.label}
            icon={p.icon}
            label={p.label}
            value={p.value}
            color={p.color}
            startFrame={160}
            index={i}
          />
        ))}
      </div>
    </SceneFrame>
  );
};
```

- [ ] **Step 2: Wire InventoryModule into AdVideo.tsx**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/remotion/scenes/InventoryModule.tsx frontend/src/remotion/AdVideo.tsx
git commit -m "feat: add InventoryModule scene (22-30s) with stock counters and location cards"
```

---

### Task 14: Scene 5 — PosModule (30–38s)

**Files:**
- Create: `frontend/src/remotion/scenes/PosModule.tsx`
- Modify: `frontend/src/remotion/AdVideo.tsx` (wire in PosModule)

- [ ] **Step 1: Write PosModule scene**

```typescript
// frontend/src/remotion/scenes/PosModule.tsx
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';
import { SceneFrame } from '../components/SceneFrame';
import { KineticText } from '../components/KineticText';
import { UICounter } from '../components/UICounter';
import { GlowEffect } from '../components/GlowEffect';

const CART_ITEMS = [
  { name: 'Maize Flour (2kg)', qty: 2, price: 2400 },
  { name: 'Cooking Oil (1L)', qty: 1, price: 4500 },
  { name: 'Sugar (1kg)', qty: 3, price: 1800 },
  { name: 'Milk (500ml)', qty: 2, price: 1200 },
];

export const PosModule: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = 240; // 8s * 30fps

  const subtotal = CART_ITEMS.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <SceneFrame currentFrame={frame} totalFrames={totalFrames}>
      <GlowEffect size={300} color={COLORS.accentSolid} x="85%" y="25%" opacity={0.08} />

      {/* Split layout: cart left, total right */}
      <div style={{ display: 'flex', gap: 40, width: 900, alignItems: 'flex-start' }}>
        {/* Left: Cart items */}
        <div style={{ flex: 1 }}>
          <KineticText
            text="Fast checkout."
            startFrame={10}
            fontSize={42}
            align="left"
            fontWeight={800}
          />
          <KineticText
            text="Happy customers."
            startFrame={35}
            fontSize={34}
            align="left"
            color={COLORS.accent}
            fontWeight={700}
          />

          <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CART_ITEMS.map((item, i) => {
              const itemFrame = Math.max(0, frame - (60 + i * 15));
              const itemOpacity = spring({ frame: itemFrame, fps, config: SPRING.gentle, from: 0, to: 1 });
              const itemX = spring({ frame: itemFrame, fps, config: { damping: 14, stiffness: 70 }, from: -40, to: 0 });

              return (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 16px',
                    backgroundColor: COLORS.surface,
                    borderRadius: 10,
                    border: `1px solid ${COLORS.border}`,
                    opacity: itemOpacity,
                    transform: `translateX(${itemX}px)`,
                  }}
                >
                  <div>
                    <span style={{ fontFamily: FONT.body, fontSize: 18, fontWeight: 600, color: COLORS.text }}>
                      {item.name}
                    </span>
                    <span style={{ fontFamily: FONT.body, fontSize: 14, color: COLORS.textMuted, marginLeft: 10 }}>
                      x{item.qty}
                    </span>
                  </div>
                  <span style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: COLORS.text, fontVariantNumeric: 'tabular-nums' }}>
                    TZS {(item.qty * item.price).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Total + receipt */}
        <div
          style={{
            width: 280,
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            border: `1px solid ${COLORS.border}`,
            padding: 28,
            alignSelf: 'flex-start',
            marginTop: 140,
          }}
        >
          {/* Barcode scan line */}
          <div
            style={{
              height: 2,
              backgroundColor: COLORS.accent,
              marginBottom: 20,
              borderRadius: 1,
              opacity: interpolate(frame, [60, 80, 100, 120], [0, 0.8, 0.8, 0], { extrapolateRight: 'clamp' }),
              boxShadow: `0 0 12px ${COLORS.accent}`,
            }}
          />

          <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 14, color: COLORS.textMuted, fontWeight: 600, marginBottom: 8 }}>
            TOTAL
          </p>
          <UICounter
            value={subtotal}
            startFrame={130}
            prefix="TZS "
            fontSize={40}
            color={COLORS.accentSolid}
            duration={35}
          />

          {/* Receipt animation */}
          <div
            style={{
              marginTop: 20,
              height: 60,
              backgroundColor: COLORS.white,
              borderRadius: '4px 4px 20px 20px',
              opacity: interpolate(frame, [160, 180], [0, 0.15], { extrapolateRight: 'clamp' }),
              transform: `scaleY(${spring({ frame: Math.max(0, frame - 160), fps, config: SPRING.snappy, from: 0, to: 1 })})`,
              transformOrigin: 'top',
            }}
          />
        </div>
      </div>
    </SceneFrame>
  );
};
```

- [ ] **Step 2: Wire PosModule into AdVideo.tsx**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/remotion/scenes/PosModule.tsx frontend/src/remotion/AdVideo.tsx
git commit -m "feat: add PosModule scene (30-38s) with checkout flow and receipt"
```

---

### Task 15: Scene 6 — ReportsAI (38–46s)

**Files:**
- Create: `frontend/src/remotion/scenes/ReportsAI.tsx`
- Modify: `frontend/src/remotion/AdVideo.tsx` (wire in ReportsAI)

- [ ] **Step 1: Write ReportsAI scene**

```typescript
// frontend/src/remotion/scenes/ReportsAI.tsx
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';
import { SceneFrame } from '../components/SceneFrame';
import { KineticText } from '../components/KineticText';
import { UIChart } from '../components/UIChart';
import { UIStatusBadge } from '../components/UIStatusBadge';
import { GlowEffect } from '../components/GlowEffect';

const salesData = [120, 180, 150, 220, 260, 310, 290];
const barData = [
  { label: 'Mon', value: 420000 },
  { label: 'Tue', value: 380000 },
  { label: 'Wed', value: 510000 },
  { label: 'Thu', value: 460000 },
  { label: 'Fri', value: 620000 },
  { label: 'Sat', value: 780000 },
  { label: 'Sun', value: 540000 },
];

const insights = [
  { text: 'Restock: Cooking Oil', status: 'orange' as const },
  { text: 'Top Seller: Maize Flour', status: 'green' as const },
  { text: 'Sales Trend +18%', status: 'blue' as const },
];

export const ReportsAI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = 240; // 8s * 30fps

  return (
    <SceneFrame currentFrame={frame} totalFrames={totalFrames}>
      <GlowEffect size={400} color={COLORS.blue} x="20%" y="70%" opacity={0.06} />
      <GlowEffect size={300} color={COLORS.accent} x="75%" y="25%" opacity={0.06} />

      <div style={{ textAlign: 'center', marginBottom: 25 }}>
        <KineticText
          text="AI that knows"
          startFrame={10}
          fontSize={52}
        />
        <KineticText
          text="before you do."
          startFrame={35}
          fontSize={42}
          color={COLORS.accent}
          fontWeight={700}
        />
      </div>

      <div style={{ display: 'flex', gap: 30, width: 920 }}>
        {/* Left: Charts */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              border: `1px solid ${COLORS.border}`,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <p style={{ margin: 0, marginBottom: 8, fontFamily: FONT.body, fontSize: 13, color: COLORS.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>
              Weekly Sales Trend
            </p>
            <UIChart type="line" data={salesData} startFrame={50} width={400} height={180} color={COLORS.accentSolid} />
          </div>
          <div
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              border: `1px solid ${COLORS.border}`,
              padding: 20,
            }}
          >
            <p style={{ margin: 0, marginBottom: 8, fontFamily: FONT.body, fontSize: 13, color: COLORS.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>
              Daily Revenue
            </p>
            <UIChart type="bar" data={barData} startFrame={70} width={400} height={160} />
          </div>
        </div>

        {/* Right: AI insights */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>
          {insights.map((insight, i) => {
            const cardFrame = Math.max(0, frame - (120 + i * 20));
            const scale = spring({ frame: cardFrame, fps, config: SPRING.snappy, from: 0.8, to: 1 });
            const opacity = spring({ frame: cardFrame, fps, config: SPRING.snappy, from: 0, to: 1 });

            return (
              <div
                key={insight.text}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  border: `1px solid ${COLORS.border}`,
                  padding: '16px 20px',
                  transform: `scale(${scale})`,
                  opacity,
                  boxShadow: `0 0 20px rgba(74, 222, 128, ${interpolate(frame, [120 + i * 20, 150 + i * 20], [0, 0.1], { extrapolateRight: 'clamp' })})`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>🤖</span>
                  <span style={{ fontFamily: FONT.body, fontSize: 16, fontWeight: 700, color: COLORS.text }}>
                    {insight.text}
                  </span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <UIStatusBadge text={insight.status === 'orange' ? 'Action needed' : insight.status === 'green' ? 'Performing well' : 'Trending up'} status={insight.status} startFrame={140 + i * 20} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneFrame>
  );
};
```

- [ ] **Step 2: Wire ReportsAI into AdVideo.tsx**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/remotion/scenes/ReportsAI.tsx frontend/src/remotion/AdVideo.tsx
git commit -m "feat: add ReportsAI scene (38-46s) with charts and AI insight cards"
```

---

### Task 16: Scene 7 — CloudMultistore (46–52s)

**Files:**
- Create: `frontend/src/remotion/scenes/CloudMultistore.tsx`
- Modify: `frontend/src/remotion/AdVideo.tsx` (wire in CloudMultistore)

- [ ] **Step 1: Write CloudMultistore scene**

```typescript
// frontend/src/remotion/scenes/CloudMultistore.tsx
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';
import { SceneFrame } from '../components/SceneFrame';
import { KineticText } from '../components/KineticText';
import { GlowEffect } from '../components/GlowEffect';

const DEVICES = [
  { label: 'Phone', width: 90, height: 160, color: COLORS.accent },
  { label: 'Tablet', width: 140, height: 190, color: COLORS.blue },
  { label: 'Desktop', width: 200, height: 140, color: COLORS.accentSolid },
];

const LOCATIONS = [
  { x: 180, y: 140, label: 'Dar es Salaam' },
  { x: 380, y: 100, label: 'Nairobi' },
  { x: 120, y: 260, label: 'Kampala' },
  { x: 320, y: 300, label: 'Kigali' },
];

export const CloudMultistore: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = 180; // 6s * 30fps

  return (
    <SceneFrame currentFrame={frame} totalFrames={totalFrames}>
      <GlowEffect size={500} color={COLORS.blue} x="50%" y="50%" opacity={0.06} />

      <KineticText
        text="Any branch."
        startFrame={10}
        fontSize={52}
      />
      <KineticText
        text="Any device."
        startFrame={40}
        fontSize={42}
        color={COLORS.blue}
        fontWeight={700}
      />

      {/* Location map with pins */}
      <div
        style={{
          position: 'relative',
          width: 500,
          height: 380,
          marginTop: 24,
          backgroundColor: COLORS.surface,
          borderRadius: 20,
          border: `1px solid ${COLORS.border}`,
          overflow: 'hidden',
        }}
      >
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${20 + i * 25}%`,
                height: 1,
                backgroundColor: COLORS.border,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${20 + i * 20}%`,
                width: 1,
                backgroundColor: COLORS.border,
              }}
            />
          </React.Fragment>
        ))}

        {/* Connection lines to hub */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 500 380"
        >
          {LOCATIONS.map((loc, i) => {
            const lineProgress = spring({
              frame: Math.max(0, frame - (80 + i * 15)),
              fps,
              config: SPRING.gentle,
              from: 0,
              to: 1,
            });
            const hubX = 250;
            const hubY = 190;
            const dx = loc.x - hubX;
            const dy = loc.y - hubY;
            const cx = hubX + dx * lineProgress;
            const cy = hubY + dy * lineProgress;

            return (
              <line
                key={i}
                x1={hubX} y1={hubY}
                x2={cx} y2={cy}
                stroke={COLORS.blue}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.4}
              />
            );
          })}
        </svg>

        {/* Hub */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: COLORS.accentSolid,
            boxShadow: `0 0 24px ${COLORS.accent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            zIndex: 2,
          }}
        >
          🏢
        </div>

        {/* Location pins */}
        {LOCATIONS.map((loc, i) => {
          const pinFrame = Math.max(0, frame - (60 + i * 15));
          const pinScale = spring({ frame: pinFrame, fps, config: SPRING.snappy, from: 0, to: 1 });

          return (
            <div
              key={loc.label}
              style={{
                position: 'absolute',
                left: loc.x - 20,
                top: loc.y - 28,
                transform: `scale(${pinScale})`,
                zIndex: 1,
              }}
            >
              <span style={{ fontSize: 28 }}>📍</span>
              <span
                style={{
                  display: 'block',
                  fontFamily: FONT.body,
                  fontSize: 10,
                  fontWeight: 700,
                  color: COLORS.text,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  marginLeft: -30,
                  width: 80,
                  marginTop: -2,
                }}
              >
                {loc.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Device mockups row */}
      <div style={{ display: 'flex', gap: 30, marginTop: 20, alignItems: 'flex-end' }}>
        {DEVICES.map((d, i) => {
          const devFrame = Math.max(0, frame - (110 + i * 20));
          const devOpacity = spring({ frame: devFrame, fps, config: SPRING.gentle, from: 0, to: 1 });
          const devY = spring({ frame: devFrame, fps, config: SPRING.gentle, from: 20, to: 0 });

          return (
            <div
              key={d.label}
              style={{
                width: d.width,
                height: d.height,
                borderRadius: d.label === 'Desktop' ? '12px 12px 4px 4px' : 16,
                backgroundColor: COLORS.surface,
                border: `2px solid ${d.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 4,
                opacity: devOpacity,
                transform: `translateY(${devY}px)`,
              }}
            >
              <span style={{ fontSize: 24 }}>{d.label === 'Phone' ? '📱' : d.label === 'Tablet' ? '📋' : '🖥️'}</span>
              <span style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 700, color: COLORS.textMuted }}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </SceneFrame>
  );
};
```

- [ ] **Step 2: Wire CloudMultistore into AdVideo.tsx**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/remotion/scenes/CloudMultistore.tsx frontend/src/remotion/AdVideo.tsx
git commit -m "feat: add CloudMultistore scene (46-52s) with location map and device mockups"
```

---

### Task 17: Scene 8 — CtaClose (52–60s)

**Files:**
- Create: `frontend/src/remotion/scenes/CtaClose.tsx`
- Modify: `frontend/src/remotion/AdVideo.tsx` (wire in CtaClose)

- [ ] **Step 1: Write CtaClose scene**

```typescript
// frontend/src/remotion/scenes/CtaClose.tsx
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';
import { SceneFrame } from '../components/SceneFrame';
import { GlowEffect } from '../components/GlowEffect';

export const CtaClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = 240; // 8s * 30fps

  const logoScale = spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.text, from: 0.3, to: 1 });
  const ctaOpacity = interpolate(frame, [70, 100], [0, 1], { extrapolateRight: 'clamp' });
  const ctaScale = spring({ frame: Math.max(0, frame - 70), fps, config: SPRING.snappy, from: 1.3, to: 1 });
  const urlOpacity = interpolate(frame, [110, 135], [0, 1], { extrapolateRight: 'clamp' });
  const badgeOpacity = interpolate(frame, [150, 175], [0, 1], { extrapolateRight: 'clamp' });
  const badgeY = spring({ frame: Math.max(0, frame - 150), fps, config: { damping: 12, stiffness: 55 }, from: 20, to: 0 });

  return (
    <SceneFrame currentFrame={frame} totalFrames={totalFrames}>
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <GlowEffect size={500} color={COLORS.accent} x="50%" y="35%" opacity={0.1} pulse />

        {/* Logo mark */}
        <div style={{ transform: `scale(${logoScale})`, marginBottom: 16 }}>
          <svg width={100} height={100} viewBox="0 0 64 64" role="img">
            <defs>
              <linearGradient id="cta-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={COLORS.accentSolid} />
                <stop offset="1" stopColor={COLORS.accent} />
              </linearGradient>
            </defs>
            <rect x="3" y="3" width="58" height="58" rx="15" fill="url(#cta-grad)" />
            <path d="M21 16 L21 40 L40 40 L46 34 L41 33 L31 33 L31 16 Z" fill={COLORS.white} opacity="0.97" />
            <path d="M40 40 L51 29 L46 24 L46 34 L40 34 Z" fill={COLORS.white} opacity="0.6" />
            <rect x="41" y="11" width="14" height="10" rx="3" fill={COLORS.accent} opacity="0.95" />
          </svg>
        </div>

        {/* Brand name */}
        <h2
          style={{
            margin: 0,
            fontFamily: FONT.display,
            fontSize: 48,
            fontWeight: 800,
            color: COLORS.text,
            letterSpacing: '-0.03em',
            opacity: interpolate(frame, [30, 55], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          Letis <span style={{ color: COLORS.accent }}>POS</span>
        </h2>

        {/* CTA */}
        <div
          style={{
            marginTop: 20,
            padding: '18px 48px',
            backgroundColor: COLORS.accentSolid,
            borderRadius: 16,
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            boxShadow: `0 20px 50px rgba(22, 163, 74, 0.35)`,
          }}
        >
          <span
            style={{
              fontFamily: FONT.display,
              fontSize: 32,
              fontWeight: 900,
              color: COLORS.white,
            }}
          >
            Start free — 30 days on us
          </span>
        </div>

        {/* URL */}
        <p
          style={{
            margin: 0,
            marginTop: 4,
            fontFamily: FONT.body,
            fontSize: 22,
            fontWeight: 600,
            color: COLORS.textMuted,
            opacity: urlOpacity,
            letterSpacing: '0.04em',
          }}
        >
          letispos.com
        </p>

        {/* Launch offer badge */}
        <div
          style={{
            marginTop: 20,
            padding: '10px 24px',
            backgroundColor: COLORS.surface,
            border: `1px solid ${COLORS.accent}40`,
            borderRadius: 12,
            opacity: badgeOpacity,
            transform: `translateY(${badgeY}px)`,
          }}
        >
          <span style={{ fontFamily: FONT.body, fontSize: 18, fontWeight: 700, color: COLORS.accent }}>
            Launch offer: 50% off first 3 months
          </span>
          <span style={{ fontFamily: FONT.body, fontSize: 15, color: COLORS.textMuted, marginLeft: 8 }}>
            · No credit card
          </span>
        </div>
      </AbsoluteFill>
    </SceneFrame>
  );
};
```

- [ ] **Step 2: Wire CtaClose into AdVideo.tsx**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/remotion/scenes/CtaClose.tsx frontend/src/remotion/AdVideo.tsx
git commit -m "feat: add CtaClose scene (52-60s) with logo, CTA button, and launch offer"
```

---

### Task 18: Final wiring — complete AdVideo.tsx

**Files:**
- Modify: `frontend/src/remotion/AdVideo.tsx`

- [ ] **Step 1: Rewrite AdVideo.tsx with all scenes wired**

```typescript
// frontend/src/remotion/AdVideo.tsx
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { COLORS, SCENES } from './config';
import { BrandOpen } from './scenes/BrandOpen';
import { TheProblem } from './scenes/TheProblem';
import { DashboardReveal } from './scenes/DashboardReveal';
import { InventoryModule } from './scenes/InventoryModule';
import { PosModule } from './scenes/PosModule';
import { ReportsAI } from './scenes/ReportsAI';
import { CloudMultistore } from './scenes/CloudMultistore';
import { CtaClose } from './scenes/CtaClose';

export const AdVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <Sequence from={SCENES.brandOpen.start} durationInFrames={SCENES.brandOpen.end - SCENES.brandOpen.start}>
        <BrandOpen />
      </Sequence>
      <Sequence from={SCENES.theProblem.start} durationInFrames={SCENES.theProblem.end - SCENES.theProblem.start}>
        <TheProblem />
      </Sequence>
      <Sequence from={SCENES.dashboardReveal.start} durationInFrames={SCENES.dashboardReveal.end - SCENES.dashboardReveal.start}>
        <DashboardReveal />
      </Sequence>
      <Sequence from={SCENES.inventoryModule.start} durationInFrames={SCENES.inventoryModule.end - SCENES.inventoryModule.start}>
        <InventoryModule />
      </Sequence>
      <Sequence from={SCENES.posModule.start} durationInFrames={SCENES.posModule.end - SCENES.posModule.start}>
        <PosModule />
      </Sequence>
      <Sequence from={SCENES.reportsAI.start} durationInFrames={SCENES.reportsAI.end - SCENES.reportsAI.start}>
        <ReportsAI />
      </Sequence>
      <Sequence from={SCENES.cloudMultistore.start} durationInFrames={SCENES.cloudMultistore.end - SCENES.cloudMultistore.start}>
        <CloudMultistore />
      </Sequence>
      <Sequence from={SCENES.ctaClose.start} durationInFrames={SCENES.ctaClose.end - SCENES.ctaClose.start}>
        <CtaClose />
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Full verification — run Remotion Studio**

Run: `cd frontend && npx remotion studio src/remotion/index.ts`
Expected: Studio opens. LetisAd composition plays all 8 scenes end-to-end. No broken imports, no blank screens.

- [ ] **Step 3: Render test (first 5 seconds)**

Run: `cd frontend && npx remotion render LetisAd out/test-render.mp4 --frames=0-149`
Expected: MP4 file at `frontend/out/test-render.mp4`. Opens in media player. Shows BrandOpen scene correctly.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/remotion/AdVideo.tsx
git commit -m "feat: wire all 8 scenes into AdVideo composition"
```

---

### Task 19: Add render script to package.json

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Add remotion scripts**

Add to `frontend/package.json` scripts block:

```json
"remotion:studio": "remotion studio src/remotion/index.ts",
"remotion:render": "remotion render LetisAd out/letis-ad.mp4"
```

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json
git commit -m "chore: add remotion studio and render scripts"
```

---

### Task 20: Final render + verification

- [ ] **Step 1: Full render**

Run: `cd frontend && npm run remotion:render`
Expected: Full 60-second MP4 at `frontend/out/letis-ad.mp4`. ~1800 frames rendered. No errors.

- [ ] **Step 2: Spot check frames**

Run: `cd frontend && npx remotion still LetisAd out/frame300.png --frame=300 && npx remotion still LetisAd out/frame900.png --frame=900 && npx remotion still LetisAd out/frame1500.png --frame=1500`
Expected: Three still frames at key timestamps showing DashboardReveal, PosModule, and CloudMultistore respectively.

- [ ] **Step 3: Commit any final tweaks**

```bash
git add -A
git commit -m "chore: final render output and adjustments"
```
