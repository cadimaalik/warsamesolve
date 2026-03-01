import { useMemo } from 'react';
import { COLORS, FONTS, METHOD_COLORS } from '../constants/brand';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

/**
 * Interactive function plot showing data points and fitted curve.
 */
export default function FunctionPlot({ result, showResiduals = false }) {
  const { chartData, yMin, yMax } = useMemo(() => {
    if (!result || !result.plotData) return { chartData: [], yMin: 0, yMax: 1 };

    // Combine fitted curve data
    const curveData = result.plotData.map(p => ({
      x: p.x,
      fitted: p.y,
    }));

    // Data points as scatter
    const scatterData = result.points.map((p, i) => ({
      x: p.x,
      dataPoint: p.y,
      residual: result.residuals ? result.residuals[i] : undefined,
    }));

    // Compute y range
    const allY = [
      ...result.plotData.map(p => p.y).filter(y => isFinite(y)),
      ...result.points.map(p => p.y),
    ];
    let minY = Math.min(...allY);
    let maxY = Math.max(...allY);
    const padding = (maxY - minY) * 0.1 || 1;
    minY -= padding;
    maxY += padding;

    return {
      chartData: { curve: curveData, scatter: scatterData },
      yMin: minY,
      yMax: maxY,
    };
  }, [result]);

  if (!result || !result.plotData) return null;

  const methodColor = METHOD_COLORS[result.method] || COLORS.green;

  // Merge curve and scatter data for ComposedChart
  const mergedData = useMemo(() => {
    if (!chartData.curve) return [];

    const map = new Map();
    chartData.curve.forEach(p => {
      map.set(p.x, { x: p.x, fitted: p.fitted });
    });
    // Add data points - use slightly offset keys if needed
    chartData.scatter.forEach((p, i) => {
      const key = `dp_${i}`;
      // Find closest curve point or add new
      const existing = map.get(p.x);
      if (existing) {
        existing.dataPoint = p.dataPoint;
      } else {
        map.set(p.x + 1e-10 * i, { x: p.x, dataPoint: p.dataPoint });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.x - b.x);
  }, [chartData]);

  // Residual lines data
  const residualLines = useMemo(() => {
    if (!showResiduals || !result.residuals) return [];
    return result.points.map((p, i) => ({
      x: p.x,
      yData: p.y,
      yFit: p.y - result.residuals[i],
    }));
  }, [showResiduals, result]);

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
        Graph
      </div>
      <div style={{ padding: '10px 4px 10px 0', height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={mergedData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={COLORS.border}
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="x"
              type="number"
              domain={[result.plotRange.xMin, result.plotRange.xMax]}
              tick={{ fill: COLORS.textDim, fontSize: 10, fontFamily: FONTS.mono }}
              stroke={COLORS.border}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: COLORS.textDim, fontSize: 10, fontFamily: FONTS.mono }}
              stroke={COLORS.border}
              tickFormatter={(v) => {
                if (Math.abs(v) >= 1000) return v.toExponential(1);
                return parseFloat(v.toFixed(2)).toString();
              }}
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
              formatter={(value, name) => [
                typeof value === 'number' ? value.toFixed(4) : value,
                name === 'fitted' ? 'Fitted' : 'Data',
              ]}
              labelFormatter={(v) => `x = ${typeof v === 'number' ? v.toFixed(4) : v}`}
            />
            <Legend
              wrapperStyle={{
                fontFamily: FONTS.mono,
                fontSize: 10,
                color: COLORS.textDim,
              }}
            />

            {/* Residual lines */}
            {residualLines.map((r, i) => (
              <ReferenceLine
                key={`res-${i}`}
                segment={[
                  { x: r.x, y: r.yData },
                  { x: r.x, y: r.yFit },
                ]}
                stroke={COLORS.error}
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            ))}

            {/* Fitted curve */}
            <Line
              dataKey="fitted"
              stroke={methodColor}
              strokeWidth={2}
              dot={false}
              name="Fitted"
              connectNulls
              isAnimationActive={false}
            />

            {/* Data points */}
            <Scatter
              dataKey="dataPoint"
              fill={COLORS.accent}
              stroke={COLORS.accent}
              name="Data"
              r={5}
              isAnimationActive={false}
            />

            {/* Evaluation point */}
            {result.evalResult !== null && result.evalResult !== undefined && result.xEval !== null && (
              <Scatter
                data={[{ x: result.xEval, evalPt: result.evalResult }]}
                dataKey="evalPt"
                fill={COLORS.error}
                stroke="#fff"
                name={`f(${result.xEval})`}
                r={7}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
