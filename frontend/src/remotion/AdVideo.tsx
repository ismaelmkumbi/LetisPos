import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { SCENES, COLORS } from './config';
import { BrandOpen } from './scenes/BrandOpen';
import { TheProblem } from './scenes/TheProblem';
import { DashboardReveal } from './scenes/DashboardReveal';

export const AdVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <Sequence from={SCENES.brandOpen.start} durationInFrames={SCENES.brandOpen.end - SCENES.brandOpen.start}>
        <BrandOpen />
      </Sequence>
      <Sequence from={SCENES.theProblem.start} durationInFrames={SCENES.theProblem.end - SCENES.theProblem.start}>
        <TheProblem />
      </Sequence>
      <Sequence from={SCENES.dashboardReveal.start} durationInFrames={SCENES.dashboardReveal.end - SCENES.dashboardReveal.start}>
        <DashboardReveal />
      </Sequence>
      <Sequence from={SCENES.inventoryModule.start} durationInFrames={SCENES.inventoryModule.end - SCENES.inventoryModule.start}>
        <AbsoluteFill style={{ backgroundColor: COLORS.bg }} />
      </Sequence>
      <Sequence from={SCENES.posModule.start} durationInFrames={SCENES.posModule.end - SCENES.posModule.start}>
        <AbsoluteFill style={{ backgroundColor: COLORS.bg }} />
      </Sequence>
      <Sequence from={SCENES.reportsAI.start} durationInFrames={SCENES.reportsAI.end - SCENES.reportsAI.start}>
        <AbsoluteFill style={{ backgroundColor: COLORS.bg }} />
      </Sequence>
      <Sequence from={SCENES.cloudMultistore.start} durationInFrames={SCENES.cloudMultistore.end - SCENES.cloudMultistore.start}>
        <AbsoluteFill style={{ backgroundColor: COLORS.bg }} />
      </Sequence>
      <Sequence from={SCENES.ctaClose.start} durationInFrames={SCENES.ctaClose.end - SCENES.ctaClose.start}>
        <AbsoluteFill style={{ backgroundColor: COLORS.bg }} />
      </Sequence>
    </AbsoluteFill>
  );
};
