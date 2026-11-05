export function toTeamLogoSlug(abbreviation: string): string {
  return abbreviation.trim().toLowerCase().replace(/\s+/g, '-');
}

export function defaultTeamLogoUrl(abbreviation: string): string {
  return `/team-logos/${toTeamLogoSlug(abbreviation)}.svg`;
}

export function resolveTeamLogoUrl(logoUrl: string | null | undefined, abbreviation: string): string {
  const trimmed = logoUrl?.trim();
  if (trimmed) {
    return trimmed;
  }
  return defaultTeamLogoUrl(abbreviation);
}
