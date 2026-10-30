const OTA_DOMAIN_MARKERS = [
  "agoda", "airbnb", "booking", "expedia", "hotelbeds", "hotels.com",
  "orbitz", "priceline", "trip.com", "traveloka", "vrbo",
] as const;

export function isOtaRelayEmail(value: string): boolean {
  const domain = value.trim().toLowerCase().split("@").at(-1);
  if (!domain || !value.includes("@")) return false;
  return OTA_DOMAIN_MARKERS.some((marker) => domain.includes(marker));
}

export function isLikelyPlaceholderPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return false;
  if (/^(\d)\1+$/.test(digits)) return true;
  let ascending = true;
  let descending = true;
  for (let index = 1; index < digits.length; index += 1) {
    const previous = Number(digits[index - 1]);
    const current = Number(digits[index]);
    if (current !== (previous + 1) % 10) ascending = false;
    if (current !== (previous + 9) % 10) descending = false;
  }
  return ascending || descending;
}

export function publicEmail(value: string): string {
  return isOtaRelayEmail(value) ? "" : value;
}

export function publicPhone(value: string): string {
  return isLikelyPlaceholderPhone(value) ? "" : value;
}
