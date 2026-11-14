import { CalcError, ceilUnits, num, opt, whole } from './validate.ts';

const allowance = (value: unknown, field = 'allowancePercent') => opt(field, value, 0, 100, 0);

// Concrete ----------------------------------------------------------------

export type ConcreteInput =
  | { shape: 'slab'; lengthFt: number; widthFt: number; depthIn: number; allowancePercent?: number; bagYieldCuFt?: number }
  | { shape: 'round'; diameterIn: number; heightIn: number; allowancePercent?: number; bagYieldCuFt?: number }
  | { shape: 'tube'; outerDiameterIn: number; innerDiameterIn: number; heightIn: number; allowancePercent?: number; bagYieldCuFt?: number };

export interface ConcreteResult {
  cubicFeet: number;
  cubicFeetWithAllowance: number;
  cubicYards: number;
  /** Bags needed at the entered yield, rounded up. Null when no bag yield is given. */
  bags: number | null;
}

/**
 * Concrete volume for a slab, a round column or a hollow tube, with an optional
 * allowance and bag count. Check the bag label for its yield (for example, many
 * 80 lb bags state about 0.6 cubic feet). Does not choose thickness, mix or reinforcing.
 */
export function concrete(input: ConcreteInput): ConcreteResult {
  const extra = allowance(input.allowancePercent);
  const yieldCuFt = input.bagYieldCuFt === undefined ? null : num('bagYieldCuFt', input.bagYieldCuFt, 0.001, 1000);
  let cubicFeet: number;
  if (input.shape === 'slab') {
    const area = num('lengthFt', input.lengthFt, 0.01, 10000) * num('widthFt', input.widthFt, 0.01, 10000);
    cubicFeet = (area * num('depthIn', input.depthIn, 0.01, 1200)) / 12;
  } else if (input.shape === 'round') {
    const d = num('diameterIn', input.diameterIn, 0.01, 12000);
    cubicFeet = ((Math.PI * d ** 2) / 576) * (num('heightIn', input.heightIn, 0.01, 1200) / 12);
  } else if (input.shape === 'tube') {
    const outer = num('outerDiameterIn', input.outerDiameterIn, 0.01, 12000);
    const inner = num('innerDiameterIn', input.innerDiameterIn, 0, outer);
    if (inner >= outer) throw new CalcError('out_of_range', 'innerDiameterIn', 'innerDiameterIn must be smaller than outerDiameterIn');
    cubicFeet = ((Math.PI * (outer ** 2 - inner ** 2)) / 576) * (num('heightIn', input.heightIn, 0.01, 1200) / 12);
  } else {
    throw new CalcError('bad_option', 'shape', 'shape must be "slab", "round" or "tube"');
  }
  const cubicFeetWithAllowance = (cubicFeet * (100 + extra)) / 100;
  return {
    cubicFeet,
    cubicFeetWithAllowance,
    cubicYards: cubicFeetWithAllowance / 27,
    bags: yieldCuFt === null ? null : ceilUnits((cubicFeet * (100 + extra)) / (100 * yieldCuFt)),
  };
}

// Gravel ------------------------------------------------------------------

export type GravelInput =
  | { shape: 'rectangle'; lengthFt: number; widthFt: number; depthIn: number; allowancePercent?: number; densityLbPerCuFt?: number }
  | { shape: 'circle'; diameterFt: number; depthIn: number; allowancePercent?: number; densityLbPerCuFt?: number };

export interface GravelResult {
  cubicFeet: number;
  cubicFeetWithAllowance: number;
  cubicYards: number;
  /** Weight at the entered density. Null when no density is given: gravel density varies by material and supplier. */
  pounds: number | null;
  /** US short tons of 2,000 lb. */
  shortTons: number | null;
}

