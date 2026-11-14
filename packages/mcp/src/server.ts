import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import {
  CalcError, roofPitch, hipRoof, markup, hourlyRate, concrete, gravel, bricks, mortar, paint, drywall, deckBoards,
} from 'jobsite-math';

export const SERVER_NAME = 'jobsite-math';
export const SERVER_VERSION = '0.1.0';

const INSTRUCTIONS =
  'Deterministic US-unit construction and pricing calculators. Use them instead of doing the arithmetic yourself. ' +
  'Ask the user for any missing dimension or product figure (bag yield, paint coverage, sheet size, density) rather than guessing. ' +
  'Results are planning estimates, not structural design, code compliance, HVAC load calculations or tax advice. ' +
  'The tools are read-only, make no network calls and store nothing.';

const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const pct = (d: string) => z.number().min(0).max(100).optional().describe(d);
const allowance = pct('Extra percentage for waste or overage. Omit for none; this is not a recommended rate.');

type Handler<T> = (args: T) => unknown;

function ok(value: unknown) {
  const structuredContent = value as Record<string, unknown>;
  return { structuredContent, content: [{ type: 'text' as const, text: JSON.stringify(value) }] };
}
function fail(error: unknown) {
  const text = error instanceof CalcError ? `Invalid input for ${error.field}: ${error.message}` : 'The calculation could not be completed.';
  return { isError: true, content: [{ type: 'text' as const, text }] };
}

