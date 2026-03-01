import { COLORS, FONTS } from '../constants/brand';

export default function Header() {
  return (
    <header style={{
      background: COLORS.bgPanel,
      borderBottom: `1px solid ${COLORS.border}`,
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <a
          href="/"
          style={{
            color: COLORS.textDim,
            textDecoration: 'none',
            fontFamily: FONTS.mono,
            fontSize: 12,
            letterSpacing: '0.05em',
          }}
        >
          Formula252
        </a>
        <span style={{ color: COLORS.textDim }}>/</span>
        <h1 style={{
          fontFamily: FONTS.mono,
          fontSize: 16,
          fontWeight: 700,
          color: COLORS.green,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          FuncApprox
        </h1>
      </div>
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: 11,
        color: COLORS.textDim,
        letterSpacing: '0.05em',
      }}>
        Function Approximation
      </div>
    </header>
  );
}
