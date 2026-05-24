import { describe, expect, it } from 'vitest'
import {
  OPERATIONAL_READING_WINDOW_MAX,
  medianLevels,
  regressionSlopeMPerDay,
  sliceLastForOperational,
} from './hydro-monitoring-operational-stats'

describe('medianLevels', () => {
  it('returns null for empty input', () => {
    expect(medianLevels([])).toBeNull()
  })

  it('returns the single value for one reading', () => {
    expect(medianLevels([3.2])).toBe(3.2)
  })

  it('averages the two middle values for even length', () => {
    expect(medianLevels([1, 2, 3, 4])).toBe(2.5)
  })

  it('returns middle value for odd length', () => {
    expect(medianLevels([10, 1, 5])).toBe(5)
  })

  it('is robust to one spike in last-five window', () => {
    const window = [1.0, 1.1, 1.0, 1.05, 99.0]
    expect(medianLevels(window)).toBe(1.05)
  })
})

describe('sliceLastForOperational', () => {
  it('returns all elements when fewer than max window', () => {
    expect(sliceLastForOperational([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('returns last N when list is longer than max', () => {
    const arr = Array.from({ length: 10 }, (_, i) => i)
    expect(sliceLastForOperational(arr)).toEqual([5, 6, 7, 8, 9])
    expect(sliceLastForOperational(arr).length).toBe(OPERATIONAL_READING_WINDOW_MAX)
  })

  it('returns empty for empty input', () => {
    expect(sliceLastForOperational([])).toEqual([])
  })
})

describe('regressionSlopeMPerDay', () => {
  const day = 86_400_000

  it('returns null for fewer than two points', () => {
    expect(regressionSlopeMPerDay([])).toBeNull()
    expect(regressionSlopeMPerDay([{ tMs: 0, y: 1 }])).toBeNull()
  })

  it('fits a line through two points (1 m rise per day)', () => {
    const slope = regressionSlopeMPerDay([
      { tMs: 0, y: 0 },
      { tMs: day, y: 1 },
    ])
    expect(slope).toBeCloseTo(1, 6)
  })

  it('returns null when all timestamps are identical (degenerate)', () => {
    expect(
      regressionSlopeMPerDay([
        { tMs: 1000, y: 1 },
        { tMs: 1000, y: 2 },
      ])
    ).toBeNull()
  })

  it('returns null if any coordinate is non-finite', () => {
    expect(
      regressionSlopeMPerDay([
        { tMs: 0, y: NaN },
        { tMs: day, y: 1 },
      ])
    ).toBeNull()
  })
})
