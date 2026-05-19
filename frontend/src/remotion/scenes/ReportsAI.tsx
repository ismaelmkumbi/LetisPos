import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
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
  const totalFrames = 240;

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
