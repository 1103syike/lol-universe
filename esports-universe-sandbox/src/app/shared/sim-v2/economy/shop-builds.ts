import { CHAMPION_KITS, type ChampionCombatClass, type ChampionDamageType } from '../../../core/data/champion-kits';
import type { PlayerPosition } from '../../../core/models/player.model';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import opggItemBuilds from './opgg-item-builds.json';

export type BuildPlan = {
  id: string;
  items: readonly string[];
};

export type CompContext = {
  enemyTanks: number;
  enemyArmor: number;
  enemyMr: number;
  enemyAssassins: number;
  enemyEngage: number;
  allyFrontline: number;
  allyAp: number;
  allyAd: number;
  goldLead: number;
};

type WeightedPlan = { plan: BuildPlan; weight: number };

const SUPPORT_ENCHANTER: BuildPlan = {
  id: 'support-enchanter',
  items: [
    'WorldAtlas',
    'Boots',
    'IonianBootsofLucidity',
    'FaerieCharm',
    'ForbiddenIdol',
    "MikaelsBlessing",
    'Kindlegem',
    'MoonstoneRenewer',
    'StaffofFlowingWater',
    'ArdentCenser',
    'Redemption',
  ],
};

const SUPPORT_ENGAGE: BuildPlan = {
  id: 'support-engage',
  items: [
    'WorldAtlas',
    'Boots',
    'PlatedSteelcaps',
    'RubyCrystal',
    'Kindlegem',
    'LocketoftheIronSolari',
    'ClothArmor',
    'KnightsVow',
    'ChainVest',
    'ZekesConvergence',
    'Trailblazer',
  ],
};

const SUPPORT_MAGE: BuildPlan = {
  id: 'support-mage',
  items: [
    'WorldAtlas',
    'Boots',
    'SorcerersShoes',
    'AmplifyingTome',
    'LostChapter',
    'Malignance',
    'BlastingWand',
    'LiandrysTorment',
    'NeedlesslyLargeRod',
    'Shadowflame',
    'Morellonomicon',
  ],
};

const ADC_CRIT_CLASSIC: BuildPlan = {
  id: 'adc-crit-classic',
  items: [
    'DoransBlade',
    'Boots',
    'BFSword',
    'CloakofAgility',
    'Pickaxe',
    'InfinityEdge',
    'BerserkersGreaves',
    'Noonquiver',
    'Zeal',
    'PhantomDancer',
    'LastWhisper',
    'LordDominiksRegards',
    'VampiricScepter',
    'Bloodthirster',
  ],
};

const ADC_CRIT_YUNTAL: BuildPlan = {
  id: 'adc-crit-yuntal',
  items: [
    'DoransBlade',
    'Boots',
    'BFSword',
    'Noonquiver',
    'YunTalWildarrows',
    'BerserkersGreaves',
    'CloakofAgility',
    'InfinityEdge',
    'Zeal',
    'RunaansHurricane',
    'LastWhisper',
    'LordDominiksRegards',
    'Bloodthirster',
  ],
};

const ADC_COLLECTOR: BuildPlan = {
  id: 'adc-collector',
  items: [
    'DoransBlade',
    'Boots',
    'BFSword',
    'Pickaxe',
    'TheCollector',
    'BerserkersGreaves',
    'CloakofAgility',
    'InfinityEdge',
    'LastWhisper',
    'LordDominiksRegards',
    'Zeal',
    'RapidFirecannon',
    'Bloodthirster',
  ],
};

const ADC_ONHIT: BuildPlan = {
  id: 'adc-onhit',
  items: [
    'DoransBlade',
    'Boots',
    'RecurveBow',
    'Pickaxe',
    'VampiricScepter',
    'BladeofTheRuinedKing',
    'BerserkersGreaves',
    'KrakenSlayer',
    'GuinsoosRageblade',
    'Terminus',
    'LastWhisper',
    'LordDominiksRegards',
  ],
};

const ADC_POKE_SHEEN: BuildPlan = {
  id: 'adc-poke-sheen',
  items: [
    'DoransBlade',
    'TearoftheGoddess',
    'Boots',
    'LongSword',
    'CaulfieldsWarhammer',
    'Manamune',
    'Sheen',
    'Phage',
    'HearthboundAxe',
    'TrinityForce',
    'IonianBootsofLucidity',
    'VampiricScepter',
    'BladeofTheRuinedKing',
    'LastWhisper',
    'LordDominiksRegards',
  ],
};

const ADC_SHIELDBOW: BuildPlan = {
  id: 'adc-shieldbow',
  items: [
    'DoransBlade',
    'Boots',
    'BFSword',
    'CloakofAgility',
    'ImmortalShieldbow',
    'BerserkersGreaves',
    'InfinityEdge',
    'PhantomDancer',
    'GuardianAngel',
    'LordDominiksRegards',
  ],
};

const MAGE_BURST: BuildPlan = {
  id: 'mage-burst',
  items: [
    'DoransRing',
    'Boots',
    'AmplifyingTome',
    'SapphireCrystal',
    'LostChapter',
    'HextechAlternator',
    'LudensCompanion',
    'SorcerersShoes',
    'NeedlesslyLargeRod',
    'Shadowflame',
    "RabadonsDeathcap",
    'VoidStaff',
  ],
};

const MAGE_BATTLE: BuildPlan = {
  id: 'mage-battle',
  items: [
    'DoransRing',
    'Boots',
    'SapphireCrystal',
    'RubyCrystal',
    'CatalystofAeons',
    'RodofAges',
    'SorcerersShoes',
    'BlastingWand',
    'LiandrysTorment',
    'NeedlesslyLargeRod',
    "RabadonsDeathcap",
    'ZhonyasHourglass',
  ],
};

const MAGE_BLACKFIRE: BuildPlan = {
  id: 'mage-blackfire',
  items: [
    'DoransRing',
    'Boots',
    'AmplifyingTome',
    'LostChapter',
    'BlackfireTorch',
    'SorcerersShoes',
    'LiandrysTorment',
    'Shadowflame',
    'Cryptbloom',
    'ZhonyasHourglass',
  ],
};

