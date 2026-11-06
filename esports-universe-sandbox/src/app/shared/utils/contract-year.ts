export function yearOf(date: string): number {
  const year = Number(String(date).slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : 2004;
}

export function birthdayFromYear(year: number): string {
  return `${year}-01-01`;
}

export function contractRangeFromYears(contractYear: number, expiryYear: number): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: `${contractYear}-01-01`,
    endDate: `${expiryYear}-12-31`,
  };
}

export function contractYearLabel(startDate: string, endDate: string): string {
  return `${yearOf(startDate)}–${yearOf(endDate)}`;
}

export function buildBirthYears(latest = new Date().getFullYear() - 15, earliest = 1970): number[] {
  const years: number[] = [];
  for (let year = latest; year >= earliest; year -= 1) {
    years.push(year);
  }
  return years;
}

const PLAYER_BIRTH_YEAR_START = 1998;
const PLAYER_CONTRACT_YEAR_START = 2021;

export function buildPlayerBirthYears(endYear: number): number[] {
  const last = Math.max(endYear, PLAYER_BIRTH_YEAR_START);
  const years: number[] = [];
  for (let year = PLAYER_BIRTH_YEAR_START; year <= last; year += 1) {
    years.push(year);
  }
  return years;
}

export function buildPlayerContractYears(endYear = new Date().getFullYear() + 10): number[] {
  const last = Math.max(endYear, PLAYER_CONTRACT_YEAR_START);
  const years: number[] = [];
  for (let year = PLAYER_CONTRACT_YEAR_START; year <= last; year += 1) {
    years.push(year);
  }
  return years;
}

export function defaultPlayerBirthYear(referenceYear: number): number {
  return referenceYear - 18;
}
