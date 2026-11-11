import type { ChampionCombatClass } from '../../../core/data/champion-kits';

export type AbilityDamageType = 'physical' | 'magic' | 'true';
export type SlotKind =
  | 'sweetspot'
  | 'engageStrike'
  | 'cleave'
  | 'poke'
  | 'burst'
  | 'steroid'
  | 'gapclose'
  | 'hook'
  | 'slam'
  | 'guard'
  | 'zone'
  | 'shield'
  | 'fade'
  | 'dash'
  | 'snare'
  | 'strike'
  | 'wave'
  | 'peel'
  | 'duelUlt'
  | 'teamUlt'
  | 'burstUlt'
  | 'executeUlt'
  | 'assassinate';

export interface SlotSpec {
  kind: SlotKind;
  base: number;
  perLevel: number;
  ad: number;
  ap: number;
  heal?: number;
  shield?: number;
  ms?: number;
  cc?: number;
  execute?: number;
  aoe?: boolean;
}

export interface ChampionAbilityProfile {
  id: string;
  combatClass: ChampionCombatClass;
  damageType: AbilityDamageType;
  flavor: string;
  Q: SlotSpec;
  W: SlotSpec;
  E: SlotSpec;
  R: SlotSpec;
}

export const CHAMPION_ABILITY_CATALOG: Record<string, ChampionAbilityProfile> = {
  "Aatrox": {
    "id": "Aatrox",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "void",
    "Q": {
      "kind": "sweetspot",
      "base": 87,
      "perLevel": 28,
      "ad": 0.81,
      "ap": 0.05,
      "heal": 0.19,
      "cc": 0.56
    },
    "W": {
      "kind": "guard",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.31
    },
    "E": {
      "kind": "dash",
      "base": 62,
      "perLevel": 23,
      "ad": 0.68,
      "ap": 0.08,
      "ms": 81,
      "cc": 0.25
    },
    "R": {
      "kind": "duelUlt",
      "base": 191,
      "perLevel": 100,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.53
    }
  },
  "Ahri": {
    "id": "Ahri",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "flame",
    "Q": {
      "kind": "poke",
      "base": 70,
      "perLevel": 50,
      "ad": 0,
      "ap": 1,
      "heal": 0,
      "cc": 0
    },
    "W": {
      "kind": "strike",
      "base": 72,
      "perLevel": 36,
      "ad": 0,
      "ap": 0.72,
      "heal": 0,
      "ms": 40,
      "cc": 0
    },
    "E": {
      "kind": "snare",
      "base": 80,
      "perLevel": 40,
      "ad": 0,
      "ap": 0.85,
      "cc": 0.9
    },
    "R": {
      "kind": "dash",
      "base": 75,
      "perLevel": 50,
      "ad": 0,
      "ap": 0.35,
      "aoe": true,
      "heal": 0,
      "cc": 0
    }
  },
  "Akali": {
    "id": "Akali",
    "combatClass": "assassin",
    "damageType": "magic",
    "flavor": "light",
    "Q": {
      "kind": "gapclose",
      "base": 78,
      "perLevel": 24,
      "ad": 0.71,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.63
    },
    "W": {
      "kind": "fade",
      "base": 50,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.35
    },
    "E": {
      "kind": "strike",
      "base": 61,
      "perLevel": 22,
      "ad": 0.65,
      "ap": 0.08,
      "ms": 78,
      "cc": 0.28
    },
    "R": {
      "kind": "assassinate",
      "base": 177,
      "perLevel": 96,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": false,
      "heal": 0,
      "cc": 0.59
    }
  },
  "Akshan": {
    "id": "Akshan",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "light",
    "Q": {
      "kind": "poke",
      "base": 85,
      "perLevel": 29,
      "ad": 0.82,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.36
    },
    "W": {
      "kind": "poke",
      "base": 50,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.2
    },
    "E": {
      "kind": "dash",
      "base": 59,
      "perLevel": 23,
      "ad": 0.68,
      "ap": 0.08,
      "ms": 76,
      "cc": 0.16
    },
    "R": {
      "kind": "executeUlt",
      "base": 194,
      "perLevel": 96,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": false,
      "heal": 0,
      "cc": 0.34
    }
  },
  "Alistar": {
    "id": "Alistar",
    "combatClass": "tank",
    "damageType": "magic",
    "flavor": "blood",
    "Q": {
      "kind": "hook",
      "base": 66,
      "perLevel": 21,
      "ad": 0.1,
      "ap": 0.7,
      "heal": 0,
      "cc": 0.83
    },
    "W": {
      "kind": "gapclose",
      "base": 56,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.7,
      "heal": 0.05,
      "shield": 0.1,
      "cc": 0.7
    },
    "E": {
      "kind": "wave",
      "base": 54,
      "perLevel": 18,
      "ad": 0.05,
      "ap": 0.4,
      "ms": 66,
      "cc": 0.4
    },
    "R": {
      "kind": "teamUlt",
      "base": 80,
      "perLevel": 40,
      "ad": 0.1,
      "ap": 0.3,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.25,
      "cc": 0.2
    }
  },
  "Ambessa": {
    "id": "Ambessa",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "engageStrike",
      "base": 79,
      "perLevel": 24,
      "ad": 0.71,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.65
    },
    "W": {
      "kind": "guard",
      "base": 51,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.36
    },
    "E": {
      "kind": "dash",
      "base": 64,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.08,
      "ms": 84,
      "cc": 0.29
    },
    "R": {
      "kind": "duelUlt",
      "base": 187,
      "perLevel": 98,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.61
    }
  },
  "Amumu": {
    "id": "Amumu",
    "combatClass": "tank",
    "damageType": "magic",
    "flavor": "iron",
    "Q": {
      "kind": "hook",
      "base": 70,
      "perLevel": 30,
      "ad": 0.05,
      "ap": 0.85,
      "heal": 0,
      "cc": 0.9
    },
    "W": {
      "kind": "zone",
      "base": 20,
      "perLevel": 10,
      "ad": 0.05,
      "ap": 0.2,
      "heal": 0.05,
      "shield": 0.05,
      "cc": 0.1
    },
    "E": {
      "kind": "wave",
      "base": 65,
      "perLevel": 30,
      "ad": 0.05,
      "ap": 0.5,
      "ms": 0,
      "cc": 0.2
    },
    "R": {
      "kind": "teamUlt",
      "base": 150,
      "perLevel": 80,
      "ad": 0.1,
      "ap": 0.8,
      "execute": 0.05,
      "aoe": true,
      "heal": 0.05,
      "cc": 1.2
    }
  },
  "Anivia": {
    "id": "Anivia",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "storm",
    "Q": {
      "kind": "poke",
      "base": 83,
      "perLevel": 32,
      "ad": 0.15,
      "ap": 0.81,
      "heal": 0,
      "cc": 0.45
    },
    "W": {
      "kind": "zone",
      "base": 54,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.28,
      "cc": 0.25
    },
    "E": {
      "kind": "snare",
      "base": 51,
      "perLevel": 20,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 64,
      "cc": 0.85
    },
    "R": {
      "kind": "teamUlt",
      "base": 198,
      "perLevel": 102,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.42
    }
  },
  "Annie": {
    "id": "Annie",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "frost",
    "Q": {
      "kind": "burst",
      "base": 84,
      "perLevel": 28,
      "ad": 0.15,
      "ap": 0.74,
      "heal": 0,
      "cc": 0.79
    },
    "W": {
      "kind": "zone",
      "base": 55,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.33,
      "cc": 0.44
    },
    "E": {
      "kind": "snare",
      "base": 54,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 68,
      "cc": 0.96
    },
    "R": {
      "kind": "teamUlt",
      "base": 199,
      "perLevel": 103,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.75
    }
  },
  "Aphelios": {
    "id": "Aphelios",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "poke",
      "base": 83,
      "perLevel": 31,
      "ad": 0.86,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.23
    },
    "W": {
      "kind": "poke",
      "base": 57,
      "perLevel": 25,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.13
    },
    "E": {
      "kind": "dash",
      "base": 48,
      "perLevel": 20,
      "ad": 0.59,
      "ap": 0.08,
      "ms": 59,
      "cc": 0.1
    },
    "R": {
      "kind": "executeUlt",
      "base": 212,
      "perLevel": 106,
      "ad": 1.48,
      "ap": 0.1,
      "execute": 0.44,
      "aoe": true,
      "heal": 0,
      "cc": 0.21
    }
  },
  "Ashe": {
    "id": "Ashe",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "void",
    "Q": {
      "kind": "steroid",
      "base": 0,
      "perLevel": 0,
      "ad": 0,
      "ap": 0,
      "heal": 0,
      "ms": 0,
      "cc": 0
    },
    "W": {
      "kind": "poke",
      "base": 20,
      "perLevel": 15,
      "ad": 1.0,
      "ap": 0,
      "heal": 0,
      "cc": 0.35
    },
    "E": {
      "kind": "fade",
      "base": 0,
      "perLevel": 0,
      "ad": 0,
      "ap": 0,
      "ms": 0,
      "cc": 0
    },
    "R": {
      "kind": "executeUlt",
      "base": 200,
      "perLevel": 200,
      "ad": 1.0,
      "ap": 0,
      "execute": 0,
      "aoe": false,
      "heal": 0,
      "cc": 0.8
    }
  },
  "AurelionSol": {
    "id": "AurelionSol",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "frost",
    "Q": {
      "kind": "poke",
      "base": 81,
      "perLevel": 32,
      "ad": 0.15,
      "ap": 0.83,
      "heal": 0,
      "cc": 0.36
    },
    "W": {
      "kind": "zone",
      "base": 56,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.26,
      "cc": 0.2
    },
    "E": {
      "kind": "snare",
      "base": 54,
      "perLevel": 21,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 68,
      "cc": 0.82
    },
    "R": {
      "kind": "teamUlt",
      "base": 201,
      "perLevel": 104,
      "ad": 0.2,
      "ap": 0.96,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.34
    }
  },
  "Aurora": {
    "id": "Aurora",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "blood",
    "Q": {
      "kind": "poke",
      "base": 87,
      "perLevel": 30,
      "ad": 0.15,
      "ap": 0.79,
      "heal": 0,
      "cc": 0.5
    },
    "W": {
      "kind": "zone",
      "base": 52,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.28,
      "cc": 0.28
    },
    "E": {
      "kind": "snare",
      "base": 55,
      "perLevel": 21,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 69,
      "cc": 0.86
    },
    "R": {
      "kind": "teamUlt",
      "base": 193,
      "perLevel": 99,
      "ad": 0.2,
      "ap": 0.93,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.47
    }
  },
  "Azir": {
    "id": "Azir",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "storm",
    "Q": {
      "kind": "poke",
      "base": 84,
      "perLevel": 32,
      "ad": 0.15,
      "ap": 0.83,
      "heal": 0,
      "cc": 0.41
    },
    "W": {
      "kind": "zone",
      "base": 57,
      "perLevel": 25,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.27,
      "cc": 0.23
    },
    "E": {
      "kind": "snare",
      "base": 52,
      "perLevel": 20,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 65,
      "cc": 0.83
    },
    "R": {
      "kind": "teamUlt",
      "base": 212,
      "perLevel": 106,
      "ad": 0.2,
      "ap": 0.97,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.38
    }
  },
  "Bard": {
    "id": "Bard",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "iron",
    "Q": {
      "kind": "hook",
      "base": 80,
      "perLevel": 28,
      "ad": 0.15,
      "ap": 0.74,
      "heal": 0,
      "cc": 0.63
    },
    "W": {
      "kind": "shield",
      "base": 53,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.3,
      "cc": 0.35
    },
    "E": {
      "kind": "peel",
      "base": 51,
      "perLevel": 18,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 62,
      "cc": 0.91
    },
    "R": {
      "kind": "teamUlt",
      "base": 188,
      "perLevel": 100,
      "ad": 0.2,
      "ap": 0.94,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.9
    }
  },
  "Belveth": {
    "id": "Belveth",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "light",
    "Q": {
      "kind": "cleave",
      "base": 71,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.59
    },
    "W": {
      "kind": "guard",
      "base": 52,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.33
    },
    "E": {
      "kind": "dash",
      "base": 64,
      "perLevel": 24,
      "ad": 0.69,
      "ap": 0.08,
      "ms": 83,
      "cc": 0.26
    },
    "R": {
      "kind": "duelUlt",
      "base": 198,
      "perLevel": 99,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.55
    }
  },
  "Blitzcrank": {
    "id": "Blitzcrank",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "hook",
      "base": 75,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.81
    },
    "W": {
      "kind": "guard",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.34,
      "cc": 0.45
    },
    "E": {
      "kind": "wave",
      "base": 52,
      "perLevel": 18,
      "ad": 0.54,
      "ap": 0.08,
      "ms": 64,
      "cc": 0.97
    },
    "R": {
      "kind": "teamUlt",
      "base": 188,
      "perLevel": 100,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 1.06
    }
  },
  "Brand": {
    "id": "Brand",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "void",
    "Q": {
      "kind": "poke",
      "base": 85,
      "perLevel": 32,
      "ad": 0.15,
      "ap": 0.81,
      "heal": 0,
      "cc": 0.41
    },
    "W": {
      "kind": "zone",
      "base": 56,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.27,
      "cc": 0.23
    },
    "E": {
      "kind": "snare",
      "base": 49,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 61,
      "cc": 0.83
    },
    "R": {
      "kind": "teamUlt",
      "base": 201,
      "perLevel": 104,
      "ad": 0.2,
      "ap": 0.96,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.38
    }
  },
  "Braum": {
    "id": "Braum",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "iron",
    "Q": {
      "kind": "hook",
      "base": 69,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.63
    },
    "W": {
      "kind": "guard",
      "base": 56,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.3,
      "cc": 0.35
    },
    "E": {
      "kind": "wave",
      "base": 49,
      "perLevel": 18,
      "ad": 0.54,
      "ap": 0.08,
      "ms": 60,
      "cc": 0.91
    },
    "R": {
      "kind": "teamUlt",
      "base": 194,
      "perLevel": 104,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 0.9
    }
  },
  "Briar": {
    "id": "Briar",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "engageStrike",
      "base": 69,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.05,
      "heal": 0.14,
      "cc": 0.79
    },
    "W": {
      "kind": "guard",
      "base": 52,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.44
    },
    "E": {
      "kind": "cleave",
      "base": 58,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 74,
      "cc": 0.35
    },
    "R": {
      "kind": "duelUlt",
      "base": 188,
      "perLevel": 99,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.75
    }
  },
  "Caitlyn": {
    "id": "Caitlyn",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "blood",
    "Q": {
      "kind": "poke",
      "base": 97,
      "perLevel": 34,
      "ad": 0.95,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.27
    },
    "W": {
      "kind": "poke",
      "base": 51,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.15
    },
    "E": {
      "kind": "dash",
      "base": 51,
      "perLevel": 21,
      "ad": 0.61,
      "ap": 0.08,
      "ms": 64,
      "cc": 0.12
    },
    "R": {
      "kind": "executeUlt",
      "base": 197,
      "perLevel": 98,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": false,
      "heal": 0,
      "cc": 0.26
    }
  },
  "Camille": {
    "id": "Camille",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "engageStrike",
      "base": 78,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.77
    },
    "W": {
      "kind": "guard",
      "base": 51,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.42
    },
    "E": {
      "kind": "dash",
      "base": 70,
      "perLevel": 25,
      "ad": 0.72,
      "ap": 0.08,
      "ms": 92,
      "cc": 0.34
    },
    "R": {
      "kind": "duelUlt",
      "base": 195,
      "perLevel": 98,
      "ad": 1.43,
      "ap": 0.1,
      "execute": 0.41,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.72
    }
  },
  "Cassiopeia": {
    "id": "Cassiopeia",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "iron",
    "Q": {
      "kind": "poke",
      "base": 86,
      "perLevel": 30,
      "ad": 0.15,
      "ap": 0.78,
      "heal": 0,
      "cc": 0.45
    },
    "W": {
      "kind": "zone",
      "base": 53,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.28,
      "cc": 0.25
    },
    "E": {
      "kind": "snare",
      "base": 56,
      "perLevel": 22,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 72,
      "cc": 0.85
    },
    "R": {
      "kind": "teamUlt",
      "base": 197,
      "perLevel": 101,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.42
    }
  },
  "Chogath": {
    "id": "Chogath",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "blood",
    "Q": {
      "kind": "slam",
      "base": 77,
      "perLevel": 27,
      "ad": 0.78,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.5
    },
    "W": {
      "kind": "guard",
      "base": 51,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.28,
      "cc": 0.28
    },
    "E": {
      "kind": "wave",
      "base": 58,
      "perLevel": 22,
      "ad": 0.65,
      "ap": 0.08,
      "ms": 75,
      "cc": 0.86
    },
    "R": {
      "kind": "teamUlt",
      "base": 185,
      "perLevel": 98,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 0.77
    }
  },
  "Corki": {
    "id": "Corki",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "light",
    "Q": {
      "kind": "poke",
      "base": 90,
      "perLevel": 32,
      "ad": 0.91,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.32
    },
    "W": {
      "kind": "poke",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.17
    },
    "E": {
      "kind": "dash",
      "base": 53,
      "perLevel": 21,
      "ad": 0.63,
      "ap": 0.08,
      "ms": 67,
      "cc": 0.14
    },
    "R": {
      "kind": "executeUlt",
      "base": 200,
      "perLevel": 100,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": true,
      "heal": 0,
      "cc": 0.3
    }
  },
  "Darius": {
    "id": "Darius",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "engageStrike",
      "base": 80,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0.15,
      "cc": 0.63
    },
    "W": {
      "kind": "guard",
      "base": 47,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.35
    },
    "E": {
      "kind": "dash",
      "base": 63,
      "perLevel": 23,
      "ad": 0.68,
      "ap": 0.08,
      "ms": 82,
      "cc": 0.28
    },
    "R": {
      "kind": "duelUlt",
      "base": 178,
      "perLevel": 92,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.59
    }
  },
  "Diana": {
    "id": "Diana",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "void",
    "Q": {
      "kind": "engageStrike",
      "base": 74,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.77
    },
    "W": {
      "kind": "guard",
      "base": 54,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.42
    },
    "E": {
      "kind": "cleave",
      "base": 59,
      "perLevel": 21,
      "ad": 0.61,
      "ap": 0.08,
      "ms": 75,
      "cc": 0.34
    },
    "R": {
      "kind": "duelUlt",
      "base": 193,
      "perLevel": 102,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.72
    }
  },
  "Draven": {
    "id": "Draven",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "light",
    "Q": {
      "kind": "steroid",
      "base": 85,
      "perLevel": 25,
      "ad": 0.73,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.5
    },
    "W": {
      "kind": "poke",
      "base": 51,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.28
    },
    "E": {
      "kind": "dash",
      "base": 55,
      "perLevel": 21,
      "ad": 0.61,
      "ap": 0.08,
      "ms": 69,
      "cc": 0.22
    },
    "R": {
      "kind": "executeUlt",
      "base": 197,
      "perLevel": 98,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": false,
      "heal": 0,
      "cc": 0.47
    }
  },
  "DrMundo": {
    "id": "DrMundo",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "slam",
      "base": 73,
      "perLevel": 24,
      "ad": 0.71,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.41
    },
    "W": {
      "kind": "guard",
      "base": 48,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.27,
      "cc": 0.23
    },
    "E": {
      "kind": "wave",
      "base": 63,
      "perLevel": 25,
      "ad": 0.71,
      "ap": 0.08,
      "ms": 83,
      "cc": 0.83
    },
    "R": {
      "kind": "teamUlt",
      "base": 179,
      "perLevel": 94,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 0.68
    }
  },
  "Ekko": {
    "id": "Ekko",
    "combatClass": "assassin",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "gapclose",
      "base": 77,
      "perLevel": 26,
      "ad": 0.75,
      "ap": 0.05,
      "heal": 0.17,
      "cc": 0.68
    },
    "W": {
      "kind": "fade",
      "base": 52,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.38
    },
    "E": {
      "kind": "strike",
      "base": 60,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.08,
      "ms": 77,
      "cc": 0.3
    },
    "R": {
      "kind": "assassinate",
      "base": 181,
      "perLevel": 99,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": false,
      "heal": 0,
      "cc": 0.64
    }
  },
  "Elise": {
    "id": "Elise",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "light",
    "Q": {
      "kind": "poke",
      "base": 82,
      "perLevel": 31,
      "ad": 0.15,
      "ap": 0.8,
      "heal": 0,
      "cc": 0.68
    },
    "W": {
      "kind": "zone",
      "base": 50,
      "perLevel": 22,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.31,
      "cc": 0.38
    },
    "E": {
      "kind": "snare",
      "base": 55,
      "perLevel": 20,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 69,
      "cc": 0.92
    },
    "R": {
      "kind": "burstUlt",
      "base": 177,
      "perLevel": 96,
      "ad": 0.2,
      "ap": 0.91,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.64
    }
  },
  "Evelynn": {
    "id": "Evelynn",
    "combatClass": "assassin",
    "damageType": "physical",
    "flavor": "iron",
    "Q": {
      "kind": "gapclose",
      "base": 67,
      "perLevel": 25,
      "ad": 0.73,
      "ap": 0.05,
      "heal": 0.17,
      "cc": 0.77
    },
    "W": {
      "kind": "fade",
      "base": 54,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.42
    },
    "E": {
      "kind": "strike",
      "base": 58,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 73,
      "cc": 0.34
    },
    "R": {
      "kind": "assassinate",
      "base": 186,
      "perLevel": 102,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": true,
      "heal": 0,
      "cc": 0.72
    }
  },
  "Ezreal": {
    "id": "Ezreal",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "poke",
      "base": 94,
      "perLevel": 34,
      "ad": 0.96,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.23
    },
    "W": {
      "kind": "poke",
      "base": 50,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.13
    },
    "E": {
      "kind": "dash",
      "base": 51,
      "perLevel": 21,
      "ad": 0.63,
      "ap": 0.08,
      "ms": 65,
      "cc": 0.1
    },
    "R": {
      "kind": "executeUlt",
      "base": 194,
      "perLevel": 96,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": false,
      "heal": 0,
      "cc": 0.21
    }
  },
  "Fiddlesticks": {
    "id": "Fiddlesticks",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "void",
    "Q": {
      "kind": "burst",
      "base": 71,
      "perLevel": 28,
      "ad": 0.15,
      "ap": 0.74,
      "heal": 0,
      "cc": 0.77
    },
    "W": {
      "kind": "zone",
      "base": 56,
      "perLevel": 25,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.33,
      "cc": 0.42
    },
    "E": {
      "kind": "snare",
      "base": 55,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 69,
      "cc": 0.95
    },
    "R": {
      "kind": "teamUlt",
      "base": 203,
      "perLevel": 105,
      "ad": 0.2,
      "ap": 0.97,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.72
    }
  },
  "Fiora": {
    "id": "Fiora",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "cleave",
      "base": 79,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.5
    },
    "W": {
      "kind": "guard",
      "base": 44,
      "perLevel": 19,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.28
    },
    "E": {
      "kind": "dash",
      "base": 66,
      "perLevel": 25,
      "ad": 0.73,
      "ap": 0.08,
      "ms": 88,
      "cc": 0.22
    },
    "R": {
      "kind": "duelUlt",
      "base": 172,
      "perLevel": 88,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.47
    }
  },
  "Fizz": {
    "id": "Fizz",
    "combatClass": "assassin",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "gapclose",
      "base": 80,
      "perLevel": 25,
      "ad": 0.73,
      "ap": 0.05,
      "heal": 0.17,
      "cc": 0.72
    },
    "W": {
      "kind": "fade",
      "base": 51,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.4
    },
    "E": {
      "kind": "strike",
      "base": 61,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.08,
      "ms": 78,
      "cc": 0.32
    },
    "R": {
      "kind": "assassinate",
      "base": 180,
      "perLevel": 98,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": false,
      "heal": 0,
      "cc": 0.68
    }
  },
  "Galio": {
    "id": "Galio",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "blood",
    "Q": {
      "kind": "hook",
      "base": 75,
      "perLevel": 25,
      "ad": 0.73,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.77
    },
    "W": {
      "kind": "guard",
      "base": 57,
      "perLevel": 25,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.33,
      "cc": 0.42
    },
    "E": {
      "kind": "wave",
      "base": 55,
      "perLevel": 19,
      "ad": 0.57,
      "ap": 0.08,
      "ms": 69,
      "cc": 0.95
    },
    "R": {
      "kind": "teamUlt",
      "base": 197,
      "perLevel": 106,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 1.02
    }
  },
  "Gangplank": {
    "id": "Gangplank",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "void",
    "Q": {
      "kind": "sweetspot",
      "base": 89,
      "perLevel": 32,
      "ad": 0.9,
      "ap": 0.05,
      "heal": 0.21,
      "cc": 0.32
    },
    "W": {
      "kind": "guard",
      "base": 52,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.17
    },
    "E": {
      "kind": "dash",
      "base": 60,
      "perLevel": 24,
      "ad": 0.7,
      "ap": 0.08,
      "ms": 79,
      "cc": 0.14
    },
    "R": {
      "kind": "duelUlt",
      "base": 188,
      "perLevel": 99,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.3
    }
  },
  "Garen": {
    "id": "Garen",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "iron",
    "Q": {
      "kind": "cleave",
      "base": 76,
      "perLevel": 22,
      "ad": 0.65,
      "ap": 0.05,
      "heal": 0.15,
      "cc": 0.5
    },
    "W": {
      "kind": "guard",
      "base": 47,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.28
    },
    "E": {
      "kind": "dash",
      "base": 63,
      "perLevel": 24,
      "ad": 0.7,
      "ap": 0.08,
      "ms": 82,
      "cc": 0.22
    },
    "R": {
      "kind": "duelUlt",
      "base": 180,
      "perLevel": 93,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.47
    }
  },
  "Gnar": {
    "id": "Gnar",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "blood",
    "Q": {
      "kind": "sweetspot",
      "base": 90,
      "perLevel": 31,
      "ad": 0.87,
      "ap": 0.05,
      "heal": 0.21,
      "cc": 0.7
    },
    "W": {
      "kind": "guard",
      "base": 55,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.39
    },
    "E": {
      "kind": "cleave",
      "base": 59,
      "perLevel": 21,
      "ad": 0.63,
      "ap": 0.08,
      "ms": 76,
      "cc": 0.31
    },
    "R": {
      "kind": "duelUlt",
      "base": 199,
      "perLevel": 103,
      "ad": 1.4,
      "ap": 0.1,
      "execute": 0.4,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.66
    }
  },
  "Gragas": {
    "id": "Gragas",
    "combatClass": "fighter",
    "damageType": "magic",
    "flavor": "shadow",
    "Q": {
      "kind": "engageStrike",
      "base": 74,
      "perLevel": 25,
      "ad": 0.15,
      "ap": 0.69,
      "heal": 0.17,
      "cc": 0.77
    },
    "W": {
      "kind": "guard",
      "base": 55,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.42
    },
    "E": {
      "kind": "cleave",
      "base": 57,
      "perLevel": 20,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 71,
      "cc": 0.34
    },
    "R": {
      "kind": "duelUlt",
      "base": 194,
      "perLevel": 103,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.72
    }
  },
  "Graves": {
    "id": "Graves",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "flame",
    "Q": {
      "kind": "steroid",
      "base": 79,
      "perLevel": 27,
      "ad": 0.78,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.36
    },
    "W": {
      "kind": "poke",
      "base": 47,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.2
    },
    "E": {
      "kind": "dash",
      "base": 57,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.08,
      "ms": 74,
      "cc": 0.16
    },
    "R": {
      "kind": "executeUlt",
      "base": 171,
      "perLevel": 92,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": false,
      "heal": 0,
      "cc": 0.34
    }
  },
  "Gwen": {
    "id": "Gwen",
    "combatClass": "fighter",
    "damageType": "magic",
    "flavor": "iron",
    "Q": {
      "kind": "cleave",
      "base": 77,
      "perLevel": 25,
      "ad": 0.15,
      "ap": 0.69,
      "heal": 0.17,
      "cc": 0.54
    },
    "W": {
      "kind": "guard",
      "base": 54,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.3
    },
    "E": {
      "kind": "dash",
      "base": 64,
      "perLevel": 24,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 83,
      "cc": 0.24
    },
    "R": {
      "kind": "duelUlt",
      "base": 203,
      "perLevel": 102,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.43,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.51
    }
  },
  "Hecarim": {
    "id": "Hecarim",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "engageStrike",
      "base": 68,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.05,
      "heal": 0.14,
      "cc": 0.79
    },
    "W": {
      "kind": "guard",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.44
    },
    "E": {
      "kind": "cleave",
      "base": 62,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.08,
      "ms": 80,
      "cc": 0.35
    },
    "R": {
      "kind": "duelUlt",
      "base": 192,
      "perLevel": 101,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.75
    }
  },
  "Heimerdinger": {
    "id": "Heimerdinger",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "iron",
    "Q": {
      "kind": "poke",
      "base": 91,
      "perLevel": 32,
      "ad": 0.15,
      "ap": 0.83,
      "heal": 0,
      "cc": 0.27
    },
    "W": {
      "kind": "zone",
      "base": 51,
      "perLevel": 22,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.24,
      "cc": 0.15
    },
    "E": {
      "kind": "snare",
      "base": 50,
      "perLevel": 20,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 62,
      "cc": 0.79
    },
    "R": {
      "kind": "teamUlt",
      "base": 192,
      "perLevel": 98,
      "ad": 0.2,
      "ap": 0.93,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.26
    }
  },
  "Hwei": {
    "id": "Hwei",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "shadow",
    "Q": {
      "kind": "poke",
      "base": 93,
      "perLevel": 35,
      "ad": 0.15,
      "ap": 0.87,
      "heal": 0,
      "cc": 0.32
    },
    "W": {
      "kind": "zone",
      "base": 53,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.25,
      "cc": 0.17
    },
    "E": {
      "kind": "snare",
      "base": 49,
      "perLevel": 20,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 61,
      "cc": 0.8
    },
    "R": {
      "kind": "teamUlt",
      "base": 197,
      "perLevel": 101,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.3
    }
  },
  "Illaoi": {
    "id": "Illaoi",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "sweetspot",
      "base": 83,
      "perLevel": 28,
      "ad": 0.8,
      "ap": 0.05,
      "heal": 0.19,
      "cc": 0.41
    },
    "W": {
      "kind": "guard",
      "base": 45,
      "perLevel": 20,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.23
    },
    "E": {
      "kind": "dash",
      "base": 63,
      "perLevel": 25,
      "ad": 0.71,
      "ap": 0.08,
      "ms": 83,
      "cc": 0.18
    },
    "R": {
      "kind": "duelUlt",
      "base": 175,
      "perLevel": 90,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.38
    }
  },
  "Irelia": {
    "id": "Irelia",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "blood",
    "Q": {
      "kind": "engageStrike",
      "base": 79,
      "perLevel": 23,
      "ad": 0.68,
      "ap": 0.05,
      "heal": 0.15,
      "cc": 0.65
    },
    "W": {
      "kind": "guard",
      "base": 49,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.36
    },
    "E": {
      "kind": "dash",
      "base": 63,
      "perLevel": 23,
      "ad": 0.68,
      "ap": 0.08,
      "ms": 82,
      "cc": 0.29
    },
    "R": {
      "kind": "duelUlt",
      "base": 182,
      "perLevel": 95,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.61
    }
  },
  "Ivern": {
    "id": "Ivern",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "light",
    "Q": {
      "kind": "poke",
      "base": 70,
      "perLevel": 26,
      "ad": 0.15,
      "ap": 0.71,
      "heal": 0,
      "cc": 0.36
    },
    "W": {
      "kind": "shield",
      "base": 51,
      "perLevel": 22,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.26,
      "cc": 0.2
    },
    "E": {
      "kind": "peel",
      "base": 47,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 58,
      "cc": 0.82
    },
    "R": {
      "kind": "teamUlt",
      "base": 185,
      "perLevel": 98,
      "ad": 0.2,
      "ap": 0.93,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.64
    }
  },
  "Janna": {
    "id": "Janna",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "storm",
    "Q": {
      "kind": "poke",
      "base": 77,
      "perLevel": 27,
      "ad": 0.15,
      "ap": 0.73,
      "heal": 0,
      "cc": 0.32
    },
    "W": {
      "kind": "shield",
      "base": 54,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.25,
      "cc": 0.17
    },
    "E": {
      "kind": "peel",
      "base": 44,
      "perLevel": 18,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 53,
      "cc": 0.8
    },
    "R": {
      "kind": "teamUlt",
      "base": 191,
      "perLevel": 102,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.6
    }
  },
  "JarvanIV": {
    "id": "JarvanIV",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "engageStrike",
      "base": 71,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0.15,
      "cc": 0.83
    },
    "W": {
      "kind": "guard",
      "base": 56,
      "perLevel": 25,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.46
    },
    "E": {
      "kind": "cleave",
      "base": 59,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 74,
      "cc": 0.37
    },
    "R": {
      "kind": "duelUlt",
      "base": 190,
      "perLevel": 105,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.78
    }
  },
  "Jax": {
    "id": "Jax",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "iron",
    "Q": {
      "kind": "cleave",
      "base": 73,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0.15,
      "cc": 0.54
    },
    "W": {
      "kind": "guard",
      "base": 47,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.3
    },
    "E": {
      "kind": "dash",
      "base": 67,
      "perLevel": 25,
      "ad": 0.73,
      "ap": 0.08,
      "ms": 89,
      "cc": 0.24
    },
    "R": {
      "kind": "duelUlt",
      "base": 178,
      "perLevel": 92,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.51
    }
  },
  "Jayce": {
    "id": "Jayce",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "light",
    "Q": {
      "kind": "sweetspot",
      "base": 97,
      "perLevel": 34,
      "ad": 0.96,
      "ap": 0.05,
      "heal": 0.23,
      "cc": 0.32
    },
    "W": {
      "kind": "guard",
      "base": 47,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.17
    },
    "E": {
      "kind": "dash",
      "base": 57,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.08,
      "ms": 73,
      "cc": 0.14
    },
    "R": {
      "kind": "duelUlt",
      "base": 171,
      "perLevel": 92,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.3
    }
  },
  "Jhin": {
    "id": "Jhin",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "poke",
      "base": 88,
      "perLevel": 32,
      "ad": 0.89,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.41
    },
    "W": {
      "kind": "poke",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.23
    },
    "E": {
      "kind": "dash",
      "base": 52,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 65,
      "cc": 0.18
    },
    "R": {
      "kind": "executeUlt",
      "base": 202,
      "perLevel": 101,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": true,
      "heal": 0,
      "cc": 0.38
    }
  },
  "Jinx": {
    "id": "Jinx",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "iron",
    "Q": {
      "kind": "poke",
      "base": 80,
      "perLevel": 28,
      "ad": 0.8,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.23
    },
    "W": {
      "kind": "poke",
      "base": 57,
      "perLevel": 25,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.13
    },
    "E": {
      "kind": "dash",
      "base": 48,
      "perLevel": 20,
      "ad": 0.59,
      "ap": 0.08,
      "ms": 59,
      "cc": 0.1
    },
    "R": {
      "kind": "executeUlt",
      "base": 209,
      "perLevel": 106,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": true,
      "heal": 0,
      "cc": 0.21
    }
  },
  "Kaisa": {
    "id": "Kaisa",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "iron",
    "Q": {
      "kind": "steroid",
      "base": 79,
      "perLevel": 26,
      "ad": 0.75,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.5
    },
    "W": {
      "kind": "poke",
      "base": 55,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.28
    },
    "E": {
      "kind": "dash",
      "base": 55,
      "perLevel": 21,
      "ad": 0.61,
      "ap": 0.08,
      "ms": 69,
      "cc": 0.22
    },
    "R": {
      "kind": "executeUlt",
      "base": 197,
      "perLevel": 103,
      "ad": 1.38,
      "ap": 0.1,
      "execute": 0.39,
      "aoe": true,
      "heal": 0,
      "cc": 0.47
    }
  },
  "Kalista": {
    "id": "Kalista",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "steroid",
      "base": 85,
      "perLevel": 26,
      "ad": 0.75,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.68
    },
    "W": {
      "kind": "poke",
      "base": 51,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.38
    },
    "E": {
      "kind": "dash",
      "base": 56,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 71,
      "cc": 0.3
    },
    "R": {
      "kind": "executeUlt",
      "base": 197,
      "perLevel": 98,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": false,
      "heal": 0,
      "cc": 0.64
    }
  },
  "Karma": {
    "id": "Karma",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "blood",
    "Q": {
      "kind": "poke",
      "base": 90,
      "perLevel": 32,
      "ad": 0.15,
      "ap": 0.83,
      "heal": 0,
      "cc": 0.41
    },
    "W": {
      "kind": "zone",
      "base": 53,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.27,
      "cc": 0.23
    },
    "E": {
      "kind": "snare",
      "base": 48,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 59,
      "cc": 0.83
    },
    "R": {
      "kind": "teamUlt",
      "base": 195,
      "perLevel": 100,
      "ad": 0.2,
      "ap": 0.94,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.38
    }
  },
  "Karthus": {
    "id": "Karthus",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "flame",
    "Q": {
      "kind": "poke",
      "base": 80,
      "perLevel": 31,
      "ad": 0.15,
      "ap": 0.8,
      "heal": 0,
      "cc": 0.23
    },
    "W": {
      "kind": "zone",
      "base": 56,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.24,
      "cc": 0.13
    },
    "E": {
      "kind": "snare",
      "base": 44,
      "perLevel": 18,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 53,
      "cc": 0.77
    },
    "R": {
      "kind": "teamUlt",
      "base": 206,
      "perLevel": 104,
      "ad": 0.2,
      "ap": 0.96,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.21
    }
  },
  "Kassadin": {
    "id": "Kassadin",
    "combatClass": "assassin",
    "damageType": "physical",
    "flavor": "flame",
    "Q": {
      "kind": "gapclose",
      "base": 70,
      "perLevel": 26,
      "ad": 0.75,
      "ap": 0.05,
      "heal": 0.17,
      "cc": 0.5
    },
    "W": {
      "kind": "fade",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.28
    },
    "E": {
      "kind": "strike",
      "base": 61,
      "perLevel": 23,
      "ad": 0.68,
      "ap": 0.08,
      "ms": 79,
      "cc": 0.22
    },
    "R": {
      "kind": "assassinate",
      "base": 183,
      "perLevel": 100,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": true,
      "heal": 0,
      "cc": 0.47
    }
  },
  "Katarina": {
    "id": "Katarina",
    "combatClass": "assassin",
    "damageType": "magic",
    "flavor": "frost",
    "Q": {
      "kind": "gapclose",
      "base": 72,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0.15,
      "cc": 0.77
    },
    "W": {
      "kind": "fade",
      "base": 56,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.42
    },
    "E": {
      "kind": "strike",
      "base": 59,
      "perLevel": 21,
      "ad": 0.61,
      "ap": 0.08,
      "ms": 75,
      "cc": 0.34
    },
    "R": {
      "kind": "assassinate",
      "base": 189,
      "perLevel": 104,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": true,
      "heal": 0,
      "cc": 0.72
    }
  },
  "Kayle": {
    "id": "Kayle",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "light",
    "Q": {
      "kind": "burst",
      "base": 73,
      "perLevel": 28,
      "ad": 0.15,
      "ap": 0.74,
      "heal": 0,
      "cc": 0.18
    },
    "W": {
      "kind": "zone",
      "base": 54,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.23,
      "cc": 0.1
    },
    "E": {
      "kind": "snare",
      "base": 56,
      "perLevel": 23,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 72,
      "cc": 0.76
    },
    "R": {
      "kind": "teamUlt",
      "base": 206,
      "perLevel": 102,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.17
    }
  },
  "Kayn": {
    "id": "Kayn",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "engageStrike",
      "base": 69,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.7
    },
    "W": {
      "kind": "guard",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.39
    },
    "E": {
      "kind": "dash",
      "base": 64,
      "perLevel": 23,
      "ad": 0.68,
      "ap": 0.08,
      "ms": 84,
      "cc": 0.31
    },
    "R": {
      "kind": "duelUlt",
      "base": 190,
      "perLevel": 100,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.66
    }
  },
  "Kennen": {
    "id": "Kennen",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "shadow",
    "Q": {
      "kind": "poke",
      "base": 87,
      "perLevel": 31,
      "ad": 0.15,
      "ap": 0.8,
      "heal": 0,
      "cc": 0.77
    },
    "W": {
      "kind": "zone",
      "base": 57,
      "perLevel": 25,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.33,
      "cc": 0.42
    },
    "E": {
      "kind": "snare",
      "base": 58,
      "perLevel": 20,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 73,
      "cc": 0.95
    },
    "R": {
      "kind": "teamUlt",
      "base": 204,
      "perLevel": 106,
      "ad": 0.2,
      "ap": 0.97,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.72
    }
  },
  "Khazix": {
    "id": "Khazix",
    "combatClass": "assassin",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "gapclose",
      "base": 70,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.72
    },
    "W": {
      "kind": "fade",
      "base": 50,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.4
    },
    "E": {
      "kind": "strike",
      "base": 61,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.08,
      "ms": 78,
      "cc": 0.32
    },
    "R": {
      "kind": "assassinate",
      "base": 177,
      "perLevel": 96,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": false,
      "heal": 0,
      "cc": 0.68
    }
  },
  "Kindred": {
    "id": "Kindred",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "poke",
      "base": 78,
      "perLevel": 28,
      "ad": 0.8,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.54
    },
    "W": {
      "kind": "poke",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.3
    },
    "E": {
      "kind": "dash",
      "base": 57,
      "perLevel": 21,
      "ad": 0.63,
      "ap": 0.08,
      "ms": 72,
      "cc": 0.24
    },
    "R": {
      "kind": "executeUlt",
      "base": 200,
      "perLevel": 100,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": true,
      "heal": 0,
      "cc": 0.51
    }
  },
  "Kled": {
    "id": "Kled",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "blood",
    "Q": {
      "kind": "engageStrike",
      "base": 81,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.74
    },
    "W": {
      "kind": "guard",
      "base": 47,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.41
    },
    "E": {
      "kind": "dash",
      "base": 65,
      "perLevel": 23,
      "ad": 0.68,
      "ap": 0.08,
      "ms": 85,
      "cc": 0.33
    },
    "R": {
      "kind": "duelUlt",
      "base": 178,
      "perLevel": 92,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.7
    }
  },
  "KogMaw": {
    "id": "KogMaw",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "blood",
    "Q": {
      "kind": "poke",
      "base": 86,
      "perLevel": 33,
      "ad": 0.93,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.14
    },
    "W": {
      "kind": "poke",
      "base": 56,
      "perLevel": 25,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.07
    },
    "E": {
      "kind": "dash",
      "base": 45,
      "perLevel": 19,
      "ad": 0.57,
      "ap": 0.08,
      "ms": 55,
      "cc": 0.06
    },
    "R": {
      "kind": "executeUlt",
      "base": 208,
      "perLevel": 105,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": true,
      "heal": 0,
      "cc": 0.13
    }
  },
  "KSante": {
    "id": "KSante",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "flame",
    "Q": {
      "kind": "hook",
      "base": 78,
      "perLevel": 24,
      "ad": 0.71,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.63
    },
    "W": {
      "kind": "guard",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.3,
      "cc": 0.35
    },
    "E": {
      "kind": "wave",
      "base": 59,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.08,
      "ms": 76,
      "cc": 0.91
    },
    "R": {
      "kind": "teamUlt",
      "base": 189,
      "perLevel": 101,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 0.9
    }
  },
  "Leblanc": {
    "id": "Leblanc",
    "combatClass": "assassin",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "gapclose",
      "base": 92,
      "perLevel": 32,
      "ad": 0.89,
      "ap": 0.05,
      "heal": 0.21,
      "cc": 0.63
    },
    "W": {
      "kind": "fade",
      "base": 48,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.35
    },
    "E": {
      "kind": "strike",
      "base": 56,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 70,
      "cc": 0.28
    },
    "R": {
      "kind": "assassinate",
      "base": 174,
      "perLevel": 94,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": false,
      "heal": 0,
      "cc": 0.59
    }
  },
  "LeeSin": {
    "id": "LeeSin",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "light",
    "Q": {
      "kind": "engageStrike",
      "base": 73,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.77
    },
    "W": {
      "kind": "guard",
      "base": 51,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.42
    },
    "E": {
      "kind": "cleave",
      "base": 59,
      "perLevel": 21,
      "ad": 0.61,
      "ap": 0.08,
      "ms": 75,
      "cc": 0.34
    },
    "R": {
      "kind": "duelUlt",
      "base": 172,
      "perLevel": 98,
      "ad": 1.2,
      "ap": 0.1,
      "execute": 0.3,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.72
    }
  },
  "Leona": {
    "id": "Leona",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "iron",
    "Q": {
      "kind": "hook",
      "base": 73,
      "perLevel": 21,
      "ad": 0.62,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.85
    },
    "W": {
      "kind": "guard",
      "base": 56,
      "perLevel": 25,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.34,
      "cc": 0.47
    },
    "E": {
      "kind": "wave",
      "base": 53,
      "perLevel": 18,
      "ad": 0.54,
      "ap": 0.08,
      "ms": 65,
      "cc": 0.98
    },
    "R": {
      "kind": "teamUlt",
      "base": 193,
      "perLevel": 105,
      "ad": 1.3,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 1.11
    }
  },
  "Lillia": {
    "id": "Lillia",
    "combatClass": "fighter",
    "damageType": "magic",
    "flavor": "frost",
    "Q": {
      "kind": "sweetspot",
      "base": 82,
      "perLevel": 31,
      "ad": 0.15,
      "ap": 0.8,
      "heal": 0.2,
      "cc": 0.5
    },
    "W": {
      "kind": "guard",
      "base": 55,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.28
    },
    "E": {
      "kind": "cleave",
      "base": 58,
      "perLevel": 22,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 75,
      "cc": 0.22
    },
    "R": {
      "kind": "duelUlt",
      "base": 194,
      "perLevel": 103,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.47
    }
  },
  "Lissandra": {
    "id": "Lissandra",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "iron",
    "Q": {
      "kind": "burst",
      "base": 82,
      "perLevel": 28,
      "ad": 0.15,
      "ap": 0.74,
      "heal": 0,
      "cc": 0.77
    },
    "W": {
      "kind": "zone",
      "base": 56,
      "perLevel": 25,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.33,
      "cc": 0.42
    },
    "E": {
      "kind": "snare",
      "base": 55,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 69,
      "cc": 0.95
    },
    "R": {
      "kind": "teamUlt",
      "base": 203,
      "perLevel": 105,
      "ad": 0.2,
      "ap": 0.97,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.72
    }
  },
  "Lucian": {
    "id": "Lucian",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "light",
    "Q": {
      "kind": "steroid",
      "base": 86,
      "perLevel": 27,
      "ad": 0.78,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.59
    },
    "W": {
      "kind": "poke",
      "base": 52,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.33
    },
    "E": {
      "kind": "dash",
      "base": 56,
      "perLevel": 21,
      "ad": 0.61,
      "ap": 0.08,
      "ms": 71,
      "cc": 0.26
    },
    "R": {
      "kind": "executeUlt",
      "base": 178,
      "perLevel": 99,
      "ad": 1.25,
      "ap": 0.1,
      "execute": 0.33,
      "aoe": false,
      "heal": 0,
      "cc": 0.55
    }
  },
  "Lulu": {
    "id": "Lulu",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "storm",
    "Q": {
      "kind": "poke",
      "base": 79,
      "perLevel": 26,
      "ad": 0.15,
      "ap": 0.71,
      "heal": 0,
      "cc": 0.32
    },
    "W": {
      "kind": "shield",
      "base": 56,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.25,
      "cc": 0.17
    },
    "E": {
      "kind": "peel",
      "base": 44,
      "perLevel": 18,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 53,
      "cc": 0.8
    },
    "R": {
      "kind": "teamUlt",
      "base": 194,
      "perLevel": 104,
      "ad": 0.2,
      "ap": 0.96,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.6
    }
  },
  "Lux": {
    "id": "Lux",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "void",
    "Q": {
      "kind": "poke",
      "base": 92,
      "perLevel": 34,
      "ad": 0.15,
      "ap": 0.86,
      "heal": 0,
      "cc": 0.36
    },
    "W": {
      "kind": "zone",
      "base": 53,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.26,
      "cc": 0.2
    },
    "E": {
      "kind": "snare",
      "base": 47,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 58,
      "cc": 0.82
    },
    "R": {
      "kind": "teamUlt",
      "base": 195,
      "perLevel": 100,
      "ad": 0.2,
      "ap": 0.94,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.34
    }
  },
  "Malphite": {
    "id": "Malphite",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "hook",
      "base": 70,
      "perLevel": 24,
      "ad": 0.71,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.85
    },
    "W": {
      "kind": "guard",
      "base": 58,
      "perLevel": 25,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.34,
      "cc": 0.47
    },
    "E": {
      "kind": "wave",
      "base": 57,
      "perLevel": 19,
      "ad": 0.57,
      "ap": 0.08,
      "ms": 71,
      "cc": 0.98
    },
    "R": {
      "kind": "teamUlt",
      "base": 198,
      "perLevel": 107,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 1.11
    }
  },
  "Malzahar": {
    "id": "Malzahar",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "storm",
    "Q": {
      "kind": "poke",
      "base": 83,
      "perLevel": 29,
      "ad": 0.15,
      "ap": 0.76,
      "heal": 0,
      "cc": 0.5
    },
    "W": {
      "kind": "zone",
      "base": 53,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.28,
      "cc": 0.28
    },
    "E": {
      "kind": "snare",
      "base": 55,
      "perLevel": 21,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 69,
      "cc": 0.86
    },
    "R": {
      "kind": "teamUlt",
      "base": 197,
      "perLevel": 101,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.47
    }
  },
  "Maokai": {
    "id": "Maokai",
    "combatClass": "tank",
    "damageType": "magic",
    "flavor": "blood",
    "Q": {
      "kind": "hook",
      "base": 74,
      "perLevel": 26,
      "ad": 0.15,
      "ap": 0.71,
      "heal": 0,
      "cc": 0.72
    },
    "W": {
      "kind": "guard",
      "base": 56,
      "perLevel": 25,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.32,
      "cc": 0.4
    },
    "E": {
      "kind": "wave",
      "base": 56,
      "perLevel": 20,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 70,
      "cc": 0.94
    },
    "R": {
      "kind": "teamUlt",
      "base": 195,
      "perLevel": 105,
      "ad": 0.2,
      "ap": 0.97,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 0.98
    }
  },
  "MasterYi": {
    "id": "MasterYi",
    "combatClass": "assassin",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "gapclose",
      "base": 63,
      "perLevel": 21,
      "ad": 0.62,
      "ap": 0.05,
      "heal": 0.14,
      "cc": 0.54
    },
    "W": {
      "kind": "fade",
      "base": 51,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.3
    },
    "E": {
      "kind": "strike",
      "base": 63,
      "perLevel": 24,
      "ad": 0.69,
      "ap": 0.08,
      "ms": 82,
      "cc": 0.24
    },
    "R": {
      "kind": "assassinate",
      "base": 180,
      "perLevel": 98,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": false,
      "heal": 0,
      "cc": 0.51
    }
  },
  "Milio": {
    "id": "Milio",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "flame",
    "Q": {
      "kind": "poke",
      "base": 79,
      "perLevel": 27,
      "ad": 0.15,
      "ap": 0.73,
      "heal": 0,
      "cc": 0.27
    },
    "W": {
      "kind": "shield",
      "base": 55,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.24,
      "cc": 0.15
    },
    "E": {
      "kind": "peel",
      "base": 43,
      "perLevel": 18,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 52,
      "cc": 0.79
    },
    "R": {
      "kind": "teamUlt",
      "base": 192,
      "perLevel": 103,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.55
    }
  },
  "MissFortune": {
    "id": "MissFortune",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "poke",
      "base": 88,
      "perLevel": 31,
      "ad": 0.86,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.5
    },
    "W": {
      "kind": "poke",
      "base": 56,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.28
    },
    "E": {
      "kind": "dash",
      "base": 52,
      "perLevel": 20,
      "ad": 0.59,
      "ap": 0.08,
      "ms": 65,
      "cc": 0.22
    },
    "R": {
      "kind": "executeUlt",
      "base": 194,
      "perLevel": 104,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.36,
      "aoe": true,
      "heal": 0,
      "cc": 0.47
    }
  },
  "MonkeyKing": {
    "id": "MonkeyKing",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "engageStrike",
      "base": 72,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0.15,
      "cc": 0.79
    },
    "W": {
      "kind": "guard",
      "base": 56,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.44
    },
    "E": {
      "kind": "cleave",
      "base": 59,
      "perLevel": 21,
      "ad": 0.61,
      "ap": 0.08,
      "ms": 76,
      "cc": 0.35
    },
    "R": {
      "kind": "duelUlt",
      "base": 196,
      "perLevel": 104,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.75
    }
  },
  "Mordekaiser": {
    "id": "Mordekaiser",
    "combatClass": "fighter",
    "damageType": "magic",
    "flavor": "flame",
    "Q": {
      "kind": "engageStrike",
      "base": 80,
      "perLevel": 25,
      "ad": 0.15,
      "ap": 0.69,
      "heal": 0.17,
      "cc": 0.63
    },
    "W": {
      "kind": "guard",
      "base": 53,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.35
    },
    "E": {
      "kind": "dash",
      "base": 62,
      "perLevel": 23,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 80,
      "cc": 0.28
    },
    "R": {
      "kind": "duelUlt",
      "base": 192,
      "perLevel": 101,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.59
    }
  },
  "Morgana": {
    "id": "Morgana",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "frost",
    "Q": {
      "kind": "poke",
      "base": 82,
      "perLevel": 30,
      "ad": 0.15,
      "ap": 0.78,
      "heal": 0,
      "cc": 0.63
    },
    "W": {
      "kind": "zone",
      "base": 54,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.3,
      "cc": 0.35
    },
    "E": {
      "kind": "snare",
      "base": 52,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 64,
      "cc": 0.91
    },
    "R": {
      "kind": "teamUlt",
      "base": 198,
      "perLevel": 102,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.59
    }
  },
  "Naafiri": {
    "id": "Naafiri",
    "combatClass": "assassin",
    "damageType": "physical",
    "flavor": "blood",
    "Q": {
      "kind": "gapclose",
      "base": 75,
      "perLevel": 24,
      "ad": 0.71,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.72
    },
    "W": {
      "kind": "fade",
      "base": 52,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.4
    },
    "E": {
      "kind": "strike",
      "base": 61,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.08,
      "ms": 78,
      "cc": 0.32
    },
    "R": {
      "kind": "assassinate",
      "base": 181,
      "perLevel": 99,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": false,
      "heal": 0,
      "cc": 0.68
    }
  },
  "Nami": {
    "id": "Nami",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "void",
    "Q": {
      "kind": "poke",
      "base": 86,
      "perLevel": 30,
      "ad": 0.15,
      "ap": 0.78,
      "heal": 0,
      "cc": 0.5
    },
    "W": {
      "kind": "shield",
      "base": 54,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.28,
      "cc": 0.28
    },
    "E": {
      "kind": "peel",
      "base": 47,
      "perLevel": 18,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 57,
      "cc": 0.86
    },
    "R": {
      "kind": "teamUlt",
      "base": 191,
      "perLevel": 102,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.77
    }
  },
  "Nasus": {
    "id": "Nasus",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "flame",
    "Q": {
      "kind": "cleave",
      "base": 68,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.36
    },
    "W": {
      "kind": "guard",
      "base": 47,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.2
    },
    "E": {
      "kind": "dash",
      "base": 64,
      "perLevel": 25,
      "ad": 0.72,
      "ap": 0.08,
      "ms": 84,
      "cc": 0.16
    },
    "R": {
      "kind": "duelUlt",
      "base": 178,
      "perLevel": 92,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.34
    }
  },
  "Nautilus": {
    "id": "Nautilus",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "hook",
      "base": 71,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.85
    },
    "W": {
      "kind": "guard",
      "base": 56,
      "perLevel": 25,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.34,
      "cc": 0.47
    },
    "E": {
      "kind": "wave",
      "base": 54,
      "perLevel": 18,
      "ad": 0.55,
      "ap": 0.08,
      "ms": 67,
      "cc": 0.98
    },
    "R": {
      "kind": "teamUlt",
      "base": 195,
      "perLevel": 105,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 1.11
    }
  },
  "Neeko": {
    "id": "Neeko",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "storm",
    "Q": {
      "kind": "poke",
      "base": 83,
      "perLevel": 29,
      "ad": 0.15,
      "ap": 0.76,
      "heal": 0,
      "cc": 0.72
    },
    "W": {
      "kind": "zone",
      "base": 55,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.32,
      "cc": 0.4
    },
    "E": {
      "kind": "snare",
      "base": 55,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 68,
      "cc": 0.94
    },
    "R": {
      "kind": "teamUlt",
      "base": 199,
      "perLevel": 103,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.68
    }
  },
  "Nidalee": {
    "id": "Nidalee",
    "combatClass": "assassin",
    "damageType": "physical",
    "flavor": "light",
    "Q": {
      "kind": "gapclose",
      "base": 86,
      "perLevel": 33,
      "ad": 0.93,
      "ap": 0.05,
      "heal": 0.22,
      "cc": 0.41
    },
    "W": {
      "kind": "fade",
      "base": 47,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.23
    },
    "E": {
      "kind": "strike",
      "base": 54,
      "perLevel": 21,
      "ad": 0.63,
      "ap": 0.08,
      "ms": 69,
      "cc": 0.18
    },
    "R": {
      "kind": "assassinate",
      "base": 171,
      "perLevel": 92,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": false,
      "heal": 0,
      "cc": 0.38
    }
  },
  "Nilah": {
    "id": "Nilah",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "blood",
    "Q": {
      "kind": "engageStrike",
      "base": 74,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0.15,
      "cc": 0.68
    },
    "W": {
      "kind": "guard",
      "base": 56,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.38
    },
    "E": {
      "kind": "cleave",
      "base": 56,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 71,
      "cc": 0.3
    },
    "R": {
      "kind": "duelUlt",
      "base": 196,
      "perLevel": 104,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.64
    }
  },
  "Nocturne": {
    "id": "Nocturne",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "flame",
    "Q": {
      "kind": "engageStrike",
      "base": 68,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.05,
      "heal": 0.14,
      "cc": 0.81
    },
    "W": {
      "kind": "guard",
      "base": 54,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.45
    },
    "E": {
      "kind": "cleave",
      "base": 59,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 74,
      "cc": 0.36
    },
    "R": {
      "kind": "duelUlt",
      "base": 193,
      "perLevel": 102,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.77
    }
  },
  "Nunu": {
    "id": "Nunu",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "flame",
    "Q": {
      "kind": "hook",
      "base": 65,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.72
    },
    "W": {
      "kind": "guard",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.32,
      "cc": 0.4
    },
    "E": {
      "kind": "wave",
      "base": 56,
      "perLevel": 20,
      "ad": 0.59,
      "ap": 0.08,
      "ms": 70,
      "cc": 0.94
    },
    "R": {
      "kind": "teamUlt",
      "base": 188,
      "perLevel": 100,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 0.98
    }
  },
  "Olaf": {
    "id": "Olaf",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "engageStrike",
      "base": 79,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0.15,
      "cc": 0.72
    },
    "W": {
      "kind": "guard",
      "base": 51,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.4
    },
    "E": {
      "kind": "dash",
      "base": 65,
      "perLevel": 23,
      "ad": 0.68,
      "ap": 0.08,
      "ms": 85,
      "cc": 0.32
    },
    "R": {
      "kind": "duelUlt",
      "base": 187,
      "perLevel": 98,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.68
    }
  },
  "Orianna": {
    "id": "Orianna",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "flame",
    "Q": {
      "kind": "poke",
      "base": 88,
      "perLevel": 32,
      "ad": 0.15,
      "ap": 0.81,
      "heal": 0,
      "cc": 0.68
    },
    "W": {
      "kind": "zone",
      "base": 58,
      "perLevel": 25,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.31,
      "cc": 0.38
    },
    "E": {
      "kind": "snare",
      "base": 54,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 67,
      "cc": 0.92
    },
    "R": {
      "kind": "teamUlt",
      "base": 205,
      "perLevel": 107,
      "ad": 0.2,
      "ap": 0.98,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.64
    }
  },
  "Ornn": {
    "id": "Ornn",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "hook",
      "base": 72,
      "perLevel": 25,
      "ad": 0.73,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.77
    },
    "W": {
      "kind": "guard",
      "base": 57,
      "perLevel": 25,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.33,
      "cc": 0.42
    },
    "E": {
      "kind": "wave",
      "base": 54,
      "perLevel": 19,
      "ad": 0.56,
      "ap": 0.08,
      "ms": 67,
      "cc": 0.95
    },
    "R": {
      "kind": "teamUlt",
      "base": 207,
      "perLevel": 106,
      "ad": 1.43,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 1.02
    }
  },
  "Pantheon": {
    "id": "Pantheon",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "sweetspot",
      "base": 85,
      "perLevel": 28,
      "ad": 0.8,
      "ap": 0.05,
      "heal": 0.19,
      "cc": 0.77
    },
    "W": {
      "kind": "guard",
      "base": 52,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.42
    },
    "E": {
      "kind": "cleave",
      "base": 59,
      "perLevel": 21,
      "ad": 0.61,
      "ap": 0.08,
      "ms": 75,
      "cc": 0.34
    },
    "R": {
      "kind": "duelUlt",
      "base": 188,
      "perLevel": 99,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.72
    }
  },
  "Poppy": {
    "id": "Poppy",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "hook",
      "base": 74,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.63
    },
    "W": {
      "kind": "guard",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.3,
      "cc": 0.35
    },
    "E": {
      "kind": "wave",
      "base": 57,
      "perLevel": 21,
      "ad": 0.61,
      "ap": 0.08,
      "ms": 72,
      "cc": 0.91
    },
    "R": {
      "kind": "teamUlt",
      "base": 188,
      "perLevel": 100,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 0.9
    }
  },
  "Pyke": {
    "id": "Pyke",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "shadow",
    "Q": {
      "kind": "hook",
      "base": 81,
      "perLevel": 25,
      "ad": 0.15,
      "ap": 0.69,
      "heal": 0,
      "cc": 0.81
    },
    "W": {
      "kind": "shield",
      "base": 51,
      "perLevel": 22,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.34,
      "cc": 0.45
    },
    "E": {
      "kind": "peel",
      "base": 56,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 70,
      "cc": 0.97
    },
    "R": {
      "kind": "teamUlt",
      "base": 185,
      "perLevel": 98,
      "ad": 0.2,
      "ap": 0.93,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 1.06
    }
  },
  "Qiyana": {
    "id": "Qiyana",
    "combatClass": "assassin",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "gapclose",
      "base": 78,
      "perLevel": 25,
      "ad": 0.73,
      "ap": 0.05,
      "heal": 0.17,
      "cc": 0.77
    },
    "W": {
      "kind": "fade",
      "base": 54,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.42
    },
    "E": {
      "kind": "strike",
      "base": 60,
      "perLevel": 21,
      "ad": 0.63,
      "ap": 0.08,
      "ms": 77,
      "cc": 0.34
    },
    "R": {
      "kind": "assassinate",
      "base": 186,
      "perLevel": 102,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": true,
      "heal": 0,
      "cc": 0.72
    }
  },
  "Quinn": {
    "id": "Quinn",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "poke",
      "base": 91,
      "perLevel": 31,
      "ad": 0.86,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.36
    },
    "W": {
      "kind": "poke",
      "base": 44,
      "perLevel": 19,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.2
    },
    "E": {
      "kind": "dash",
      "base": 62,
      "perLevel": 25,
      "ad": 0.71,
      "ap": 0.08,
      "ms": 82,
      "cc": 0.16
    },
    "R": {
      "kind": "executeUlt",
      "base": 182,
      "perLevel": 88,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": false,
      "heal": 0,
      "cc": 0.34
    }
  },
  "Rakan": {
    "id": "Rakan",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "iron",
    "Q": {
      "kind": "hook",
      "base": 74,
      "perLevel": 23,
      "ad": 0.15,
      "ap": 0.66,
      "heal": 0,
      "cc": 0.83
    },
    "W": {
      "kind": "shield",
      "base": 56,
      "perLevel": 25,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.34,
      "cc": 0.46
    },
    "E": {
      "kind": "peel",
      "base": 54,
      "perLevel": 18,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 66,
      "cc": 0.98
    },
    "R": {
      "kind": "teamUlt",
      "base": 195,
      "perLevel": 105,
      "ad": 0.2,
      "ap": 0.97,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 1.08
    }
  },
  "Rammus": {
    "id": "Rammus",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "hook",
      "base": 63,
      "perLevel": 21,
      "ad": 0.62,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.72
    },
    "W": {
      "kind": "guard",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.32,
      "cc": 0.4
    },
    "E": {
      "kind": "wave",
      "base": 56,
      "perLevel": 20,
      "ad": 0.59,
      "ap": 0.08,
      "ms": 70,
      "cc": 0.94
    },
    "R": {
      "kind": "teamUlt",
      "base": 188,
      "perLevel": 100,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 0.98
    }
  },
  "RekSai": {
    "id": "RekSai",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "engageStrike",
      "base": 71,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0.15,
      "cc": 0.7
    },
    "W": {
      "kind": "guard",
      "base": 50,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.39
    },
    "E": {
      "kind": "cleave",
      "base": 59,
      "perLevel": 21,
      "ad": 0.63,
      "ap": 0.08,
      "ms": 76,
      "cc": 0.31
    },
    "R": {
      "kind": "duelUlt",
      "base": 184,
      "perLevel": 96,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.66
    }
  },
  "Rell": {
    "id": "Rell",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "hook",
      "base": 66,
      "perLevel": 21,
      "ad": 0.62,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.83
    },
    "W": {
      "kind": "guard",
      "base": 56,
      "perLevel": 25,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.34,
      "cc": 0.46
    },
    "E": {
      "kind": "wave",
      "base": 54,
      "perLevel": 18,
      "ad": 0.55,
      "ap": 0.08,
      "ms": 66,
      "cc": 0.98
    },
    "R": {
      "kind": "teamUlt",
      "base": 195,
      "perLevel": 105,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 1.08
    }
  },
  "Renata": {
    "id": "Renata",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "shadow",
    "Q": {
      "kind": "hook",
      "base": 80,
      "perLevel": 28,
      "ad": 0.15,
      "ap": 0.74,
      "heal": 0,
      "cc": 0.63
    },
    "W": {
      "kind": "shield",
      "base": 56,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.3,
      "cc": 0.35
    },
    "E": {
      "kind": "peel",
      "base": 51,
      "perLevel": 18,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 62,
      "cc": 0.91
    },
    "R": {
      "kind": "teamUlt",
      "base": 194,
      "perLevel": 104,
      "ad": 0.2,
      "ap": 0.96,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.9
    }
  },
  "Renekton": {
    "id": "Renekton",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "engageStrike",
      "base": 85,
      "perLevel": 24,
      "ad": 0.71,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.68
    },
    "W": {
      "kind": "guard",
      "base": 47,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.38
    },
    "E": {
      "kind": "dash",
      "base": 63,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.08,
      "ms": 81,
      "cc": 0.3
    },
    "R": {
      "kind": "duelUlt",
      "base": 166,
      "perLevel": 92,
      "ad": 1.23,
      "ap": 0.1,
      "execute": 0.31,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.64
    }
  },
  "Rengar": {
    "id": "Rengar",
    "combatClass": "assassin",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "gapclose",
      "base": 68,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.05,
      "heal": 0.14,
      "cc": 0.79
    },
    "W": {
      "kind": "fade",
      "base": 51,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.44
    },
    "E": {
      "kind": "strike",
      "base": 63,
      "perLevel": 22,
      "ad": 0.65,
      "ap": 0.08,
      "ms": 82,
      "cc": 0.35
    },
    "R": {
      "kind": "assassinate",
      "base": 180,
      "perLevel": 98,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": false,
      "heal": 0,
      "cc": 0.75
    }
  },
  "Riven": {
    "id": "Riven",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "blood",
    "Q": {
      "kind": "engageStrike",
      "base": 81,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.68
    },
    "W": {
      "kind": "guard",
      "base": 48,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.38
    },
    "E": {
      "kind": "dash",
      "base": 66,
      "perLevel": 24,
      "ad": 0.7,
      "ap": 0.08,
      "ms": 86,
      "cc": 0.3
    },
    "R": {
      "kind": "duelUlt",
      "base": 181,
      "perLevel": 94,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.64
    }
  },
  "Rumble": {
    "id": "Rumble",
    "combatClass": "fighter",
    "damageType": "magic",
    "flavor": "iron",
    "Q": {
      "kind": "sweetspot",
      "base": 94,
      "perLevel": 33,
      "ad": 0.15,
      "ap": 0.85,
      "heal": 0.22,
      "cc": 0.5
    },
    "W": {
      "kind": "guard",
      "base": 55,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.28
    },
    "E": {
      "kind": "cleave",
      "base": 55,
      "perLevel": 21,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 69,
      "cc": 0.22
    },
    "R": {
      "kind": "duelUlt",
      "base": 197,
      "perLevel": 103,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.39,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.47
    }
  },
  "Ryze": {
    "id": "Ryze",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "storm",
    "Q": {
      "kind": "burst",
      "base": 79,
      "perLevel": 28,
      "ad": 0.15,
      "ap": 0.74,
      "heal": 0,
      "cc": 0.41
    },
    "W": {
      "kind": "zone",
      "base": 53,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.27,
      "cc": 0.23
    },
    "E": {
      "kind": "snare",
      "base": 61,
      "perLevel": 24,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 79,
      "cc": 0.83
    },
    "R": {
      "kind": "teamUlt",
      "base": 202,
      "perLevel": 101,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.38
    }
  },
  "Samira": {
    "id": "Samira",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "iron",
    "Q": {
      "kind": "steroid",
      "base": 77,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.77
    },
    "W": {
      "kind": "poke",
      "base": 57,
      "perLevel": 25,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.42
    },
    "E": {
      "kind": "dash",
      "base": 55,
      "perLevel": 19,
      "ad": 0.57,
      "ap": 0.08,
      "ms": 69,
      "cc": 0.34
    },
    "R": {
      "kind": "executeUlt",
      "base": 209,
      "perLevel": 106,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": true,
      "heal": 0,
      "cc": 0.72
    }
  },
  "Sejuani": {
    "id": "Sejuani",
    "combatClass": "tank",
    "damageType": "magic",
    "flavor": "void",
    "Q": {
      "kind": "hook",
      "base": 68,
      "perLevel": 23,
      "ad": 0.15,
      "ap": 0.66,
      "heal": 0,
      "cc": 0.79
    },
    "W": {
      "kind": "guard",
      "base": 57,
      "perLevel": 25,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.33,
      "cc": 0.44
    },
    "E": {
      "kind": "wave",
      "base": 56,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 70,
      "cc": 0.96
    },
    "R": {
      "kind": "teamUlt",
      "base": 197,
      "perLevel": 106,
      "ad": 0.2,
      "ap": 0.97,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 1.05
    }
  },
  "Senna": {
    "id": "Senna",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "void",
    "Q": {
      "kind": "poke",
      "base": 91,
      "perLevel": 33,
      "ad": 0.15,
      "ap": 0.85,
      "heal": 0,
      "cc": 0.36
    },
    "W": {
      "kind": "shield",
      "base": 53,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.26,
      "cc": 0.2
    },
    "E": {
      "kind": "peel",
      "base": 50,
      "perLevel": 20,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 62,
      "cc": 0.82
    },
    "R": {
      "kind": "teamUlt",
      "base": 189,
      "perLevel": 101,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.64
    }
  },
  "Seraphine": {
    "id": "Seraphine",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "void",
    "Q": {
      "kind": "poke",
      "base": 85,
      "perLevel": 32,
      "ad": 0.15,
      "ap": 0.81,
      "heal": 0,
      "cc": 0.41
    },
    "W": {
      "kind": "shield",
      "base": 56,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.27,
      "cc": 0.23
    },
    "E": {
      "kind": "peel",
      "base": 47,
      "perLevel": 18,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 57,
      "cc": 0.83
    },
    "R": {
      "kind": "teamUlt",
      "base": 194,
      "perLevel": 104,
      "ad": 0.2,
      "ap": 0.96,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.68
    }
  },
  "Sett": {
    "id": "Sett",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "engageStrike",
      "base": 79,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0.15,
      "cc": 0.74
    },
    "W": {
      "kind": "guard",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.41
    },
    "E": {
      "kind": "cleave",
      "base": 62,
      "perLevel": 22,
      "ad": 0.65,
      "ap": 0.08,
      "ms": 80,
      "cc": 0.33
    },
    "R": {
      "kind": "duelUlt",
      "base": 190,
      "perLevel": 100,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.7
    }
  },
  "Shaco": {
    "id": "Shaco",
    "combatClass": "assassin",
    "damageType": "physical",
    "flavor": "blood",
    "Q": {
      "kind": "gapclose",
      "base": 76,
      "perLevel": 26,
      "ad": 0.75,
      "ap": 0.05,
      "heal": 0.17,
      "cc": 0.63
    },
    "W": {
      "kind": "fade",
      "base": 47,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.35
    },
    "E": {
      "kind": "strike",
      "base": 58,
      "perLevel": 21,
      "ad": 0.63,
      "ap": 0.08,
      "ms": 74,
      "cc": 0.28
    },
    "R": {
      "kind": "assassinate",
      "base": 171,
      "perLevel": 92,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": false,
      "heal": 0,
      "cc": 0.59
    }
  },
  "Shen": {
    "id": "Shen",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "flame",
    "Q": {
      "kind": "slam",
      "base": 74,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.59
    },
    "W": {
      "kind": "guard",
      "base": 54,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.3,
      "cc": 0.33
    },
    "E": {
      "kind": "wave",
      "base": 59,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.08,
      "ms": 75,
      "cc": 0.9
    },
    "R": {
      "kind": "teamUlt",
      "base": 191,
      "perLevel": 102,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 0.85
    }
  },
  "Shyvana": {
    "id": "Shyvana",
    "combatClass": "fighter",
    "damageType": "magic",
    "flavor": "storm",
    "Q": {
      "kind": "cleave",
      "base": 71,
      "perLevel": 25,
      "ad": 0.15,
      "ap": 0.69,
      "heal": 0.17,
      "cc": 0.54
    },
    "W": {
      "kind": "guard",
      "base": 51,
      "perLevel": 22,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.3
    },
    "E": {
      "kind": "dash",
      "base": 60,
      "perLevel": 23,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 78,
      "cc": 0.24
    },
    "R": {
      "kind": "duelUlt",
      "base": 187,
      "perLevel": 98,
      "ad": 0.2,
      "ap": 0.93,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.51
    }
  },
  "Singed": {
    "id": "Singed",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "flame",
    "Q": {
      "kind": "slam",
      "base": 79,
      "perLevel": 27,
      "ad": 0.78,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.36
    },
    "W": {
      "kind": "guard",
      "base": 47,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.26,
      "cc": 0.2
    },
    "E": {
      "kind": "wave",
      "base": 62,
      "perLevel": 25,
      "ad": 0.71,
      "ap": 0.08,
      "ms": 82,
      "cc": 0.82
    },
    "R": {
      "kind": "teamUlt",
      "base": 176,
      "perLevel": 92,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 0.64
    }
  },
  "Sion": {
    "id": "Sion",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "hook",
      "base": 74,
      "perLevel": 26,
      "ad": 0.75,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.72
    },
    "W": {
      "kind": "guard",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.32,
      "cc": 0.4
    },
    "E": {
      "kind": "wave",
      "base": 69,
      "perLevel": 25,
      "ad": 0.72,
      "ap": 0.08,
      "ms": 91,
      "cc": 0.94
    },
    "R": {
      "kind": "teamUlt",
      "base": 192,
      "perLevel": 101,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 0.98
    }
  },
  "Sivir": {
    "id": "Sivir",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "iron",
    "Q": {
      "kind": "poke",
      "base": 84,
      "perLevel": 29,
      "ad": 0.82,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.23
    },
    "W": {
      "kind": "poke",
      "base": 54,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.13
    },
    "E": {
      "kind": "dash",
      "base": 50,
      "perLevel": 21,
      "ad": 0.61,
      "ap": 0.08,
      "ms": 63,
      "cc": 0.1
    },
    "R": {
      "kind": "executeUlt",
      "base": 203,
      "perLevel": 102,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": true,
      "heal": 0,
      "cc": 0.21
    }
  },
  "Skarner": {
    "id": "Skarner",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "hook",
      "base": 67,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.77
    },
    "W": {
      "kind": "guard",
      "base": 55,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.33,
      "cc": 0.42
    },
    "E": {
      "kind": "wave",
      "base": 58,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 73,
      "cc": 0.95
    },
    "R": {
      "kind": "teamUlt",
      "base": 192,
      "perLevel": 103,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 1.02
    }
  },
  "Smolder": {
    "id": "Smolder",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "poke",
      "base": 84,
      "perLevel": 32,
      "ad": 0.91,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.18
    },
    "W": {
      "kind": "poke",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.1
    },
    "E": {
      "kind": "dash",
      "base": 48,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 60,
      "cc": 0.08
    },
    "R": {
      "kind": "executeUlt",
      "base": 202,
      "perLevel": 101,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": true,
      "heal": 0,
      "cc": 0.17
    }
  },
  "Sona": {
    "id": "Sona",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "void",
    "Q": {
      "kind": "poke",
      "base": 82,
      "perLevel": 31,
      "ad": 0.15,
      "ap": 0.8,
      "heal": 0,
      "cc": 0.36
    },
    "W": {
      "kind": "shield",
      "base": 54,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.26,
      "cc": 0.2
    },
    "E": {
      "kind": "peel",
      "base": 45,
      "perLevel": 18,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 54,
      "cc": 0.82
    },
    "R": {
      "kind": "teamUlt",
      "base": 191,
      "perLevel": 102,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.64
    }
  },
  "Soraka": {
    "id": "Soraka",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "iron",
    "Q": {
      "kind": "poke",
      "base": 77,
      "perLevel": 27,
      "ad": 0.15,
      "ap": 0.73,
      "heal": 0,
      "cc": 0.18
    },
    "W": {
      "kind": "shield",
      "base": 53,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.23,
      "cc": 0.1
    },
    "E": {
      "kind": "peel",
      "base": 41,
      "perLevel": 17,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 48,
      "cc": 0.76
    },
    "R": {
      "kind": "teamUlt",
      "base": 188,
      "perLevel": 100,
      "ad": 0.2,
      "ap": 0.94,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.47
    }
  },
  "Swain": {
    "id": "Swain",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "storm",
    "Q": {
      "kind": "poke",
      "base": 85,
      "perLevel": 31,
      "ad": 0.15,
      "ap": 0.8,
      "heal": 0,
      "cc": 0.54
    },
    "W": {
      "kind": "zone",
      "base": 54,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.29,
      "cc": 0.3
    },
    "E": {
      "kind": "snare",
      "base": 54,
      "perLevel": 20,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 68,
      "cc": 0.88
    },
    "R": {
      "kind": "teamUlt",
      "base": 198,
      "perLevel": 102,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.51
    }
  },
  "Sylas": {
    "id": "Sylas",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "blood",
    "Q": {
      "kind": "burst",
      "base": 77,
      "perLevel": 25,
      "ad": 0.15,
      "ap": 0.69,
      "heal": 0,
      "cc": 0.7
    },
    "W": {
      "kind": "shield",
      "base": 54,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.32,
      "cc": 0.39
    },
    "E": {
      "kind": "snare",
      "base": 60,
      "perLevel": 22,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 78,
      "cc": 0.93
    },
    "R": {
      "kind": "teamUlt",
      "base": 198,
      "perLevel": 102,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.66
    }
  },
  "Syndra": {
    "id": "Syndra",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "shadow",
    "Q": {
      "kind": "poke",
      "base": 94,
      "perLevel": 34,
      "ad": 0.15,
      "ap": 0.86,
      "heal": 0,
      "cc": 0.41
    },
    "W": {
      "kind": "zone",
      "base": 55,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.27,
      "cc": 0.23
    },
    "E": {
      "kind": "snare",
      "base": 51,
      "perLevel": 20,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 63,
      "cc": 0.83
    },
    "R": {
      "kind": "teamUlt",
      "base": 199,
      "perLevel": 103,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.38
    }
  },
  "TahmKench": {
    "id": "TahmKench",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "void",
    "Q": {
      "kind": "slam",
      "base": 75,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.5
    },
    "W": {
      "kind": "guard",
      "base": 51,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.28,
      "cc": 0.28
    },
    "E": {
      "kind": "wave",
      "base": 53,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 67,
      "cc": 0.86
    },
    "R": {
      "kind": "teamUlt",
      "base": 185,
      "perLevel": 98,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 0.77
    }
  },
  "Taliyah": {
    "id": "Taliyah",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "flame",
    "Q": {
      "kind": "poke",
      "base": 85,
      "perLevel": 32,
      "ad": 0.15,
      "ap": 0.81,
      "heal": 0,
      "cc": 0.5
    },
    "W": {
      "kind": "zone",
      "base": 53,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.28,
      "cc": 0.28
    },
    "E": {
      "kind": "snare",
      "base": 56,
      "perLevel": 21,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 71,
      "cc": 0.86
    },
    "R": {
      "kind": "teamUlt",
      "base": 195,
      "perLevel": 100,
      "ad": 0.2,
      "ap": 0.94,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.47
    }
  },
  "Talon": {
    "id": "Talon",
    "combatClass": "assassin",
    "damageType": "physical",
    "flavor": "flame",
    "Q": {
      "kind": "gapclose",
      "base": 79,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.72
    },
    "W": {
      "kind": "fade",
      "base": 50,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.4
    },
    "E": {
      "kind": "strike",
      "base": 61,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.08,
      "ms": 78,
      "cc": 0.32
    },
    "R": {
      "kind": "assassinate",
      "base": 177,
      "perLevel": 96,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": false,
      "heal": 0,
      "cc": 0.68
    }
  },
  "Taric": {
    "id": "Taric",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "void",
    "Q": {
      "kind": "hook",
      "base": 68,
      "perLevel": 22,
      "ad": 0.15,
      "ap": 0.62,
      "heal": 0,
      "cc": 0.63
    },
    "W": {
      "kind": "shield",
      "base": 56,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.3,
      "cc": 0.35
    },
    "E": {
      "kind": "peel",
      "base": 51,
      "perLevel": 18,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 62,
      "cc": 0.91
    },
    "R": {
      "kind": "teamUlt",
      "base": 194,
      "perLevel": 104,
      "ad": 0.2,
      "ap": 0.96,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.9
    }
  },
  "Teemo": {
    "id": "Teemo",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "flame",
    "Q": {
      "kind": "poke",
      "base": 93,
      "perLevel": 33,
      "ad": 0.93,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.18
    },
    "W": {
      "kind": "poke",
      "base": 42,
      "perLevel": 19,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.1
    },
    "E": {
      "kind": "dash",
      "base": 58,
      "perLevel": 24,
      "ad": 0.7,
      "ap": 0.08,
      "ms": 76,
      "cc": 0.08
    },
    "R": {
      "kind": "executeUlt",
      "base": 179,
      "perLevel": 86,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": false,
      "heal": 0,
      "cc": 0.17
    }
  },
  "Thresh": {
    "id": "Thresh",
    "combatClass": "support",
    "damageType": "physical",
    "flavor": "light",
    "Q": {
      "kind": "hook",
      "base": 81,
      "perLevel": 25,
      "ad": 0.73,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.79
    },
    "W": {
      "kind": "shield",
      "base": 56,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.33,
      "cc": 0.44
    },
    "E": {
      "kind": "peel",
      "base": 53,
      "perLevel": 18,
      "ad": 0.55,
      "ap": 0.08,
      "ms": 66,
      "cc": 0.96
    },
    "R": {
      "kind": "teamUlt",
      "base": 191,
      "perLevel": 104,
      "ad": 1.3,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 1.05
    }
  },
  "Tristana": {
    "id": "Tristana",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "blood",
    "Q": {
      "kind": "steroid",
      "base": 81,
      "perLevel": 26,
      "ad": 0.75,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.54
    },
    "W": {
      "kind": "poke",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.3
    },
    "E": {
      "kind": "dash",
      "base": 58,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.08,
      "ms": 74,
      "cc": 0.24
    },
    "R": {
      "kind": "executeUlt",
      "base": 200,
      "perLevel": 100,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": true,
      "heal": 0,
      "cc": 0.51
    }
  },
  "Trundle": {
    "id": "Trundle",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "flame",
    "Q": {
      "kind": "cleave",
      "base": 76,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0.15,
      "cc": 0.59
    },
    "W": {
      "kind": "guard",
      "base": 47,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.33
    },
    "E": {
      "kind": "dash",
      "base": 66,
      "perLevel": 25,
      "ad": 0.71,
      "ap": 0.08,
      "ms": 87,
      "cc": 0.26
    },
    "R": {
      "kind": "duelUlt",
      "base": 178,
      "perLevel": 92,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.55
    }
  },
  "Tryndamere": {
    "id": "Tryndamere",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "cleave",
      "base": 74,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.05,
      "heal": 0.14,
      "cc": 0.5
    },
    "W": {
      "kind": "guard",
      "base": 42,
      "perLevel": 19,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.28
    },
    "E": {
      "kind": "dash",
      "base": 67,
      "perLevel": 26,
      "ad": 0.74,
      "ap": 0.08,
      "ms": 89,
      "cc": 0.22
    },
    "R": {
      "kind": "duelUlt",
      "base": 169,
      "perLevel": 86,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.47
    }
  },
  "TwistedFate": {
    "id": "TwistedFate",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "storm",
    "Q": {
      "kind": "poke",
      "base": 83,
      "perLevel": 29,
      "ad": 0.15,
      "ap": 0.76,
      "heal": 0,
      "cc": 0.5
    },
    "W": {
      "kind": "zone",
      "base": 51,
      "perLevel": 22,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.28,
      "cc": 0.28
    },
    "E": {
      "kind": "snare",
      "base": 55,
      "perLevel": 21,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 69,
      "cc": 0.86
    },
    "R": {
      "kind": "teamUlt",
      "base": 182,
      "perLevel": 98,
      "ad": 0.2,
      "ap": 0.93,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.47
    }
  },
  "Twitch": {
    "id": "Twitch",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "poke",
      "base": 82,
      "perLevel": 31,
      "ad": 0.86,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.32
    },
    "W": {
      "kind": "poke",
      "base": 56,
      "perLevel": 25,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.17
    },
    "E": {
      "kind": "dash",
      "base": 50,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 63,
      "cc": 0.14
    },
    "R": {
      "kind": "executeUlt",
      "base": 208,
      "perLevel": 105,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": true,
      "heal": 0,
      "cc": 0.3
    }
  },
  "Udyr": {
    "id": "Udyr",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "blood",
    "Q": {
      "kind": "cleave",
      "base": 63,
      "perLevel": 21,
      "ad": 0.62,
      "ap": 0.05,
      "heal": 0.14,
      "cc": 0.54
    },
    "W": {
      "kind": "guard",
      "base": 45,
      "perLevel": 20,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.3
    },
    "E": {
      "kind": "dash",
      "base": 62,
      "perLevel": 23,
      "ad": 0.68,
      "ap": 0.08,
      "ms": 80,
      "cc": 0.24
    },
    "R": {
      "kind": "duelUlt",
      "base": 163,
      "perLevel": 90,
      "ad": 1.23,
      "ap": 0.1,
      "execute": 0.31,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.51
    }
  },
  "Urgot": {
    "id": "Urgot",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "void",
    "Q": {
      "kind": "sweetspot",
      "base": 84,
      "perLevel": 28,
      "ad": 0.8,
      "ap": 0.05,
      "heal": 0.19,
      "cc": 0.54
    },
    "W": {
      "kind": "guard",
      "base": 50,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.3
    },
    "E": {
      "kind": "dash",
      "base": 62,
      "perLevel": 23,
      "ad": 0.68,
      "ap": 0.08,
      "ms": 80,
      "cc": 0.24
    },
    "R": {
      "kind": "duelUlt",
      "base": 186,
      "perLevel": 97,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.51
    }
  },
  "Varus": {
    "id": "Varus",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "poke",
      "base": 94,
      "perLevel": 34,
      "ad": 0.95,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.45
    },
    "W": {
      "kind": "poke",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.25
    },
    "E": {
      "kind": "dash",
      "base": 51,
      "perLevel": 20,
      "ad": 0.59,
      "ap": 0.08,
      "ms": 64,
      "cc": 0.2
    },
    "R": {
      "kind": "executeUlt",
      "base": 200,
      "perLevel": 100,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": true,
      "heal": 0,
      "cc": 0.42
    }
  },
  "Vayne": {
    "id": "Vayne",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "steroid",
      "base": 77,
      "perLevel": 24,
      "ad": 0.71,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.36
    },
    "W": {
      "kind": "poke",
      "base": 54,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.2
    },
    "E": {
      "kind": "dash",
      "base": 60,
      "perLevel": 24,
      "ad": 0.69,
      "ap": 0.08,
      "ms": 78,
      "cc": 0.16
    },
    "R": {
      "kind": "executeUlt",
      "base": 203,
      "perLevel": 102,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": true,
      "heal": 0,
      "cc": 0.34
    }
  },
  "Veigar": {
    "id": "Veigar",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "flame",
    "Q": {
      "kind": "poke",
      "base": 82,
      "perLevel": 31,
      "ad": 0.15,
      "ap": 0.8,
      "heal": 0,
      "cc": 0.45
    },
    "W": {
      "kind": "zone",
      "base": 54,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.28,
      "cc": 0.25
    },
    "E": {
      "kind": "snare",
      "base": 53,
      "perLevel": 20,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 66,
      "cc": 0.85
    },
    "R": {
      "kind": "teamUlt",
      "base": 198,
      "perLevel": 102,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.42
    }
  },
  "Velkoz": {
    "id": "Velkoz",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "iron",
    "Q": {
      "kind": "poke",
      "base": 92,
      "perLevel": 35,
      "ad": 0.15,
      "ap": 0.88,
      "heal": 0,
      "cc": 0.23
    },
    "W": {
      "kind": "zone",
      "base": 53,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.24,
      "cc": 0.13
    },
    "E": {
      "kind": "snare",
      "base": 45,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 55,
      "cc": 0.77
    },
    "R": {
      "kind": "teamUlt",
      "base": 195,
      "perLevel": 100,
      "ad": 0.2,
      "ap": 0.94,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.21
    }
  },
  "Vex": {
    "id": "Vex",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "iron",
    "Q": {
      "kind": "poke",
      "base": 85,
      "perLevel": 30,
      "ad": 0.15,
      "ap": 0.78,
      "heal": 0,
      "cc": 0.68
    },
    "W": {
      "kind": "zone",
      "base": 54,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.31,
      "cc": 0.38
    },
    "E": {
      "kind": "snare",
      "base": 55,
      "perLevel": 20,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 69,
      "cc": 0.92
    },
    "R": {
      "kind": "teamUlt",
      "base": 198,
      "perLevel": 102,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.64
    }
  },
  "Vi": {
    "id": "Vi",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "shadow",
    "Q": {
      "kind": "engageStrike",
      "base": 71,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0.15,
      "cc": 0.81
    },
    "W": {
      "kind": "guard",
      "base": 54,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.45
    },
    "E": {
      "kind": "cleave",
      "base": 59,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 74,
      "cc": 0.36
    },
    "R": {
      "kind": "duelUlt",
      "base": 193,
      "perLevel": 102,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.77
    }
  },
  "Viego": {
    "id": "Viego",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "engageStrike",
      "base": 73,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.72
    },
    "W": {
      "kind": "guard",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.4
    },
    "E": {
      "kind": "cleave",
      "base": 61,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.08,
      "ms": 78,
      "cc": 0.32
    },
    "R": {
      "kind": "duelUlt",
      "base": 192,
      "perLevel": 101,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.68
    }
  },
  "Viktor": {
    "id": "Viktor",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "void",
    "Q": {
      "kind": "poke",
      "base": 86,
      "perLevel": 32,
      "ad": 0.15,
      "ap": 0.83,
      "heal": 0,
      "cc": 0.36
    },
    "W": {
      "kind": "zone",
      "base": 56,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.26,
      "cc": 0.2
    },
    "E": {
      "kind": "snare",
      "base": 52,
      "perLevel": 21,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 66,
      "cc": 0.82
    },
    "R": {
      "kind": "teamUlt",
      "base": 201,
      "perLevel": 104,
      "ad": 0.2,
      "ap": 0.96,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.34
    }
  },
  "Vladimir": {
    "id": "Vladimir",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "flame",
    "Q": {
      "kind": "burst",
      "base": 78,
      "perLevel": 28,
      "ad": 0.15,
      "ap": 0.74,
      "heal": 0,
      "cc": 0.45
    },
    "W": {
      "kind": "zone",
      "base": 56,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.28,
      "cc": 0.25
    },
    "E": {
      "kind": "snare",
      "base": 58,
      "perLevel": 22,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 74,
      "cc": 0.85
    },
    "R": {
      "kind": "teamUlt",
      "base": 201,
      "perLevel": 104,
      "ad": 0.2,
      "ap": 0.96,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.42
    }
  },
  "Volibear": {
    "id": "Volibear",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "engageStrike",
      "base": 77,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.7
    },
    "W": {
      "kind": "guard",
      "base": 52,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.39
    },
    "E": {
      "kind": "cleave",
      "base": 62,
      "perLevel": 22,
      "ad": 0.65,
      "ap": 0.08,
      "ms": 80,
      "cc": 0.31
    },
    "R": {
      "kind": "duelUlt",
      "base": 188,
      "perLevel": 99,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.66
    }
  },
  "Warwick": {
    "id": "Warwick",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "engageStrike",
      "base": 71,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.05,
      "heal": 0.14,
      "cc": 0.72
    },
    "W": {
      "kind": "guard",
      "base": 50,
      "perLevel": 22,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.4
    },
    "E": {
      "kind": "cleave",
      "base": 61,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.08,
      "ms": 78,
      "cc": 0.32
    },
    "R": {
      "kind": "duelUlt",
      "base": 184,
      "perLevel": 96,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.68
    }
  },
  "Xayah": {
    "id": "Xayah",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "void",
    "Q": {
      "kind": "poke",
      "base": 83,
      "perLevel": 28,
      "ad": 0.8,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.41
    },
    "W": {
      "kind": "poke",
      "base": 55,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.23
    },
    "E": {
      "kind": "dash",
      "base": 52,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 65,
      "cc": 0.18
    },
    "R": {
      "kind": "executeUlt",
      "base": 204,
      "perLevel": 103,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": true,
      "heal": 0,
      "cc": 0.38
    }
  },
  "Xerath": {
    "id": "Xerath",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "blood",
    "Q": {
      "kind": "poke",
      "base": 93,
      "perLevel": 35,
      "ad": 0.15,
      "ap": 0.88,
      "heal": 0,
      "cc": 0.18
    },
    "W": {
      "kind": "zone",
      "base": 52,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.23,
      "cc": 0.1
    },
    "E": {
      "kind": "snare",
      "base": 43,
      "perLevel": 18,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 52,
      "cc": 0.76
    },
    "R": {
      "kind": "teamUlt",
      "base": 193,
      "perLevel": 99,
      "ad": 0.2,
      "ap": 0.93,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.17
    }
  },
  "XinZhao": {
    "id": "XinZhao",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "iron",
    "Q": {
      "kind": "engageStrike",
      "base": 72,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0.15,
      "cc": 0.77
    },
    "W": {
      "kind": "guard",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.42
    },
    "E": {
      "kind": "cleave",
      "base": 59,
      "perLevel": 21,
      "ad": 0.61,
      "ap": 0.08,
      "ms": 75,
      "cc": 0.34
    },
    "R": {
      "kind": "duelUlt",
      "base": 178,
      "perLevel": 100,
      "ad": 1.23,
      "ap": 0.1,
      "execute": 0.31,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.72
    }
  },
  "Yasuo": {
    "id": "Yasuo",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "engageStrike",
      "base": 78,
      "perLevel": 23,
      "ad": 0.69,
      "ap": 0.05,
      "heal": 0.16,
      "cc": 0.68
    },
    "W": {
      "kind": "guard",
      "base": 54,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.38
    },
    "E": {
      "kind": "dash",
      "base": 63,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.08,
      "ms": 81,
      "cc": 0.3
    },
    "R": {
      "kind": "duelUlt",
      "base": 193,
      "perLevel": 102,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.64
    }
  },
  "Yone": {
    "id": "Yone",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "engageStrike",
      "base": 81,
      "perLevel": 26,
      "ad": 0.75,
      "ap": 0.05,
      "heal": 0.17,
      "cc": 0.63
    },
    "W": {
      "kind": "guard",
      "base": 53,
      "perLevel": 23,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.35
    },
    "E": {
      "kind": "dash",
      "base": 63,
      "perLevel": 23,
      "ad": 0.68,
      "ap": 0.08,
      "ms": 82,
      "cc": 0.28
    },
    "R": {
      "kind": "duelUlt",
      "base": 192,
      "perLevel": 101,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": true,
      "heal": 0.2,
      "cc": 0.59
    }
  },
  "Yorick": {
    "id": "Yorick",
    "combatClass": "fighter",
    "damageType": "physical",
    "flavor": "frost",
    "Q": {
      "kind": "cleave",
      "base": 74,
      "perLevel": 25,
      "ad": 0.73,
      "ap": 0.05,
      "heal": 0.17,
      "cc": 0.32
    },
    "W": {
      "kind": "guard",
      "base": 44,
      "perLevel": 19,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.08,
      "cc": 0.17
    },
    "E": {
      "kind": "dash",
      "base": 64,
      "perLevel": 26,
      "ad": 0.74,
      "ap": 0.08,
      "ms": 85,
      "cc": 0.14
    },
    "R": {
      "kind": "duelUlt",
      "base": 172,
      "perLevel": 88,
      "ad": 1.35,
      "ap": 0.1,
      "execute": 0.38,
      "aoe": false,
      "heal": 0.2,
      "cc": 0.3
    }
  },
  "Yuumi": {
    "id": "Yuumi",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "frost",
    "Q": {
      "kind": "poke",
      "base": 70,
      "perLevel": 26,
      "ad": 0.15,
      "ap": 0.71,
      "heal": 0,
      "cc": 0.14
    },
    "W": {
      "kind": "shield",
      "base": 53,
      "perLevel": 23,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.22,
      "cc": 0.07
    },
    "E": {
      "kind": "peel",
      "base": 39,
      "perLevel": 17,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 45,
      "cc": 0.74
    },
    "R": {
      "kind": "teamUlt",
      "base": 198,
      "perLevel": 100,
      "ad": 0.2,
      "ap": 0.94,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.43
    }
  },
  "Zac": {
    "id": "Zac",
    "combatClass": "tank",
    "damageType": "physical",
    "flavor": "light",
    "Q": {
      "kind": "hook",
      "base": 67,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.77
    },
    "W": {
      "kind": "guard",
      "base": 55,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.15,
      "shield": 0.33,
      "cc": 0.42
    },
    "E": {
      "kind": "wave",
      "base": 58,
      "perLevel": 20,
      "ad": 0.6,
      "ap": 0.08,
      "ms": 73,
      "cc": 0.95
    },
    "R": {
      "kind": "teamUlt",
      "base": 192,
      "perLevel": 103,
      "ad": 1.32,
      "ap": 0.1,
      "execute": 0.08,
      "aoe": true,
      "heal": 0.15,
      "cc": 1.02
    }
  },
  "Zed": {
    "id": "Zed",
    "combatClass": "assassin",
    "damageType": "physical",
    "flavor": "iron",
    "Q": {
      "kind": "gapclose",
      "base": 86,
      "perLevel": 28,
      "ad": 0.8,
      "ap": 0.05,
      "heal": 0.19,
      "cc": 0.63
    },
    "W": {
      "kind": "fade",
      "base": 48,
      "perLevel": 21,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.35
    },
    "E": {
      "kind": "strike",
      "base": 62,
      "perLevel": 23,
      "ad": 0.66,
      "ap": 0.08,
      "ms": 80,
      "cc": 0.28
    },
    "R": {
      "kind": "assassinate",
      "base": 174,
      "perLevel": 94,
      "ad": 1.27,
      "ap": 0.1,
      "execute": 0.34,
      "aoe": false,
      "heal": 0,
      "cc": 0.59
    }
  },
  "Zeri": {
    "id": "Zeri",
    "combatClass": "marksman",
    "damageType": "physical",
    "flavor": "storm",
    "Q": {
      "kind": "poke",
      "base": 82,
      "perLevel": 29,
      "ad": 0.82,
      "ap": 0.05,
      "heal": 0,
      "cc": 0.36
    },
    "W": {
      "kind": "poke",
      "base": 54,
      "perLevel": 24,
      "ad": 0.35,
      "ap": 0.1,
      "heal": 0.05,
      "shield": 0.08,
      "cc": 0.2
    },
    "E": {
      "kind": "dash",
      "base": 55,
      "perLevel": 22,
      "ad": 0.64,
      "ap": 0.08,
      "ms": 70,
      "cc": 0.16
    },
    "R": {
      "kind": "executeUlt",
      "base": 203,
      "perLevel": 102,
      "ad": 1.45,
      "ap": 0.1,
      "execute": 0.43,
      "aoe": true,
      "heal": 0,
      "cc": 0.34
    }
  },
  "Ziggs": {
    "id": "Ziggs",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "light",
    "Q": {
      "kind": "poke",
      "base": 91,
      "perLevel": 34,
      "ad": 0.15,
      "ap": 0.86,
      "heal": 0,
      "cc": 0.27
    },
    "W": {
      "kind": "zone",
      "base": 51,
      "perLevel": 22,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.24,
      "cc": 0.15
    },
    "E": {
      "kind": "snare",
      "base": 51,
      "perLevel": 21,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 64,
      "cc": 0.79
    },
    "R": {
      "kind": "teamUlt",
      "base": 192,
      "perLevel": 98,
      "ad": 0.2,
      "ap": 0.93,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.26
    }
  },
  "Zilean": {
    "id": "Zilean",
    "combatClass": "support",
    "damageType": "magic",
    "flavor": "frost",
    "Q": {
      "kind": "poke",
      "base": 79,
      "perLevel": 29,
      "ad": 0.15,
      "ap": 0.76,
      "heal": 0,
      "cc": 0.41
    },
    "W": {
      "kind": "shield",
      "base": 54,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.15,
      "shield": 0.27,
      "cc": 0.23
    },
    "E": {
      "kind": "peel",
      "base": 48,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 59,
      "cc": 0.83
    },
    "R": {
      "kind": "teamUlt",
      "base": 191,
      "perLevel": 102,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.68
    }
  },
  "Zoe": {
    "id": "Zoe",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "blood",
    "Q": {
      "kind": "poke",
      "base": 94,
      "perLevel": 34,
      "ad": 0.15,
      "ap": 0.86,
      "heal": 0,
      "cc": 0.36
    },
    "W": {
      "kind": "zone",
      "base": 51,
      "perLevel": 22,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.26,
      "cc": 0.2
    },
    "E": {
      "kind": "snare",
      "base": 47,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 58,
      "cc": 0.82
    },
    "R": {
      "kind": "teamUlt",
      "base": 180,
      "perLevel": 98,
      "ad": 0.2,
      "ap": 0.93,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.34
    }
  },
  "Zyra": {
    "id": "Zyra",
    "combatClass": "mage",
    "damageType": "magic",
    "flavor": "flame",
    "Q": {
      "kind": "poke",
      "base": 91,
      "perLevel": 33,
      "ad": 0.15,
      "ap": 0.85,
      "heal": 0,
      "cc": 0.5
    },
    "W": {
      "kind": "zone",
      "base": 54,
      "perLevel": 24,
      "ad": 0.1,
      "ap": 0.45,
      "heal": 0.05,
      "shield": 0.28,
      "cc": 0.28
    },
    "E": {
      "kind": "snare",
      "base": 50,
      "perLevel": 19,
      "ad": 0.12,
      "ap": 0.5,
      "ms": 61,
      "cc": 0.86
    },
    "R": {
      "kind": "teamUlt",
      "base": 198,
      "perLevel": 102,
      "ad": 0.2,
      "ap": 0.95,
      "execute": 0.08,
      "aoe": true,
      "heal": 0,
      "cc": 0.47
    }
  }
};