const MAGE_ARTI: BuildPlan = {
  id: 'mage-arti',
  items: [
    'DoransRing',
    'Boots',
    'TearoftheGoddess',
    'ArchangelsStaff',
    'SorcerersShoes',
    'LostChapter',
    'Malignance',
    'HorizonFocus',
    "RabadonsDeathcap",
    'VoidStaff',
  ],
};

const AD_ASSASSIN_CLASSIC: BuildPlan = {
  id: 'ad-assassin-classic',
  items: [
    'LongSword',
    'Boots',
    'SerratedDirk',
    'CaulfieldsWarhammer',
    'YoumuusGhostblade',
    'IonianBootsofLucidity',
    'Opportunity',
    'TheCollector',
    'EdgeofNight',
  ],
};

const AD_ASSASSIN_PROFANE: BuildPlan = {
  id: 'ad-assassin-profane',
  items: [
    'LongSword',
    'Boots',
    'Tiamat',
    'SerratedDirk',
    'ProfaneHydra',
    'IonianBootsofLucidity',
    'Opportunity',
    'AxiomArc',
    'EdgeofNight',
  ],
};

const AD_ASSASSIN_ECLIPSE: BuildPlan = {
  id: 'ad-assassin-eclipse',
  items: [
    'LongSword',
    'Boots',
    'SerratedDirk',
    'Eclipse',
    'IonianBootsofLucidity',
    'Hubris',
    'VoltaicCyclosword',
    'SeryldasGrudge',
  ],
};

const AP_ASSASSIN_STORM: BuildPlan = {
  id: 'ap-assassin-storm',
  items: [
    'DoransRing',
    'Boots',
    'AmplifyingTome',
    'HextechAlternator',
    'Stormsurge',
    'SorcerersShoes',
    'Shadowflame',
    "RabadonsDeathcap",
    'ZhonyasHourglass',
  ],
};

const AP_ASSASSIN_ROCKET: BuildPlan = {
  id: 'ap-assassin-rocket',
  items: [
    'DoransRing',
    'Boots',
    'HextechAlternator',
    'HextechRocketbelt',
    'SorcerersShoes',
    'Shadowflame',
    'ZhonyasHourglass',
    'BansheesVeil',
    "RabadonsDeathcap",
  ],
};

const FIGHTER_STERAKS: BuildPlan = {
  id: 'fighter-steraks',
  items: [
    'DoransShield',
    'Boots',
    'Pickaxe',
    'RubyCrystal',
    'Tunneler',
    'SteraksGage',
    'Phage',
    'Kindlegem',
    'BlackCleaver',
    'PlatedSteelcaps',
    'Tiamat',
    'TitanicHydra',
    'DeathsDance',
  ],
};

const FIGHTER_SHOJIN: BuildPlan = {
  id: 'fighter-shojin',
  items: [
    'DoransBlade',
    'Boots',
    'Pickaxe',
    'Kindlegem',
    'SpearofShojin',
    'PlatedSteelcaps',
    'CaulfieldsWarhammer',
    'SunderedSky',
    'BlackCleaver',
    'DeathsDance',
    'SteraksGage',
  ],
};

const FIGHTER_TRINITY: BuildPlan = {
  id: 'fighter-trinity',
  items: [
    'DoransBlade',
    'Boots',
    'Sheen',
    'Phage',
    'HearthboundAxe',
    'TrinityForce',
    'PlatedSteelcaps',
    'SteraksGage',
    'BlackCleaver',
    'DeathsDance',
    'GuardianAngel',
  ],
};

const FIGHTER_ECLIPSE: BuildPlan = {
  id: 'fighter-eclipse',
  items: [
    'DoransBlade',
    'Boots',
    'SerratedDirk',
    'Eclipse',
    'IonianBootsofLucidity',
    'BlackCleaver',
    'SunderedSky',
    'SteraksGage',
    'DeathsDance',
  ],
};

const AP_FIGHTER: BuildPlan = {
  id: 'ap-fighter',
  items: [
    'DoransRing',
    'Boots',
    'AmplifyingTome',
    'RecurveBow',
    'NashorsTooth',
    'SorcerersShoes',
    'Riftmaker',
    'RabadonsDeathcap',
    'ZhonyasHourglass',
    'Shadowflame',
  ],
};

const TANK_SUNFIRE: BuildPlan = {
  id: 'tank-sunfire',
  items: [
    'DoransShield',
    'Boots',
    'RubyCrystal',
    'BamisCinder',
    'SunfireAegis',
    'MercurysTreads',
    'ChainVest',
    'Thornmail',
    'NegatronCloak',
    'ForceofNature',
    'JakShoTheProtean',
  ],
};

const TANK_HOLLOW: BuildPlan = {
  id: 'tank-hollow',
  items: [
    'DoransShield',
    'Boots',
    'RubyCrystal',
    'BamisCinder',
    'HollowRadiance',
    'MercurysTreads',
    'DeadMansPlate',
    'ForceofNature',
    'KaenicRookern',
    'UnendingDespair',
  ],
};

const TANK_HEARTSTEEL: BuildPlan = {
  id: 'tank-heartsteel',
  items: [
    'DoransShield',
    'Boots',
    'RubyCrystal',
    'GiantsBelt',
    'GiantsBelt',
    'RejuvenationBead',
    'CrystallineBracer',
    'Heartsteel',
    'PlatedSteelcaps',
    'SunfireAegis',
    'Thornmail',
    'SpiritVisage',
    'JakShoTheProtean',
  ],
};

const TANK_FROST: BuildPlan = {
  id: 'tank-frost',
  items: [
    'DoransShield',
    'Boots',
    'RubyCrystal',
    'Sheen',
    'GlacialBuckler',
    'IcebornGauntlet',
    'PlatedSteelcaps',
    'FrozenHeart',
    'SpiritVisage',
    'RanduinsOmen',
    'UnendingDespair',
  ],
};

