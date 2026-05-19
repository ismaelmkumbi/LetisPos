import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';

type StatusColor = 'green' | 'red' | 'orange' | 'blue';

const STATUS_COLORS: Record<StatusColor, { bg: string; fg: string }> = {
  green: { bg: 'rgba(22, 163, 74, 0.15)', fg: COLORS.accent },
  red: { bg: 'rgba(239, 68, 68, 0.15)', fg: COLORS.danger },
  orange: { bg: 'rgba(245, 158, 11, 0.15)', fg: COLORS.warning },
  blue: { bg: 'rgba(59, 130, 246, 0.15)', fg: COLORS.blue },
};

interface Props {
  text: string;
  status: StatusColor;
  startFrame?: number;
}

export const UIStatusBadge: React.FC<Props> = ({
  text,
  status,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = STATUS_COLORS[status];

  const localFrame = Math.max(0, frame - startFrame);
  const scale = spring({ frame: localFrame, fps, config: SPRING.snappy, from: 0, to: 1 });
  const opacity = spring({ frame: localFrame, fps, config: SPRING.snappy, from: 0, to: 1 });

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 999,
        backgroundColor: colors.bg,
        color: colors.fg,
        fontFamily: FONT.body,
        fontSize: 18,
        fontWeight: 700,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: colors.fg,
        }}
      />
      {text}
    </span>
  );
};
