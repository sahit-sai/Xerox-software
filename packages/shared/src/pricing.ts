import { Kiosk, PrintJobOptions, PricingBreakdown } from './types';

export function calculateSheets(pages: number, copies: number, doubleSided: boolean): number {
  if (pages <= 0 || copies <= 0) return 0;
  if (doubleSided) {
    return Math.ceil(pages / 2) * copies;
  }
  return pages * copies;
}

export function calculateJobPrice(
  kiosk: Partial<Kiosk>,
  options: PrintJobOptions
): PricingBreakdown {
  const { pages, copies, colour, double_sided } = options;

  const rateBw = kiosk.rate_bw_paise ?? (kiosk as any).rate_bw ?? 200;
  const rateColour = kiosk.rate_colour_paise ?? (kiosk as any).rate_colour ?? 1000;
  const discountPct = kiosk.double_discount_pct ?? 0;
  const supportsColour = kiosk.supports_colour ?? true;

  const ratePerPagePaise = colour && supportsColour ? rateColour : rateBw;
  const sheets = calculateSheets(pages, copies, double_sided);
  const subtotalPaise = pages * copies * ratePerPagePaise;

  let discountPaise = 0;
  if (double_sided && discountPct > 0) {
    discountPaise = Math.round(subtotalPaise * (Number(discountPct) / 100));
  }

  const totalPaise = Math.max(0, subtotalPaise - discountPaise);

  return {
    pages,
    copies,
    sheets,
    ratePerPagePaise,
    subtotalPaise,
    discountPaise,
    totalPaise,
    totalRupees: (totalPaise / 100).toFixed(2),
  };
}

export function calculateOwnerProfit(
  sheetsBw: number,
  sheetsColour: number,
  earningsPaise: number,
  costBwPaise: number = 50,
  costColourPaise: number = 250
): { costPaise: number; profitPaise: number; profitRupees: string } {
  const totalCostPaise = (sheetsBw * costBwPaise) + (sheetsColour * costColourPaise);
  const profitPaise = earningsPaise - totalCostPaise;
  return {
    costPaise: totalCostPaise,
    profitPaise,
    profitRupees: (profitPaise / 100).toFixed(2),
  };
}
