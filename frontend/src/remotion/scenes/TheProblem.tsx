import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';
import { SceneFrame } from '../components/SceneFrame';
import { KineticText } from '../components/KineticText';

export const TheProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = 210;

  const redPulse = Math.sin(frame * 0.3) * 0.05 + 0.05;

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