const FIGHTER_SHIELD: BuildPlan = {
  id: 'fighter-shieldbow',
  items: [
    'DoransBlade',
    'Boots',
    'BFSword',
    'CloakofAgility',
    'ImmortalShieldbow',
    'BerserkersGreaves',
    'InfinityEdge',
    'DeathsDance',
    'GuardianAngel',
    'LordDominiksRegards',
  ],
};

const JG_BRUISER: BuildPlan = {
  id: 'jg-bruiser',
  items: [
    'LongSword',
    'Boots',
    'Tunneler',
    'SteraksGage',
    'Tiamat',
    'TitanicHydra',
    'MercurysTreads',
    'BlackCleaver',
    'SpiritVisage',
    'DeathsDance',
  ],
};

const JG_ASSASSIN: BuildPlan = {
  id: 'jg-assassin',
  items: [
    'LongSword',
    'Boots',
    'YoumuusGhostblade',
    'Opportunity',
    'IonianBootsofLucidity',
    'TheCollector',
    'EdgeofNight',
    'AxiomArc',
  ],
};

const CHAMPION_PLAN_POOL: Record<string, readonly BuildPlan[]> = {
  Ezreal: [ADC_POKE_SHEEN, FIGHTER_TRINITY],
  Corki: [ADC_POKE_SHEEN, ADC_CRIT_CLASSIC, MAGE_BURST],
  Varus: [ADC_ONHIT, ADC_CRIT_CLASSIC, MAGE_BLACKFIRE],
  KogMaw: [ADC_ONHIT, ADC_CRIT_CLASSIC],
  Vayne: [ADC_ONHIT, ADC_CRIT_CLASSIC, ADC_SHIELDBOW],
  KaiSa: [ADC_ONHIT, ADC_CRIT_YUNTAL, ADC_CRIT_CLASSIC],
  Kaisa: [ADC_ONHIT, ADC_CRIT_YUNTAL, ADC_CRIT_CLASSIC],
  Twitch: [ADC_ONHIT, ADC_CRIT_CLASSIC, ADC_CRIT_YUNTAL],
  Jinx: [ADC_CRIT_YUNTAL, ADC_CRIT_CLASSIC, ADC_COLLECTOR, ADC_ONHIT, ADC_SHIELDBOW],
  Ashe: [ADC_CRIT_CLASSIC, ADC_CRIT_YUNTAL, ADC_SHIELDBOW, ADC_ONHIT],
  Caitlyn: [ADC_COLLECTOR, ADC_CRIT_CLASSIC, ADC_CRIT_YUNTAL],
  Jhin: [ADC_COLLECTOR, ADC_CRIT_CLASSIC, ADC_CRIT_YUNTAL],
  Aphelios: [ADC_CRIT_CLASSIC, ADC_CRIT_YUNTAL, ADC_SHIELDBOW],
  Lucian: [ADC_CRIT_CLASSIC, ADC_POKE_SHEEN, FIGHTER_TRINITY],
  Zeri: [ADC_ONHIT, ADC_CRIT_YUNTAL, ADC_CRIT_CLASSIC],
  Samira: [ADC_COLLECTOR, ADC_SHIELDBOW, ADC_CRIT_CLASSIC],
  MissFortune: [ADC_CRIT_CLASSIC, ADC_COLLECTOR, ADC_CRIT_YUNTAL],
  Tristana: [ADC_CRIT_CLASSIC, ADC_CRIT_YUNTAL, ADC_SHIELDBOW],
  Xayah: [ADC_CRIT_CLASSIC, ADC_CRIT_YUNTAL, ADC_SHIELDBOW],
  Sivir: [ADC_CRIT_CLASSIC, ADC_CRIT_YUNTAL, ADC_ONHIT],
  Draven: [ADC_COLLECTOR, ADC_CRIT_CLASSIC, ADC_SHIELDBOW],
  Akshan: [ADC_CRIT_CLASSIC, AD_ASSASSIN_ECLIPSE, ADC_ONHIT],
  Kalista: [ADC_ONHIT, ADC_CRIT_CLASSIC, ADC_SHIELDBOW],
  Quinn: [ADC_CRIT_CLASSIC, AD_ASSASSIN_ECLIPSE, ADC_COLLECTOR],
  Smolder: [ADC_CRIT_YUNTAL, ADC_CRIT_CLASSIC, MAGE_BLACKFIRE],
  Teemo: [MAGE_BLACKFIRE, ADC_ONHIT, AP_FIGHTER],
  Nilah: [ADC_CRIT_CLASSIC, ADC_SHIELDBOW, ADC_CRIT_YUNTAL],
  Senna: [SUPPORT_ENCHANTER, ADC_CRIT_CLASSIC, AD_ASSASSIN_CLASSIC, SUPPORT_MAGE],
  Cassiopeia: [MAGE_BATTLE, MAGE_BLACKFIRE, MAGE_ARTI],
  Vladimir: [MAGE_BATTLE, AP_FIGHTER, MAGE_BLACKFIRE],
  Anivia: [MAGE_ARTI, MAGE_BURST, MAGE_BLACKFIRE],
  Swain: [MAGE_BATTLE, MAGE_BLACKFIRE, SUPPORT_MAGE],
  Syndra: [MAGE_BURST, MAGE_BLACKFIRE, MAGE_ARTI],
  Orianna: [MAGE_BURST, MAGE_ARTI, MAGE_BLACKFIRE],
  Viktor: [MAGE_BLACKFIRE, MAGE_BURST, MAGE_ARTI],
  Azir: [MAGE_BURST, MAGE_BLACKFIRE, AP_FIGHTER],
  Ahri: [MAGE_BURST, AP_ASSASSIN_STORM, MAGE_ARTI],
  Zoe: [MAGE_BURST, MAGE_ARTI, MAGE_BLACKFIRE],
  Lux: [MAGE_BURST, SUPPORT_MAGE, MAGE_ARTI],
  Annie: [MAGE_BURST, AP_ASSASSIN_ROCKET, SUPPORT_MAGE],
  TwistedFate: [MAGE_BURST, MAGE_ARTI, MAGE_BLACKFIRE],
  Hwei: [MAGE_BLACKFIRE, MAGE_BURST, MAGE_ARTI],
  Aurora: [MAGE_BURST, AP_ASSASSIN_STORM, MAGE_BLACKFIRE],
  AurelionSol: [MAGE_BLACKFIRE, MAGE_BURST, MAGE_BATTLE],
  Heimerdinger: [MAGE_BLACKFIRE, MAGE_BURST, SUPPORT_MAGE],
  Kennen: [MAGE_BURST, AP_ASSASSIN_ROCKET, AP_FIGHTER],
  Lissandra: [MAGE_BURST, MAGE_ARTI, AP_ASSASSIN_ROCKET],
  Malzahar: [MAGE_BLACKFIRE, MAGE_BURST, MAGE_ARTI],
  Morgana: [SUPPORT_MAGE, MAGE_BLACKFIRE, MAGE_BURST],
  Neeko: [MAGE_BURST, SUPPORT_MAGE, AP_ASSASSIN_ROCKET],
  Ryze: [MAGE_BATTLE, MAGE_ARTI, MAGE_BURST],
  Sylas: [AP_FIGHTER, MAGE_BATTLE, AP_ASSASSIN_ROCKET],
  Taliyah: [MAGE_BURST, MAGE_BLACKFIRE, MAGE_ARTI],
  Veigar: [MAGE_BURST, MAGE_ARTI, MAGE_BLACKFIRE],
  Vex: [MAGE_BURST, AP_ASSASSIN_STORM, MAGE_ARTI],
  Ziggs: [MAGE_BURST, MAGE_BLACKFIRE, SUPPORT_MAGE],
  Akali: [AP_ASSASSIN_STORM, AP_ASSASSIN_ROCKET, AP_FIGHTER],
  Diana: [AP_ASSASSIN_ROCKET, AP_ASSASSIN_STORM, AP_FIGHTER],
  Ekko: [AP_ASSASSIN_STORM, AP_ASSASSIN_ROCKET, MAGE_BURST],
  Elise: [AP_ASSASSIN_ROCKET, AP_ASSASSIN_STORM, MAGE_BLACKFIRE],
  Evelynn: [AP_ASSASSIN_STORM, AP_ASSASSIN_ROCKET],
  Fizz: [AP_ASSASSIN_ROCKET, AP_ASSASSIN_STORM, AP_FIGHTER],
  Katarina: [AP_ASSASSIN_STORM, AP_FIGHTER, AP_ASSASSIN_ROCKET],
  Leblanc: [AP_ASSASSIN_STORM, MAGE_BURST, AP_ASSASSIN_ROCKET],
  Kassadin: [MAGE_BATTLE, AP_ASSASSIN_ROCKET, MAGE_ARTI],
  Nidalee: [AP_ASSASSIN_ROCKET, MAGE_BLACKFIRE, AP_ASSASSIN_STORM],
  Shaco: [AD_ASSASSIN_CLASSIC, AP_ASSASSIN_STORM, AD_ASSASSIN_PROFANE],
  MasterYi: [ADC_ONHIT, ADC_CRIT_CLASSIC, FIGHTER_TRINITY],
  Naafiri: [AD_ASSASSIN_CLASSIC, AD_ASSASSIN_ECLIPSE, AD_ASSASSIN_PROFANE],
  Zed: [AD_ASSASSIN_CLASSIC, AD_ASSASSIN_PROFANE, AD_ASSASSIN_ECLIPSE],
  Talon: [AD_ASSASSIN_PROFANE, AD_ASSASSIN_CLASSIC, AD_ASSASSIN_ECLIPSE],
  Qiyana: [AD_ASSASSIN_CLASSIC, AD_ASSASSIN_ECLIPSE, AD_ASSASSIN_PROFANE],
  Rengar: [AD_ASSASSIN_CLASSIC, AD_ASSASSIN_PROFANE, FIGHTER_ECLIPSE],
  Khazix: [AD_ASSASSIN_CLASSIC, AD_ASSASSIN_PROFANE, AD_ASSASSIN_ECLIPSE],
  Pyke: [AD_ASSASSIN_CLASSIC, SUPPORT_ENGAGE, AD_ASSASSIN_PROFANE],
  Aatrox: [FIGHTER_SHOJIN, FIGHTER_STERAKS, FIGHTER_ECLIPSE],
  Darius: [FIGHTER_STERAKS, FIGHTER_TRINITY, FIGHTER_SHOJIN],
  Garen: [FIGHTER_STERAKS, FIGHTER_TRINITY, TANK_SUNFIRE],
  Sett: [FIGHTER_STERAKS, FIGHTER_SHOJIN, TANK_HEARTSTEEL],
  Camille: [FIGHTER_TRINITY, FIGHTER_ECLIPSE, FIGHTER_SHOJIN],
  Jax: [FIGHTER_TRINITY, FIGHTER_SHOJIN, FIGHTER_STERAKS],
  Fiora: [FIGHTER_ECLIPSE, FIGHTER_TRINITY, FIGHTER_SHOJIN],
  Irelia: [FIGHTER_TRINITY, FIGHTER_SHOJIN, FIGHTER_STERAKS],
  Renekton: [FIGHTER_SHOJIN, FIGHTER_STERAKS, FIGHTER_ECLIPSE],
  Riven: [FIGHTER_ECLIPSE, FIGHTER_SHOJIN, AD_ASSASSIN_ECLIPSE],
  Ambessa: [FIGHTER_SHOJIN, FIGHTER_ECLIPSE, FIGHTER_STERAKS],
  Belveth: [FIGHTER_TRINITY, ADC_ONHIT, FIGHTER_SHOJIN],
  Briar: [JG_BRUISER, FIGHTER_STERAKS, FIGHTER_ECLIPSE],
  Gangplank: [FIGHTER_TRINITY, ADC_CRIT_CLASSIC, FIGHTER_SHOJIN],
  Gnar: [FIGHTER_TRINITY, FIGHTER_SHOJIN, TANK_SUNFIRE],
  Hecarim: [JG_BRUISER, FIGHTER_TRINITY, FIGHTER_SHOJIN],
  Illaoi: [FIGHTER_STERAKS, FIGHTER_SHOJIN, TANK_HEARTSTEEL],
  JarvanIV: [JG_BRUISER, FIGHTER_SHOJIN, FIGHTER_ECLIPSE],
  Jayce: [FIGHTER_ECLIPSE, ADC_POKE_SHEEN, AD_ASSASSIN_ECLIPSE],
  Kled: [FIGHTER_STERAKS, FIGHTER_TRINITY, FIGHTER_SHOJIN],
  MonkeyKing: [JG_BRUISER, FIGHTER_TRINITY, FIGHTER_SHOJIN],
  Nasus: [FIGHTER_SHOJIN, TANK_FROST, TANK_SUNFIRE],
  Nocturne: [JG_ASSASSIN, JG_BRUISER, FIGHTER_ECLIPSE],
  Olaf: [JG_BRUISER, FIGHTER_STERAKS, FIGHTER_TRINITY],
  Pantheon: [FIGHTER_ECLIPSE, SUPPORT_ENGAGE, AD_ASSASSIN_ECLIPSE],
  RekSai: [JG_BRUISER, FIGHTER_SHOJIN, FIGHTER_ECLIPSE],
  Trundle: [JG_BRUISER, FIGHTER_TRINITY, TANK_FROST],
  Tryndamere: [ADC_CRIT_CLASSIC, FIGHTER_TRINITY, ADC_SHIELDBOW],
  Udyr: [JG_BRUISER, TANK_SUNFIRE, FIGHTER_TRINITY],
  Urgot: [FIGHTER_SHOJIN, FIGHTER_STERAKS, TANK_SUNFIRE],
  Vi: [JG_BRUISER, FIGHTER_TRINITY, FIGHTER_SHOJIN],
  Volibear: [TANK_HEARTSTEEL, AP_FIGHTER, JG_BRUISER],
  Warwick: [JG_BRUISER, FIGHTER_STERAKS, TANK_HEARTSTEEL],
  XinZhao: [JG_BRUISER, FIGHTER_TRINITY, FIGHTER_SHOJIN],
  Yasuo: [ADC_CRIT_CLASSIC, ADC_SHIELDBOW, ADC_CRIT_YUNTAL],
  Yone: [ADC_CRIT_CLASSIC, FIGHTER_SHIELD, ADC_SHIELDBOW],
  Yorick: [FIGHTER_TRINITY, FIGHTER_SHOJIN, TANK_FROST],
  Gragas: [AP_FIGHTER, TANK_HOLLOW, MAGE_BATTLE],
  Rumble: [MAGE_BLACKFIRE, AP_FIGHTER, MAGE_BURST],
  Shyvana: [AP_FIGHTER, JG_BRUISER, MAGE_BLACKFIRE],
  LeeSin: [JG_ASSASSIN, JG_BRUISER, FIGHTER_SHOJIN],
  Viego: [JG_BRUISER, FIGHTER_TRINITY, FIGHTER_SHOJIN],
  Graves: [ADC_CRIT_CLASSIC, AD_ASSASSIN_ECLIPSE, FIGHTER_ECLIPSE],
  Kindred: [ADC_CRIT_CLASSIC, ADC_ONHIT, ADC_CRIT_YUNTAL],
  Kayn: [AD_ASSASSIN_PROFANE, AD_ASSASSIN_ECLIPSE, JG_BRUISER],
  Mordekaiser: [AP_FIGHTER, MAGE_BATTLE, TANK_HEARTSTEEL],
  Gwen: [AP_FIGHTER, MAGE_BURST, MAGE_BLACKFIRE],
  Kayle: [AP_FIGHTER, ADC_ONHIT, MAGE_BURST],
  Lillia: [MAGE_BLACKFIRE, MAGE_BATTLE, AP_FIGHTER],
  Karthus: [MAGE_BURST, MAGE_BLACKFIRE, MAGE_ARTI],
  Brand: [MAGE_BLACKFIRE, MAGE_BURST, SUPPORT_MAGE],
  Fiddlesticks: [MAGE_BURST, MAGE_BLACKFIRE, AP_ASSASSIN_ROCKET],
  Maokai: [TANK_HOLLOW, TANK_SUNFIRE, SUPPORT_ENGAGE],
  Sejuani: [TANK_HOLLOW, TANK_SUNFIRE, TANK_HEARTSTEEL],
  Zac: [TANK_HEARTSTEEL, TANK_HOLLOW, TANK_SUNFIRE],
  Nunu: [TANK_HOLLOW, TANK_SUNFIRE, JG_BRUISER],
  Amumu: [TANK_SUNFIRE, TANK_HOLLOW, SUPPORT_ENGAGE],
  Rammus: [TANK_SUNFIRE, TANK_HEARTSTEEL, TANK_HOLLOW],
  Ornn: [TANK_SUNFIRE, TANK_HEARTSTEEL, TANK_HOLLOW],
  Sion: [TANK_HEARTSTEEL, TANK_SUNFIRE, TANK_HOLLOW],
  Malphite: [TANK_SUNFIRE, TANK_HOLLOW, MAGE_BURST],
  Chogath: [TANK_HEARTSTEEL, TANK_SUNFIRE, MAGE_BURST],
  DrMundo: [TANK_HEARTSTEEL, TANK_SUNFIRE, TANK_HOLLOW],
  Galio: [TANK_HOLLOW, MAGE_BATTLE, SUPPORT_ENGAGE],
  KSante: [TANK_SUNFIRE, FIGHTER_SHOJIN, TANK_HEARTSTEEL],
  Poppy: [TANK_SUNFIRE, FIGHTER_STERAKS, SUPPORT_ENGAGE],
  Shen: [TANK_SUNFIRE, FIGHTER_SHOJIN, SUPPORT_ENGAGE],
  Singed: [TANK_SUNFIRE, MAGE_BLACKFIRE, TANK_HEARTSTEEL],
  Skarner: [TANK_SUNFIRE, TANK_HOLLOW, JG_BRUISER],
  TahmKench: [TANK_HEARTSTEEL, SUPPORT_ENGAGE, TANK_SUNFIRE],
  Thresh: [SUPPORT_ENGAGE, TANK_SUNFIRE],
  Nautilus: [SUPPORT_ENGAGE, TANK_SUNFIRE],
  Leona: [SUPPORT_ENGAGE, TANK_SUNFIRE],
  Rell: [SUPPORT_ENGAGE, TANK_SUNFIRE],
  Alistar: [SUPPORT_ENGAGE, TANK_HEARTSTEEL],
  Blitzcrank: [SUPPORT_ENGAGE, TANK_SUNFIRE],
  Braum: [SUPPORT_ENGAGE, TANK_SUNFIRE],
  Taric: [SUPPORT_ENGAGE, SUPPORT_ENCHANTER, TANK_SUNFIRE],
  Rakan: [SUPPORT_ENGAGE, SUPPORT_ENCHANTER],
  Lulu: [SUPPORT_ENCHANTER, SUPPORT_MAGE],
  Janna: [SUPPORT_ENCHANTER, SUPPORT_MAGE],
  Nami: [SUPPORT_ENCHANTER, SUPPORT_MAGE],
  Sona: [SUPPORT_ENCHANTER, SUPPORT_MAGE],
  Yuumi: [SUPPORT_ENCHANTER, SUPPORT_MAGE],
  Milio: [SUPPORT_ENCHANTER, SUPPORT_MAGE],
  Soraka: [SUPPORT_ENCHANTER, SUPPORT_MAGE],
  Karma: [SUPPORT_ENCHANTER, SUPPORT_MAGE, MAGE_BURST],
  Seraphine: [SUPPORT_MAGE, SUPPORT_ENCHANTER, MAGE_ARTI],
  Zyra: [SUPPORT_MAGE, MAGE_BLACKFIRE, MAGE_BURST],
  Xerath: [SUPPORT_MAGE, MAGE_BURST, MAGE_ARTI],
  Velkoz: [SUPPORT_MAGE, MAGE_BURST, MAGE_BLACKFIRE],
  Bard: [SUPPORT_ENGAGE, SUPPORT_ENCHANTER],
  Renata: [SUPPORT_ENCHANTER, SUPPORT_ENGAGE, SUPPORT_MAGE],
  Zilean: [SUPPORT_ENCHANTER, SUPPORT_MAGE, MAGE_ARTI],
  Ivern: [SUPPORT_ENCHANTER, SUPPORT_MAGE, MAGE_ARTI],
};

