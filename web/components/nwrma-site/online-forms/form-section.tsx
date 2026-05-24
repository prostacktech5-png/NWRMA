import type { ReactNode } from 'react'

export function FormSection({
  title,
  children,
  id,
}: {
  title: string
  id?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="nwrma-form-section">
      <h3 className="nwrma-form-section-title">{title}</h3>
      <div className="nwrma-form-section-body">{children}</div>
    </section>
  )
}

export function FormProse({ children }: { children: ReactNode }) {
  return <div className="nwrma-form-prose">{children}</div>
}
