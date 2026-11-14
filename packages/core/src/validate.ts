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

/** A finite number greater than 0 and at most max. */
export function positive(field: string, value: unknown, max: number): number {
  num(field, value, -Infinity, max);
  if ((value as number) <= 0) throw new CalcError('out_of_range', field, `${field} must be greater than 0 and at most ${max}`);
  return value as number;
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

/** Optional boolean with a default. */
export function flag(field: string, value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new CalcError('not_a_boolean', field, `${field} must be true or false`);
  return value;
}

/** The input must be a plain object, and may only contain the listed keys. */
export function fields(field: string, value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new CalcError('bad_input', field, `${field} must be an object`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new CalcError('unexpected_field', key, `${key} is not used here; allowed: ${allowed.join(', ')}`);
  }
  return value as Record<string, unknown>;
}

/**
 * Rounds up to a whole unit, ignoring floating-point noise of about one part in
 * a trillion, so 10.000000000000002 bags is 10 bags, not 11.
 */
export function ceilUnits(value: number): number {
  const nearest = Math.round(value);
  return Math.abs(value - nearest) <= Math.abs(value) * 1e-12 ? nearest : Math.ceil(value);
}