function hashPick(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function asPosition(value: string): PlayerPosition {
  if (
    value === 'TOP' ||
    value === 'JUNGLE' ||
    value === 'MID' ||
    value === 'BOT' ||
    value === 'SUPPORT'
  ) {
    return value;
  }
  return 'MID';
}

function resolveClass(
  championId: string,
  fallbackTags: readonly string[] = [],
): { combatClass: ChampionCombatClass; damageType: ChampionDamageType } {
  const kit = CHAMPION_KITS[championId];
  if (kit) {
    return { combatClass: kit.combatClass, damageType: kit.damageType };
  }
  if (fallbackTags.includes('Marksman')) {
    return { combatClass: 'marksman', damageType: 'ad' };
  }
  if (fallbackTags.includes('Tank')) {
    return { combatClass: 'tank', damageType: 'ad' };
  }
  if (fallbackTags.includes('Mage')) {
    return { combatClass: 'mage', damageType: 'ap' };
  }
  if (fallbackTags.includes('Assassin')) {
    return { combatClass: 'assassin', damageType: 'ad' };
  }
  if (fallbackTags.includes('Support')) {
    return { combatClass: 'support', damageType: 'ap' };
  }
  return { combatClass: 'fighter', damageType: 'ad' };
}

export function analyzeComp(state: GameState, side: ChampionEntity['side']): CompContext {
  const roster = state.champions ?? [];
  const enemies = roster.filter((champ) => champ.side !== side);
  const allies = roster.filter((champ) => champ.side === side);
  let enemyTanks = 0;
  let enemyArmor = 0;
  let enemyMr = 0;
  let enemyAssassins = 0;
  let enemyEngage = 0;
  let allyFrontline = 0;
  let allyAp = 0;
  let allyAd = 0;
  for (const enemy of enemies) {
    const kit = CHAMPION_KITS[enemy.championId];
    const combatClass = kit?.combatClass ?? 'fighter';
    const damageType = kit?.damageType ?? 'ad';
    if (combatClass === 'tank') {
      enemyTanks += 1;
      enemyArmor += 1.2;
      enemyMr += 1;
    } else if (combatClass === 'fighter') {
      enemyArmor += 0.9;
      enemyEngage += (kit?.style.engage ?? 50) / 100;
    } else if (combatClass === 'assassin') {
      enemyAssassins += 1;
      enemyEngage += 0.6;
    } else if (combatClass === 'mage') {
      enemyMr += 0.7;
    } else if (combatClass === 'marksman') {
      enemyArmor += 0.35;
    }
    if (damageType === 'ap' || damageType === 'hybrid') {
      enemyMr += 0.45;
    }
    if (damageType === 'ad' || damageType === 'hybrid') {
      enemyArmor += 0.35;
    }
    enemyEngage += (kit?.style.engage ?? 40) / 220;
  }
  for (const ally of allies) {
    const kit = CHAMPION_KITS[ally.championId];
    const combatClass = kit?.combatClass ?? 'fighter';
    const damageType = kit?.damageType ?? 'ad';
    if (combatClass === 'tank' || combatClass === 'fighter' || combatClass === 'support') {
      allyFrontline += combatClass === 'tank' ? 1.2 : 0.7;
    }
    if (damageType === 'ap' || damageType === 'hybrid') {
      allyAp += 1;
    }
    if (damageType === 'ad' || damageType === 'hybrid') {
      allyAd += 1;
    }
  }
  const myGold = allies.reduce((sum, champ) => sum + champ.earnedGold, 0);
  const theirGold = enemies.reduce((sum, champ) => sum + champ.earnedGold, 0);
  return {
    enemyTanks,
    enemyArmor,
    enemyMr,
    enemyAssassins,
    enemyEngage,
    allyFrontline,
    allyAp,
    allyAd,
    goldLead: myGold - theirGold,
  };
}

function defaultPool(
  combatClass: ChampionCombatClass,
  damageType: ChampionDamageType,
  position: PlayerPosition,
): BuildPlan[] {
  if (position === 'SUPPORT' || combatClass === 'support') {
    return [SUPPORT_ENCHANTER, SUPPORT_ENGAGE, SUPPORT_MAGE];
  }
  if (combatClass === 'tank') {
    return [TANK_SUNFIRE, TANK_HOLLOW, TANK_HEARTSTEEL, TANK_FROST];
  }
  if (combatClass === 'marksman') {
    return [ADC_CRIT_CLASSIC, ADC_CRIT_YUNTAL, ADC_COLLECTOR, ADC_ONHIT, ADC_SHIELDBOW];
  }
  if (combatClass === 'mage') {
    return [MAGE_BURST, MAGE_BATTLE, MAGE_BLACKFIRE, MAGE_ARTI];
  }
  if (combatClass === 'assassin') {
    if (damageType === 'ap' || damageType === 'hybrid') {
      return [AP_ASSASSIN_STORM, AP_ASSASSIN_ROCKET];
    }
    return [AD_ASSASSIN_CLASSIC, AD_ASSASSIN_PROFANE, AD_ASSASSIN_ECLIPSE];
  }
  if (combatClass === 'fighter') {
    if (damageType === 'ap') {
      return [AP_FIGHTER, MAGE_BATTLE];
    }
    if (position === 'JUNGLE') {
      return [JG_BRUISER, JG_ASSASSIN, FIGHTER_SHOJIN, FIGHTER_STERAKS];
    }
    return [FIGHTER_STERAKS, FIGHTER_SHOJIN, FIGHTER_TRINITY, FIGHTER_ECLIPSE];
  }
  return [FIGHTER_STERAKS, FIGHTER_SHOJIN];
}

function weightPlan(
  plan: BuildPlan,
  ctx: CompContext,
  combatClass: ChampionCombatClass,
  position: PlayerPosition,
  kitEngage: number,
  kitPoke: number,
): number {
  if (plan.id.startsWith('support-') && position !== 'SUPPORT') {
    return 0.05;
  }
  if (
    position === 'SUPPORT' &&
    (plan.id.startsWith('adc-') || plan.id.startsWith('ad-assassin') || plan.id.startsWith('jg-'))
  ) {
    return 0.05;
  }
  let weight = 1;
  if (plan.id.includes('onhit')) {
    weight += Math.max(0, ctx.enemyTanks - 1.2) * 1.6 + Math.max(0, ctx.enemyArmor - 2.4) * 0.45;
  }
  if (plan.id.includes('liandry') || plan.id.includes('blackfire')) {
    weight += ctx.enemyTanks * 0.7 + ctx.enemyArmor * 0.2;
  }
  if (plan.id.includes('collector') || plan.id.includes('storm') || plan.id.includes('profane')) {
    weight += Math.max(0, 1.6 - ctx.enemyTanks) + (ctx.goldLead > 1200 ? 0.8 : 0);
  }
  if (plan.id.includes('shieldbow') || plan.id.includes('ga') || plan.id.includes('steraks')) {
    weight += ctx.enemyAssassins * 1.1 + (ctx.goldLead < -1500 ? 1.2 : 0);
  }
  if (plan.id.includes('hollow') || plan.id.includes('kaenic') || plan.id.includes('force')) {
    weight += ctx.enemyMr * 0.55;
  }
  if (plan.id.includes('sunfire') || plan.id.includes('thorn') || plan.id.includes('randuin') || plan.id.includes('frost')) {
    weight += ctx.enemyArmor * 0.35 + (ctx.allyAd >= 3 ? 0.4 : 0);
  }
  if (plan.id.includes('heartsteel')) {
    weight += ctx.enemyAssassins * 0.3 + (position === 'TOP' ? 0.5 : 0);
  }
  if (plan.id.includes('engage') || plan.id.includes('locket') || plan.id.includes('zeke')) {
    weight += kitEngage / 40 + ctx.enemyEngage * 0.45;
    if (kitEngage >= 75) {
      weight += 1.8;
    }
  }
  if (plan.id.includes('enchanter') || plan.id.includes('moonstone') || plan.id.includes('ardent')) {
    if (kitEngage >= 75) {
      return 0.04;
    }
    if (kitEngage >= 65) {
      weight *= 0.25;
    }
    weight += ctx.allyAd * 0.35 + (kitPoke > 55 ? 0.3 : 0.8);
  }
  if (plan.id.includes('support-mage')) {
    if (kitEngage >= 80) {
      weight *= 0.2;
    }
    weight += kitPoke / 50 + (ctx.allyAd <= 2 ? 0.5 : 0);
  }
  if (plan.id.includes('shojin') || plan.id.includes('trinity')) {
    weight += ctx.enemyTanks * 0.35 + (combatClass === 'fighter' ? 0.4 : 0);
  }
  if (plan.id.includes('eclipse') || plan.id.includes('sundered')) {
    weight += ctx.enemyAssassins * 0.2 + (ctx.goldLead > 800 ? 0.5 : 0.15);
  }
  if (plan.id.includes('yuntal') || plan.id.includes('crit-classic')) {
    weight += 0.9 + ctx.allyFrontline * 0.2 + (ctx.enemyAssassins < 2 ? 0.45 : 0);
  }
  if (plan.id.includes('void') || plan.id.includes('crypt') || plan.id.includes('shadowflame')) {
    weight += ctx.enemyMr * 0.25;
  }
  if (plan.id.includes('dominik') || plan.id.includes('mortal') || plan.id.includes('cleaver')) {
    weight += ctx.enemyArmor * 0.2;
  }
  return Math.max(0.05, weight);
}

function adaptPlanItems(items: readonly string[], ctx: CompContext): string[] {
  const next = [...items];
  const replace = (from: string, to: string) => {
    const index = next.indexOf(from);
    if (index >= 0) {
      next[index] = to;
    }
  };
  if (ctx.enemyArmor >= 3.2) {
    replace('LordDominiksRegards', 'LordDominiksRegards');
    replace('MortalReminder', 'LordDominiksRegards');
    if (!next.includes('LordDominiksRegards') && next.includes('LastWhisper')) {
      const idx = next.indexOf('LastWhisper');
      next.splice(idx + 1, 0, 'LordDominiksRegards');
    }
  } else if (ctx.enemyAssassins + ctx.enemyEngage >= 2.5) {
    replace('LordDominiksRegards', 'MortalReminder');
  }
  if (ctx.enemyMr >= 3) {
    replace('VoidStaff', 'Cryptbloom');
    if (!next.includes('VoidStaff') && !next.includes('Cryptbloom') && next.includes('Shadowflame')) {
      next.push('Cryptbloom');
    }
  }
  if (ctx.enemyAssassins >= 2) {
    replace('BerserkersGreaves', 'PlatedSteelcaps');
    replace('SorcerersShoes', 'MercurysTreads');
    if (next.includes('Bloodthirster') && !next.includes('GuardianAngel')) {
      next.push('GuardianAngel');
    }
  } else if (ctx.enemyMr >= 2.5) {
    replace('PlatedSteelcaps', 'MercurysTreads');
  }
  return next;
}

function pickWeighted(plans: WeightedPlan[], roll: number): BuildPlan {
  const total = plans.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = (roll % 10000) / 10000 * total;
  for (const entry of plans) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.plan;
    }
  }
  return plans[plans.length - 1]?.plan ?? ADC_CRIT_CLASSIC;
}

