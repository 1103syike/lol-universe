import { ALL_VERSION_PACKS } from './packs';
import type { VersionPack } from './version-pack';

const packs = new Map<string, VersionPack>();

for (const pack of ALL_VERSION_PACKS) {
  packs.set(pack.manifest.id, pack);
}

export function listVersionIds(): string[] {
  return [...packs.keys()];
}

export function getVersionPack(versionId: string): VersionPack {
  const pack = packs.get(versionId);
  if (!pack) {
    throw new Error(`Unknown version pack: ${versionId}`);
  }
  return pack;
}

export function registerVersionPack(pack: VersionPack): void {
  if (packs.has(pack.manifest.id)) {
    throw new Error(`Version pack already registered: ${pack.manifest.id}`);
  }
  packs.set(pack.manifest.id, pack);
}

export function lockVersion(versionId: string): VersionPack {
  const pack = getVersionPack(versionId);
  return Object.freeze({
    ...pack,
    manifest: Object.freeze({ ...pack.manifest }),
  }) as VersionPack;
}
