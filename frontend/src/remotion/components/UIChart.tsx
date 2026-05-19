import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, SPRING } from '../config';

interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  type: 'bar';
  data: BarDatum[];
  maxValue?: number;
  startFrame?: number;
  width?: number;
  height?: number;
}

interface LineChartProps {
  type: 'line';
  data: number[];
  color?: string;
  startFrame?: number;
  width?: number;
  height?: number;
}

type Props = BarChartProps | LineChartProps;

export const UIChart: React.FC<Props> = (props) => {
  const { type, startFrame = 0, width = 700, height = 300 } = props;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - startFrame);

  if (type === 'bar') {
    const { data, maxValue } = props;
    const max = maxValue ?? Math.max(...data.map((d) => d.value));
    const barCount = data.length;
    const barWidth = (width - 80) / barCount - 12;
    const chartLeft = 60;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = height - 40 - (height - 60) * pct;
          return (
            <text
              key={pct}
              x={chartLeft - 10}
              y={y + 5}
              textAnchor="end"
              fill={COLORS.textMuted}
              fontFamily={FONT.body}
              fontSize={12}
            >
              {Math.round(max * pct)}
            </text>
          );
        })}
        {data.map((d, i) => {
          const barH = interpolate(
            localFrame,
            [i * 6, i * 6 + 20],
            [0, ((height - 60) * d.value) / max],
            { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
          );
          const barX = chartLeft + i * ((width - 80) / barCount);
          const barY = height - 40 - barH;

          return (
            <g key={d.label}>
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barH}
                rx={6}
                fill={d.color ?? COLORS.accent}
                opacity={interpolate(localFrame, [i * 6, i * 6 + 10], [0, 1], { extrapolateRight: 'clamp' })}
              />
              <text
                x={barX + barWidth / 2}
                y={height - 15}
                textAnchor="middle"
                fill={COLORS.textMuted}
                fontFamily={FONT.body}
                fontSize={13}
                fontWeight={600}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // Line chart
  const { data, color = COLORS.accentSolid } = props as LineChartProps;
  const max = Math.max(...data);
  const chartW = width - 60;
  const chartH = height - 60;
  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0;

  const drawProgress = spring({
    frame: localFrame,
    fps,
    config: SPRING.gentle,
    from: 0,
    to: 1,
  });

  const points = data.map((v, i) => {
    return `${60 + i * stepX},${30 + chartH - (v / max) * chartH}`;
  });

  const path = `M${points.join(' L')}`;
  const pathLen = data.length * stepX + chartH;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {[0, 0.5, 1].map((pct) => {
        const y = 30 + chartH * (1 - pct);
        return (
          <line
            key={pct}
            x1={60} y1={y} x2={width - 20} y2={y}
            stroke={COLORS.border}
            strokeWidth={1}
          />
        );
      })}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${pathLen * drawProgress} ${pathLen}`}
      />
      {points.map((p, i) => {
        const [px, py] = p.split(',').map(Number);
        const dotOpacity = interpolate(
          localFrame,
          [i * 8 + 15, i * 8 + 22],
          [0, 1],
          { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
        );
        return (
          <circle
            key={i}
            cx={px} cy={py} r={5}
            fill={color}
            opacity={dotOpacity}
          />
        );
      })}
    </svg>
  );
};
