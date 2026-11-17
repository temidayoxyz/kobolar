import { describe, expect, it } from 'vitest'
import { add, format, isPositive, multiply } from '../src/lib/money'

describe('money', () => {
  it('adds without floating point drift', () => {
    expect(add('0.1', '0.2')).toBe('0.3000')
  })

  it('multiplies quantities', () => {
    expect(multiply('19.99', 3)).toBe('59.9700')
  })

  it('detects positive amounts', () => {
    expect(isPositive('0.01')).toBe(true)
    expect(isPositive('0')).toBe(false)
  })

  it('formats NGN', () => {
    expect(format('1500.00', 'NGN')).toContain('₦')
  })
})
