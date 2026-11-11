import { describe, expect, it } from 'vitest';
import { SIGNATURE_BATCH_B } from './signature-batch-b';
import { SIGNATURE_BATCH_C } from './signature-batch-c';
import { SIGNATURE_BATCH_D } from './signature-batch-d';
import { SIGNATURE_BATCH_E } from './signature-batch-e';
import { SIGNATURE_BATCH_F } from './signature-batch-f';
import { SIGNATURE_BATCH_G } from './signature-batch-g';
import { SIGNATURE_BATCH_H } from './signature-batch-h';
import { SIGNATURE_PARTIAL_SIX } from './signature-partial-six';
import { isHandcraftedAbility } from './executors';

describe('signature letter batches', () => {
  it('registers QWER for every batch champion', () => {
    const batches = [
      SIGNATURE_BATCH_B,
      SIGNATURE_BATCH_C,
      SIGNATURE_BATCH_D,
      SIGNATURE_BATCH_E,
      SIGNATURE_BATCH_F,
      SIGNATURE_BATCH_G,
      SIGNATURE_BATCH_H,
    ];
    const champs = new Set<string>();
    for (const batch of batches) {
      for (const key of Object.keys(batch)) {
        const [championId, slot] = key.split(':');
        expect(slot && ['Q', 'W', 'E', 'R'].includes(slot)).toBe(true);
        expect(batch[key]).toBeTypeOf('function');
        champs.add(championId!);
        expect(isHandcraftedAbility(championId!, slot as 'Q' | 'W' | 'E' | 'R')).toBe(true);
      }
    }
    expect(champs.size).toBeGreaterThanOrEqual(100);
    expect(SIGNATURE_BATCH_B['Brand:Q']).toBeTruthy();
    expect(SIGNATURE_BATCH_C['Ekko:R']).toBeTruthy();
    expect(SIGNATURE_BATCH_F['Pyke:R']).toBeTruthy();
    expect(Object.keys(SIGNATURE_PARTIAL_SIX).length).toBe(9);
  });
});
