/** Countries with their Wikidata item IDs (verified against Wikidata labels by tests/wikidata-countries). */
export const COUNTRIES: { q: string; name: string; iso: string; continent: string }[] = [
  ['Q40', 'Austria', 'at', 'europe'], ['Q31', 'Belgium', 'be', 'europe'], ['Q219', 'Bulgaria', 'bg', 'europe'], ['Q224', 'Croatia', 'hr', 'europe'],
  ['Q213', 'Czechia', 'cz', 'europe'], ['Q35', 'Denmark', 'dk', 'europe'], ['Q33', 'Finland', 'fi', 'europe'], ['Q142', 'France', 'fr', 'europe'],
  ['Q183', 'Germany', 'de', 'europe'], ['Q41', 'Greece', 'gr', 'europe'], ['Q28', 'Hungary', 'hu', 'europe'], ['Q189', 'Iceland', 'is', 'europe'],
  ['Q27', 'Ireland', 'ie', 'europe'], ['Q38', 'Italy', 'it', 'europe'], ['Q55', 'Netherlands', 'nl', 'europe'], ['Q20', 'Norway', 'no', 'europe'],
  ['Q36', 'Poland', 'pl', 'europe'], ['Q45', 'Portugal', 'pt', 'europe'], ['Q218', 'Romania', 'ro', 'europe'], ['Q214', 'Slovakia', 'sk', 'europe'],
  ['Q215', 'Slovenia', 'si', 'europe'], ['Q29', 'Spain', 'es', 'europe'], ['Q34', 'Sweden', 'se', 'europe'], ['Q39', 'Switzerland', 'ch', 'europe'],
  ['Q145', 'United Kingdom', 'gb', 'europe'], ['Q43', 'Turkey', 'tr', 'asia'], ['Q159', 'Russia', 'ru', 'europe'],
  ['Q399', 'Armenia', 'am', 'asia'], ['Q148', 'China', 'cn', 'asia'], ['Q230', 'Georgia', 'ge', 'asia'], ['Q668', 'India', 'in', 'asia'],
  ['Q252', 'Indonesia', 'id', 'asia'], ['Q794', 'Iran', 'ir', 'asia'], ['Q796', 'Iraq', 'iq', 'asia'], ['Q801', 'Israel', 'il', 'asia'],
  ['Q17', 'Japan', 'jp', 'asia'], ['Q810', 'Jordan', 'jo', 'asia'], ['Q232', 'Kazakhstan', 'kz', 'asia'], ['Q813', 'Kyrgyzstan', 'kg', 'asia'],
  ['Q822', 'Lebanon', 'lb', 'asia'], ['Q711', 'Mongolia', 'mn', 'asia'], ['Q837', 'Nepal', 'np', 'asia'], ['Q843', 'Pakistan', 'pk', 'asia'],
  ['Q928', 'Philippines', 'ph', 'asia'], ['Q851', 'Saudi Arabia', 'sa', 'asia'], ['Q884', 'South Korea', 'kr', 'asia'], ['Q858', 'Syria', 'sy', 'asia'],
  ['Q869', 'Thailand', 'th', 'asia'], ['Q881', 'Vietnam', 'vn', 'asia'],
  ['Q262', 'Algeria', 'dz', 'africa'], ['Q79', 'Egypt', 'eg', 'africa'], ['Q115', 'Ethiopia', 'et', 'africa'], ['Q114', 'Kenya', 'ke', 'africa'],
  ['Q1019', 'Madagascar', 'mg', 'africa'], ['Q1028', 'Morocco', 'ma', 'africa'], ['Q1030', 'Namibia', 'na', 'africa'], ['Q258', 'South Africa', 'za', 'africa'],
  ['Q924', 'Tanzania', 'tz', 'africa'], ['Q948', 'Tunisia', 'tn', 'africa'], ['Q1036', 'Uganda', 'ug', 'africa'],
  ['Q16', 'Canada', 'ca', 'namerica'], ['Q96', 'Mexico', 'mx', 'namerica'], ['Q30', 'United States', 'us', 'namerica'],
  ['Q414', 'Argentina', 'ar', 'samerica'], ['Q750', 'Bolivia', 'bo', 'samerica'], ['Q155', 'Brazil', 'br', 'samerica'], ['Q298', 'Chile', 'cl', 'samerica'],
  ['Q739', 'Colombia', 'co', 'samerica'], ['Q736', 'Ecuador', 'ec', 'samerica'], ['Q419', 'Peru', 'pe', 'samerica'], ['Q717', 'Venezuela', 've', 'samerica'],
  ['Q408', 'Australia', 'au', 'oceania'], ['Q664', 'New Zealand', 'nz', 'oceania'], ['Q691', 'Papua New Guinea', 'pg', 'oceania'],
].map(([q, name, iso, continent]) => ({ q, name, iso, continent })).sort((a, b) => a.name.localeCompare(b.name));

export const CONTINENT_OF: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.q, c.continent]));
