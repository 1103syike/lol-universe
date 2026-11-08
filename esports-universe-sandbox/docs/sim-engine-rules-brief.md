# 比賽引擎現況規則整理（給外部討論用）

更新日期：2026-11-08  
專案：`esports-universe-sandbox`  
預設引擎：**V2**（`getSimEngineMode()` default = `'v2'`）  
目標共識（待確認）：**V2 過程保留實體模擬，但賽果／節奏要更接近 V1 的「職業賽感」**  
最新診斷：`docs/v2-pro-feel-diagnostic-report.md`（含 12+12 場實測數據）

---

## 0. 一句話對照

| | V1 | V2 |
|---|---|---|
| 本質 | 賽果塑造器（event / tick 統計模擬） | 實體過程模擬（地圖實體 + 離散事件） |
| 真實感來源 | 直接生成合理 KDA／龍塔／故事 | 從走位、戰鬥、推塔「長出」結果 |
| 目前體感 | 比較像職業賽戰報 | 過程像簡化 SR，結果偏乾、人頭少、常打滿時限 |
| 輸出契約 | 同一個 `MatchReport` + `MatchBoxScore` | 同一個（經 adapter 轉） |

---

## 1. 共用輸出契約（Dashboard 吃這個）

兩邊最終都要產出 `MatchReport`，重點欄位：

- `draft`：BP（bans / picks / intent / patch）
- `boxScore`：時長、勝方、隊伍數據、選手 KDA／傷害／經濟／CS、`goldSeries`、`timeline`
- `phases`：draft / early / mid / late 優劣勢
- `keyPlayers` / `mvp`
- `turningPoints` / `events`
- `advantageSummary` / `decisiveSummary` / `primaryReason`
- `coachNotes` / `styleNotes` / `archetypes`

Dashboard「比賽故事」主要靠：

`buildMatchDigest(boxScore)` ← 讀 `timeline` 的節拍（First Blood、失誤、外塔、龍、巴龍、主堡…）

**規則：timeline 事件少 → 故事一定薄。**

---

## 2. V1 規則（結果導向）

路徑：`src/app/shared/sim/`（`match-engine.ts` → `live-match` / `draft` / `derive-from-box`）

### 2.1 流程

1. 組 `TeamProfile`（屬性、化學反應、教練、風格軸）
2. `runClassicDraft` 做完整 BP（Ban1 → Pick1 → Ban2 → Pick2）
3. matchup / patch meta 調整各階段修正
4. `simulateLiveMatch` 用 **30 秒 tick** 推進到結束
5. 從 box + timeline **反推** phases / 轉折 / 故事 / MVP

### 2.2 關鍵節奏參數（`SIM_BALANCE`）

- tick：`30s`
- 比賽時長：約 `22–40` 分鐘
- 首殺最早：`2:00`
- 外塔最早：`8:00`
- 小龍：`5:00` 出現，`5:00` 重生
- 巴龍：`20:00` 出現
- 擊殺基礎機率、中期／後期團戰機率、落後不敢開的軟硬門檻都有表定數值
- 經濟：被動金、CS 金、擊殺金、塔金、輔助分金等都是**直接加到統計**，不是打出來的

### 2.3 V1 為什麼「看起來真」

它不是在模擬每個普攻，而是在每個 tick **抽樣該發生的職業賽事件**：

- 該不該有擊殺／團戰
- 該不該推塔／拿龍
- 誰領先、誰翻盤、誰失誤

所以 KDA、龍塔曲線、故事節拍天生對齊「職業賽觀感」。

---

## 3. V2 規則（過程導向）

路徑：`src/app/shared/sim-v2/`

### 3.1 架構

- **Version Pack**：鎖版本內容（英雄／裝備／兵線／野怪／建築／經濟／地圖）
  - 現有：`demo-a`（14.1）、`demo-b`（14.24）
- **DiscreteScheduler**：離散事件佇列
- **World loop**：`WORLD_DT = 0.5s`，`AI_INTERVAL = 1s`
- **Web Worker**：Dashboard 走 `simulateGameAsync` → worker；失敗 fallback 主線程
- **Adapter**：
  - `buildV2Input`：legacy 輸入 → 跑 V1 同款 `runClassicDraft` → 組成 V2 roster + draft
  - `toMatchReport`：V2 state/replay → `MatchReport`（再套 V1 的 derive／digest）

### 3.2 進場／BP

1. 仍呼叫 **同一套** `runClassicDraft`
2. pick 寫進英雄實體；draft 整包帶進 `MatchReport`
3. 英雄池：全英雄表都有（非 special 的是 `partial` 通用技能）
4. special 執行器目前較完整：Garen / Ashe / Annie / LeeSin / Thresh / Ahri / Jinx

### 3.3 地圖與時間

- 簡化地圖：`75×75` cells，`cellSize=200`（約 15000 單位邊長）
- 預設 `maxDurationSec = 2400`（40 分）
- 到時未結束：`siegePressureEnd` 依經濟／存活強行砍對面主堡（或 force end）
- `forceWinnerTeamId`：可覆寫勝方（手動點隊用）

### 3.4 實體系統（現有）

