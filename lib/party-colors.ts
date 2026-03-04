export const PARTY_COLORS: Record<string, string> = {
  'Green':               '#32a852',
  'Liberal Democrats':   '#e36b20',
  'Conservatives':       '#123dc9',
  'Labour':              '#c91212',
  'Reform UK':           '#12c9c9',
};

/** Returns the hex color for a party, or a neutral grey if unknown. */
export function getPartyColor(party: string): string {
  return PARTY_COLORS[party] ?? '#6b7280';
}
