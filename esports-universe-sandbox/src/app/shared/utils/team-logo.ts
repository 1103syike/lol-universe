const PROVIDED_LOGO_SLUGS = new Set([
  'ahq',
  'jt',
  'psg',
  'gt',
  'feg',
  'rm',
  'ws',
  'mad',
  'hka',
  'dcg',
  'one',
  'ank',
  'nvm',
  'bmg',
  'grx',
  'smg',
  'byg',
  'oce',
  'mcx',
  'txo',
]);

export function toTeamLogoSlug(abbreviation: string): string {
  return abbreviation.trim().toLowerCase().replace(/\s+/g, '-');
}

export function defaultTeamLogoUrl(abbreviation: string): string {
  const slug = toTeamLogoSlug(abbreviation);
  const extension = PROVIDED_LOGO_SLUGS.has(slug) ? 'png' : 'svg';
  return `/team-logos/${slug}.${extension}`;
}

export function resolveTeamLogoUrl(logoUrl: string | null | undefined, abbreviation: string): string {
  const provided = defaultTeamLogoUrl(abbreviation);
  const trimmed = logoUrl?.trim();
  if (!trimmed) {
    return provided;
  }
  const slug = toTeamLogoSlug(abbreviation);
  const generatedSvg = `/team-logos/${slug}.svg`;
  const previousNova = slug === 'nvm' && trimmed === '/team-logos/nova-ms.svg';
  if (provided.endsWith('.png') && (trimmed === generatedSvg || previousNova)) {
    return provided;
  }
  return trimmed;
}