type OpggItemRow = {
  role: PlayerPosition | 'ANY';
  items: readonly string[];
  source?: string;
};

const OPGG_SKIP_ITEMS = new Set([
  'HealthPotion',
  'RefillablePotion',
  'CorruptingPotion',
  'ControlWard',
  'TotalBiscuitofEverlastingWill',
]);

const JUNGLE_PET_ITEMS = new Set([
  'ScorchclawPup',
  'GustwalkerHatchling',
  'MosstomperSeedling',
]);

const OPGG_ITEM_ROWS: Readonly<Record<string, readonly OpggItemRow[]>> = Object.fromEntries(
  Object.entries(
    (opggItemBuilds as { champions: Record<string, OpggItemRow[]> }).champions,
  ).map(([championId, rows]) => [
    championId,
    rows.map((row) => ({
      role: row.role,
      items: row.items.filter((itemId) => !OPGG_SKIP_ITEMS.has(itemId)),
      source: row.source,
    })),
  ]),
);

function sanitizeOpggItems(
  items: readonly string[],
  position: PlayerPosition,
): string[] {
  return items.filter((itemId) => {
    if (OPGG_SKIP_ITEMS.has(itemId)) {
      return false;
    }
    if (position !== 'JUNGLE' && JUNGLE_PET_ITEMS.has(itemId)) {
      return false;
    }
    return true;
  });
}

