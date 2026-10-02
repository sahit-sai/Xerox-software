import { Kiosk, PrintJobOptions, PricingBreakdown } from './types';
export declare function calculateSheets(pages: number, copies: number, doubleSided: boolean): number;
export declare function calculateJobPrice(kiosk: Partial<Kiosk>, options: PrintJobOptions): PricingBreakdown;
export declare function calculateOwnerProfit(sheetsBw: number, sheetsColour: number, earningsPaise: number, costBwPaise?: number, costColourPaise?: number): {
    costPaise: number;
    profitPaise: number;
    profitRupees: string;
};
