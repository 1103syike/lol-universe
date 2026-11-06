export type FormatStatus = 'playable' | 'rules' | 'pending';

export interface CircuitPointRow {
  place: string;
  spring: string;
  summer: string;
}

export interface CompetitionFormat {
  id: string;
  years: string;
  league: string;
  name: string;
  summary: string;
  status: FormatStatus;
  pendingReason?: string;
  route?: string;
  points?: CircuitPointRow[];
}

export interface FormatGroup {
  id: string;
  title: string;
  items: CompetitionFormat[];
}

const TCS_REGULAR_SUMMARY =
  '10 隊，春季與夏季各自雙循環 BO3。前 6 名進季後賽。排名先比大分再比小分。不影響晉級時同分擲硬幣；影響晉級或淘汰時打 BO1 加賽。';

const CIRCUIT_POINTS: CircuitPointRow[] = [
  { place: '冠軍', spring: '90', summer: '直通世界賽' },
  { place: '亞軍', spring: '70', summer: '100' },
  { place: '季軍', spring: '50', summer: '80' },
  { place: '第四名', spring: '30', summer: '50' },
  { place: '第五名', spring: '20', summer: '30' },
  { place: '第六名', spring: '10', summer: '10' },
];

export const FORMAT_GROUPS: FormatGroup[] = [
  {
    id: 'module-a',
    title: '2021–2022',
    items: [
      {
        id: 'tcs-regular-2021',
        years: '2021–2022',
        league: 'TCS',
        name: '例行賽',
        summary: TCS_REGULAR_SUMMARY,
        status: 'playable',
        route: '/matches',
      },
      {
        id: 'tcs-playoff-single',
        years: '2021–2022',
        league: 'TCS',
        name: '季後賽 · 六隊單敗',
        summary: '第 3 名選擇第 5 或第 6 名，第 4 名打剩下的。敗者淘汰。第 1 名再選一輪勝者，第 2 名打另一隊。全部 BO5。',
        status: 'playable',
        route: '/leagues/tcs-single',
      },
      {
        id: 'tcl-playoff-single',
        years: '2021–2022',
        league: 'TCL',
        name: '季後賽 · 六隊單敗',
        summary: '前 6 名。第 3 名選擇第 5 或第 6 名，第 4 名打剩下的。敗者淘汰。第 1 名再選一輪勝者，第 2 名打另一隊。全部 BO5。',
        status: 'playable',
        route: '/leagues/tcl-single',
      },
      {
        id: 'msi-2021',
        years: '2021–2022',
        league: '國際賽',
        name: 'MSI 名額',
        summary: '每年 1 個名額，由春季賽冠軍取得。',
        status: 'rules',
      },
      {
        id: 'worlds-points-2021',
        years: '2021–2022',
        league: '國際賽',
        name: '世界賽名額與年度積分',
        summary: '每年 3 個名額。第一種子是夏季冠軍。第二種子是年度積分第二。第三種子走三席資格賽。年度積分相同時，夏季積分較高者優先。',
        status: 'rules',
        points: CIRCUIT_POINTS,
      },
      {
        id: 'worlds-gauntlet-2021',
        years: '名額為 3 時',
        league: '國際賽',
        name: '世界賽第三種子資格賽',
        summary: '第 6 名先打第 5 名，勝者再打第 4 名，再打第 3 名。最後勝者取得第三種子。全部 BO5。',
        status: 'playable',
        route: '/leagues/qualifier/worlds-2021',
      },
    ],
  },
  {
    id: 'module-b',
    title: '2023–2024',
    items: [
      {
        id: 'tcs-regular-2023',
        years: '2023–2024',
        league: 'TCS',
        name: '例行賽',
        summary: TCS_REGULAR_SUMMARY,
        status: 'rules',
      },
      {
        id: 'tcs-playoff-double',
        years: '2023–2024',
        league: 'TCS',
        name: '季後賽 · 六隊雙敗',
        summary: '首輪仍是第 3 名選第 5 或第 6 名，敗者直接淘汰。第二輪第 1、2 名加入，勝者進勝者組決賽，敗者先互打。敗者組勝者再打勝者組決賽的敗者，贏的進總決賽。全部 BO5。',
        status: 'playable',
        route: '/leagues/tcs-double',
      },
      {
        id: 'promotion-2023',
        years: '2023–2024',
        league: 'TCS / TCL',
        name: '春季、夏季升降賽',
        summary: '當季 TCS 第 9、10 名對當季 TCL 第 1、2 名。TCL 第 1 名先選一支 TCS。兩場都是 BO5。勝者拿下一階段 TCS 資格，敗者留在 TCL。春、夏各自計算。',
        status: 'playable',
        route: '/leagues/qualifier/promotion-2023',
      },
      {
        id: 'msi-2023',
        years: '2023 起',
        league: '國際賽',
        name: 'MSI 名額',
        summary: '2 個名額，由春季賽決定。春季冠軍是一號種子，春季亞軍是二號種子。',
        status: 'rules',
      },
      {
        id: 'worlds-seeds-2023',
        years: '2023',
        league: '國際賽',
        name: '世界賽種子',
        summary: '名額 3 個。夏季冠軍是一號種子，年度積分第二是二號種子。積分表沿用 2021–2022。第三種子走三席資格賽。',
        status: 'rules',
        points: CIRCUIT_POINTS,
      },
      {
        id: 'worlds-gauntlet-2023',
        years: '2024 起',
        league: '國際賽',
        name: '世界賽四席資格賽',
        summary: '名額為 4 時使用。年度積分第 3、4 名打勝者組，第 5、6 名打敗者組。勝者組冠軍是第三種子，敗者組冠軍是第四種子。一、二號種子仍是夏季冠軍與年度積分第二。全部 BO5。',
        status: 'playable',
        route: '/leagues/qualifier/worlds-2023',
      },
      {
        id: 'ea-2023',
        years: '2023 起',
        league: 'EA',
        name: '學院聯賽',
        summary: '春季、夏季都是 10 隊雙循環 BO3。春季沒有季後賽。夏季前 6 名打年度季後賽，比照 LCK 2025 六隊雙敗、全部 BO5。第 1、2 名第二輪加入。第一輪第 3 名對第 6 名、第 4 名對第 5 名，敗者仍留在敗部。季後賽後辦官方選秀。',
        status: 'playable',
        route: '/leagues/ea',
      },
      {
        id: 'rl-2023',
        years: '2023 起',
        league: 'RL',
        name: '二隊聯賽',
        summary: '春、夏各自舉辦。單循環 BO3。前 12 名打單敗淘汰，全部 BO5。第 1～4 名輪空到八強。第一輪第 5 對第 12、第 6 對第 11、第 7 對第 10、第 8 對第 9。第 1、2 名只會在決賽相遇。',
        status: 'playable',
        route: '/leagues/rl',
      },
    ],
  },
  {
    id: 'module-c',
    title: '2025',
    items: [
      {
        id: 'tcs-spring-2025',
        years: '2025 春',
        league: 'TCS',
        name: '春季例行賽與季後賽',
        summary: '10 隊雙循環 BO3，前 6 名打六隊雙敗，全部 BO5。季後賽前 6 名進夏季 Legend，第 7～10 名進 Rise 資格賽。',
        status: 'playable',
        route: '/leagues/tcs-double',
      },
      {
        id: 'tcl-spring-2025',
        years: '2025 春',
        league: 'TCL',
        name: '春季例行賽',
        summary: '10 隊雙循環 BO3，不辦季後賽，依例行賽成績排名。前 4 名進 Rise 資格賽。',
        status: 'rules',
      },
      {
        id: 'promotion-spring-2025',
        years: '2025 春',
        league: 'TCS / TCL',
        name: '春季升降級賽',
        summary: '沿用 2023–2024：TCS 第 9、10 名對 TCL 第 1、2 名。TCL 第 1 名先選對手，兩場 BO5。只決定下一階段的聯賽身分，不改 Rise 資格賽名單。',
        status: 'playable',
        route: '/leagues/qualifier/promotion-2023',
      },
      {
        id: 'promotion-link-2025',
        years: '2025 春',
        league: 'TCS / TCL',
        name: '升降賽與 Rise 資格賽',
        summary: '兩場完全獨立。Rise 資格賽固定由春季例行賽的 TCS 第 7～10 名與 TCL 第 1～4 名參加。升降級即使改了聯賽身分，這八隊也不變。夏季 12 隊只由 Legend 與 Rise 資格賽決定。',
        status: 'rules',
      },
      {
        id: 'rise-qualifier-2025',
        years: '2025 夏前',
        league: 'TCS / TCL',
        name: 'Rise 組資格賽',
        summary: '名單依春季例行賽鎖定：TCS 第 7～10 名加 TCL 第 1～4 名，升降級不改這八隊。TCL 依序選 TCS 對手，最後兩隊自動配對，TCS 有選邊權。四場 BO5 的勝者直接進 Rise。四支敗隊先比該場勝局數，再比原種子（TCS 第 7 名最高，接著第 8、9、10 名，然後 TCL 第 1～4 名）。第 1 名選第 3 或第 4 名，兩場勝者補滿 Rise。',
        status: 'playable',
        route: '/leagues/rise',
      },
      {
        id: 'tcs-summer-regular-2025',
        years: '2025 夏',
        league: 'TCS',
        name: 'Legend、Rise 例行賽',
        summary: '兩組各 6 隊，各自三循環 BO3，每隊 15 場系列賽。排名先比系列賽勝場，再比小分、對戰戰績、對戰小分。Legend 全數進季後賽，Rise 前 2 名進季後賽。',
        status: 'rules',
      },
      {
        id: 'tcs-summer-playoff-2025',
        years: '2025 夏',
        league: 'TCS',
        name: '夏季季後賽',
        summary: '比照 LPL 爬山。第一輪 Legend 第 5 名對 Rise 第 2 名、Legend 第 6 名對 Rise 第 1 名。第二輪 Legend 第 4、3 名加入。第三輪 Legend 第 1、2 名加入，輸了掉敗部。前兩輪一敗淘汰。之後走敗部、勝部決賽、敗部決賽、一場總決賽。全部 BO5。',
        status: 'playable',
        route: '/leagues/tcs-hill',
      },
      {
        id: 'tcl-summer-2025',
        years: '2025 夏',
        league: 'TCL',
        name: '夏季例行賽',
        summary: '8 隊三循環 BO3，不辦季後賽。排名先比系列賽勝場，再比小分、對戰戰績、對戰小分。前 2 名進 TCS 保留賽。',
        status: 'rules',
      },
      {
        id: 'tcs-retention-2025',
        years: '2025 夏後',
        league: 'TCS / TCL',
        name: 'TCS 保留賽',
        summary: '種子依序是 Rise 第 3、4、5、6 名，然後 TCL 第 1、2 名。第 1、2 名輪空。第一輪第 3 名對第 6 名、第 4 名對第 5 名。準決賽由前兩名對上勝者。冠軍和亞軍進下一年 TCS。全部 BO5。',
        status: 'playable',
        route: '/leagues/retention',
      },
      {
        id: 'formosa-2025',
        years: '2025',
        league: 'Formosa Cup',
        name: '福爾摩沙杯',
        summary: 'TCS 10 隊，不影響升降級，全賽事 BO5。Play-In 六隊依系列賽勝場再比小分排種子，第 3 種子對第 6、第 4 對第 5，第 1、2 種子第二輪加入。季後賽第一輪勝者組第 3 名選一支 Play-In 晉級隊。第一輪敗者淘汰。勝者組第 1 名打該場勝者，第 2 名打另一場勝者。之後是敗部、勝部決賽與總決賽。冠軍取得 2025 年的 First Stand 名額。',
        status: 'playable',
        route: '/leagues/formosa',
      },
      {
        id: 'first-stand-2025',
        years: '2025',
        league: '國際賽',
        name: 'First Stand',
        summary: '2025 年由冠軍取得 1 個名額。2026 年起由冠軍、亞軍取得 2 個名額。',
        status: 'playable',
        route: '/leagues/formosa',
      },
    ],
  },
  {
    id: 'module-d',
    title: '2026',
    items: [
      {
        id: 'tcs-spring-2026',
        years: '2026 春',
        league: 'TCS',
        name: '春季例行賽與季後賽',
        summary: '例行賽沿用 10 隊雙循環 BO3、前 6 名季後賽。季後賽沿用 2023 的六隊雙敗，第 1、2 名第二輪才進，首輪選對手規則相同。',
        status: 'playable',
        route: '/leagues/tcs-double',
      },
      {
        id: 'tcl-spring-2026',
        years: '2026 春',
        league: 'TCL',
        name: '春季賽',
        summary: '10 隊雙循環 BO3，不辦季後賽。排名先比系列賽勝場，再比小分。前 4 名是夏季 Rise 資格賽的 TCL 種子。',
        status: 'rules',
      },
      {
        id: 'tcs-summer-2026',
        years: '2026 夏',
        league: 'TCS',
        name: '夏季分組與八隊季後賽',
        summary: 'Legend、Rise 各 6 隊，三循環 BO3。季後賽沿用 2025 的八隊爬山表，全部 BO5。Legend 前四名不再是第二輪進場。',
        status: 'playable',
        route: '/leagues/tcs-hill',
      },
      {
        id: 'rise-qualifier-2026',
        years: '2026 夏',
        league: 'TCS / TCL',
        name: 'Rise Group 資格賽',
        summary: '春季 TCS 第 7～10 名加 TCL 第 1～4 名。四場勝者直接進 Rise。四支敗隊先比該場勝局數，再比原種子，排序方式和 2025 相同。第 1 名選第 3 或第 4 名。',
        status: 'playable',
        route: '/leagues/rise-2026',
      },
      {
        id: 'tcl-summer-2026',
        years: '2026 夏',
        league: 'TCL',
        name: '夏季賽',
        summary: '8 隊三循環 BO3，不辦季後賽。排名沿用系列賽勝場、小分、對戰戰績、對戰小分。前 4 名進夏後 TCS 資格賽。',
        status: 'rules',
      },
      {
        id: 'tcs-slot-2026',
        years: '2026 夏後',
        league: 'TCS / TCL',
        name: '下一年度 TCS 資格賽',
        summary: 'Rise 第 3～6 名加 TCL 夏季前 4 名。TCL 依序選 Rise 對手，四場 BO5。四名勝者依原種子排序，Rise 第 3 名最高，第 1 名對第 4 名、第 2 名對第 3 名。兩場勝者取得下一年 TCS。',
        status: 'playable',
        route: '/leagues/tcs-slot',
      },
      {
        id: 'msi-2026',
        years: '2026 起',
        league: '國際賽',
        name: 'MSI 名額',
        summary: '2 個名額。春季冠軍是一號種子，春季亞軍是二號種子。',
        status: 'rules',
      },
      {
        id: 'worlds-2026',
        years: '2026 起',
        league: '國際賽',
        name: '世界賽名額',
        summary: '4 個名額。夏季冠軍是一號種子，年度積分第二是二號種子。第三、第四種子走四席資格賽。',
        status: 'rules',
        points: CIRCUIT_POINTS,
      },
    ],
  },
];
