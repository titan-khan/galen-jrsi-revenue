// Currency formatting utilities

/** Format IDR using Indonesian units: Jt (Juta/million), M (Miliar/billion), T (Triliun/trillion) */
export const formatIDR = (value: number) => {
  if (value >= 1_000_000_000_000) return `Rp ${(value / 1_000_000_000_000).toFixed(1)}T`;
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(0)}Jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}Rb`;
  return `Rp ${value}`;
};

export const IDR_TO_USD = 15400;
