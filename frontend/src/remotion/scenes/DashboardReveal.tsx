import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS } from '../config';
import { SceneFrame } from '../components/SceneFrame';
import { KineticText } from '../components/KineticText';
import { UIDashboard } from '../components/UIDashboard';
import { UICounter } from '../components/UICounter';
import { UIStatusBadge } from '../components/UIStatusBadge';
import { GlowEffect } from '../components/GlowEffect';

export const DashboardReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const totalFrames = 300;

  const widgets = [
    {
      title: "Today's Sales",
      width: 0.5,
      content: (
        <div>
          <UICounter value={1247000} startFrame={40} prefix="TZS " fontSize={40} color={COLORS.accent} />
          <div style={{ marginTop: 8 }}>
            <UIStatusBadge text="+12% vs last week" status="green" startFrame={55} />
          </div>
        </div>
      ),
    },
    {
      title: 'Active Products',
      width: 0.5,
      content: (
        <div>
          <UICounter value={1247} startFrame={50} fontSize={40} color={COLORS.blue} />
          <div style={{ marginTop: 8 }}>
            <UIStatusBadge text="Synced" status="green" startFrame={65} />
          </div>
        </div>
      ),
    },
    {
      title: 'Inventory Value',
      width: 0.5,
      content: (
        <div>
          <UICounter value={18500000} startFrame={60} prefix="TZS " fontSize={36} />
          <div style={{ marginTop: 8 }}>
            <span style={{ color: COLORS.textMuted, fontFamily: 'var(--lp-font-body)', fontSize: 14 }}>Across 3 warehouses</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Pending Orders',
      width: 0.5,
      content: (
        <div>
          <UICounter value={23} startFrame={70} fontSize={40} color={COLORS.warning} />
          <div style={{ marginTop: 8 }}>
            <UIStatusBadge text="Needs attention" status="orange" startFrame={85} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <SceneFrame currentFrame={frame} totalFrames={totalFrames}>
      <GlowEffect size={500} color={COLORS.accent} x="80%" y="20%" opacity={0.08} />
      <GlowEffect size={300} color={COLORS.blue} x="20%" y="80%" opacity={0.06} />

      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <KineticText
          text="Everything. In one place."
          startFrame={10}
          fontSize={48}
          fontWeight={800}
        />
      </div>

      <UIDashboard widgets={widgets} startFrame={30} />
    </SceneFrame>
  );
};
