import { CalcError, num, opt } from './validate.ts';

export interface RoofPitchInput {
  /** Vertical rise in inches. */
  riseIn: number;
  /** Horizontal run in inches. Use 12 to enter an "x in 12" pitch as the rise. */
  runIn: number;
  /** Optional horizontal (plan) area in square feet, converted to sloped area. */
  planAreaSqFt?: number;
}

export interface RoofPitchResult {
  /** Rise per 12 inches of run, the "x" in x:12. */
  risePer12: number;
  degrees: number;
  percent: number;
  /** Multiply a horizontal length or area by this to get the sloped value. */
  slopeFactor: number;
  /** Sloped distance for the entered rise and run, in inches. */
  slopeLengthIn: number;
  slopedAreaSqFt: number | null;
  /** Roofing squares (100 sq ft) of sloped area. */
  squares: number | null;
}

/** Converts rise and run into pitch, angle, percent grade and slope factor. Geometry only. */
export function roofPitch(input: RoofPitchInput): RoofPitchResult {
  const riseIn = num('riseIn', input.riseIn, 0, 10000);
  const runIn = num('runIn', input.runIn, Number.EPSILON, 10000);
  const plan = input.planAreaSqFt === undefined ? null : num('planAreaSqFt', input.planAreaSqFt, 0, 1e9);
  const ratio = riseIn / runIn;
  if (ratio > 100) throw new CalcError('out_of_range', 'riseIn', 'rise must be no more than 100 times the run');
  const slopeFactor = Math.hypot(1, ratio);
  const slopedAreaSqFt = plan === null ? null : plan * slopeFactor;
  return {
    risePer12: ratio * 12,
    degrees: (Math.atan(ratio) * 180) / Math.PI,
    percent: ratio * 100,
    slopeFactor,
    slopeLengthIn: Math.hypot(riseIn, runIn),
    slopedAreaSqFt,
    squares: slopedAreaSqFt === null ? null : slopedAreaSqFt / 100,
  };
}

export interface HipRoofInput {
  /** Building length in feet (either side; the longer side is used as the ridge direction). */
  lengthFt: number;
  widthFt: number;
  /** Eave overhang in inches, added on every side. Default 0. */
  overhangIn?: number;
  /** Pitch as rise per 12 inches of run, the same on all four planes. */
  risePer12: number;
}

export interface HipRoofResult {
  planAreaSqFt: number;
  roofAreaSqFt: number;
  squares: number;
  ridgeFt: number;
  /** Ridge height above the plate line, in feet. */
  heightFt: number;
  /** Common rafter line length (run plus overhang), not a cut length. */
  commonRafterFt: number;
  /** Hip rafter line length, not a cut length. */
  hipRafterFt: number;
}

/** Area and line lengths of a simple rectangular hip roof with equal pitch on all planes. */
export function hipRoof(input: HipRoofInput): HipRoofResult {
  const length = num('lengthFt', input.lengthFt, 0.1, 10000);
  const width = num('widthFt', input.widthFt, 0.1, 10000);
  const overhangIn = opt('overhangIn', input.overhangIn, 0, 120, 0);
  const risePer12 = num('risePer12', input.risePer12, 0.1, 24);
  const long = Math.max(length, width) + overhangIn / 6;
  const short = Math.min(length, width) + overhangIn / 6;
  const run = short / 2, slope = risePer12 / 12, height = run * slope;
  const roofAreaSqFt = long * short * Math.hypot(1, slope);
  return {
    planAreaSqFt: long * short,
    roofAreaSqFt,
    squares: roofAreaSqFt / 100,
    ridgeFt: long - short,
    heightFt: height,
    commonRafterFt: Math.hypot(run, height),
    hipRafterFt: Math.hypot(run, run, height),
  };
}
