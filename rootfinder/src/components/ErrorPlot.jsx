import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { COLORS, FONTS } from '../constants/brand';

export default function ErrorPlot({ result }) {
  const data = useMemo(() => {
    if (!result?.iterations) return [];
    return result.iterations.map((it) => ({
      n: it.n,
      absError: it.absError,
      logError: it.absError > 0 ? Math.log10(it.absError) : -16,
    }));
  }, [result]);

  if (data.length < 2) return null;

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
        Error Convergence
      </div>
      <div style={{ padding: '12px 8px 8px 0' }}>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis
              dataKey="n"
              stroke={COLORS.textDim}
              tick={{ fill: COLORS.textDim, fontSize: 10, fontFamily: FONTS.mono }}
              label={{ value: 'Iteration', position: 'insideBottom', offset: -2, fill: COLORS.textDim, fontSize: 10 }}
            />
            <YAxis
              stroke={COLORS.textDim}
              tick={{ fill: COLORS.textDim, fontSize: 10, fontFamily: FONTS.mono }}
              label={{ value: 'log10(|error|)', angle: -90, position: 'insideLeft', fill: COLORS.textDim, fontSize: 10 }}
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
              formatter={(value, name) => {
                if (name === 'logError') return [value.toFixed(4), 'log10(|error|)'];
                return [value.toExponential(4), '|error|'];
              }}
            />
            <Line
              type="monotone"
              dataKey="logError"
              stroke={COLORS.accent}
              strokeWidth={2}
              dot={{ fill: COLORS.accent, r: 3 }}
              isAnimationActive={false}
              name="logError"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
