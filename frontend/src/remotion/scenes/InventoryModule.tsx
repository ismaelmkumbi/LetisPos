import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONT } from '../config';
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
  const totalFrames = 240;

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

      <div style={{ marginBottom: 30, height: 40 }}>
        <div style={{ opacity: alertOpacity }}>
          <UIStatusBadge text="⚠ Sugar — 2 units left" status="orange" startFrame={20} />
        </div>
        <div style={{ opacity: resolvedOpacity, marginTop: -40 }}>
          <UIStatusBadge text="Restocked — 50 units" status="green" startFrame={140} />
        </div>
      </div>

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
