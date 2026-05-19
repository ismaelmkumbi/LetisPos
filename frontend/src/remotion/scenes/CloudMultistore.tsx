import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
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
  const totalFrames = 180;

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
