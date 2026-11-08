# V2 Phase P0 交付報告：成長迴路與線上存在修復

日期：2026-11-08  
範圍：只修 CS／野怪／經驗／等級／經濟／買裝／Recall 與真實時間活動統計  
資料：`docs/v2-pro-feel-audit-data.json`（修復後重跑；種子與三檔實力差與診斷相同）

---

## 1. 問題根因與程式位置

| 問題 | 根因 | 位置 |
|---|---|---|
| CS 幾乎為 0 | 補刀走捷徑或攻擊後未入帳；AI 幾乎不選 farm | `minion/lane-system.ts`、`combat/damage.ts`、`ai/decision.ts` |
| 經驗／等級卡在 ~1 | 沒有穩定 CS／清野事件；`tickStatuses` 曾把升級屬性洗回裸 base | `combat/executors.ts`、`economy/economy.ts` |
| 打野清不了營 | 紅方野區缺營；野怪每 0.5s 無冷卻輸出把打野打回家；AI 清營中途過度回城 | `version/shared-content.ts`、`jungle/jungle-system.ts`、`ai/decision.ts` |
| 回城後卡死 | 泉水無回血；每秒重開 recall 路徑；沒有 intent／travel／base 分離 | `engine.ts`、`ai/decision.ts` |
| 買裝幾乎不發生 | 人到不了基地或待不住 | 同上 + `economy/economy.ts` |
| 行動統計失真 | 把每秒 `ai_decision` 次數當時間占比 | `diagnostics/pro-feel-audit.ts`（改讀 `activitySec`） |

---

## 2. 修改檔案與內容

| 檔案 | 改了什麼 |
|---|---|
| `state/entities.ts` / `champion/spawn.ts` | `recallPhase`、`recallCount`、`activitySec`、`campKills`、`goldBySource`、`expBySource`、`levelSamples`；野怪 `nextAttackAt` |
| `types/ids.ts` | `CampId` 放寬，允許紅方營 ID |
| `version/shared-content.ts` | （既有）紅方野區營 |
| `combat/damage.ts` | 英雄擊殺小兵入帳 CS／金／經驗；小兵死亡近距離分享經驗；擊殺金走 `grantGold` |
| `combat/executors.ts` | `tickStatuses` 先 `recomputeItemStats` 再疊 status，不再洗掉裝備／等級屬性 |
| `minion/lane-system.ts` | 補刀改走真實 `basicAttack`；小兵互殺也發分享經驗；lane 選目標／兵線錨點 |
| `jungle/jungle-system.ts` | `nearestFriendlyCamp`；野怪攻擊冷卻；清野傷害／承傷調整；`campKills` |
| `economy/economy.ts` | 金錢／經驗來源記帳；升級後重算屬性；`buyAffordableItems` |
| `ai/decision.ts` | recall 三相（none／moving_home／at_base）；farm／jungle 優先；清營中不因輕傷中斷 |
| `engine.ts` | 泉水回血；`activitySec` 累積；等級曲線取樣 |
| `diagnostics/pro-feel-audit.ts` | 真實時間活動、野怪擊殺、回城次數、金／經驗來源、買裝 |
| `diagnostics/p0-growth.spec.ts` | P0 成長／回城驗收測試 |

---

## 3. 修復前後 KPI 對照（even 72v72，各 4 場均值）

| 指標 | 修復前 | 修復後 |
|---|---:|---:|
| 終局均級 | ~1.1 | **10.1** |
| 場均總 CS | ~28 | **663** |
| 場均野怪擊殺 | ~0 | **60.3** |
| AI recall 決策占比 | **68.2%** | 26.3% |
| 真實時間 lane+jungle | （無） | **71.8%** |
| 真實時間 recallTravel+Base | （無） | **26.3%** |
| 場均買裝次數 | ~0–極少 | **36.8** |
| 首次買裝時間 | 多半缺失 | **120s** |
| 金錢來源 | 幾乎只有 passive | passive + **CS 12.1k** + **camp 5.0k**（場均全隊） |
| 經驗來源 | 幾乎無 | minion / minion_share / camp |
| 場均擊殺 | 4.3 | 4.3（本階段刻意不修） |
| 強制超時結束 | 100% | 100%（本階段不進推塔／物件） |

解讀：成長與線上存在是真的被修好，不是只改統計口徑。擊殺／塔／龍仍差，屬後續階段。

---

## 4. 三種實力差距實測（各 4 場）

| 指標 | even 72v72 | advantage 82v68 | stomp 95v55 |
|---|---:|---:|---:|
| 時長（秒） | 2400 | 2400 | 2400 |
| 終局均級 | 10.1 | 9.1 | 10.4 |
| 總 CS | 663 | 532 | 691 |
| 野怪擊殺 | 60.3 | 56.8 | 67.8 |
| 買裝 | 36.8 | 33.5 | 38.3 |
| 活動 lane | 0.598 | 0.493 | 0.590 |
| 活動 jungle | 0.120 | 0.116 | 0.106 |
| 活動 recallTravel | 0.060 | 0.056 | 0.055 |
| 活動 recallBase | 0.203 | 0.322 | 0.234 |
| 總擊殺 | 4.3 | 3.8 | 5.5 |
| 強制結束 | 100% | 100% | 100% |

位置活動（even）：打野 jungle ~60%，中路 lane ~97%，射手／上路有明顯 farm＋合理回城時間。

---

## 5. 新增或修改的測試

- `diagnostics/p0-growth.spec.ts`
  - 單場：CS／野怪／等級／買裝／金錢來源／線上時間 > 回城時間
  - even 種子：成長高於修復前地板
- `diagnostics/pro-feel-audit.spec.ts`：重跑 12 場並寫入 `docs/v2-pro-feel-audit-data.json`
- 既有 `engine.spec.ts` 全過

---

## 6. 尚未解決（明確不在 P0）

1. 擊殺率仍極低，團戰／換血邏輯未做。
2. 塔、龍、巴龍、推線壓力仍為 0；100% 超時強拆。
3. 三種實力差幾乎不影響時長與物件節奏。
4. 打野清野倍率／野怪承傷是為打通迴路的平衡調整，尚未對齊職業節奏。
5. Support 幾乎不拿 CS（預期），但仍缺視線／游走職能。
6. `avgFinalGold` 是「買裝後口袋剩餘金」，不是總收入；總收入看 `goldBySource`。

---

## 7. 停止點

P0 完成。未進入物件爭奪、推塔、職業戰術 AI、結果整形或 V1 修改。  
下一階段需你確認後再開始。
