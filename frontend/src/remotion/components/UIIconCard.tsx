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
