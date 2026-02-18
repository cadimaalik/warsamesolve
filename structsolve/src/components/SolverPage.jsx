import React from 'react';
import { FONTS } from '../constants/brand.js';

export default function SolverPage({ nodes, members, methodName, solverResults, onBack, onEdit }) {
  if (!solverResults || !solverResults.success) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#e5e5e5', padding: 24, fontFamily: FONTS.mono }}>
        <button onClick={onBack} style={{
          background: 'none', border: '1px solid #4ade80', color: '#4ade80',
          fontSize: 13, fontFamily: FONTS.mono, fontWeight: 600,
          cursor: 'pointer', padding: '8px 16px', marginBottom: 24,
        }}>
          &larr; Back to Methods
        </button>
        <p>No results available. Go back and run the solver.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#e5e5e5', padding: 24, fontFamily: FONTS.mono }}>
      {/* Nav buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{
          background: 'none', border: '1px solid #4ade80', color: '#4ade80',
          fontSize: 13, fontFamily: FONTS.mono, fontWeight: 600,
          cursor: 'pointer', padding: '8px 16px',
        }}>
          &larr; Back to Methods
        </button>
        <button onClick={onEdit} style={{
          background: 'none', border: '1px solid #059669', color: '#059669',
          fontSize: 13, fontFamily: FONTS.mono, fontWeight: 600,
          cursor: 'pointer', padding: '8px 16px',
        }}>
          Edit Structure
        </button>
      </div>

      <h2 style={{ color: '#4ade80', marginBottom: 8 }}>Solver Results Loaded</h2>
      <p style={{ color: '#a3a3a3', marginBottom: 16 }}>Method: {methodName}</p>
      <p>Reactions: {solverResults.reactions.length} found</p>
      <p>Truss forces: {(solverResults.trussForces || []).length} found</p>

      <pre style={{ color: '#9ca3af', fontSize: 12, marginTop: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {JSON.stringify(solverResults.reactions, null, 2)}
      </pre>
      <pre style={{ color: '#9ca3af', fontSize: 12, marginTop: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {JSON.stringify(solverResults.trussForces, null, 2)}
      </pre>
    </div>
  );
}
