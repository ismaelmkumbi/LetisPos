import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';
import { SceneFrame } from '../components/SceneFrame';
import { GlowEffect } from '../components/GlowEffect';

export const CtaClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = 240;

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
