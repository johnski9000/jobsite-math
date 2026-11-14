/** Error thrown for any input outside a calculator's stated limits. */
export class CalcError extends RangeError {
  readonly code: string;
  readonly field: string;
  constructor(code: string, field: string, message: string) {
    super(message);
    this.name = 'CalcError';
    this.code = code;
    this.field = field;
  }
}

/** Checks that a value is a finite number inside [min, max] and returns it. */
export function num(field: string, value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new CalcError('not_a_number', field, `${field} must be a finite number`);
  }
  if (value < min || value > max) {
    throw new CalcError('out_of_range', field, `${field} must be between ${min} and ${max}`);
  }
  return value;
}

/** Like num, but the value must also be a whole number. */
export function whole(field: string, value: unknown, min: number, max: number): number {
  num(field, value, min, max);
  if (!Number.isInteger(value)) throw new CalcError('not_whole', field, `${field} must be a whole number`);
  return value as number;
}

/** Optional number with a default. */
export function opt(field: string, value: unknown, min: number, max: number, fallback: number): number {
  return value === undefined ? fallback : num(field, value, min, max);
}

/**
 * Rounds up to a whole unit, ignoring floating-point noise below one billionth,
 * so 10.000000000000002 bags is 10 bags, not 11.
 */
export const ceilUnits = (value: number): number => Math.ceil(Math.round(value * 1e9) / 1e9);
