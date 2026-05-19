import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONT } from '../config';

interface Props {
  value: number;
  startFrame?: number;
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
