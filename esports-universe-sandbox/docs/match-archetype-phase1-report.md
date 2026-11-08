# Phase I：比賽類型系統交付報告

## 1. 新增與修改檔案

### 新增
- `src/app/shared/sim/match-archetype.ts`：分類模組（門檻、指標、主類型／次標籤）
- `src/app/shared/sim/match-archetype.spec.ts`：合成局面單元測試
- `src/app/shared/sim/match-archetype.sample.spec.ts`：100 場抽樣
- `docs/match-archetype-sample-100.json`：抽樣統計輸出
- `docs/match-archetype-phase1-report.md`：本報告
- `scripts/sample-match-archetypes.mjs`：備用抽樣腳本

### 修改
- `match-stats.ts`：新增 `base-hold` 事件、`endMethod`／`pushStyle`／`structureHold` payload
- `objectives.ts`：結束探測改回傳 `{ end, hold }`，寫入 `endMethod` 與守家事件；塔事件可標 `pushStyle`
- `live-match.ts`：套用 `hold`／`end` 探測結果
- `siege.spec.ts`：配合新回傳結構
- `match-engine.ts`：賽後呼叫 `classifyMatchArchetypes`，帶入賽前 draft 戰力差
- `report.ts`：`MatchReport.archetypes`
- `index.ts`：匯出分類 API
- `dashboard.page.html`／`.scss`：報告區顯示主要類型／次要標籤／判定理由

## 2. 各分類實際判定條件（摘要）

門檻集中在 `ARCHETYPE_THRESHOLDS`。

| ID | 主要條件 |
|---|---|
| comeback | 勝方最大落後 ≥ 3500，前期仍落後，終局領先 ≥ 1500 |
| epic-battle | 時長 ≥ 40 分、經濟接近樣本 ≥ 62%、優勢切換 ≥ 3、團戰 ≥ 4 |
| stomp | 前期領先 ≥ 3200、優勢維持樣本 ≥ 72%、幾乎無大落後 |
| upset | 需 `preMatchEdge`，賽前劣勢方獲勝且差距 ≥ 8 |
| narrow-victory | 中後期大幅領先，終局優勢收斂到 ≤ 900 |
| marathon | 時長 ≥ 38 分 |
| macro-game | 低 KPM／低團戰頻率，且推塔足夠 |
| bloodbath | 總擊殺 ≥ 28 且 KPM／TPM 高 |
| split-push | 邊線塔 ≥ 4，其中安靜／split 比例 ≥ 60% |
| objective-war | 雙方都 contest 的物件爭奪 ≥ 4，或大型物件爭奪 ≥ 2；重爭奪才可當主類型 |
| base-defense | `base-hold` ≥ 2，或首座兵營後僵持 ≥ 4 分且有主堡塔拆除 |
| backdoor | 僅在 nexus.`endMethod === 'backdoor'` 時給標 |
| decisive-fight | 終局 90 秒內擊殺 ≥ 3（預設次要） |
| miracle-steal | 落後 ≥ 3500 時搶下 contest 物件並產生經濟回擺（預設次要） |
| perfect-game | 勝方死亡 ≤ 2，且長期壓制 |

矛盾對（不會同時出現）：stomp↔comeback／epic／narrow；bloodbath↔macro；perfect↔comeback／narrow。

## 3. 可靠度與資料缺口

### 可可靠判定
comeback、epic-battle、stomp、narrow-victory、marathon、macro-game、bloodbath、objective-war、base-defense（有 hold 事件後）、backdoor（nexus.`endMethod === 'backdoor'`）、decisive-fight、miracle-steal、upset（已接 draft 戰力差）、perfect-game、split-push（有 pushStyle 或時間窗推斷）

### 資料仍不足／保守不給
- **split-push**：已可依邊線塔＋無團戰窗／`pushStyle` 判定，但尚未有獨立「分推意圖」事件；偏保守。

## 4. 100 場抽樣結果

見 `docs/match-archetype-sample-100.json`（收緊爭奪判定後）：

- 無主類型比例：約 65%（普通對局可不強貼標）
- 主類型出現：bloodbath／base-defense／marathon／epic-battle／stomp／macro-game／objective-war 等分散
- 次要標籤：decisive-fight 最常見，其次 objective-war、base-defense、marathon
- 矛盾標籤：0

## 5. 測試結果

- `match-archetype.spec.ts`：合成局面驗收案例通過
- `match-archetype.sample.spec.ts`：100 場無矛盾標籤
- `siege.spec.ts`：配合 `MatchEndProbe` 已更新
- 專案 `ng build` 通過

## 6. UI 呈現

模擬報告記分板：獎牌列掛在賽事列（例如「TCL 2021 春季常規賽 第4週 第4天」）**上方**，不另開獨立「比賽類型」區塊。

- 主類型：金色獎牌
- 次要標籤：铜色獎牌（最多 2）
- `title` 顯示判定理由

## 7. 矛盾標籤

分類器會過濾 `CONFLICT_PAIRS`；100 場抽樣 `conflictCount = 0`。

## 8. 對比賽引擎的影響

- **勝負／擊殺／經濟生成邏輯未改機率曲線**（正常攻城仍用原 closeChance）。
- 新增遙測／結束路徑：
  - 結束失敗時寫入 `base-hold`（不結束比賽）
  - nexus 標記 `endMethod`（`siege`／`backdoor`／`timeout`）
  - **backdoor**（稀有）：兵營已拆、主堡塔未全拆、波壓高、剛打完團、防守方至少 4 人死亡、90 秒冷卻、低機率骰；超時強制結束路徑不會走偷家
  - 塔可標記 `pushStyle`（呼叫端傳 `recentCombat` 時）
- 分類本身只讀 box score，不回寫模擬過程。

## 核心原則

比賽類型是賽後分析結果，不是開局抽籤劇本。
