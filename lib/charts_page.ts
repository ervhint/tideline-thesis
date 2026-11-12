// All Charts (docs/PLAN.md §6j): where each card's chart lives on the site, and which cards take the full width (L6).
// lib/charts_page.test.mjs checks that every chart and side measure in ENTRIES has a page here (L2).
export const PAGE_OF: Record<string, string> = {
  gauge: '/', 'fee-trace': '/follow-the-fee/', elasticity: '/elasticity/', model: '/model/', concentration: '/concentration/',
  confidential: '/method/', visibility: '/method/', activity: '/method/',
};
export const WIDE = new Set(['gauge', 'model', 'concentration', 'activity']);