/** Gravel or aggregate volume, and weight only when you supply your supplier's bulk density. */
export function gravel(input: GravelInput): GravelResult {
  const extra = allowance(input.allowancePercent);
  const density = input.densityLbPerCuFt === undefined ? null : num('densityLbPerCuFt', input.densityLbPerCuFt, 0.001, 500);
  let area: number;
  if (input.shape === 'rectangle') area = num('lengthFt', input.lengthFt, 0.01, 10000) * num('widthFt', input.widthFt, 0.01, 10000);
  else if (input.shape === 'circle') area = Math.PI * (num('diameterFt', input.diameterFt, 0.01, 10000) / 2) ** 2;
  else throw new CalcError('bad_option', 'shape', 'shape must be "rectangle" or "circle"');
  const cubicFeet = (area * num('depthIn', input.depthIn, 0.01, 1200)) / 12;
  const cubicFeetWithAllowance = (cubicFeet * (100 + extra)) / 100;
  const pounds = density === null ? null : cubicFeetWithAllowance * density;
  return { cubicFeet, cubicFeetWithAllowance, cubicYards: cubicFeetWithAllowance / 27, pounds, shortTons: pounds === null ? null : pounds / 2000 };
}

// Brick and mortar ----------------------------------------------------------

/** US modular brick: 7 5/8 x 2 1/4 inch face with a 3/8 inch mortar joint. */
export const MODULAR_BRICK = { brickLengthIn: 7.625, brickHeightIn: 2.25, jointIn: 0.375 } as const;

export interface BricksInput {
  wallLengthFt: number;
  wallHeightFt: number;
  /** Area of windows and doors to subtract, sq ft. Default 0. */
  openingsSqFt?: number;
  brickLengthIn: number;
  brickHeightIn: number;
  jointIn: number;
  allowancePercent?: number;
}

export interface BricksResult {
  netAreaSqFt: number;
  bricksPerSqFt: number;
  baseBricks: number;
  bricks: number;
}

/** Bricks for one wythe of a wall face. Use MODULAR_BRICK for standard US modular brick. */
export function bricks(input: BricksInput): BricksResult {
  const length = num('wallLengthFt', input.wallLengthFt, 0.1, 10000);
  const height = num('wallHeightFt', input.wallHeightFt, 0.1, 10000);
  const openings = opt('openingsSqFt', input.openingsSqFt, 0, length * height, 0);
  const module = (num('brickLengthIn', input.brickLengthIn, 0.1, 48) + num('jointIn', input.jointIn, 0, 2)) * (num('brickHeightIn', input.brickHeightIn, 0.1, 48) + input.jointIn);
  const extra = allowance(input.allowancePercent);
  const netAreaSqFt = length * height - openings;
  return {
    netAreaSqFt,
    bricksPerSqFt: 144 / module,
    baseBricks: ceilUnits((netAreaSqFt * 144) / module),
    bricks: ceilUnits((netAreaSqFt * 144 * (100 + extra)) / (module * 100)),
  };
}

export interface MortarInput {
  /** Whole number of bricks to lay. */
  bricks: number;
  /** Bricks laid per bag, from the bag label or your own records. */
  bricksPerBag: number;
  allowancePercent?: number;
}

/** Mortar bags for a brick count at your bag's stated coverage. */
export function mortar(input: MortarInput): { baseBags: number; bags: number } {
  const count = whole('bricks', input.bricks, 0, 1e9);
  const perBag = num('bricksPerBag', input.bricksPerBag, 0.1, 1e6);
  const extra = allowance(input.allowancePercent);
  return { baseBags: ceilUnits(count / perBag), bags: ceilUnits((count * (100 + extra)) / (perBag * 100)) };
}

// Paint and drywall -----------------------------------------------------------

/** A rectangular room (walls, optionally the ceiling) or an area you have already measured. */
export type Surface = { lengthFt: number; widthFt: number; heightFt: number; includeCeiling?: boolean } | { areaSqFt: number };

function surfaceArea(surface: Surface, openingsSqFt: unknown): number {
  if (surface === null || typeof surface !== 'object') throw new CalcError('bad_option', 'surface', 'surface must be a room or an area');
  let gross: number;
  if ('areaSqFt' in surface) gross = num('surface.areaSqFt', surface.areaSqFt, 0, 1e9);
  else {
    const l = num('surface.lengthFt', surface.lengthFt, 0.1, 10000);
    const w = num('surface.widthFt', surface.widthFt, 0.1, 10000);
    const h = num('surface.heightFt', surface.heightFt, 0.1, 1000);
    gross = 2 * (l + w) * h + (surface.includeCeiling ? l * w : 0);
  }
  return gross - opt('openingsSqFt', openingsSqFt, 0, gross, 0);
}

