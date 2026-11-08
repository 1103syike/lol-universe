# V2 Phase P1 交付報告：比賽閉環

日期：2026-11-08  
範圍：交戰意圖、兵線推塔關閉、最小物件、累積經濟上報  
資料：`docs/v2-pro-feel-audit-data.json`（P1 後重跑；種子／實力差與診斷相同）

---

## 1. 問題根因與程式位置

| 大問題 | 根因 | 位置 |
|---|---|---|
| KDA／傷害崩 | farm 無條件擋 fight；開打門檻過窄 | `ai/decision.ts` |
| 零塔、超時瞬刪主堡 | 小兵不打塔；overtime 直接 `nexus.hp=0` | `minion/lane-system.ts`、`engine.ts` |
| 零龍／零巴 | AI 永不選 objective camp；baron 不寫 `hasBaron` | `jungle/jungle-system.ts`、`ai/decision.ts` |
| 金差圖假尺度 | boxScore／samples 用買裝後口袋金 | `game-state.teamGold`、`to-match-report.ts`、`economy.ts` |
| 戰報假補塔／龍 | timeline while 迴圈用 box 數字灌事件 | `adapter/to-match-report.ts` |
| 塔殺變「逃脫回城」 | 無 killer 的環境傷害走 `forceRecall` | `combat/damage.ts` |

---

## 2. 修改摘要

| 區塊 | 改動 |
|---|---|
| A Macro AI | `decideForChampion` 改意圖打分：farm／trade／gank／skirmish／siege／objective／clear；前期偏 farm，中後期可壓過 farm |
| B 推線關閉 | 小兵打可 siege 結構；後期拆塔倍率；overtime 依序摧毁結構，禁瞬刪 nexus；拿掉假補 timeline |
| C 物件 | `nearestObjectiveCamp`／window boost；dragon／baron／herald 可選；baron 寫入 `hasBaron` |
| D 經濟 | `earnedGold` 只增；`pocketGold`（`gold`）可扣；samples／boxScore 用 earned |
| 死亡 | 塔／兵／野怪擊殺改正式死亡（就近敵方拿擊殺），不再洗成回城 |

---

## 3. 修復前後 KPI（even 72v72）

| 指標 | P0 後 | P1 後 |
|---|---:|---:|
| 場均擊殺 | 4.3 | **19.3** |
| 對英雄傷害 | ~8.0k | **9.8k** |
| 場均塔 | 0 | **11.5** |
| 場均龍 | 0 | **2.5** |
| 首外塔 missing | 100% | **0%** |
| 強制／超時結束 | 100% | **75%** |
| 場均時長 | 2400 | **2247**（開始有提前結束） |
| 人均 earned 金 | （口袋金誤報） | **~4.4k** |
| 終局均級 | 10.1 | 4.6（交戰／死亡變多，成長被稀釋） |
| 總 CS | 663 | 111（同上 tradeoff） |

---

## 4. 三種實力差距

| 指標 | even | advantage | stomp |
|---|---:|---:|---:|
| 時長 | 2247 | 2307 | 2400 |
| 擊殺 | 19.3 | 21.8 | 17.5 |
| 塔 | 11.5 | 11.0 | 12.8 |
| 龍 | 2.5 | 0.5 | 0.8 |
| 傷害 | 9.8k | 12.5k | 10.1k |
| 強制結束% | 75 | 75 | 100 |
| earned 金 | 4.4k | 4.7k | 4.6k |

分化仍弱（尤其 stomp 時長），但已有塔／龍／擊殺與部分自然結束。

---

## 5. 測試

- `diagnostics/p1-macro.spec.ts`：擊殺、傷害、塔或龍、earned 金、等級地板
- `diagnostics/p0-growth.spec.ts`：成長地板放寬以相容交戰（仍要求有 CS／野怪／買裝）
- `engine.spec.ts`、`pro-feel-audit.spec.ts`（12 場）通過

---

## 6. 尚未解決

1. CS／等級相對 P0 下降：交戰與正式死亡變多，線上補刀時間被擠壓。
2. 仍有不少局打滿 40 分靠 overtime 結構鏈關閉（非完整高地運營）。
3. 團戰叢集仍少；傷害未到職業賽萬級中段。
4. 均勢／優勢／碾壓節奏分化不足。
5. 決策 share 的 recall 仍偏高（決策次數口徑），真實 `activitySec.recallBase` 也仍偏多。

---

## 7. 停止點

P1 完成。未做完整職業戰術 AI、未改 V1、未做結果整形。  
下一階段需確認後再開始。
