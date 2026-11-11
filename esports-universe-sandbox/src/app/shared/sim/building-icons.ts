export type BuildingIconKind = 'tower' | 'inhibitor' | 'nexus';
export type BuildingIconSide = 'blue' | 'red';

export function buildingIconUrl(kind: BuildingIconKind, side: BuildingIconSide): string {
  return `/buildings/${kind}_building_${side}.png`;
}

export function structureKindToBuildingIcon(
  structureKind: string,
): BuildingIconKind {
  if (structureKind === 'inhibitor') {
    return 'inhibitor';
  }
  if (structureKind === 'nexus') {
    return 'nexus';
  }
  return 'tower';
}

export function buildingIconSize(kind: BuildingIconKind): number {
  if (kind === 'nexus') {
    return 36;
  }
  if (kind === 'inhibitor') {
    return 28;
  }
  return 26;
}

export function buildingIconStyle(
  kind: BuildingIconKind,
  side: BuildingIconSide,
  size = 20,
): Record<string, string> {
  return {
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: `url(${buildingIconUrl(kind, side)})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'contain',
  };
}

export function isBuildingIconId(icon: string): icon is BuildingIconKind {
  return icon === 'tower' || icon === 'inhibitor' || icon === 'nexus';
}
