import Big from 'big.js'

export type Money = { amount: string; currency: string }

/** All money arithmetic goes through Big.js, never JS floats. */
export function add(a: string, b: string): string {
  return new Big(a).plus(b).toFixed(4)
}

export function multiply(amount: string, quantity: number): string {
  return new Big(amount).times(quantity).toFixed(4)
}

export function isPositive(amount: string): boolean {
  return new Big(amount).gt(0)
}

export function format(amount: string, currency: string, locale = 'en-NG'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(amount))
  } catch {
    return `${currency} ${amount}`
  }
}
