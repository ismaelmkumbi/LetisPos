import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';

interface Props {
  text: string;
  startFrame?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
  style?: React.CSSProperties;
}

export const KineticText: React.FC<Props> = ({
  text,
  startFrame = 0,
  fontSize = 52,
  color = COLORS.text,
  fontWeight = 900,
  align = 'center',
  maxWidth = 800,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - startFrame);

  const scale = spring({
    frame: localFrame,
    fps,
    config: SPRING.text,
    from: 0.5,
    to: 1,
  });

  const opacity = spring({
    frame: localFrame,
    fps,
    config: SPRING.text,
    from: 0,
    to: 1,
  });

  return (
    <p
      style={{
        margin: 0,
        fontFamily: FONT.display,
        fontSize,
        fontWeight,
        color,
        textAlign: align,
        maxWidth,
        transform: `scale(${scale})`,
        opacity,
        lineHeight: 1.2,
        ...style,
      }}
    >
      {text}
    </p>
  );
};
