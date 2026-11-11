export type MinionIconRole = 'melee' | 'caster' | 'cannon' | 'super';
export type MinionIconSide = 'blue' | 'red';

export function minionIconUrl(role: MinionIconRole, side: MinionIconSide): string {
  return `/minions/${side}_${role}.webp`;
}

export function minionRoleLabel(role: MinionIconRole): string {
  if (role === 'cannon') {
    return '砲車';
  }
  if (role === 'super') {
    return '超級兵';
  }
  if (role === 'caster') {
    return '遠程兵';
  }
  return '近戰兵';
}

export function minionIconStyle(
  role: MinionIconRole,
  side: MinionIconSide,
  size = 34,
): Record<string, string> {
  return {
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: `url(${minionIconUrl(role, side)})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    borderRadius: '0.28rem',
  };
}

export function isMinionIconRole(value: string | null | undefined): value is MinionIconRole {
  return value === 'melee' || value === 'caster' || value === 'cannon' || value === 'super';
}
