import { CalcError, num, opt } from './validate.ts';

export interface MarkupInput {
  /** Job cost in US dollars. */
  costUsd: number;
  /** The markup or margin percentage, depending on mode. */
  percent: number;
  /** "markup": percent of cost. "margin": percent of the selling price. */
  mode: 'markup' | 'margin';
}

export interface MarkupResult {
  priceUsd: number;
  profitUsd: number;
  marginPercent: number;
  markupPercent: number;
}

/** Selling price from a cost and either a markup or a gross margin percentage. Excludes sales tax. */
export function markup(input: MarkupInput): MarkupResult {
  if (input.mode !== 'markup' && input.mode !== 'margin') throw new CalcError('bad_option', 'mode', 'mode must be "markup" or "margin"');
  const cost = num('costUsd', input.costUsd, 0.01, 1e9);
  const percent = num('percent', input.percent, 0, input.mode === 'margin' ? 99.99 : 1000);
  const priceUsd = input.mode === 'markup' ? cost * (1 + percent / 100) : cost / (1 - percent / 100);
  const profitUsd = priceUsd - cost;
  return { priceUsd, profitUsd, marginPercent: (profitUsd / priceUsd) * 100, markupPercent: (profitUsd / cost) * 100 };
}

/** The gross margin that a given markup produces. 25% markup is a 20% margin. */
export const markupToMargin = (markupPercent: number): number => {
  const m = num('markupPercent', markupPercent, 0, 1e6);
  return (m / (100 + m)) * 100;
};

/** The markup needed for a target gross margin. A 20% margin needs a 25% markup. */
export const marginToMarkup = (marginPercent: number): number => {
  const g = num('marginPercent', marginPercent, 0, 99.99);
  return (g / (100 - g)) * 100;
};

export interface HourlyRateInput {
  /** What you want to pay yourself in a year, USD. */
  targetPayUsd: number;
  /** Yearly overhead: insurance, vehicle, tools, software, USD. */
  overheadUsd: number;
  /** Yearly reserve or savings, USD. Default 0. */
  reserveUsd?: number;
  /** Weeks you can bill in a year. */
  workingWeeks: number;
  /** Billable hours in a working week (not hours on site plus travel and admin). */
  billableHoursPerWeek: number;
  /** Profit margin on top of pay, overhead and reserve, percent. Default 0. */
  profitMarginPercent?: number;
}

export interface HourlyRateResult {
  requiredRevenueUsd: number;
  billableHours: number;
  hourlyRateUsd: number;
  profitUsd: number;
}

/** Hourly rate that covers pay, overhead, a reserve and a profit margin over your billable hours. */
export function hourlyRate(input: HourlyRateInput): HourlyRateResult {
  const pay = num('targetPayUsd', input.targetPayUsd, 0, 1e8);
  const overhead = num('overheadUsd', input.overheadUsd, 0, 1e8);
  const reserve = opt('reserveUsd', input.reserveUsd, 0, 1e8, 0);
  const weeks = num('workingWeeks', input.workingWeeks, 0.1, 52);
  const hours = num('billableHoursPerWeek', input.billableHoursPerWeek, 0.1, 112);
  const margin = opt('profitMarginPercent', input.profitMarginPercent, 0, 95, 0);
  const requiredRevenueUsd = (pay + overhead + reserve) / (1 - margin / 100);
  const billableHours = weeks * hours;
  return { requiredRevenueUsd, billableHours, hourlyRateUsd: requiredRevenueUsd / billableHours, profitUsd: requiredRevenueUsd - pay - overhead - reserve };
}
