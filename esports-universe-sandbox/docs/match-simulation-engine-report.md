# LoL 事件驅動比賽模擬引擎報告

> 專案：Esports Universe Sandbox  
> 基礎規格：[`event-driven-match-sim-spec.md`](./event-driven-match-sim-spec.md)  
> **地圖／決策定案**：[`match-map-state-decision-spec.md`](./match-map-state-decision-spec.md)  
> 實作位置：`src/app/shared/sim/`  
> 接線：總覽自動模擬（例行／季後／升降／MSI／生死戰）

---

## 1. 目標

**意圖 → 嘗試 → 判定 → TimelineEvent → apply（唯一寫入）→ 狀態回饋 → 結束條件**

下一步升級為：地圖狀態＋位置狀態＋隊伍決策（contest／trade／give-up），時間僅作限制條件。

---

## 2. 已具備

| 項目 | 狀態 |
|---|---|
| live tick + apply 唯一寫入 | 已上 |
| 結束條件 | nexus／超時推主堡（已移除投降結束） |
| 塔時間門檻 | `minOuterTowerSec` + 壓力 |
| 傷害雙邊 combat | 已上；KDA 與傷害軟相關 |
| 擊殺情境 | 線殺／gank／資源團；同路限制 |
| **Phase A 地圖骨架** | 外／內／高地塔格、`canRotate`、十人 locale／task、幼體 8:00／預示者 15:00、鍍層衰減 |
| **Phase B 決策層** | 物件先選 contest／trade／give-up 再結算；payload 帶意圖；預示者撞塔壓力 |
| **Phase C 轉線／敘事** | canRotate 後更新 locale／task；擊殺池依站位；故事以決策段落為主 |
| **Phase D 子戰術** | contest 再拆 direct／假開／埋伏／先做視野；影響勝負偏向與團殺密度 |
| **Phase E P0/P1** | 攻城鏈：高地→兵營→主堡雙塔→主堡；塔事件含 `defenderTeamId`；結束需兵線壓力 |
| **Phase F 死亡狀態** | 死亡／復活；團戰與物件只計存活；`homeAlive`／`awayAlive` 由狀態推導；雪球參數暫不動 |

---

## 3. 下一階段（依定案規格，禁止一次重寫）

| Phase | 內容 |
|---|---|
| A | ✅ 地圖狀態骨架 |
| B | ✅ 決策層：物件 contest／trade／give-up |
| C | ✅ 轉線改站位＋合法擊殺池依 locale；故事改決策段落 |
| D | ✅ 子戰術 fake-start／ambush／vision-first |

詳見 [`match-map-state-decision-spec.md`](./match-map-state-decision-spec.md) §11。

---

## 4. 缺資料（不發明）

- Champion／熟練度／版本 Meta／真實 BP  
- 抽象 `draftPower` 仍可作 live 修正項

---

## 5. 驗證

- `invariants`：KDA／經濟／物件／結束／event id／早期塔  
- `npx tsx scripts/probe-event-sim.mts`
