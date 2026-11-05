import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const teams = [
  { slug: 'gt', abbr: 'GT', c1: '#0f766e', c2: '#fbbf24' },
  { slug: 'dnl', abbr: 'DNL', c1: '#1d4ed8', c2: '#93c5fd' },
  { slug: 'fir', abbr: 'FIR', c1: '#be123c', c2: '#fda4af' },
  { slug: 'msb', abbr: 'MSB', c1: '#1e3a8a', c2: '#60a5fa' },
  { slug: 'uni', abbr: 'UNI', c1: '#f59e0b', c2: '#422006' },
  { slug: 'fg', abbr: 'FG', c1: '#0ea5e9', c2: '#082f49' },
  { slug: 'lux', abbr: 'LUX', c1: '#111827', c2: '#f8fafc' },
  { slug: 'rm', abbr: 'RM', c1: '#7c2d12', c2: '#fdba74' },
  { slug: 'drg', abbr: 'DRG', c1: '#4c1d95', c2: '#c4b5fd' },
  { slug: 'dea', abbr: 'DEA', c1: '#14532d', c2: '#86efac' },
  { slug: 'nova-ms', abbr: 'NOVA', c1: '#312e81', c2: '#a5b4fc' },
  { slug: 'bmg', abbr: 'BMG', c1: '#881337', c2: '#fecdd3' },
  { slug: 'fet', abbr: 'FET', c1: '#ff6a00', c2: '#111827' },
  { slug: 'oce', abbr: 'OCE', c1: '#0369a1', c2: '#7dd3fc' },
  { slug: 'esb', abbr: 'ESB', c1: '#1f2937', c2: '#f97316' },
  { slug: 'one', abbr: 'ONE', c1: '#111827', c2: '#22d3ee' },
  { slug: 'evg', abbr: 'EVG', c1: '#0f172a', c2: '#38bdf8' },
  { slug: 'es', abbr: 'ES', c1: '#14532d', c2: '#f8fafc' },
  { slug: 'dcg', abbr: 'DCG', c1: '#0b1220', c2: '#38bdf8' },
  { slug: 'ank', abbr: 'ANK', c1: '#7f1d1d', c2: '#fecaca' },
];

function svgFor(team) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${team.abbr} logo">
  <defs>
    <linearGradient id="g" x1="40" y1="20" x2="220" y2="240" gradientUnits="userSpaceOnUse">
      <stop stop-color="${team.c1}"/>
      <stop offset="1" stop-color="${team.c2}"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="28" fill="#0b0f14"/>
  <circle cx="128" cy="128" r="96" fill="url(#g)"/>
  <circle cx="128" cy="128" r="78" fill="#0b0f14" opacity="0.28"/>
  <path d="M128 34l18 48h50l-40 30 15 48-43-30-43 30 15-48-40-30h50z" fill="#fff" opacity="0.16"/>
  <text x="128" y="146" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="${team.abbr.length > 3 ? 42 : 54}" font-weight="800" fill="#fff">${team.abbr}</text>
</svg>`;
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'team-logos');
mkdirSync(outDir, { recursive: true });

for (const team of teams) {
  writeFileSync(join(outDir, `${team.slug}.svg`), svgFor(team), 'utf8');
}

console.log(`Generated ${teams.length} logos in ${outDir}`);
