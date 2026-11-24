import React, { useState } from 'react';

export interface BarDatum {
  label: string;
  value: number;
  secondaryLabel?: string;
  color?: string;
}

interface HorizontalBarListProps {
  items: BarDatum[];
  formatValue: (val: number) => string;
  defaultColor?: string;
}

export const HorizontalBarList: React.FC<HorizontalBarListProps> = ({
  items,
  formatValue,
  defaultColor = '#14532D',
}) => {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3.5">
      {items.map((item) => {
        const pct = Math.max(2, (item.value / max) * 100);
        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-4 text-xs">
              <div className="font-medium text-stone-800 truncate">{item.label}</div>
              <div className="flex items-baseline gap-2 shrink-0">
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {formatValue(item.value)}
                </span>
                {item.secondaryLabel && (
                  <span className="font-mono text-stone-500 tabular-nums">{item.secondaryLabel}</span>
                )}
              </div>
            </div>
            <div className="w-full h-2 bg-stone-100 rounded-sm overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: item.color || defaultColor,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export interface MultiYearPoint {
  year: string | number;
  value: number;
  secondaryValue?: number;
}

interface MultiYearBarChartProps {
  data: MultiYearPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  formatValue: (val: number) => string;
  primaryColor?: string;
  secondaryColor?: string;
  height?: number;
}

export const MultiYearBarChart: React.FC<MultiYearBarChartProps> = ({
  data,
  primaryLabel,
  secondaryLabel,
  formatValue,
  primaryColor = '#14532D',
  secondaryColor = '#94A3B8',
  height = 200,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxVal = Math.max(
    ...data.flatMap((d) => [d.value, d.secondaryValue ?? 0]),
    1
  );

  const chartWidth = 460;
  const chartHeight = height;
  const padTop = 22;
  const padBottom = 32;
  const padLeft = 16;
  const padRight = 16;
  const innerH = chartHeight - padTop - padBottom;
  const innerW = chartWidth - padLeft - padRight;
  const groupW = innerW / Math.max(data.length, 1);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs text-stone-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: primaryColor }} />
            <span>{primaryLabel}</span>
          </div>
          {secondaryLabel && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: secondaryColor }} />
              <span>{secondaryLabel}</span>
            </div>
          )}
        </div>
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="font-mono text-stone-900 tabular-nums">
            {data[hoveredIdx].year}: {formatValue(data[hoveredIdx].value)}
            {data[hoveredIdx].secondaryValue !== undefined && secondaryLabel
              ? ` · ${secondaryLabel}: ${formatValue(data[hoveredIdx].secondaryValue!)}`
              : ''}
          </div>
        )}
      </div>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label={primaryLabel}
      >
        {[0, 0.5, 1].map((step) => {
          const y = padTop + innerH * (1 - step);
          return (
            <line
              key={step}
              x1={padLeft}
              x2={chartWidth - padRight}
              y1={y}
              y2={y}
              stroke="#E7E5E4"
              strokeDasharray={step === 0 ? undefined : '3 3'}
              strokeWidth={1}
            />
          );
        })}

        {data.map((d, idx) => {
          const cx = padLeft + groupW * idx + groupW / 2;
          const hasSecondary = d.secondaryValue !== undefined;
          const barW = hasSecondary ? Math.min(34, groupW * 0.28) : Math.min(48, groupW * 0.42);
          const h1 = (d.value / maxVal) * innerH;
          const y1 = padTop + innerH - h1;
          const x1 = hasSecondary ? cx - barW - 3 : cx - barW / 2;

          const h2 = hasSecondary ? ((d.secondaryValue ?? 0) / maxVal) * innerH : 0;
          const y2 = padTop + innerH - h2;
          const x2 = cx + 3;

          return (
            <g
              key={d.year}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={x1}
                y={y1}
                width={barW}
                height={Math.max(2, h1)}
                rx={2}
                fill={primaryColor}
                opacity={hoveredIdx === null || hoveredIdx === idx ? 1 : 0.65}
              />
              {!hasSecondary && (
                <text
                  x={cx}
                  y={Math.max(12, y1 - 6)}
                  textAnchor="middle"
                  className="fill-stone-700 font-mono text-[10px]"
                >
                  {formatValue(d.value)}
                </text>
              )}
              {hasSecondary && (
                <rect
                  x={x2}
                  y={y2}
                  width={barW}
                  height={Math.max(2, h2)}
                  rx={2}
                  fill={secondaryColor}
                  opacity={hoveredIdx === null || hoveredIdx === idx ? 1 : 0.65}
                />
              )}
              <text
                x={cx}
                y={chartHeight - 10}
                textAnchor="middle"
                className="fill-stone-600 font-mono text-[11px] font-medium"
              >
                {d.year}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

interface StackedProportionBarProps {
  segments: { label: string; value: number; color: string }[];
  formatValue: (val: number) => string;
}

export const StackedProportionBar: React.FC<StackedProportionBarProps> = ({
  segments,
  formatValue,
}) => {
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;

  return (
    <div className="space-y-3">
      <div className="flex w-full h-3.5 overflow-hidden bg-stone-100 rounded-sm">
        {segments.map((seg) => {
          const pct = (seg.value / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={seg.label}
              style={{ width: `${pct}%`, backgroundColor: seg.color }}
              title={`${seg.label}: ${formatValue(seg.value)} (${pct.toFixed(1)}%)`}
              className="h-full transition-all duration-300"
            />
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {segments.map((seg) => {
          const pct = (seg.value / total) * 100;
          return (
            <div key={seg.label} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-stone-700 truncate">{seg.label}</span>
              </div>
              <span className="font-mono font-medium text-stone-900 tabular-nums shrink-0">
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
