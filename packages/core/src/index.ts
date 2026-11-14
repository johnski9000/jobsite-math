export { CalcError } from './validate.js';
export { roofPitch, hipRoof } from './roof.js';
export type { RoofPitchInput, RoofPitchResult, HipRoofInput, HipRoofResult } from './roof.js';
export { markup, markupToMargin, marginToMarkup, hourlyRate } from './pricing.js';
export type { MarkupInput, MarkupResult, HourlyRateInput, HourlyRateResult } from './pricing.js';
export { concrete, gravel, bricks, mortar, paint, drywall, deckBoards, MODULAR_BRICK } from './materials.js';
export type {
  ConcreteInput, ConcreteResult, GravelInput, GravelResult, BricksInput, BricksResult, MortarInput,
  Surface, PaintInput, PaintResult, DrywallInput, DrywallResult, DeckBoardsInput, DeckBoardsResult,
} from './materials.js';