function resolveOpggItems(
  championId: string,
  position: PlayerPosition,
): readonly string[] | null {
  const rows = OPGG_ITEM_ROWS[championId];
  if (!rows || rows.length === 0) {
    return null;
  }
  const exact = rows.find((row) => row.role === position);
  if (exact && exact.items.length > 0) {
    return sanitizeOpggItems(exact.items, position);
  }
  const any = rows.find((row) => row.role === 'ANY');
  if (any && any.items.length > 0) {
    return sanitizeOpggItems(any.items, position);
  }
  return rows[0]?.items?.length ? sanitizeOpggItems(rows[0].items, position) : null;
}

export function resolveShopPrefer(args: {
  championId: string;
  position: string;
  ownedItems: readonly string[];
  tags?: readonly string[];
  state?: GameState;
  side?: ChampionEntity['side'];
  playerId?: string;
}): string[] {
  const position = asPosition(args.position);
  const { combatClass, damageType } = resolveClass(args.championId, args.tags);
  const kit = CHAMPION_KITS[args.championId];
  const ctx =
    args.state && args.side
      ? analyzeComp(args.state, args.side)
      : {
          enemyTanks: 0.8,
          enemyArmor: 1.8,
          enemyMr: 1.8,
          enemyAssassins: 1,
          enemyEngage: 1,
          allyFrontline: 1.5,
          allyAp: 2,
          allyAd: 3,
          goldLead: 0,
        };
  const opggItems = resolveOpggItems(args.championId, position);
  if (opggItems && opggItems.length > 0) {
    return adaptPlanItems(opggItems, ctx);
  }
  const pool = [...(CHAMPION_PLAN_POOL[args.championId] ?? defaultPool(combatClass, damageType, position))];
  const weighted: WeightedPlan[] = pool.map((plan) => ({
    plan,
    weight: weightPlan(
      plan,
      ctx,
      combatClass,
      position,
      kit?.style.engage ?? 50,
      kit?.style.poke ?? 50,
    ),
  }));
  const seedKey = [
    String(args.state?.seed ?? 'solo'),
    args.championId,
    args.playerId ?? '',
    position,
    String(Math.round(ctx.enemyArmor * 10)),
    String(Math.round(ctx.enemyMr * 10)),
    String(ctx.enemyTanks),
    String(ctx.enemyAssassins),
  ].join('|');
  const picked = pickWeighted(weighted, hashPick(seedKey));
  return adaptPlanItems(picked.items, ctx);
}

export function resolveShopPreferForChampion(state: GameState, champion: ChampionEntity): string[] {
  if (champion.shopPlan && champion.shopPlan.length > 0) {
    const ctx = analyzeComp(state, champion.side);
    return adaptPlanItems(champion.shopPlan, ctx);
  }
  const def = state.lockedPack.champions[champion.championId];
  const plan = resolveShopPrefer({
    championId: champion.championId,
    position: champion.positionLabel,
    ownedItems: champion.items,
    tags: def?.tags,
    state,
    side: champion.side,
    playerId: champion.playerId,
  });
  champion.shopPlan = plan;
  return plan;
}
