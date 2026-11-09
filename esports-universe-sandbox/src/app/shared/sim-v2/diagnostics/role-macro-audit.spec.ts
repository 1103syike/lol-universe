import { describe, expect, it } from 'vitest';

import { auditRoleMacro, formatRoleMacroAudit } from './role-macro-audit';

describe('role macro audit', () => {
  it(
    'runs vision + five-role + jungle/obj fight diagnostics',
    () => {
      const audit = auditRoleMacro([91001, 42, 1000]);
      // eslint-disable-next-line no-console
      console.log(formatRoleMacroAudit(audit));

      expect(audit.vision.avgWardsPlaced).toBeGreaterThan(0);
      expect(audit.roles).toHaveLength(5);

      const jungle = audit.roles.find((row) => row.role === 'JUNGLE');
      expect(jungle).toBeTruthy();
      expect(jungle!.avgDamage).toBeGreaterThan(200);
      expect(audit.jungle.avgCampKillsBy12).toBeGreaterThan(1);

      const support = audit.roles.find((row) => row.role === 'SUPPORT');
      expect(support).toBeTruthy();
      expect(support!.avgWards).toBeGreaterThanOrEqual(0);

      expect(audit.fights.objectiveFights + audit.fights.regularFights).toBeGreaterThan(0);
    },
    60000,
  );
});
