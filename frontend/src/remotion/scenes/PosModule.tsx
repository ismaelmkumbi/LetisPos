import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
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
  const totalFrames = 240;

  const subtotal = CART_ITEMS.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <SceneFrame currentFrame={frame} totalFrames={totalFrames}>
      <GlowEffect size={300} color={COLORS.accentSolid} x="85%" y="25%" opacity={0.08} />

      <div style={{ display: 'flex', gap: 40, width: 900, alignItems: 'flex-start' }}>
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
