import { useEffect, useRef } from 'react'

export default function EquationBlock({ equations }) {
  const ref = useRef(null)

  useEffect(() => {
    let retryId = null

    const typeset = () => {
      if (!ref.current) {
        return
      }

      if (!window.MathJax?.typesetPromise) {
        retryId = window.setTimeout(typeset, 50)
        return
      }

      if (window.MathJax.typesetClear) {
        window.MathJax.typesetClear([ref.current])
      }

      window.MathJax.typesetPromise([ref.current]).catch(() => {})
    }

    typeset()

    return () => {
      if (retryId) {
        window.clearTimeout(retryId)
      }
    }
  }, [equations])

  if (!equations?.length) {
    return null
  }

  const groups = []
  let current = []

  equations.forEach((line) => {
    if (line === '') {
      if (current.length) {
        groups.push(current)
        current = []
      }
      return
    }

    current.push(line)
  })

  if (current.length) {
    groups.push(current)
  }

  return (
    <div ref={ref} className="equation-block">
      {groups.map((group, index) => {
        const latex = group.length === 1
          ? `\\[${group[0]}\\]`
          : `\\[\\begin{gathered}${group.join(' \\\\ ')}\\end{gathered}\\]`

        return (
          <div
            key={index}
            className={index < groups.length - 1 ? 'equation-group-spaced' : undefined}
            dangerouslySetInnerHTML={{ __html: latex }}
          />
        )
      })}
    </div>
  )
}
