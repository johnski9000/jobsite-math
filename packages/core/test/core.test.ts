import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CalcError, roofPitch, hipRoof, markup, markupToMargin, marginToMarkup, hourlyRate,
  concrete, gravel, bricks, mortar, paint, drywall, deckBoards, MODULAR_BRICK,
} from '../src/index.ts';

const close = (a: number | null, b: number, eps = 1e-9) => assert.ok(a !== null && Math.abs(a - b) < eps, `${a} != ${b}`);

test('roof pitch converts rise and run, and sloped area only when plan area is given', () => {
  const r = roofPitch({ riseIn: 6, runIn: 12, planAreaSqFt: 1000 });
  assert.equal(r.risePer12, 6); assert.equal(r.percent, 50);
  close(r.degrees, 26.565051177, 1e-8); close(r.slopedAreaSqFt, 1118.03398875, 1e-7); close(r.squares, 11.1803398875, 1e-9);
  const flat = roofPitch({ riseIn: 0, runIn: 12 });
  assert.equal(flat.degrees, 0); assert.equal(flat.slopedAreaSqFt, null); assert.equal(flat.squares, null);
  for (const [riseIn, runIn] of [[1, 0], [-1, 12], [Infinity, 12], [1000, 0.01]]) assert.throws(() => roofPitch({ riseIn, runIn }), CalcError);
});

test('hip roof agrees with independent plane areas and is symmetric', () => {
  const r = hipRoof({ lengthFt: 24, widthFt: 16, risePer12: 6 });
  const slant = Math.sqrt(8 ** 2 + 4 ** 2);
  close(r.roofAreaSqFt, 2 * ((16 * slant) / 2) + 2 * (((24 + 8) / 2) * slant), 1e-10);
  assert.equal(r.ridgeFt, 8); assert.equal(r.hipRafterFt, 12); assert.equal(r.heightFt, 4);
  assert.deepEqual(hipRoof({ lengthFt: 16, widthFt: 24, risePer12: 6 }), r);
  const o = hipRoof({ lengthFt: 24, widthFt: 16, overhangIn: 12, risePer12: 6 });
  assert.equal(o.planAreaSqFt, 26 * 18); assert.equal(o.heightFt, 4.5); assert.equal(o.hipRafterFt, 13.5);
  assert.throws(() => hipRoof({ lengthFt: 24, widthFt: 16, overhangIn: -1, risePer12: 6 }), CalcError);
  assert.throws(() => hipRoof({ lengthFt: 24, widthFt: 16, risePer12: 0 }), CalcError);
});

test('markup and margin agree with each other', () => {
  const r = markup({ costUsd: 100, percent: 25, mode: 'markup' });
  assert.equal(r.priceUsd, 125); assert.equal(r.profitUsd, 25); assert.equal(r.marginPercent, 20);
  assert.equal(markup({ costUsd: 100, percent: 20, mode: 'margin' }).priceUsd, 125);
  assert.equal(markupToMargin(25), 20); assert.equal(marginToMarkup(20), 25);
  assert.throws(() => markup({ costUsd: 100, percent: 100, mode: 'margin' }), CalcError);
  // @ts-expect-error invalid mode
  assert.throws(() => markup({ costUsd: 100, percent: 10, mode: 'profit' }), CalcError);
});

test('hourly rate covers pay, overhead, reserve and margin over billable hours', () => {
  const r = hourlyRate({ targetPayUsd: 60000, overheadUsd: 20000, workingWeeks: 46, billableHoursPerWeek: 25 });
  assert.equal(r.billableHours, 1150); assert.equal(r.requiredRevenueUsd, 80000); close(r.hourlyRateUsd, 69.5652173913, 1e-9);
  assert.equal(hourlyRate({ targetPayUsd: 60000, overheadUsd: 20000, reserveUsd: 10000, workingWeeks: 45, billableHoursPerWeek: 20, profitMarginPercent: 10 }).requiredRevenueUsd, 100000);
  assert.throws(() => hourlyRate({ targetPayUsd: 1, overheadUsd: 0, workingWeeks: 0, billableHoursPerWeek: 20 }), CalcError);
});