/** Builds the MCP server with one read-only tool per calculator. */
export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }, { instructions: INSTRUCTIONS });
  const tool = <S extends z.ZodRawShape>(name: string, title: string, description: string, shape: S, run: Handler<z.infer<z.ZodObject<S>>>) => {
    server.registerTool(name, { title, description, annotations, inputSchema: z.object(shape).strict() }, async (args: z.infer<z.ZodObject<S>>) => {
      try { return ok(run(args)); } catch (error) { return fail(error); }
    });
  };

  tool('roof_pitch', 'Roof pitch', 'Convert rise and run in inches to pitch (x in 12), angle, percent grade and slope factor. Optionally convert plan area to sloped area and squares.', {
    riseIn: z.number().describe('Vertical rise in inches'),
    runIn: z.number().describe('Horizontal run in inches; use 12 for an x-in-12 pitch'),
    planAreaSqFt: z.number().optional().describe('Optional horizontal plan area in square feet'),
  }, roofPitch);

  tool('hip_roof', 'Hip roof area', 'Area, squares, ridge length and rafter line lengths of a simple rectangular hip roof with equal pitch on all planes.', {
    lengthFt: z.number().describe('Building length in feet'),
    widthFt: z.number().describe('Building width in feet'),
    overhangIn: z.number().optional().describe('Eave overhang in inches on every side'),
    risePer12: z.number().describe('Pitch as rise per 12 inches of run'),
  }, hipRoof);

  tool('markup', 'Markup or margin price', 'Selling price, profit, margin and markup from a USD cost and a markup or gross-margin percentage. Excludes sales tax.', {
    costUsd: z.number().describe('Job cost in US dollars'),
    percent: z.number().describe('Markup or margin percentage'),
    mode: z.enum(['markup', 'margin']).describe('markup is a percent of cost; margin is a percent of selling price'),
  }, markup);

  tool('hourly_rate', 'Contractor hourly rate', 'Hourly rate that covers yearly pay, overhead, an optional reserve and profit margin over billable hours.', {
    targetPayUsd: z.number().describe('Yearly pay wanted, USD'),
    overheadUsd: z.number().describe('Yearly overhead, USD'),
    reserveUsd: z.number().optional().describe('Yearly reserve, USD'),
    workingWeeks: z.number().describe('Billable weeks per year'),
    billableHoursPerWeek: z.number().describe('Billable hours per working week'),
    profitMarginPercent: pct('Profit margin percent on top of costs'),
  }, hourlyRate);

  tool('concrete', 'Concrete volume and bags', 'Concrete volume for a slab (length, width, depth), a round column (diameter, height) or a tube (outer and inner diameter, height), with optional allowance and bag count at the bag label yield.', {
    shape: z.enum(['slab', 'round', 'tube']),
    lengthFt: z.number().optional().describe('Slab length in feet'),
    widthFt: z.number().optional().describe('Slab width in feet'),
    depthIn: z.number().optional().describe('Slab depth in inches'),
    diameterIn: z.number().optional().describe('Round column diameter in inches'),
    outerDiameterIn: z.number().optional().describe('Tube outer diameter in inches'),
    innerDiameterIn: z.number().optional().describe('Tube inner diameter in inches'),
    heightIn: z.number().optional().describe('Column or tube height in inches'),
    allowancePercent: allowance,
    bagYieldCuFt: z.number().optional().describe('Cubic feet per bag from the bag label; omit for no bag count'),
  }, (a) => concrete(a as Parameters<typeof concrete>[0]));

  tool('gravel', 'Gravel volume and weight', 'Gravel or aggregate volume for a rectangle or circle. Weight only when the supplier bulk density is given.', {
    shape: z.enum(['rectangle', 'circle']),
    lengthFt: z.number().optional(), widthFt: z.number().optional(),
    diameterFt: z.number().optional().describe('Circle diameter in feet'),
    depthIn: z.number().describe('Depth in inches'),
    allowancePercent: allowance,
    densityLbPerCuFt: z.number().optional().describe('Supplier bulk density in lb per cubic foot'),
  }, (a) => gravel(a as Parameters<typeof gravel>[0]));

  tool('bricks', 'Brick count', 'Bricks for one wythe of a wall face. US modular brick is 7.625 x 2.25 in with a 0.375 in joint.', {
    wallLengthFt: z.number(), wallHeightFt: z.number(),
    openingsSqFt: z.number().optional().describe('Window and door area to subtract'),
    brickLengthIn: z.number(), brickHeightIn: z.number(), jointIn: z.number(),
    allowancePercent: allowance,
  }, bricks);

  tool('mortar', 'Mortar bags', 'Mortar bags for a whole number of bricks at the bag label coverage (bricks per bag).', {
    bricks: z.number().int(), bricksPerBag: z.number(), allowancePercent: allowance,
  }, mortar);

  const surface = z.union([
    z.object({ lengthFt: z.number(), widthFt: z.number(), heightFt: z.number(), includeCeiling: z.boolean().optional() }).strict(),
    z.object({ areaSqFt: z.number() }).strict(),
  ]).describe('A rectangular room (walls, optionally ceiling) or a measured area in square feet');

  tool('paint', 'Paint gallons', 'US gallons of paint for a room or area, coats and the product label coverage.', {
    surface, openingsSqFt: z.number().optional(), coats: z.number().int(),
    coverageSqFtPerGallon: z.number().describe('Coverage per gallon from the label'), allowancePercent: allowance,
  }, paint);

  tool('drywall', 'Drywall sheets', 'Drywall sheets for a room or area. Does not select a rated assembly.', {
    surface, openingsSqFt: z.number().optional(), layers: z.number().int().optional(),
    sheetWidthFt: z.number(), sheetLengthFt: z.number(), allowancePercent: allowance,
  }, drywall);

  tool('deck_boards', 'Deck boards', 'Surface boards for a straight rectangular deck, with no offcut reuse.', {
    lengthFt: z.number().describe('Deck length in the board direction, feet'),
    widthFt: z.number().describe('Deck width across the boards, feet'),
    boardWidthIn: z.number().describe('Actual board width in inches'),
    gapIn: z.number().describe('Gap between boards in inches'),
    boardLengthFt: z.number().describe('Stock board length in feet'),
    allowancePercent: allowance,
  }, deckBoards);

  return server;
}
