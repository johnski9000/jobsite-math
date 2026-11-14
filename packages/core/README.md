# jobsite-math

Small, zero-dependency TypeScript functions for the arithmetic US contractors do every day: roof pitch, hip roof area, concrete, gravel, brick, mortar, paint, drywall, deck boards, markup and hourly rate.

- US units, with the unit in every field name (`depthIn`, `lengthFt`, `bagYieldCuFt`), so there is no guessing.
- Product figures (bag yield, paint coverage, sheet size, gravel density) are inputs, never hidden constants.
- Quantities round up to whole bags, sheets and boards, without floating-point surprises (370 bricks at 37 per bag is 10 bags, not 11).
- Bad input throws a `CalcError` that names the field.
- ESM, typed, no runtime dependencies.

```sh
npm install jobsite-math
```

## Examples

```ts
import { roofPitch, concrete, paint, markup, MODULAR_BRICK, bricks } from 'jobsite-math';

roofPitch({ riseIn: 6, runIn: 12, planAreaSqFt: 1000 });
// { risePer12: 6, degrees: 26.57, percent: 50, slopeFactor: 1.118, slopeLengthIn: 13.42, slopedAreaSqFt: 1118.03, squares: 11.18 }

concrete({ shape: 'slab', lengthFt: 10, widthFt: 6, depthIn: 4, allowancePercent: 10, bagYieldCuFt: 0.6 });
// { cubicFeet: 20, cubicFeetWithAllowance: 22, cubicYards: 0.815, bags: 37 }

paint({ surface: { lengthFt: 12, widthFt: 10, heightFt: 8 }, openingsSqFt: 40, coats: 2, coverageSqFtPerGallon: 350 });
// { netAreaSqFt: 312, coatAreaSqFt: 624, gallons: 1.78, quarts: 7.13, wholeGallons: 2 }

markup({ costUsd: 100, percent: 25, mode: 'markup' });
// { priceUsd: 125, profitUsd: 25, marginPercent: 20, markupPercent: 25 }

bricks({ wallLengthFt: 10, wallHeightFt: 10, ...MODULAR_BRICK, allowancePercent: 10 });
// { netAreaSqFt: 100, bricksPerSqFt: 6.86, baseBricks: 686, bricks: 755 }
```

(Results are shown rounded here; the functions return full precision.)

## Functions and formulas

| Function | What it returns | Formula and limits |
|---|---|---|
| `roofPitch({ riseIn, runIn, planAreaSqFt? })` | pitch in 12, degrees, percent, slope factor, sloped area, squares | slope factor = √(1 + (rise/run)²). One plane, geometry only. |
| `hipRoof({ lengthFt, widthFt, overhangIn?, risePer12 })` | plan and roof area, squares, ridge, height, common and hip rafter line lengths | Rectangular plan, equal pitch on all four planes. Line lengths, not cut lengths. |
| `markup({ costUsd, percent, mode })` | price, profit, margin %, markup % | markup: cost × (1 + p). margin: cost ÷ (1 − p). Sales tax excluded. |
| `markupToMargin(m)`, `marginToMarkup(g)` | the other percentage | m ÷ (100 + m), g ÷ (100 − g) |
| `hourlyRate({ targetPayUsd, overheadUsd, reserveUsd?, workingWeeks, billableHoursPerWeek, profitMarginPercent? })` | required revenue, billable hours, rate, profit | (pay + overhead + reserve) ÷ (1 − margin) ÷ billable hours |
| `concrete({ shape: 'slab' \| 'round' \| 'tube', ... })` | cubic feet, with allowance, cubic yards, bags | Bags only when you give the bag label yield. Does not choose thickness, mix or reinforcing. |
| `gravel({ shape: 'rectangle' \| 'circle', ... })` | cubic feet, cubic yards, pounds, short tons | Weight only when you give your supplier's bulk density. |
| `bricks({ wallLengthFt, wallHeightFt, openingsSqFt?, brickLengthIn, brickHeightIn, jointIn, allowancePercent? })` | net area, bricks per sq ft, bricks | One wythe. `MODULAR_BRICK` is 7 5/8 × 2 1/4 in with a 3/8 in joint (6.86 per sq ft). |
| `mortar({ bricks, bricksPerBag, allowancePercent? })` | bags | Use the coverage printed on your bag. |
| `paint({ surface, openingsSqFt?, coats, coverageSqFtPerGallon, allowancePercent? })` | net area, coat area, US gallons, quarts, whole gallons | `surface` is a room `{ lengthFt, widthFt, heightFt, includeCeiling? }` or `{ areaSqFt }`. |
| `drywall({ surface, openingsSqFt?, layers?, sheetWidthFt, sheetLengthFt, allowancePercent? })` | sheets | Area based. Does not select a fire or sound rated assembly. |
| `deckBoards({ lengthFt, widthFt, boardWidthIn, gapIn, boardLengthFt, allowancePercent? })` | rows, pieces per row, boards, linear feet | Straight rectangular deck. No offcut reuse or staggered joints, so it can differ from a cut list. |

`allowancePercent` is always optional and defaults to 0. It is your waste or overage choice, not a recommendation.

## Errors

```ts
import { concrete, CalcError } from 'jobsite-math';
try {
  concrete({ shape: 'slab', lengthFt: 10, widthFt: -1, depthIn: 4 });
} catch (e) {
  if (e instanceof CalcError) console.log(e.field, e.code); // "widthFt" "out_of_range"
}
```

`CalcError` extends `RangeError`. Codes: `not_a_number`, `out_of_range`, `not_whole`, `bad_option`.

## Use with AI assistants

[`jobsite-math-mcp`](https://www.npmjs.com/package/jobsite-math-mcp) wraps these functions as a read-only MCP server, so Claude, Cursor and other MCP clients can call them instead of doing the arithmetic themselves.

## Not included, on purpose

Tax calculations (they change every year), HVAC load sizing (that is a Manual J job) and anything structural. These functions are planning estimates. Check product data sheets, local code and an engineer where it matters.

## Background

The same maths runs the free browser calculators at [contractorwebsiteshq.com/us/tools](https://contractorwebsiteshq.com/us/tools/).

## Licence

MIT. Copyright (c) 2026 JW Digital Services Ltd.