test('concrete handles slabs, round columns and tubes, and rounds bags up', () => {
  const slab = concrete({ shape: 'slab', lengthFt: 10, widthFt: 6, depthIn: 4, bagYieldCuFt: 0.6 });
  assert.equal(slab.cubicFeet, 20); assert.equal(slab.bags, 34); assert.equal(slab.cubicYards, 20 / 27);
  assert.equal(concrete({ shape: 'slab', lengthFt: 10, widthFt: 6, depthIn: 4 }).bags, null);
  assert.equal(concrete({ shape: 'slab', lengthFt: 10, widthFt: 6, depthIn: 4, allowancePercent: 10 }).cubicFeetWithAllowance, 22);
  close(concrete({ shape: 'round', diameterIn: 12, heightIn: 12 }).cubicFeet, Math.PI / 4, 1e-12);
  close(concrete({ shape: 'tube', outerDiameterIn: 24, innerDiameterIn: 12, heightIn: 12 }).cubicFeet, Math.PI * 0.75, 1e-12);
  assert.throws(() => concrete({ shape: 'tube', outerDiameterIn: 12, innerDiameterIn: 12, heightIn: 12 }), CalcError);
  assert.throws(() => concrete({ shape: 'slab', lengthFt: 10, widthFt: 6, depthIn: 4, bagYieldCuFt: 0 }), CalcError);
});

test('gravel leaves weight unknown until density is supplied', () => {
  const r = gravel({ shape: 'rectangle', lengthFt: 10, widthFt: 10, depthIn: 3, allowancePercent: 10 });
  assert.equal(r.cubicFeet, 25); assert.equal(r.cubicFeetWithAllowance, 27.5); assert.equal(r.pounds, null); assert.equal(r.shortTons, null);
  const m = gravel({ shape: 'rectangle', lengthFt: 10, widthFt: 10, depthIn: 3, allowancePercent: 10, densityLbPerCuFt: 100 });
  assert.equal(m.pounds, 2750); assert.equal(m.shortTons, 1.375);
  close(gravel({ shape: 'circle', diameterFt: 10, depthIn: 12 }).cubicFeet, Math.PI * 25, 1e-10);
  assert.throws(() => gravel({ shape: 'rectangle', lengthFt: 10, widthFt: 10, depthIn: 3, densityLbPerCuFt: 0 }), CalcError);
});

test('bricks subtract openings and apply the allowance once', () => {
  const r = bricks({ wallLengthFt: 10, wallHeightFt: 10, ...MODULAR_BRICK, allowancePercent: 10 });
  assert.equal(r.baseBricks, 686); assert.equal(r.bricks, 755); close(r.bricksPerSqFt, 144 / 21);
  const opened = bricks({ wallLengthFt: 10, wallHeightFt: 10, openingsSqFt: 20, ...MODULAR_BRICK });
  assert.equal(opened.netAreaSqFt, 80); assert.equal(opened.baseBricks, 549); assert.equal(opened.bricks, 549);
  assert.equal(bricks({ wallLengthFt: 10, wallHeightFt: 10, openingsSqFt: 100, ...MODULAR_BRICK, allowancePercent: 10 }).bricks, 0);
  assert.throws(() => bricks({ wallLengthFt: 10, wallHeightFt: 10, openingsSqFt: 101, ...MODULAR_BRICK }), CalcError);
});

test('mortar rounds up without an extra bag from floating-point error', () => {
  assert.deepEqual(mortar({ bricks: 370, bricksPerBag: 37, allowancePercent: 10 }), { baseBags: 10, bags: 11 });
  assert.equal(mortar({ bricks: 371, bricksPerBag: 37 }).bags, 11);
  assert.equal(mortar({ bricks: 0, bricksPerBag: 37 }).bags, 0);
  assert.throws(() => mortar({ bricks: 1.5, bricksPerBag: 37 }), CalcError);
  assert.throws(() => mortar({ bricks: 370, bricksPerBag: 0 }), CalcError);
});

