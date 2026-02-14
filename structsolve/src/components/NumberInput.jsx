import React from 'react';
import { COLORS } from '../constants/brand.js';

const btnStyle = {
  width: 24, height: 24, borderRadius: 4, border: 'none',
  background: '#059669', color: '#fff', fontSize: 14,
  cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0, lineHeight: 1, flexShrink: 0,
};

const fieldStyle = {
  flex: 1, padding: '6px 8px', borderRadius: 4,
  border: `1px solid ${COLORS.borderLight}`, background: COLORS.bgInput,
  color: COLORS.textPrimary, fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
  outline: 'none', boxSizing: 'border-box',
  MozAppearance: 'textfield', textAlign: 'center',
};

export default function NumberInput({ value, onChange, min, step = 1, autoFocus, allowNegative = false }) {
  const s = parseFloat(step) || 1;

  function increment() {
    const v = parseFloat(value) || 0;
    onChange(String(Math.round((v + s) * 1000) / 1000));
  }

  function decrement() {
    const v = parseFloat(value) || 0;
    const next = Math.round((v - s) * 1000) / 1000;
    if (!allowNegative && min !== undefined && next < parseFloat(min)) return;
    if (!allowNegative && min === undefined && next < 0) return;
    onChange(String(next));
  }

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <button type="button" style={btnStyle} onClick={decrement}>&minus;</button>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={fieldStyle}
        min={min}
        step={step}
        autoFocus={autoFocus}
      />
      <button type="button" style={btnStyle} onClick={increment}>+</button>
    </div>
  );
}
