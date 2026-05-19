import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';

interface Widget {
  title: string;
  width: number;
  content: React.ReactNode;
}

interface Props {
  widgets: Widget[];
  startFrame?: number;
}

export const UIDashboard: React.FC<Props> = ({ widgets, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - startFrame);

  const containerScale = spring({
    frame: localFrame,
    fps,
    config: SPRING.gentle,
    from: 0.92,
    to: 1,
  });

  return (
    <div
      style={{
        width: 960,
        transform: `scale(${containerScale})`,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 4px',
        }}
      >
        <span style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 800, color: COLORS.text }}>
          Letis POS
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{
            fontFamily: FONT.body, fontSize: 13, color: COLORS.accent, fontWeight: 700,
            backgroundColor: 'rgba(74, 222, 128, 0.12)', padding: '4px 14px', borderRadius: 999,
          }}>
            Online
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {widgets.map((w, i) => {
          const widgetDelay = startFrame + i * 10;
          const widgetFrame = Math.max(0, frame - widgetDelay);
          const widgetOpacity = spring({
            frame: widgetFrame,
            fps,
            config: SPRING.gentle,
            from: 0,
            to: 1,
          });
          const widgetY = spring({
            frame: widgetFrame,
            fps,
            config: SPRING.gentle,
            from: 30,
            to: 0,
          });

          return (
            <div
              key={w.title}
              style={{
                width: `calc(${w.width * 100}% - ${16 * (1 - w.width) / w.width}px)`,
                minWidth: 200,
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                border: `1px solid ${COLORS.border}`,
                padding: 22,
                opacity: widgetOpacity,
                transform: `translateY(${widgetY}px)`,
                flex: '1 1 auto',
              }}
            >
              <p
                style={{
                  margin: 0,
                  marginBottom: 14,
                  fontFamily: FONT.body,
                  fontSize: 14,
                  color: COLORS.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                }}
              >
                {w.title}
              </p>
              {w.content}
            </div>
          );
        })}
      </div>
    </div>
  );
};
