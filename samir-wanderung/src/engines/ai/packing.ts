/**
 * Rule-based packing suggestions from real inputs (forecast, estimated duration, max elevation,
 * season, user needs). General preparation advice — not a safety guarantee.
 */
export interface PackingInput {
  hours: number;
  maxEle: number | null;
  minTemp: number | null;
  maxPrecipProb: number | null;
  maxGust: number | null;
  snow: boolean;
  month: number; // 0..11
  northern: boolean;
  needs: { kids?: boolean; dog?: boolean; photography?: boolean; overnight?: boolean };
}

export function packingList(i: PackingInput): { item: string; why: string }[] {
  const out: { item: string; why: string }[] = [
    { item: 'Map / offline map & charged phone', why: 'navigation' },
    { item: 'First-aid kit & emergency blanket', why: 'basic safety' },
    { item: `Water (~${Math.max(1, Math.round(i.hours * 0.5 * 2) / 2)} L)`, why: `≈0.5 L per hour for ${i.hours.toFixed(1)} h` },
    { item: 'Snacks / food', why: i.hours > 4 ? 'long hike' : 'energy' },
    { item: 'Sturdy hiking shoes', why: 'terrain' },
  ];
  const summer = i.northern ? i.month >= 5 && i.month <= 7 : i.month === 11 || i.month <= 1;
  const winter = i.northern ? i.month === 11 || i.month <= 1 : i.month >= 5 && i.month <= 7;
  if (i.hours > 3) out.push({ item: 'Power bank', why: 'GPS drains battery' });
  if (i.hours > 6) out.push({ item: 'Headlamp', why: 'long day — risk of returning after dark' });
  if ((i.maxPrecipProb ?? 0) >= 30) out.push({ item: 'Rain jacket & pack cover', why: `forecast precipitation probability up to ${i.maxPrecipProb}%` });
  if (i.minTemp != null && i.minTemp < 8) out.push({ item: 'Warm layer, hat & gloves', why: `forecast low ${Math.round(i.minTemp)} °C` });
  if ((i.maxGust ?? 0) >= 40) out.push({ item: 'Windproof shell', why: `gusts up to ${Math.round(i.maxGust!)} km/h forecast` });
  if (i.snow || winter) out.push({ item: 'Traction aids / gaiters', why: i.snow ? 'snowfall in forecast' : 'winter season' });
  if ((i.maxEle ?? 0) > 1800) out.push({ item: 'Sun protection (UV increases with altitude) & extra layer', why: `max elevation ${i.maxEle} m` });
  else if (summer) out.push({ item: 'Sun hat & sunscreen', why: 'summer' });
  if (i.needs.kids) out.push({ item: 'Extra snacks, spare clothes for children', why: 'family hike' });
  if (i.needs.dog) out.push({ item: 'Dog water bowl, leash, waste bags', why: 'hiking with a dog' });
  if (i.needs.photography) out.push({ item: 'Camera, spare battery, lens cloth', why: 'photography' });
  if (i.needs.overnight) out.push({ item: 'Sleeping bag, hut reservation / permit check', why: 'overnight' });
  return out;
}
