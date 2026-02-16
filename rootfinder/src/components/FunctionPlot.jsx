import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart,
  ComposedChart,
} from 'recharts';
import { COLORS, FONTS } from '../constants/brand';
import { generatePlotData } from '../engine/methods';

export default function FunctionPlot({ exprStr, result, xMin: propXMin, xMax: propXMax }) {
  const { plotData, xMin, xMax, yMin, yMax } = useMemo(() => {
    if (!exprStr) return { plotData: [], xMin: -5, xMax: 5, yMin: -5, yMax: 5 };

    let lo = propXMin ?? -5;
    let hi = propXMax ?? 5;

    // Expand range around root if needed
    if (result?.root !== undefined) {
      const r = result.root;
      if (r < lo) lo = r - 2;
      if (r > hi) hi = r + 2;
    }

    // Expand range around interval for bracketing methods
    if (result?.iterations?.length > 0) {
      const first = result.iterations[0];
      if (first.a !== undefined && first.a < lo) lo = first.a - 1;
      if (first.b !== undefined && first.b > hi) hi = first.b + 1;
    }

    const data = generatePlotData(exprStr, lo, hi, 500);
    const ys = data.filter(d => d.y !== null).map(d => d.y);
    const minY = ys.length > 0 ? Math.min(...ys) : -5;
    const maxY = ys.length > 0 ? Math.max(...ys) : 5;
    const padY = (maxY - minY) * 0.1 || 1;

    return {
      plotData: data,
      xMin: lo,
      xMax: hi,
      yMin: Math.max(minY - padY, -100),
      yMax: Math.min(maxY + padY, 100),
    };
  }, [exprStr, result, propXMin, propXMax]);

  if (!exprStr) return null;

  const rootPoint = result?.root !== undefined ? [{ x: result.root, y: 0 }] : [];

  return (
    <div style={{
      background: COLORS.bgCard,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${COLORS.border}`,
        fontFamily: FONTS.mono,
        fontSize: 12,
        fontWeight: 600,
        color: COLORS.textPrimary,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Function Plot
      </div>
      <div style={{ padding: '12px 8px 8px 0' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={plotData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis
              dataKey="x"
              type="number"
              domain={[xMin, xMax]}
              stroke={COLORS.textDim}
              tick={{ fill: COLORS.textDim, fontSize: 10, fontFamily: FONTS.mono }}
              tickCount={10}
            />
            <YAxis
              domain={[yMin, yMax]}
              stroke={COLORS.textDim}
              tick={{ fill: COLORS.textDim, fontSize: 10, fontFamily: FONTS.mono }}
              tickCount={8}
            />
            <Tooltip
              contentStyle={{
                background: COLORS.bgPanel,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 4,
                fontFamily: FONTS.mono,
                fontSize: 11,
                color: COLORS.textPrimary,
              }}
              formatter={(value) => value !== null ? value.toFixed(6) : 'undef'}
              labelFormatter={(label) => `x = ${parseFloat(label).toFixed(6)}`}
            />
            <ReferenceLine y={0} stroke={COLORS.textDim} strokeWidth={1} />
            <ReferenceLine x={0} stroke={COLORS.textDim} strokeWidth={1} strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="y"
              stroke={COLORS.green}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            {rootPoint.length > 0 && (
              <Scatter
                data={rootPoint}
                fill={COLORS.error}
                shape="circle"
                isAnimationActive={false}
                legendType="none"
              >
              </Scatter>
            )}
          </ComposedChart>
        </ResponsiveContainer>
        {result?.root !== undefined && (
          <div style={{
            textAlign: 'center',
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.textDim,
            marginTop: 4,
          }}>
            Root marked in red at x = {result.root.toFixed(8)}
          </div>
        )}
      </div>
    </div>
  );
}