export interface PaintInput {
  surface: Surface;
  openingsSqFt?: number;
  coats: number;
  /** Coverage per US gallon from the product label, sq ft. Often 350 to 400 for wall paint. */
  coverageSqFtPerGallon: number;
  allowancePercent?: number;
}

export interface PaintResult {
  netAreaSqFt: number;
  coatAreaSqFt: number;
  gallons: number;
  quarts: number;
  wholeGallons: number;
}

/** US gallons of paint for a room or area at the product's stated coverage. */
export function paint(input: PaintInput): PaintResult {
  const coats = whole('coats', input.coats, 1, 10);
  const coverage = num('coverageSqFtPerGallon', input.coverageSqFtPerGallon, 1, 10000);
  const extra = allowance(input.allowancePercent);
  const netAreaSqFt = surfaceArea(input.surface, input.openingsSqFt);
  const coatAreaSqFt = netAreaSqFt * coats;
  const gallons = (coatAreaSqFt * (100 + extra)) / (coverage * 100);
  return { netAreaSqFt, coatAreaSqFt, gallons, quarts: gallons * 4, wholeGallons: ceilUnits(gallons) };
}

export interface DrywallInput {
  surface: Surface;
  openingsSqFt?: number;
  /** Layers of board. Default 1. */
  layers?: number;
  /** Sheet size in feet, for example 4 x 8 or 4 x 12. */
  sheetWidthFt: number;
  sheetLengthFt: number;
  allowancePercent?: number;
}

export interface DrywallResult {
  netAreaSqFt: number;
  layerAreaSqFt: number;
  sheetAreaSqFt: number;
  baseSheets: number;
  sheets: number;
}

/** Drywall sheets for a room or area. Does not select a fire or sound rated assembly. */
export function drywall(input: DrywallInput): DrywallResult {
  const layers = input.layers === undefined ? 1 : whole('layers', input.layers, 1, 4);
  const sheetAreaSqFt = num('sheetWidthFt', input.sheetWidthFt, 1, 10) * num('sheetLengthFt', input.sheetLengthFt, 1, 20);
  const extra = allowance(input.allowancePercent);
  const netAreaSqFt = surfaceArea(input.surface, input.openingsSqFt);
  const layerAreaSqFt = netAreaSqFt * layers;
  return {
    netAreaSqFt,
    layerAreaSqFt,
    sheetAreaSqFt,
    baseSheets: ceilUnits(layerAreaSqFt / sheetAreaSqFt),
    sheets: ceilUnits((layerAreaSqFt * (100 + extra)) / (sheetAreaSqFt * 100)),
  };
}

// Deck --------------------------------------------------------------------

export interface DeckBoardsInput {
  /** Deck length in feet, the direction the boards run. */
  lengthFt: number;
  /** Deck width in feet, across the boards. */
  widthFt: number;
  /** Actual board width in inches (a 5/4 x 6 board is about 5.5). */
  boardWidthIn: number;
  /** Gap between boards in inches. */
  gapIn: number;
  /** Stock board length in feet. */
  boardLengthFt: number;
  allowancePercent?: number;
}

export interface DeckBoardsResult {
  areaSqFt: number;
  rows: number;
  piecesPerRow: number;
  baseBoards: number;
  boards: number;
  purchasedLinearFt: number;
}

/** Deck surface boards for a straight rectangular deck. Assumes no reuse of offcuts and no staggered joints. */
export function deckBoards(input: DeckBoardsInput): DeckBoardsResult {
  const length = num('lengthFt', input.lengthFt, 0.1, 1000);
  const width = num('widthFt', input.widthFt, 0.1, 1000);
  const board = num('boardWidthIn', input.boardWidthIn, 0.1, 24);
  const gap = num('gapIn', input.gapIn, 0, 1);
  const stock = num('boardLengthFt', input.boardLengthFt, 1, 40);
  const extra = allowance(input.allowancePercent);
  const rows = ceilUnits((width * 12 + gap) / (board + gap));
  const piecesPerRow = ceilUnits(length / stock);
  const baseBoards = rows * piecesPerRow;
  const boards = ceilUnits((baseBoards * (100 + extra)) / 100);
  return { areaSqFt: length * width, rows, piecesPerRow, baseBoards, boards, purchasedLinearFt: boards * stock };
}
