import React from 'react';
import FBDRenderer from './FBDRenderer.jsx';
import EquationBlock from './EquationBlock.jsx';

export default function SolutionStep({ step, stepNumber, inTrussGrid }) {
  const { title, fbd, notes, equations, trussTable } = step;

  const containerStyle = inTrussGrid
    ? { background: '#111111', border: '1px solid #2a2a2a', borderRadius: 8, padding: 16 }
    : { marginBottom: 40 };

  return (
    <div className="solution-step" style={containerStyle}>
      <div className="step-header">
        {stepNumber != null && (
          <span className="step-number">Step {stepNumber}</span>
        )}
        <span className="step-title">{title}</span>
      </div>

      {fbd && (
        <div className="step-fbd">
          <FBDRenderer {...fbd} />
        </div>
      )}

      {notes && (
        <div className="step-notes">{notes}</div>
      )}

      {equations && equations.length > 0 && (
        <EquationBlock equations={equations} />
      )}

      {trussTable && <TrussResultsTable trussForces={trussTable} />}
    </div>
  );
}

function TrussResultsTable({ trussForces }) {
  if (!trussForces || trussForces.length === 0) return null;
  return (
    <table className="truss-results-table">
      <thead>
        <tr>
          <th>Member</th>
          <th>Force</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        {trussForces.map((tf, i) => {
          const cls =
            tf.classification === 'Tension (T)' ? 'force-tension' :
            tf.classification === 'Compression (C)' ? 'force-compression' :
            'force-zero';
          return (
            <tr key={i}>
              <td>{tf.startLabel}{tf.endLabel}</td>
              <td className={cls}>{Math.abs(tf.force).toFixed(2)} kN</td>
              <td className={cls}>{tf.classification}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
