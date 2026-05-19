// frontend/src/remotion/components/SceneFrame.tsx
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../config';

interface Props {
  children: React.ReactNode;
  /** Fade in from 0 over this many frames. Default 10. */
  fadeIn?: number;
  /** Fade out to 0 over this many frames at end. Default 10. */
  fadeOut?: number;
  currentFrame: number;
  totalFrames: number;
}

export const SceneFrame: React.FC<Props> = ({
  children,
  fadeIn = 10,
  fadeOut = 10,
  currentFrame,
  totalFrames,
}) => {
  let opacity = 1;

  if (currentFrame < fadeIn) {
    opacity = currentFrame / fadeIn;
  }
  const fadeStart = totalFrames - fadeOut;
  if (currentFrame >= fadeStart) {
    opacity = 1 - (currentFrame - fadeStart) / fadeOut;
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        opacity,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
