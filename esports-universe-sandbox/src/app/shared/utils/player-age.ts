export function calculateAge(birthday: string, currentDate: string): number {
  const birth = parseDate(birthday);
  const current = parseDate(currentDate);

  if (!birth || !current) {
    return 0;
  }

  let age = current.getFullYear() - birth.getFullYear();
  const monthDiff = current.getMonth() - birth.getMonth();
  const dayDiff = current.getDate() - birth.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return Math.max(age, 0);
}

function parseDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}
