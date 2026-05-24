import type { ReactNode } from 'react'

/** Inline bold matching official PDF emphasis */
export function IB({ children }: { children: ReactNode }) {
  return <strong>{children}</strong>
}

/** Entire paragraph bold (PDF all-bold lines) */
export function InstructionBoldP({ children }: { children: ReactNode }) {
  return (
    <p className="nwrma-instruction-emphasis">
      <strong>{children}</strong>
    </p>
  )
}

export function InstructionP({ children }: { children: ReactNode }) {
  return <p>{children}</p>
}
