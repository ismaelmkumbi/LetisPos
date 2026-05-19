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
