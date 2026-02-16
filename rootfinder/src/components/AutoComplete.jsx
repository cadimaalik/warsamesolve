import { useState, useEffect } from 'react';
import { COLORS, FONTS } from '../constants/brand';
import { getAutocompleteSuggestions } from '../engine/pythonParser';

export default function AutoComplete({ input, cursorPosition, onSelect, visible }) {
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!visible || !input) { setSuggestions([]); return; }

    const textBefore = input.slice(0, cursorPosition);
    const match = textBefore.match(/[a-zA-Z]+$/);

    if (match && match[0].length > 0) {
      const matches = getAutocompleteSuggestions(match[0]);
      setSuggestions(matches.slice(0, 6));
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
    }
  }, [input, cursorPosition, visible]);

  const handleSelect = (func) => {
    const textBefore = input.slice(0, cursorPosition);
    const match = textBefore.match(/[a-zA-Z]+$/);
    const replaceLength = match ? match[0].length : 0;
    onSelect(func, replaceLength);
  };

  if (suggestions.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      zIndex: 100,
      background: COLORS.bgCard,
      border: `1px solid ${COLORS.borderLight}`,
      borderRadius: 4,
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      maxHeight: 200,
      overflowY: 'auto',
      minWidth: 150,
      marginTop: 2,
    }}>
      {suggestions.map((func, i) => (
        <div
          key={func}
          onClick={() => handleSelect(func)}
          onMouseEnter={() => setSelectedIndex(i)}
          style={{
            padding: '6px 12px',
            fontFamily: FONTS.mono,
            fontSize: 12,
            color: i === selectedIndex ? COLORS.green : COLORS.textPrimary,
            background: i === selectedIndex ? COLORS.greenGlow : 'transparent',
            cursor: 'pointer',
            borderBottom: i < suggestions.length - 1 ? `1px solid ${COLORS.border}` : 'none',
          }}
        >
          <span style={{ color: COLORS.blue }}>{func}</span>
          <span style={{ color: COLORS.textDim }}>()</span>
        </div>
      ))}
    </div>
  );
}
