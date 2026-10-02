"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSheets = calculateSheets;
exports.calculateJobPrice = calculateJobPrice;
exports.calculateOwnerProfit = calculateOwnerProfit;
function calculateSheets(pages, copies, doubleSided) {
    if (pages <= 0 || copies <= 0)
        return 0;
    if (doubleSided) {
        return Math.ceil(pages / 2) * copies;
    }
    return pages * copies;
}
function calculateJobPrice(kiosk, options) {
    const { pages, copies, colour, double_sided } = options;
    const rateBw = kiosk.rate_bw_paise ?? kiosk.rate_bw ?? 200;
    const rateColour = kiosk.rate_colour_paise ?? kiosk.rate_colour ?? 1000;
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
function calculateOwnerProfit(sheetsBw, sheetsColour, earningsPaise, costBwPaise = 50, costColourPaise = 250) {
    const totalCostPaise = (sheetsBw * costBwPaise) + (sheetsColour * costColourPaise);
    const profitPaise = earningsPaise - totalCostPaise;
    return {
        costPaise: totalCostPaise,
        profitPaise,
        profitRupees: (profitPaise / 100).toFixed(2),
    };
}
