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