| 系統 | 現況規則 |
|---|---|
| 英雄 | HP／AD／AP／甲魔抗／攻速／藍、等級曲線、物品加成 |
| 移動 | 簡易 pathfinding（遠距常走直線 waypoint） |
| 視野 | 距離 ≤ 900 看到敵方，記憶約 8 秒 |
| 兵線 | 波次生成；兵互打／打人；英雄補刀拿金經驗 |
| 野區 | 野怪營／龍等；打野清營、低血可 gank |
| 建築 | 外→內→高地→主堡順序；塔優先打兵，再打英雄 |
| 經濟 | 起始金、被動金、擊殺金、助攻金、塔金 |
| 戰鬥 | 普攻 + 技能執行器；傷害分物理／魔法／真實 |
| 狀態 | ms／slow／stun／armor／as；暈眩不能攻擊施法 |
| 擊殺歸因 | 只認英雄擊殺或 12 秒內威脅表；純 PvE 致死 → 回城脫身，不記人頭 |
| 傷害統計 | `damageToChampions` 只記對英雄；不再把推塔／補兵算進對人傷害 |

### 3.5 AI 決策優先序（每秒）

對每個活著的英雄大致：

1. 升級技能（Q→E→W→R；R 要 6 等）
2. 過低血／塔下殘血 → 回城
3. 泉水買裝（很粗的清單）
4. 打野：可 gank 殘血敵；否則清營
5. 可補刀就補
6. 同路敵人或已知敵人 → 打架（殘血會追）
7. 8 分後有兵線壓力才推塔
8. 否則走回線上點

### 3.6 戰鬥手感參數（目前）

- 英雄基礎 HP 約 520（坦更高），甲約 24
- 普攻：`AD * (1.05 + 0.45 * mechanics/100)`
- 無藍英雄技能 0 耗藍；有藍會回藍
- stub 技能不能放；partial／full 可放
- 助攻：擊殺點 1200 範圍內隊友

### 3.7 敘事（剛接回）

從 replay 轉 timeline 時會標：

- First Blood
- 對線／遊走／團戰／失誤擊殺
- 外塔（含 lane／tier）
- 小龍／巴龍／預示者
- 團戰叢集（12 秒內 ≥3 殺）
- 主堡

再跑 V1 同款：

`derivePhaseReports` / `deriveTurningPoints` / `deriveKeyPlayers` / `buildMatchDigest` …

---

## 4. 不變式（兩邊報告都要過）

`assertBoxScore` 大意：

- 隊伍擊殺 = 選手擊殺加總；死亡同理
- 雙方擊殺總和 = 雙方死亡總和
- 選手經濟加總 = 隊伍總經濟；goldSeries 終點對齊
- timeline 擊殺／助攻／傷害 要對得上選手欄
- 有 combat 事件時兩邊對人傷害都 > 0
- 8 分前不能有塔事件
- 要有 nexus／surrender 結束，且勝方一致

V2 為了過這些：純塔殺不送人頭；對人傷害分開記。

---

## 5. 目前實測現象（多 seed）

- BP：正常（約 10 bans，選角會變，不再永遠五個固定英雄）
- 人頭：常整場個位數（例如 0–4）
- 傷害：總對人傷害大約數千級，遠低於 V1 職業賽尺度
- 時長：很多場打滿 40 分才被 overtime 收掉
- 故事：有 First Blood／失誤／完賽句，但中段物件／團戰節拍偏少

---

## 6. 根因判斷（討論用）

V2 不是「壞掉的 V1」，是：

1. **目標函數不同**：V1 優化戰報觀感；V2 優化過程物理
2. **AI 太保守／太單調**：互戳、回城、少開、少換龍換塔
3. **收尾弱**：很少自然推爆主堡，靠 40 分強行結束
4. **敘事層已接上，但事件密度不夠** → 故事必然瘦
5. 英雄技能多數還是通用模版，差異不足以驅動陣容敘事

---

## 7. 建議改 V2 的方向（尚未實作，供討論）

目標：**不放棄實體模擬，但讓賽果分布靠近 V1。**

可調槓桿（由易到難）：

1. **節奏曲線**：提高中期擊殺／遊走／團戰傾向；落後方敢開條件
2. **資源 AI**：定時爭小龍／巴龍／首塔，讓 timeline 有物件節拍
3. **收尾**：經濟／人數領先時加速圍主堡，降低 40 分 overtime 比例
4. **經濟尺度**：CS／被動／擊殺金對齊 V1 量級，讓 goldSeries 好看
5. **保留 V1 draft**：繼續共用 BP；用 draft intent 影響 V2 AI 風格
6. **可選混合**：實體模擬產出「骨架事件」，再用 V1 風格的敘事／微調層補密度（需明確邊界，避免假數據）

非目標（目前）：

- 做成完整還原版 LoL client
- 每個英雄完整技能腳本一次做完

---

## 8. 關鍵檔案索引

```
shared/sim/                 # V1
  match-engine.ts
  balance.ts
  draft.ts
  live-match / derive-from-box / narrative

shared/sim-v2/              # V2
  engine.ts                 # 主迴圈、超時收尾
  ai/decision.ts            # AI
  combat/*                  # 傷害、技能、狀態
  adapter/from-legacy-input.ts  # BP → V2
  adapter/to-match-report.ts    # V2 → 戰報／故事
  version/packs.ts          # demo-a / demo-b
  worker/*                  # Web Worker
```

---

## 9. 請 GPT 一起想的問題

1. 在「保留實體模擬」前提下，要用哪些**可觀測 KPI** 定義「夠像 V1」？  
   （例：場均擊殺、一血時間、外塔時間、龍數、完賽分鐘、overtime 比例）
2. 該偏 **調 AI／數值**，還是接受 **輕量結果整形層**？
3. draft intent 應如何綁到 V2 決策權重？
4. 故事層只許描述真實發生事件，還是允許「合理解釋但未模擬到的細節」？
