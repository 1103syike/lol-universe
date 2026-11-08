export const CHAMPION_SPRITE_URL = '/champions/champion-sprite.webp';
export const CHAMPION_SPRITE_CELL = 58;
export const CHAMPION_SPRITE_COLUMNS = 16;
export const CHAMPION_SPRITE_WIDTH = 928;
export const CHAMPION_SPRITE_HEIGHT = 742;
export const CHAMPION_DATA_VERSION = '14.24.1';
export const CHAMPION_SPRITE_BASE_VERSION = '9.22.1';

export type ChampionTag = 'Fighter' | 'Tank' | 'Mage' | 'Assassin' | 'Marksman' | 'Support';
export type ChampionRole = 'fighter' | 'tank' | 'mage' | 'assassin' | 'marksman' | 'support';

export interface ChampionDefinition {
  id: string;
  key: number;
  name: string;
  nameZh: string;
  title: string;
  titleZh: string;
  tags: ChampionTag[];
  roles: ChampionRole[];
  resource: string;
  spriteIndex: number;
}

export const CHAMPIONS: readonly ChampionDefinition[] = [
  {
    id: "Aatrox",
    key: 266,
    name: "Aatrox",
    nameZh: "厄薩斯",
    title: "the Darkin Blade",
    titleZh: "冥血劍魔",
    tags: [
      "Fighter"
    ],
    roles: [
      "fighter"
    ],
    resource: "Blood Well",
    spriteIndex: 1
  },
  {
    id: "Ahri",
    key: 103,
    name: "Ahri",
    nameZh: "阿璃",
    title: "the Nine-Tailed Fox",
    titleZh: "九尾妖狐",
    tags: [
      "Mage",
      "Assassin"
    ],
    roles: [
      "mage",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 2
  },
  {
    id: "Akali",
    key: 84,
    name: "Akali",
    nameZh: "阿卡莉",
    title: "the Rogue Assassin",
    titleZh: "隻影刺客",
    tags: [
      "Assassin"
    ],
    roles: [
      "assassin"
    ],
    resource: "Energy",
    spriteIndex: 3
  },
  {
    id: "Alistar",
    key: 12,
    name: "Alistar",
    nameZh: "亞歷斯塔",
    title: "the Minotaur",
    titleZh: "牛頭酋長",
    tags: [
      "Tank",
      "Support"
    ],
    roles: [
      "tank",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 4
  },
  {
    id: "Amumu",
    key: 32,
    name: "Amumu",
    nameZh: "阿姆姆",
    title: "the Sad Mummy",
    titleZh: "殤之木乃伊",
    tags: [
      "Tank",
      "Support"
    ],
    roles: [
      "tank",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 5
  },
  {
    id: "Anivia",
    key: 34,
    name: "Anivia",
    nameZh: "艾妮維亞",
    title: "the Cryophoenix",
    titleZh: "冰晶鳳凰",
    tags: [
      "Mage"
    ],
    roles: [
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 6
  },
  {
    id: "Annie",
    key: 1,
    name: "Annie",
    nameZh: "安妮",
    title: "the Dark Child",
    titleZh: "黑暗之女",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 7
  },
  {
    id: "Ashe",
    key: 22,
    name: "Ashe",
    nameZh: "艾希",
    title: "the Frost Archer",
    titleZh: "冰霜射手",
    tags: [
      "Marksman",
      "Support"
    ],
    roles: [
      "marksman",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 8
  },
  {
    id: "AurelionSol",
    key: 136,
    name: "Aurelion Sol",
    nameZh: "翱銳龍獸",
    title: "The Star Forger",
    titleZh: "星際漫遊者",
    tags: [
      "Mage"
    ],
    roles: [
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 9
  },
  {
    id: "Azir",
    key: 268,
    name: "Azir",
    nameZh: "阿祈爾",
    title: "the Emperor of the Sands",
    titleZh: "蘇瑞瑪砂皇",
    tags: [
      "Mage",
      "Marksman"
    ],
    roles: [
      "mage",
      "marksman"
    ],
    resource: "Mana",
    spriteIndex: 10
  },
  {
    id: "Bard",
    key: 432,
    name: "Bard",
    nameZh: "巴德",
    title: "the Wandering Caretaker",
    titleZh: "漂泊守望者",
    tags: [
      "Support",
      "Mage"
    ],
    roles: [
      "support",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 11
  },
  {
    id: "Blitzcrank",
    key: 53,
    name: "Blitzcrank",
    nameZh: "布里茨",
    title: "the Great Steam Golem",
    titleZh: "蒸汽巨神兵",
    tags: [
      "Tank",
      "Support"
    ],
    roles: [
      "tank",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 12
  },
  {
    id: "Brand",
    key: 63,
    name: "Brand",
    nameZh: "布蘭德",
    title: "the Burning Vengeance",
    titleZh: "復仇業火",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 13
  },
  {
    id: "Braum",
    key: 201,
    name: "Braum",
    nameZh: "布郎姆",
    title: "the Heart of the Freljord",
    titleZh: "弗雷爾卓德豪腕",
    tags: [
      "Tank",
      "Support"
    ],
    roles: [
      "tank",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 14
  },
  {
    id: "Caitlyn",
    key: 51,
    name: "Caitlyn",
    nameZh: "凱特琳",
    title: "the Sheriff of Piltover",
    titleZh: "執法者",
    tags: [
      "Marksman"
    ],
    roles: [
      "marksman"
    ],
    resource: "Mana",
    spriteIndex: 15
  },
  {
    id: "Camille",
    key: 164,
    name: "Camille",
    nameZh: "卡蜜兒",
    title: "the Steel Shadow",
    titleZh: "鋼鐵殘影",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 16
  },
  {
    id: "Cassiopeia",
    key: 69,
    name: "Cassiopeia",
    nameZh: "卡莎碧雅",
    title: "the Serpent's Embrace",
    titleZh: "蛇之擁抱",
    tags: [
      "Mage"
    ],
    roles: [
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 17
  },
  {
    id: "Chogath",
    key: 31,
    name: "Cho'Gath",
    nameZh: "科加斯",
    title: "the Terror of the Void",
    titleZh: "虛空恐懼",
    tags: [
      "Tank",
      "Mage"
    ],
    roles: [
      "tank",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 18
  },
  {
    id: "Corki",
    key: 42,
    name: "Corki",
    nameZh: "庫奇",
    title: "the Daring Bombardier",
    titleZh: "英勇投彈手",
    tags: [
      "Marksman",
      "Mage"
    ],
    roles: [
      "marksman",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 19
  },
  {
    id: "Darius",
    key: 122,
    name: "Darius",
    nameZh: "達瑞斯",
    title: "the Hand of Noxus",
    titleZh: "諾克薩斯之力",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 20
  },
  {
    id: "Diana",
    key: 131,
    name: "Diana",
    nameZh: "黛安娜",
    title: "Scorn of the Moon",
    titleZh: "輕藐之月",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 21
  },
  {
    id: "Draven",
    key: 119,
    name: "Draven",
    nameZh: "達瑞文",
    title: "the Glorious Executioner",
    titleZh: "處刑娛樂大師",
    tags: [
      "Marksman"
    ],
    roles: [
      "marksman"
    ],
    resource: "Mana",
    spriteIndex: 22
  },
  {
    id: "DrMundo",
    key: 36,
    name: "Dr. Mundo",
    nameZh: "蒙多醫生",
    title: "the Madman of Zaun",
    titleZh: "佐恩狂人",
    tags: [
      "Tank",
      "Fighter"
    ],
    roles: [
      "tank",
      "fighter"
    ],
    resource: "None",
    spriteIndex: 23
  },
  {
    id: "Ekko",
    key: 245,
    name: "Ekko",
    nameZh: "艾克",
    title: "the Boy Who Shattered Time",
    titleZh: "時空少年",
    tags: [
      "Assassin",
      "Mage"
    ],
    roles: [
      "assassin",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 24
  },
  {
    id: "Elise",
    key: 60,
    name: "Elise",
    nameZh: "伊莉絲",
    title: "the Spider Queen",
    titleZh: "蜘蛛女王",
    tags: [
      "Assassin",
      "Mage"
    ],
    roles: [
      "assassin",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 25
  },
  {
    id: "Evelynn",
    key: 28,
    name: "Evelynn",
    nameZh: "伊芙琳",
    title: "Agony's Embrace",
    titleZh: "臨終擁抱",
    tags: [
      "Assassin",
      "Mage"
    ],
    roles: [
      "assassin",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 26
  },
  {
    id: "Ezreal",
    key: 81,
    name: "Ezreal",
    nameZh: "伊澤瑞爾",
    title: "the Prodigal Explorer",
    titleZh: "探險家",
    tags: [
      "Marksman",
      "Mage"
    ],
    roles: [
      "marksman",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 27
  },
  {
    id: "Fiddlesticks",
    key: 9,
    name: "Fiddlesticks",
    nameZh: "費德提克",
    title: "the Ancient Fear",
    titleZh: "亙古之懼",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 28
  },
  {
    id: "Fiora",
    key: 114,
    name: "Fiora",
    nameZh: "菲歐拉",
    title: "the Grand Duelist",
    titleZh: "孤高劍客",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 29
  },
  {
    id: "Fizz",
    key: 105,
    name: "Fizz",
    nameZh: "飛斯",
    title: "the Tidal Trickster",
    titleZh: "深海頑童",
    tags: [
      "Assassin",
      "Fighter"
    ],
    roles: [
      "assassin",
      "fighter"
    ],
    resource: "Mana",
    spriteIndex: 30
  },
  {
    id: "Galio",
    key: 3,
    name: "Galio",
    nameZh: "加里歐",
    title: "the Colossus",
    titleZh: "禦國巨像",
    tags: [
      "Tank",
      "Mage"
    ],
    roles: [
      "tank",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 31
  },
  {
    id: "Gangplank",
    key: 41,
    name: "Gangplank",
    nameZh: "剛普朗克",
    title: "the Saltwater Scourge",
    titleZh: "海洋之災",
    tags: [
      "Fighter"
    ],
    roles: [
      "fighter"
    ],
    resource: "Mana",
    spriteIndex: 32
  },
  {
    id: "Garen",
    key: 86,
    name: "Garen",
    nameZh: "蓋倫",
    title: "The Might of Demacia",
    titleZh: "蒂瑪西亞之力",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "None",
    spriteIndex: 33
  },
  {
    id: "Gnar",
    key: 150,
    name: "Gnar",
    nameZh: "吶兒",
    title: "the Missing Link",
    titleZh: "失落之子",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Rage",
    spriteIndex: 34
  },
  {
    id: "Gragas",
    key: 79,
    name: "Gragas",
    nameZh: "古拉格斯",
    title: "the Rabble Rouser",
    titleZh: "酒桶之王",
    tags: [
      "Fighter",
      "Mage"
    ],
    roles: [
      "fighter",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 35
  },
  {
    id: "Graves",
    key: 104,
    name: "Graves",
    nameZh: "葛雷夫",
    title: "the Outlaw",
    titleZh: "亡命之徒",
    tags: [
      "Marksman"
    ],
    roles: [
      "marksman"
    ],
    resource: "Mana",
    spriteIndex: 36
  },
  {
    id: "Hecarim",
    key: 120,
    name: "Hecarim",
    nameZh: "赫克林",
    title: "the Shadow of War",
    titleZh: "戰爭之影",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 37
  },
  {
    id: "Heimerdinger",
    key: 74,
    name: "Heimerdinger",
    nameZh: "漢默丁格",
    title: "the Revered Inventor",
    titleZh: "大發明家",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 38
  },
  {
    id: "Illaoi",
    key: 420,
    name: "Illaoi",
    nameZh: "伊羅旖",
    title: "the Kraken Priestess",
    titleZh: "海妖祭司",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 39
  },
  {
    id: "Irelia",
    key: 39,
    name: "Irelia",
    nameZh: "伊瑞莉雅",
    title: "the Blade Dancer",
    titleZh: "舞劍靈使",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 40
  },
  {
    id: "Ivern",
    key: 427,
    name: "Ivern",
    nameZh: "埃爾文",
    title: "the Green Father",
    titleZh: "綠林之父",
    tags: [
      "Support",
      "Mage"
    ],
    roles: [
      "support",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 41
  },
  {
    id: "Janna",
    key: 40,
    name: "Janna",
    nameZh: "珍娜",
    title: "the Storm's Fury",
    titleZh: "風暴女神",
    tags: [
      "Support",
      "Mage"
    ],
    roles: [
      "support",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 42
  },
  {
    id: "JarvanIV",
    key: 59,
    name: "Jarvan IV",
    nameZh: "嘉文四世",
    title: "the Exemplar of Demacia",
    titleZh: "蒂瑪西亞楷模",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 43
  },
  {
    id: "Jax",
    key: 24,
    name: "Jax",
    nameZh: "賈克斯",
    title: "Grandmaster at Arms",
    titleZh: "武器達人",
    tags: [
      "Fighter"
    ],
    roles: [
      "fighter"
    ],
    resource: "Mana",
    spriteIndex: 44
  },
  {
    id: "Jayce",
    key: 126,
    name: "Jayce",
    nameZh: "杰西",
    title: "the Defender of Tomorrow",
    titleZh: "明日守護者",
    tags: [
      "Marksman",
      "Fighter"
    ],
    roles: [
      "marksman",
      "fighter"
    ],
    resource: "Mana",
    spriteIndex: 45
  },
  {
    id: "Jhin",
    key: 202,
    name: "Jhin",
    nameZh: "燼",
    title: "the Virtuoso",
    titleZh: "炫技大師",
    tags: [
      "Marksman",
      "Mage"
    ],
    roles: [
      "marksman",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 46
  },
  {
    id: "Jinx",
    key: 222,
    name: "Jinx",
    nameZh: "吉茵珂絲",
    title: "the Loose Cannon",
    titleZh: "暴走重砲",
    tags: [
      "Marksman"
    ],
    roles: [
      "marksman"
    ],
    resource: "Mana",
    spriteIndex: 47
  },
  {
    id: "Kaisa",
    key: 145,
    name: "Kai'Sa",
    nameZh: "凱莎",
    title: "Daughter of the Void",
    titleZh: "虛空之女",
    tags: [
      "Marksman",
      "Mage"
    ],
    roles: [
      "marksman",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 48
  },
  {
    id: "Kalista",
    key: 429,
    name: "Kalista",
    nameZh: "克黎思妲",
    title: "the Spear of Vengeance",
    titleZh: "復仇之矛",
    tags: [
      "Marksman"
    ],
    roles: [
      "marksman"
    ],
    resource: "Mana",
    spriteIndex: 49
  },
  {
    id: "Karma",
    key: 43,
    name: "Karma",
    nameZh: "卡瑪",
    title: "the Enlightened One",
    titleZh: "魂之啟者",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 50
  },
  {
    id: "Karthus",
    key: 30,
    name: "Karthus",
    nameZh: "卡爾瑟斯",
    title: "the Deathsinger",
    titleZh: "死亡頌唱者",
    tags: [
      "Mage"
    ],
    roles: [
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 51
  },
  {
    id: "Kassadin",
    key: 38,
    name: "Kassadin",
    nameZh: "卡薩丁",
    title: "the Void Walker",
    titleZh: "虛空行者",
    tags: [
      "Assassin",
      "Mage"
    ],
    roles: [
      "assassin",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 52
  },
  {
    id: "Katarina",
    key: 55,
    name: "Katarina",
    nameZh: "卡特蓮娜",
    title: "the Sinister Blade",
    titleZh: "不祥之刃",
    tags: [
      "Assassin",
      "Mage"
    ],
    roles: [
      "assassin",
      "mage"
    ],
    resource: "None",
    spriteIndex: 53
  },
  {
    id: "Kayle",
    key: 10,
    name: "Kayle",
    nameZh: "凱爾",
    title: "the Righteous",
    titleZh: "正義天使",
    tags: [
      "Mage",
      "Marksman"
    ],
    roles: [
      "mage",
      "marksman"
    ],
    resource: "Mana",
    spriteIndex: 54
  },
  {
    id: "Kayn",
    key: 141,
    name: "Kayn",
    nameZh: "慨影",
    title: "the Shadow Reaper",
    titleZh: "闇魂收割者",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 55
  },
  {
    id: "Kennen",
    key: 85,
    name: "Kennen",
    nameZh: "凱能",
    title: "the Heart of the Tempest",
    titleZh: "狂暴之心",
    tags: [
      "Mage"
    ],
    roles: [
      "mage"
    ],
    resource: "Energy",
    spriteIndex: 56
  },
  {
    id: "Khazix",
    key: 121,
    name: "Kha'Zix",
    nameZh: "卡力斯",
    title: "the Voidreaver",
    titleZh: "虛空掠食者",
    tags: [
      "Assassin"
    ],
    roles: [
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 57
  },
  {
    id: "Kindred",
    key: 203,
    name: "Kindred",
    nameZh: "鏡爪",
    title: "The Eternal Hunters",
    titleZh: "永恆獵手",
    tags: [
      "Marksman"
    ],
    roles: [
      "marksman"
    ],
    resource: "Mana",
    spriteIndex: 58
  },
  {
    id: "Kled",
    key: 240,
    name: "Kled",
    nameZh: "克雷德",
    title: "the Cantankerous Cavalier",
    titleZh: "暴躁騎士",
    tags: [
      "Fighter"
    ],
    roles: [
      "fighter"
    ],
    resource: "Courage",
    spriteIndex: 59
  },
  {
    id: "KogMaw",
    key: 96,
    name: "Kog'Maw",
    nameZh: "寇格魔",
    title: "the Mouth of the Abyss",
    titleZh: "深淵巨口",
    tags: [
      "Marksman",
      "Mage"
    ],
    roles: [
      "marksman",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 60
  },
  {
    id: "Leblanc",
    key: 7,
    name: "LeBlanc",
    nameZh: "勒布朗",
    title: "the Deceiver",
    titleZh: "詐欺師",
    tags: [
      "Assassin",
      "Mage"
    ],
    roles: [
      "assassin",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 61
  },
  {
    id: "LeeSin",
    key: 64,
    name: "Lee Sin",
    nameZh: "李星",
    title: "the Blind Monk",
    titleZh: "盲眼武僧",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Energy",
    spriteIndex: 62
  },
  {
    id: "Leona",
    key: 89,
    name: "Leona",
    nameZh: "雷歐娜",
    title: "the Radiant Dawn",
    titleZh: "黎明之光",
    tags: [
      "Tank",
      "Support"
    ],
    roles: [
      "tank",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 63
  },
  {
    id: "Lissandra",
    key: 127,
    name: "Lissandra",
    nameZh: "麗珊卓",
    title: "the Ice Witch",
    titleZh: "傲雪巫女",
    tags: [
      "Mage"
    ],
    roles: [
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 64
  },
  {
    id: "Lucian",
    key: 236,
    name: "Lucian",
    nameZh: "路西恩",
    title: "the Purifier",
    titleZh: "驅魔聖槍",
    tags: [
      "Marksman",
      "Assassin"
    ],
    roles: [
      "marksman",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 65
  },
  {
    id: "Lulu",
    key: 117,
    name: "Lulu",
    nameZh: "露璐",
    title: "the Fae Sorceress",
    titleZh: "精靈魔法使",
    tags: [
      "Support",
      "Mage"
    ],
    roles: [
      "support",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 66
  },
  {
    id: "Lux",
    key: 99,
    name: "Lux",
    nameZh: "拉克絲",
    title: "the Lady of Luminosity",
    titleZh: "光之少女",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 67
  },
  {
    id: "Malphite",
    key: 54,
    name: "Malphite",
    nameZh: "墨菲特",
    title: "Shard of the Monolith",
    titleZh: "幻石碎片",
    tags: [
      "Tank",
      "Mage"
    ],
    roles: [
      "tank",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 68
  },
  {
    id: "Malzahar",
    key: 90,
    name: "Malzahar",
    nameZh: "馬爾札哈",
    title: "the Prophet of the Void",
    titleZh: "虛空先知",
    tags: [
      "Mage"
    ],
    roles: [
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 69
  },
  {
    id: "Maokai",
    key: 57,
    name: "Maokai",
    nameZh: "茂凱",
    title: "the Twisted Treant",
    titleZh: "扭曲樹人",
    tags: [
      "Tank",
      "Support"
    ],
    roles: [
      "tank",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 70
  },
  {
    id: "MasterYi",
    key: 11,
    name: "Master Yi",
    nameZh: "易大師",
    title: "the Wuju Bladesman",
    titleZh: "無極劍聖",
    tags: [
      "Assassin",
      "Fighter"
    ],
    roles: [
      "assassin",
      "fighter"
    ],
    resource: "Mana",
    spriteIndex: 71
  },
  {
    id: "MissFortune",
    key: 21,
    name: "Miss Fortune",
    nameZh: "好運姐",
    title: "the Bounty Hunter",
    titleZh: "賞金獵人",
    tags: [
      "Marksman",
      "Mage"
    ],
    roles: [
      "marksman",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 72
  },
  {
    id: "MonkeyKing",
    key: 62,
    name: "Wukong",
    nameZh: "悟空",
    title: "the Monkey King",
    titleZh: "齊天大聖",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 73
  },
  {
    id: "Mordekaiser",
    key: 82,
    name: "Mordekaiser",
    nameZh: "魔鬥凱薩",
    title: "the Iron Revenant",
    titleZh: " 金屬亡靈",
    tags: [
      "Fighter",
      "Mage"
    ],
    roles: [
      "fighter",
      "mage"
    ],
    resource: "Shield",
    spriteIndex: 74
  },
  {
    id: "Morgana",
    key: 25,
    name: "Morgana",
    nameZh: "魔甘娜",
    title: "the Fallen",
    titleZh: "墮落天使",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 75
  },
  {
    id: "Nami",
    key: 267,
    name: "Nami",
    nameZh: "娜米",
    title: "the Tidecaller",
    titleZh: "海潮之音",
    tags: [
      "Support",
      "Mage"
    ],
    roles: [
      "support",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 76
  },
  {
    id: "Nasus",
    key: 75,
    name: "Nasus",
    nameZh: "納瑟斯",
    title: "the Curator of the Sands",
    titleZh: "沙漠死神",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 77
  },
  {
    id: "Nautilus",
    key: 111,
    name: "Nautilus",
    nameZh: "納帝魯斯",
    title: "the Titan of the Depths",
    titleZh: "深淵巨人",
    tags: [
      "Tank",
      "Support"
    ],
    roles: [
      "tank",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 78
  },
  {
    id: "Neeko",
    key: 518,
    name: "Neeko",
    nameZh: "妮可",
    title: "the Curious Chameleon",
    titleZh: "好奇變色龍",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 79
  },
  {
    id: "Nidalee",
    key: 76,
    name: "Nidalee",
    nameZh: "奈德麗",
    title: "the Bestial Huntress",
    titleZh: "狂野獵手",
    tags: [
      "Assassin",
      "Mage"
    ],
    roles: [
      "assassin",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 80
  },
  {
    id: "Nocturne",
    key: 56,
    name: "Nocturne",
    nameZh: "夜曲",
    title: "the Eternal Nightmare",
    titleZh: "永恆夢魘",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 81
  },
  {
    id: "Nunu",
    key: 20,
    name: "Nunu & Willump",
    nameZh: "努努和威朗普",
    title: "the Boy and His Yeti",
    titleZh: "冰原拍檔",
    tags: [
      "Tank",
      "Mage"
    ],
    roles: [
      "tank",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 82
  },
  {
    id: "Olaf",
    key: 2,
    name: "Olaf",
    nameZh: "歐拉夫",
    title: "the Berserker",
    titleZh: "狂戰士",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 83
  },
  {
    id: "Orianna",
    key: 61,
    name: "Orianna",
    nameZh: "奧莉安娜",
    title: "the Lady of Clockwork",
    titleZh: "發條少女",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 84
  },
  {
    id: "Ornn",
    key: 516,
    name: "Ornn",
    nameZh: "鄂爾",
    title: "The Fire below the Mountain",
    titleZh: "爐心山神",
    tags: [
      "Tank"
    ],
    roles: [
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 85
  },
  {
    id: "Pantheon",
    key: 80,
    name: "Pantheon",
    nameZh: "潘森",
    title: "the Unbreakable Spear",
    titleZh: "不屈之矛",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 86
  },
  {
    id: "Poppy",
    key: 78,
    name: "Poppy",
    nameZh: "波比",
    title: "Keeper of the Hammer",
    titleZh: "聖槌守護者",
    tags: [
      "Tank",
      "Fighter"
    ],
    roles: [
      "tank",
      "fighter"
    ],
    resource: "Mana",
    spriteIndex: 87
  },
  {
    id: "Pyke",
    key: 555,
    name: "Pyke",
    nameZh: "派克",
    title: "the Bloodharbor Ripper",
    titleZh: "血港開膛手",
    tags: [
      "Support",
      "Assassin"
    ],
    roles: [
      "support",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 88
  },
  {
    id: "Qiyana",
    key: 246,
    name: "Qiyana",
    nameZh: "姬亞娜",
    title: "Empress of the Elements",
    titleZh: "元素女帝",
    tags: [
      "Assassin"
    ],
    roles: [
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 89
  },
  {
    id: "Quinn",
    key: 133,
    name: "Quinn",
    nameZh: "葵恩",
    title: "Demacia's Wings",
    titleZh: "蒂瑪西亞之翼",
    tags: [
      "Marksman",
      "Assassin"
    ],
    roles: [
      "marksman",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 90
  },
  {
    id: "Rakan",
    key: 497,
    name: "Rakan",
    nameZh: "銳空",
    title: "The Charmer",
    titleZh: "惑羽",
    tags: [
      "Support"
    ],
    roles: [
      "support"
    ],
    resource: "Mana",
    spriteIndex: 91
  },
  {
    id: "Rammus",
    key: 33,
    name: "Rammus",
    nameZh: "拉姆斯",
    title: "the Armordillo",
    titleZh: "披甲龍龜",
    tags: [
      "Tank"
    ],
    roles: [
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 92
  },
  {
    id: "RekSai",
    key: 421,
    name: "Rek'Sai",
    nameZh: "雷珂煞",
    title: "the Void Burrower",
    titleZh: "虛空穿梭者",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Rage",
    spriteIndex: 93
  },
  {
    id: "Renekton",
    key: 58,
    name: "Renekton",
    nameZh: "雷尼克頓",
    title: "the Butcher of the Sands",
    titleZh: "沙漠屠夫",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Fury",
    spriteIndex: 94
  },
  {
    id: "Rengar",
    key: 107,
    name: "Rengar",
    nameZh: "雷葛爾",
    title: "the Pridestalker",
    titleZh: "傲慢伏擊者",
    tags: [
      "Assassin",
      "Fighter"
    ],
    roles: [
      "assassin",
      "fighter"
    ],
    resource: "Ferocity",
    spriteIndex: 95
  },
  {
    id: "Riven",
    key: 92,
    name: "Riven",
    nameZh: "雷玟",
    title: "the Exile",
    titleZh: "破刃放逐者",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "None",
    spriteIndex: 96
  },
  {
    id: "Rumble",
    key: 68,
    name: "Rumble",
    nameZh: "藍寶",
    title: "the Mechanized Menace",
    titleZh: "武裝機兵",
    tags: [
      "Fighter",
      "Mage"
    ],
    roles: [
      "fighter",
      "mage"
    ],
    resource: "Heat",
    spriteIndex: 97
  },
  {
    id: "Ryze",
    key: 13,
    name: "Ryze",
    nameZh: "雷茲",
    title: "the Rune Mage",
    titleZh: "符文法師",
    tags: [
      "Mage"
    ],
    roles: [
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 98
  },
  {
    id: "Sejuani",
    key: 113,
    name: "Sejuani",
    nameZh: "史瓦妮",
    title: "Fury of the North",
    titleZh: "北境之怒",
    tags: [
      "Tank"
    ],
    roles: [
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 99
  },
  {
    id: "Senna",
    key: 235,
    name: "Senna",
    nameZh: "姍娜",
    title: "the Redeemer",
    titleZh: "贖魂聖槍",
    tags: [
      "Support",
      "Marksman"
    ],
    roles: [
      "support",
      "marksman"
    ],
    resource: "Mana",
    spriteIndex: 100
  },
  {
    id: "Shaco",
    key: 35,
    name: "Shaco",
    nameZh: "薩科",
    title: "the Demon Jester",
    titleZh: "惡魔小丑",
    tags: [
      "Assassin"
    ],
    roles: [
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 101
  },
  {
    id: "Shen",
    key: 98,
    name: "Shen",
    nameZh: "慎",
    title: "the Eye of Twilight",
    titleZh: "暮光之眼",
    tags: [
      "Tank"
    ],
    roles: [
      "tank"
    ],
    resource: "Energy",
    spriteIndex: 102
  },
  {
    id: "Shyvana",
    key: 102,
    name: "Shyvana",
    nameZh: "希瓦娜",
    title: "the Half-Dragon",
    titleZh: "半龍少女",
    tags: [
      "Fighter",
      "Mage"
    ],
    roles: [
      "fighter",
      "mage"
    ],
    resource: "Fury",
    spriteIndex: 103
  },
  {
    id: "Singed",
    key: 27,
    name: "Singed",
    nameZh: "辛吉德",
    title: "the Mad Chemist",
    titleZh: "瘋狂煉金師",
    tags: [
      "Tank",
      "Mage"
    ],
    roles: [
      "tank",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 104
  },
  {
    id: "Sion",
    key: 14,
    name: "Sion",
    nameZh: "賽恩",
    title: "The Undead Juggernaut",
    titleZh: "亡靈勇士",
    tags: [
      "Tank",
      "Fighter"
    ],
    roles: [
      "tank",
      "fighter"
    ],
    resource: "Mana",
    spriteIndex: 105
  },
  {
    id: "Sivir",
    key: 15,
    name: "Sivir",
    nameZh: "希維爾",
    title: "the Battle Mistress",
    titleZh: "戰爭女神",
    tags: [
      "Marksman"
    ],
    roles: [
      "marksman"
    ],
    resource: "Mana",
    spriteIndex: 106
  },
  {
    id: "Skarner",
    key: 72,
    name: "Skarner",
    nameZh: "史加納",
    title: "the Primordial Sovereign",
    titleZh: "遠古強者",
    tags: [
      "Tank",
      "Fighter"
    ],
    roles: [
      "tank",
      "fighter"
    ],
    resource: "Mana",
    spriteIndex: 107
  },
  {
    id: "Sona",
    key: 37,
    name: "Sona",
    nameZh: "索娜",
    title: "Maven of the Strings",
    titleZh: "琴仙",
    tags: [
      "Support",
      "Mage"
    ],
    roles: [
      "support",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 108
  },
  {
    id: "Soraka",
    key: 16,
    name: "Soraka",
    nameZh: "索拉卡",
    title: "the Starchild",
    titleZh: "眾星之子",
    tags: [
      "Support",
      "Mage"
    ],
    roles: [
      "support",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 109
  },
  {
    id: "Swain",
    key: 50,
    name: "Swain",
    nameZh: "斯溫",
    title: "the Noxian Grand General",
    titleZh: "諾克薩斯總帥",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 110
  },
  {
    id: "Sylas",
    key: 517,
    name: "Sylas",
    nameZh: "賽勒斯",
    title: "the Unshackled",
    titleZh: "罪鍊術士",
    tags: [
      "Mage",
      "Assassin"
    ],
    roles: [
      "mage",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 111
  },
  {
    id: "Syndra",
    key: 134,
    name: "Syndra",
    nameZh: "星朵拉",
    title: "the Dark Sovereign",
    titleZh: "黑暗領主",
    tags: [
      "Mage"
    ],
    roles: [
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 112
  },
  {
    id: "TahmKench",
    key: 223,
    name: "Tahm Kench",
    nameZh: "貪啃奇",
    title: "The River King",
    titleZh: "河中巨怪",
    tags: [
      "Tank",
      "Support"
    ],
    roles: [
      "tank",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 113
  },
  {
    id: "Taliyah",
    key: 163,
    name: "Taliyah",
    nameZh: "塔莉雅",
    title: "the Stoneweaver",
    titleZh: "岩石編織者",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 114
  },
  {
    id: "Talon",
    key: 91,
    name: "Talon",
    nameZh: "塔隆",
    title: "the Blade's Shadow",
    titleZh: "神影刺客",
    tags: [
      "Assassin"
    ],
    roles: [
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 115
  },
  {
    id: "Taric",
    key: 44,
    name: "Taric",
    nameZh: "塔里克",
    title: "the Shield of Valoran",
    titleZh: "瓦羅然之盾",
    tags: [
      "Support",
      "Tank"
    ],
    roles: [
      "support",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 116
  },
  {
    id: "Teemo",
    key: 17,
    name: "Teemo",
    nameZh: "提摩",
    title: "the Swift Scout",
    titleZh: "迅捷斥候",
    tags: [
      "Marksman",
      "Mage"
    ],
    roles: [
      "marksman",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 117
  },
  {
    id: "Thresh",
    key: 412,
    name: "Thresh",
    nameZh: "瑟雷西",
    title: "the Chain Warden",
    titleZh: "鍊魂獄長",
    tags: [
      "Support",
      "Tank"
    ],
    roles: [
      "support",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 118
  },
  {
    id: "Tristana",
    key: 18,
    name: "Tristana",
    nameZh: "崔絲塔娜",
    title: "the Yordle Gunner",
    titleZh: "約德爾炮手",
    tags: [
      "Marksman",
      "Assassin"
    ],
    roles: [
      "marksman",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 119
  },
  {
    id: "Trundle",
    key: 48,
    name: "Trundle",
    nameZh: "特朗德",
    title: "the Troll King",
    titleZh: "巨魔王",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 120
  },
  {
    id: "Tryndamere",
    key: 23,
    name: "Tryndamere",
    nameZh: "泰達米爾",
    title: "the Barbarian King",
    titleZh: "蠻族之王",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Fury",
    spriteIndex: 121
  },
  {
    id: "TwistedFate",
    key: 4,
    name: "Twisted Fate",
    nameZh: "逆命",
    title: "the Card Master",
    titleZh: "卡牌大師",
    tags: [
      "Mage",
      "Marksman"
    ],
    roles: [
      "mage",
      "marksman"
    ],
    resource: "Mana",
    spriteIndex: 122
  },
  {
    id: "Twitch",
    key: 29,
    name: "Twitch",
    nameZh: "圖奇",
    title: "the Plague Rat",
    titleZh: "瘟疫之源",
    tags: [
      "Marksman",
      "Assassin"
    ],
    roles: [
      "marksman",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 123
  },
  {
    id: "Udyr",
    key: 77,
    name: "Udyr",
    nameZh: "烏迪爾",
    title: "the Spirit Walker",
    titleZh: "神靈行者",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 124
  },
  {
    id: "Urgot",
    key: 6,
    name: "Urgot",
    nameZh: "烏爾加特",
    title: "the Dreadnought",
    titleZh: "重裝無畏",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 125
  },
  {
    id: "Varus",
    key: 110,
    name: "Varus",
    nameZh: "法洛士",
    title: "the Arrow of Retribution",
    titleZh: "懲戒之箭",
    tags: [
      "Marksman",
      "Mage"
    ],
    roles: [
      "marksman",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 126
  },
  {
    id: "Vayne",
    key: 67,
    name: "Vayne",
    nameZh: "汎",
    title: "the Night Hunter",
    titleZh: "暗夜獵人",
    tags: [
      "Marksman",
      "Assassin"
    ],
    roles: [
      "marksman",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 127
  },
  {
    id: "Veigar",
    key: 45,
    name: "Veigar",
    nameZh: "維迦",
    title: "the Tiny Master of Evil",
    titleZh: "邪惡小法師",
    tags: [
      "Mage"
    ],
    roles: [
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 128
  },
  {
    id: "Velkoz",
    key: 161,
    name: "Vel'Koz",
    nameZh: "威寇茲",
    title: "the Eye of the Void",
    titleZh: "虛空魔眼",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 129
  },
  {
    id: "Vi",
    key: 254,
    name: "Vi",
    nameZh: "菲艾",
    title: "the Piltover Enforcer",
    titleZh: "鐵腕特警",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 130
  },
  {
    id: "Viktor",
    key: 112,
    name: "Viktor",
    nameZh: "維克特",
    title: "the Herald of the Arcane",
    titleZh: "奧術預示者",
    tags: [
      "Mage"
    ],
    roles: [
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 131
  },
  {
    id: "Vladimir",
    key: 8,
    name: "Vladimir",
    nameZh: "弗拉迪米爾",
    title: "the Crimson Reaper",
    titleZh: "血色收割者",
    tags: [
      "Mage",
      "Fighter"
    ],
    roles: [
      "mage",
      "fighter"
    ],
    resource: "Crimson Rush",
    spriteIndex: 132
  },
  {
    id: "Volibear",
    key: 106,
    name: "Volibear",
    nameZh: "弗力貝爾",
    title: "the Relentless Storm",
    titleZh: "無情風暴",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 133
  },
  {
    id: "Warwick",
    key: 19,
    name: "Warwick",
    nameZh: "沃維克",
    title: "the Uncaged Wrath of Zaun",
    titleZh: "嗜血狂怒",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 134
  },
  {
    id: "Xayah",
    key: 498,
    name: "Xayah",
    nameZh: "剎雅",
    title: "the Rebel",
    titleZh: "逆羽",
    tags: [
      "Marksman"
    ],
    roles: [
      "marksman"
    ],
    resource: "Mana",
    spriteIndex: 135
  },
  {
    id: "Xerath",
    key: 101,
    name: "Xerath",
    nameZh: "齊勒斯",
    title: "the Magus Ascendant",
    titleZh: "遠古魔導",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 136
  },
  {
    id: "XinZhao",
    key: 5,
    name: "Xin Zhao",
    nameZh: "趙信",
    title: "the Seneschal of Demacia",
    titleZh: "蒂瑪西亞總管",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 137
  },
  {
    id: "Yasuo",
    key: 157,
    name: "Yasuo",
    nameZh: "犽宿",
    title: "the Unforgiven",
    titleZh: "放逐浪人",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Flow",
    spriteIndex: 138
  },
  {
    id: "Yorick",
    key: 83,
    name: "Yorick",
    nameZh: "約瑞科",
    title: "Shepherd of Souls",
    titleZh: "亡魂牧人",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Mana",
    spriteIndex: 139
  },
  {
    id: "Yuumi",
    key: 350,
    name: "Yuumi",
    nameZh: "悠咪",
    title: "the Magical Cat",
    titleZh: "魔法靈貓",
    tags: [
      "Support",
      "Mage"
    ],
    roles: [
      "support",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 140
  },
  {
    id: "Zac",
    key: 154,
    name: "Zac",
    nameZh: "札克",
    title: "the Secret Weapon",
    titleZh: "魔人",
    tags: [
      "Tank",
      "Fighter"
    ],
    roles: [
      "tank",
      "fighter"
    ],
    resource: "None",
    spriteIndex: 141
  },
  {
    id: "Zed",
    key: 238,
    name: "Zed",
    nameZh: "劫",
    title: "the Master of Shadows",
    titleZh: "影忍至尊",
    tags: [
      "Assassin"
    ],
    roles: [
      "assassin"
    ],
    resource: "Energy",
    spriteIndex: 142
  },
  {
    id: "Ziggs",
    key: 115,
    name: "Ziggs",
    nameZh: "希格斯",
    title: "the Hexplosives Expert",
    titleZh: "魔法爆破專家",
    tags: [
      "Mage"
    ],
    roles: [
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 143
  },
  {
    id: "Zilean",
    key: 26,
    name: "Zilean",
    nameZh: "極靈",
    title: "the Chronokeeper",
    titleZh: "時光守護者",
    tags: [
      "Support",
      "Mage"
    ],
    roles: [
      "support",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 144
  },
  {
    id: "Zoe",
    key: 142,
    name: "Zoe",
    nameZh: "柔依",
    title: "the Aspect of Twilight",
    titleZh: "暮光星靈",
    tags: [
      "Mage"
    ],
    roles: [
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 145
  },
  {
    id: "Zyra",
    key: 143,
    name: "Zyra",
    nameZh: "枷蘿",
    title: "Rise of the Thorns",
    titleZh: "荊棘漫遊者",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 146
  },
  {
    id: "Aphelios",
    key: 523,
    name: "Aphelios",
    nameZh: "亞菲利歐",
    title: "the Weapon of the Faithful",
    titleZh: "信仰銳武",
    tags: [
      "Marksman"
    ],
    roles: [
      "marksman"
    ],
    resource: "Mana",
    spriteIndex: 147
  },
  {
    id: "Sett",
    key: 875,
    name: "Sett",
    nameZh: "賽特",
    title: "the Boss",
    titleZh: "獸血拳皇",
    tags: [
      "Fighter",
      "Tank"
    ],
    roles: [
      "fighter",
      "tank"
    ],
    resource: "Grit",
    spriteIndex: 148
  },
  {
    id: "Lillia",
    key: 876,
    name: "Lillia",
    nameZh: "莉莉亞",
    title: "the Bashful Bloom",
    titleZh: "羞赧綻華",
    tags: [
      "Fighter",
      "Mage"
    ],
    roles: [
      "fighter",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 149
  },
  {
    id: "Yone",
    key: 777,
    name: "Yone",
    nameZh: "犽凝",
    title: "the Unforgotten",
    titleZh: "不滅劍豪",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Flow",
    spriteIndex: 150
  },
  {
    id: "Samira",
    key: 360,
    name: "Samira",
    nameZh: "煞蜜拉",
    title: "the Desert Rose",
    titleZh: "荒漠薔薇",
    tags: [
      "Marksman",
      "Assassin"
    ],
    roles: [
      "marksman",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 151
  },
  {
    id: "Seraphine",
    key: 147,
    name: "Seraphine",
    nameZh: "瑟菈紛",
    title: "the Starry-Eyed Songstress",
    titleZh: "燦眸歌姬",
    tags: [
      "Support",
      "Mage"
    ],
    roles: [
      "support",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 152
  },
  {
    id: "Rell",
    key: 526,
    name: "Rell",
    nameZh: "銳兒",
    title: "the Iron Maiden",
    titleZh: "鋼鐵少女",
    tags: [
      "Tank",
      "Support"
    ],
    roles: [
      "tank",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 153
  },
  {
    id: "Viego",
    key: 234,
    name: "Viego",
    nameZh: "維爾戈",
    title: "The Ruined King",
    titleZh: "殞落王者",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "None",
    spriteIndex: 154
  },
  {
    id: "Gwen",
    key: 887,
    name: "Gwen",
    nameZh: "關",
    title: "The Hallowed Seamstress",
    titleZh: "聖啟織偶",
    tags: [
      "Fighter"
    ],
    roles: [
      "fighter"
    ],
    resource: "Mana",
    spriteIndex: 155
  },
  {
    id: "Akshan",
    key: 166,
    name: "Akshan",
    nameZh: "埃可尚",
    title: "the Rogue Sentinel",
    titleZh: "俠盜哨兵",
    tags: [
      "Marksman",
      "Assassin"
    ],
    roles: [
      "marksman",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 156
  },
  {
    id: "Vex",
    key: 711,
    name: "Vex",
    nameZh: "薇可絲",
    title: "the Gloomist",
    titleZh: "愁霧影巫",
    tags: [
      "Mage"
    ],
    roles: [
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 157
  },
  {
    id: "Zeri",
    key: 221,
    name: "Zeri",
    nameZh: "婕莉",
    title: "The Spark of Zaun",
    titleZh: "佐恩電光",
    tags: [
      "Marksman"
    ],
    roles: [
      "marksman"
    ],
    resource: "Mana",
    spriteIndex: 158
  },
  {
    id: "Renata",
    key: 888,
    name: "Renata Glasc",
    nameZh: "睿娜妲．格萊斯克",
    title: "the Chem-Baroness",
    titleZh: "化學女爵",
    tags: [
      "Support",
      "Mage"
    ],
    roles: [
      "support",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 159
  },
  {
    id: "Belveth",
    key: 200,
    name: "Bel'Veth",
    nameZh: "貝爾薇斯",
    title: "the Empress of the Void",
    titleZh: "虛空女皇",
    tags: [
      "Fighter"
    ],
    roles: [
      "fighter"
    ],
    resource: "",
    spriteIndex: 160
  },
  {
    id: "Nilah",
    key: 895,
    name: "Nilah",
    nameZh: "淣菈",
    title: "the Joy Unbound",
    titleZh: "奔放笑顏",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 161
  },
  {
    id: "KSante",
    key: 897,
    name: "K'Sante",
    nameZh: "卡桑帝",
    title: "the Pride of Nazumah",
    titleZh: "納祖瑪之傲",
    tags: [
      "Tank",
      "Fighter"
    ],
    roles: [
      "tank",
      "fighter"
    ],
    resource: "Mana",
    spriteIndex: 162
  },
  {
    id: "Milio",
    key: 902,
    name: "Milio",
    nameZh: "米里歐",
    title: "The Gentle Flame",
    titleZh: "溫煦良焰",
    tags: [
      "Support",
      "Mage"
    ],
    roles: [
      "support",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 163
  },
  {
    id: "Naafiri",
    key: 950,
    name: "Naafiri",
    nameZh: "娜菲芮",
    title: "the Hound of a Hundred Bites",
    titleZh: "百犬之牙",
    tags: [
      "Assassin",
      "Fighter"
    ],
    roles: [
      "assassin",
      "fighter"
    ],
    resource: "Mana",
    spriteIndex: 164
  },
  {
    id: "Briar",
    key: 233,
    name: "Briar",
    nameZh: "布蕾爾",
    title: "the Restrained Hunger",
    titleZh: "披枷饞鬼",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Fury",
    spriteIndex: 165
  },
  {
    id: "Hwei",
    key: 910,
    name: "Hwei",
    nameZh: "赫威",
    title: "the Visionary",
    titleZh: "奇想繪師",
    tags: [
      "Mage",
      "Support"
    ],
    roles: [
      "mage",
      "support"
    ],
    resource: "Mana",
    spriteIndex: 166
  },
  {
    id: "Smolder",
    key: 901,
    name: "Smolder",
    nameZh: "史矛德",
    title: "the Fiery Fledgling",
    titleZh: "帝煌雛龍",
    tags: [
      "Marksman",
      "Mage"
    ],
    roles: [
      "marksman",
      "mage"
    ],
    resource: "Mana",
    spriteIndex: 167
  },
  {
    id: "Aurora",
    key: 893,
    name: "Aurora",
    nameZh: "歐羅拉",
    title: "the Witch Between Worlds",
    titleZh: "跨界靈使",
    tags: [
      "Mage",
      "Assassin"
    ],
    roles: [
      "mage",
      "assassin"
    ],
    resource: "Mana",
    spriteIndex: 168
  },
  {
    id: "Ambessa",
    key: 799,
    name: "Ambessa",
    nameZh: "安比薩",
    title: "Matriarch of War",
    titleZh: "鐵血狼母",
    tags: [
      "Fighter",
      "Assassin"
    ],
    roles: [
      "fighter",
      "assassin"
    ],
    resource: "Energy",
    spriteIndex: 169
  }
];

const CHAMPION_BY_ID: ReadonlyMap<string, ChampionDefinition> = new Map(
  CHAMPIONS.map((champion) => [champion.id, champion]),
);

const CHAMPION_BY_KEY: ReadonlyMap<number, ChampionDefinition> = new Map(
  CHAMPIONS.map((champion) => [champion.key, champion]),
);

export function getChampionById(id: string): ChampionDefinition | null {
  return CHAMPION_BY_ID.get(id) ?? null;
}

export function getChampionByKey(key: number): ChampionDefinition | null {
  return CHAMPION_BY_KEY.get(key) ?? null;
}

export function listChampions(): readonly ChampionDefinition[] {
  return CHAMPIONS;
}