test('paint applies openings, coats and allowance once', () => {
  const room = { lengthFt: 12, widthFt: 10, heightFt: 8 };
  const r = paint({ surface: room, openingsSqFt: 40, coats: 2, coverageSqFtPerGallon: 350, allowancePercent: 10 });
  assert.equal(r.netAreaSqFt, 312); assert.equal(r.coatAreaSqFt, 624); close(r.gallons, 1.961142857142857, 1e-12); assert.equal(r.wholeGallons, 2);
  assert.equal(paint({ surface: { areaSqFt: 352 }, openingsSqFt: 40, coats: 2, coverageSqFtPerGallon: 350, allowancePercent: 10 }).gallons, r.gallons);
  assert.equal(paint({ surface: { ...room, includeCeiling: true }, openingsSqFt: 40, coats: 1, coverageSqFtPerGallon: 350 }).netAreaSqFt, 432);
  assert.throws(() => paint({ surface: room, openingsSqFt: 353, coats: 1, coverageSqFtPerGallon: 350 }), CalcError);
  assert.throws(() => paint({ surface: room, coats: 1.5, coverageSqFtPerGallon: 350 }), CalcError);
});

test('drywall counts sheets for selected surfaces and layers', () => {
  const room = { lengthFt: 12, widthFt: 10, heightFt: 8, includeCeiling: true };
  const r = drywall({ surface: room, openingsSqFt: 40, sheetWidthFt: 4, sheetLengthFt: 8, allowancePercent: 10 });
  assert.equal(r.netAreaSqFt, 432); assert.equal(r.sheetAreaSqFt, 32); assert.equal(r.baseSheets, 14); assert.equal(r.sheets, 15);
  assert.equal(drywall({ surface: { areaSqFt: 472 }, openingsSqFt: 40, layers: 2, sheetWidthFt: 4, sheetLengthFt: 8 }).sheets, 27);
  assert.equal(drywall({ surface: { ...room, includeCeiling: false }, openingsSqFt: 40, sheetWidthFt: 4, sheetLengthFt: 8, allowancePercent: 10 }).sheets, 11);
  assert.throws(() => drywall({ surface: room, sheetWidthFt: 0, sheetLengthFt: 8 }), CalcError);
});

test('deck rows include gaps and whole stock pieces', () => {
  const r = deckBoards({ lengthFt: 12, widthFt: 10, boardWidthIn: 5.5, gapIn: 0.1875, boardLengthFt: 16, allowancePercent: 10 });
  assert.equal(r.rows, 22); assert.equal(r.baseBoards, 22); assert.equal(r.boards, 25); assert.equal(r.purchasedLinearFt, 400);
  assert.equal(deckBoards({ lengthFt: 20, widthFt: 10, boardWidthIn: 5.5, gapIn: 0.1875, boardLengthFt: 16 }).baseBoards, 44);
  assert.equal(deckBoards({ lengthFt: 1, widthFt: 1, boardWidthIn: 6, gapIn: 0, boardLengthFt: 1 }).rows, 2);
  assert.throws(() => deckBoards({ lengthFt: 12, widthFt: 10, boardWidthIn: 0, gapIn: 0.1875, boardLengthFt: 16 }), CalcError);
});

test('errors name the field that failed', () => {
  try { concrete({ shape: 'slab', lengthFt: 10, widthFt: -1, depthIn: 4 }); assert.fail('should throw'); }
  catch (e) { assert.ok(e instanceof CalcError); assert.equal(e.field, 'widthFt'); assert.equal(e.code, 'out_of_range'); assert.ok(e instanceof RangeError); }
  // @ts-expect-error missing field
  try { gravel({ shape: 'rectangle', lengthFt: 10, depthIn: 3 }); assert.fail('should throw'); }
  catch (e) { assert.ok(e instanceof CalcError); assert.equal(e.field, 'widthFt'); assert.equal(e.code, 'not_a_number'); }
});
