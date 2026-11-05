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
        status: 'rules',
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
        summary: '每年 3 個名額。第一種子是夏季冠軍。第二種子是年度積分最高、還沒有名額的隊伍。第三種子走資格賽。夏季積分相同時，夏季積分較高者優先。夏季冠軍同時是年度第一時，第二種子由年度第二遞補。',
        status: 'rules',
        points: [
          { place: '冠軍', spring: '90', summer: '直通世界賽' },
          { place: '亞軍', spring: '70', summer: '100' },
          { place: '季軍', spring: '50', summer: '80' },
          { place: '第四名', spring: '30', summer: '50' },
          { place: '第五名', spring: '20', summer: '30' },
          { place: '第六名', spring: '10', summer: '10' },
        ],
      },
      {
        id: 'worlds-gauntlet-2021',
        years: '2021–2022',
        league: '國際賽',
        name: '世界賽第三種子資格賽',
        summary: '年度積分第 4 名先打第 5 名，勝者再打第 3 名。勝者取得第三種子。全部 BO5。',
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
        years: '2023',
        league: '國際賽',
        name: 'MSI 名額',
        summary: '名額是 2 個，由春季賽決定。兩張門票怎麼分還沒寫死。',
        status: 'pending',
        pendingReason: '2023 年後 MSI 名額的具體分配方式尚未確認。',
      },
      {
        id: 'msi-2024',
        years: '2024',
        league: '國際賽',
        name: 'MSI 名額',
        summary: '名額是 2 個，由春季賽決定。',
        status: 'pending',
        pendingReason: '2023 年後 MSI 名額的具體分配方式尚未確認。',
      },
      {
        id: 'worlds-seeds-2023',
        years: '2023',
        league: '國際賽',
        name: '世界賽第一、第二種子',
        summary: '當年世界賽名額是 3 個。第一、第二種子怎麼產生沒有寫死，不能沿用 2021 的積分表。',
        status: 'pending',
        pendingReason: '2023 年後世界賽第一、第二種子的決定方式，以及年度積分表是否沿用 2021，都尚未確認。',
      },
      {
        id: 'worlds-gauntlet-2023',
        years: '2023 起的資格賽圖',
        league: '國際賽',
        name: '世界賽第三、第四種子資格賽',
        summary: '年度積分第 3、4 名打勝者組，第 5、6 名打敗者組。勝者組冠軍是第三種子，敗者組冠軍是第四種子。沒有再打一場總冠軍戰。全部 BO5。2023 當年名額表是 3 個，這張四隊圖從規格的「2023 年起」寫法收進來，第四種子只在名額為 4 的年度使用。',
        status: 'playable',
        route: '/leagues/qualifier/worlds-2023',
      },
      {
        id: 'worlds-count-2024',
        years: '2024',
        league: '國際賽',
        name: '世界賽名額數',
        summary: '4 個名額。第一、第二種子的產生方式尚未確認。第三、第四種子走上面那張四隊雙敗。',
        status: 'pending',
        pendingReason: '2023 年後世界賽第一、第二種子的決定方式尚未確認。',
      },
      {
        id: 'ea-2023',
        years: '2023 起',
        league: 'EA',
        name: '學院聯賽',
        summary: '有春季、夏季。春季沒有季後賽。夏季結束後有年度總季後賽，然後官方選秀。',
        status: 'pending',
        pendingReason: 'EA 年度總季後賽沒有種子與對戰圖，不能自行補完。',
      },
      {
        id: 'rl-2023',
        years: '2023 起',
        league: 'RL',
        name: '二隊聯賽',
        summary: '春、夏各自舉辦。單循環 BO3。前 12 名進單敗淘汰季後賽，季後賽 BO5。',
        status: 'pending',
        pendingReason: '前 12 名單敗淘汰沒有種子與對戰圖，不能自行補完。',
      },
    ],
  },
  {
    id: 'module-c',
    title: '2025 Formosa Cup',
    items: [
      {
        id: 'msi-2025',
        years: '2025',
        league: '國際賽',
        name: 'MSI 名額',
        summary: '名額是 2 個，由春季賽決定。',
        status: 'pending',
        pendingReason: '2023 年後 MSI 名額的具體分配方式尚未確認。2025 年後 Formosa Cup 以外的賽事細節也尚未確認。',
      },
      {
        id: 'formosa-2025',
        years: '2025',
        league: 'Formosa Cup',
        name: '福爾摩沙杯',
        summary: '只有 TCS，10 隊，不影響升降級。前一年夏季冠軍、亞軍當隊長，蛇形選秀分成兩組各 5 隊。Group Battle 是跟另一組 5 隊各打一場 BO3。勝者組前 3 直接進季後賽，敗者組第 5 淘汰，其餘 6 隊打 Play-In 搶 3 個名額。季後賽 6 隊雙敗、全部 BO5，勝者組前兩名第二輪輪空。',
        status: 'pending',
        pendingReason: 'Play-In 的雙敗對戰圖、種子、輪空和 BO3／BO5 配置沒有附在規格裡，不能依 LCK Cup 的名字自己畫。季後賽 4 隊第一輪怎麼配對也沒寫死。',
      },
      {
        id: 'first-stand-2025',
        years: '2025',
        league: '國際賽',
        name: 'First Stand',
        summary: '2025 年 1 個名額。2026 年起 2 個名額。對應冠軍、亞軍，但是名額怎麼從盃賽結果對上還沒有獨立對戰圖。',
        status: 'pending',
        pendingReason: '規格只寫名額數量與「依照 LCK Cup 的冠軍、亞軍」，沒有獨立的對戰步驟。',
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
        summary: '10 支隊伍。其餘賽制沒有寫。',
        status: 'pending',
        pendingReason: '2026 春季 TCL 的例行賽、季後賽與其他安排尚未確認。',
      },
      {
        id: 'tcs-summer-2026',
        years: '2026 夏',
        league: 'TCS',
        name: '夏季分組與八隊季後賽',
        summary: 'TCS 12 隊、TCL 8 隊。Legend 6 隊是春季季後賽前 6，全部進季後賽。Rise 6 隊由春季資格賽產生，前 2 名進季後賽。季後賽 8 隊雙敗，Legend 第 1～4 名第二輪開始，Legend 第 5、6 名和 Rise 第 1、2 名第一輪開始，全部 BO5。',
        status: 'pending',
        pendingReason: 'Legend、Rise 的例行賽對戰方式，以及八隊雙敗的完整對戰圖都尚未確認，不能把六隊圖放大來用。',
      },
      {
        id: 'rise-qualifier-2026',
        years: '2026 夏',
        league: 'TCS / TCL',
        name: 'Rise Group 資格賽',
        summary: '春季 TCS 第 7～10 名加 TCL 第 1～4 名。TCL 依序選 TCS 對手，最後兩隊自動配對，TCS 有選邊權。四場勝者直接進 Rise。四場敗者再排 1～4 名，第 1 名選第 3 或第 4，兩場勝者補滿 Rise，敗者回 TCL。',
        status: 'pending',
        pendingReason: '第一階段敗者的排序公式尚未確認，第二輪種子不能自己算。',
      },
      {
        id: 'tcl-summer-2026',
        years: '2026 夏',
        league: 'TCL',
        name: '夏季賽',
        summary: '8 隊，不辦季後賽。',
        status: 'pending',
        pendingReason: '例行賽場次、BO 數及排名細節尚未確認。',
      },
      {
        id: 'tcs-slot-2026',
        years: '2026 夏後',
        league: 'TCS / TCL',
        name: '下一年度 TCS 資格賽',
        summary: 'Rise 第 3～6 名加 TCL 夏季前 4 名。TCL 第 1～3 名依序選 Rise 對手，最後兩隊自動配對，Rise 有選邊權。四場 BO5 的勝者再打兩場 BO5，兩場勝者取得下一年 TCS。下一年回到 TCS 10 隊、TCL 10 隊。',
        status: 'pending',
        pendingReason: '第二輪兩場怎麼配對沒有寫死，不能自己排 1 對 4。',
      },
      {
        id: 'msi-2026',
        years: '2026 起',
        league: '國際賽',
        name: 'MSI 名額',
        summary: '2 個名額，由春季賽決定。',
        status: 'pending',
        pendingReason: '2023 年後 MSI 名額的具體分配方式尚未確認。',
      },
      {
        id: 'worlds-2026',
        years: '2026 起',
        league: '國際賽',
        name: '世界賽名額數',
        summary: '4 個名額。第三、第四種子的四隊雙敗圖可以開。第一、第二種子仍待確認。',
        status: 'pending',
        pendingReason: '2023 年後世界賽第一、第二種子的決定方式尚未確認。',
      },
    ],
  },
];
