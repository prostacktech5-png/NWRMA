import { describe, expect, it } from 'vitest'
import { isPublicSitePath } from './public-paths'

describe('isPublicSitePath', () => {
  it('allows public marketing routes', () => {
    expect(isPublicSitePath('/')).toBe(true)
    expect(isPublicSitePath('/about')).toBe(true)
    expect(isPublicSitePath('/departments')).toBe(true)
    expect(isPublicSitePath('/projects')).toBe(true)
    expect(isPublicSitePath('/departments/finance')).toBe(true)
    expect(isPublicSitePath('/water-quality/portal')).toBe(true)
    expect(isPublicSitePath('/borehole-licensing')).toBe(true)
  })

  it('denies ERP routes', () => {
    expect(isPublicSitePath('/dashboard')).toBe(false)
    expect(isPublicSitePath('/finance/requisitions')).toBe(false)
    expect(isPublicSitePath('/hydrological')).toBe(false)
  })
})
