import { useMemo } from 'react';
import { COLORS, FONTS, METHOD_COLORS } from '../constants/brand';
import {
  ResponsiveContainer, ComposedChart, Line, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

export default function FunctionPlot({ result, showResiduals = false }) {
  const { mergedData, yMin, yMax } = useMemo(() => {
    if (!result || !result.plotData) return { mergedData: [], yMin: 0, yMax: 1 };

    const allY = [
      ...result.plotData.map(p => p.y).filter(y => isFinite(y)),
      ...result.points.map(p => p.y),
    ];
    let minY = Math.min(...allY);
    let maxY = Math.max(...allY);
    const padding = (maxY - minY) * 0.1 || 1;

    // Build merged dataset
    const map = new Map();
    result.plotData.forEach(p => {
      map.set(p.x, { x: p.x, fitted: p.y });
    });
    result.points.forEach((p, i) => {
      const existing = map.get(p.x);
      if (existing) {
        existing.dataPoint = p.y;
      } else {
        map.set(p.x + 1e-10 * i, { x: p.x, dataPoint: p.y });
      }
    });

    return {
      mergedData: Array.from(map.values()).sort((a, b) => a.x - b.x),
      yMin: minY - padding,
      yMax: maxY + padding,
    };
  }, [result]);

  if (!result || !result.plotData) return null;

  const methodColor = METHOD_COLORS[result.subMethod || result.method] || COLORS.green;

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
        fontFamily: FONTS.mono, fontSize: 12, fontWeight: 600,
        color: COLORS.textPrimary, textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Graph
      </div>
      <div style={{ padding: '10px 4px 10px 0', height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={mergedData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} strokeOpacity={0.5} />
            <XAxis
              dataKey="x" type="number"
              domain={[result.plotRange.xMin, result.plotRange.xMax]}
              tick={{ fill: COLORS.textDim, fontSize: 10, fontFamily: FONTS.mono }}
              stroke={COLORS.border}
              tickFormatter={v => v.toFixed(1)}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: COLORS.textDim, fontSize: 10, fontFamily: FONTS.mono }}
              stroke={COLORS.border}
              tickFormatter={v => Math.abs(v) >= 1000 ? v.toExponential(1) : parseFloat(v.toFixed(2)).toString()}
            />
            <Tooltip
              contentStyle={{
                background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`,
                borderRadius: 4, fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textPrimary,
              }}
              formatter={(value, name) => [
                typeof value === 'number' ? value.toFixed(4) : value,
                name === 'fitted' ? 'Fitted' : 'Data',
              ]}
              labelFormatter={v => `x = ${typeof v === 'number' ? v.toFixed(4) : v}`}
            />
            <Legend wrapperStyle={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim }} />
            <Line
              dataKey="fitted" stroke={methodColor} strokeWidth={2}
              dot={false} name="Fitted" connectNulls isAnimationActive={false}
            />
            <Scatter
              dataKey="dataPoint" fill={COLORS.accent} stroke={COLORS.accent}
              name="Data" r={5} isAnimationActive={false}
            />
            {result.evalResult !== null && result.evalResult !== undefined && result.xEval !== null && (
              <Scatter
                data={[{ x: result.xEval, evalPt: result.evalResult }]}
                dataKey="evalPt" fill={COLORS.error} stroke="#fff"
                name={`f(${result.xEval})`} r={7} isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
