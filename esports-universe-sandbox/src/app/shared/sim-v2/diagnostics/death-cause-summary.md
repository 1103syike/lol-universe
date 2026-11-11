# 五場比賽死亡原因調查報告

樣本：`demo-a` × 5 場（seed 1000 / 1100 / 1200 / 42 / 77），不同陣容，最長 1800s。  
完整逐筆死亡：`death-cause-audit-report.md`（同目錄）。  
審計程式：`death-cause-audit.ts`。

## 總覽

| 項目 | 數值 |
|------|------|
| 場次 | 5 |
| 總死亡 | **201**（約 40 次／場） |
| 以英雄傷害為主（fair_champ_kill） | **135**（約 67%） |
| 環境／引擎味道偏重 | **約 22～30 筆**（小兵收尾、塔傷、回城中被兵磨死等） |

### 最後一擊 via（聚合）

- 普攻 `auto` 23%
- 點燃相關 ~8%
- 各英雄技能分散（Jinx R、Aatrox Q、LeeSin Q、Viego…）
- **小兵 `minion` 3.5%（7 次最後一擊）**
- **塔 `tower` 2.0%（4 次最後一擊）**  
  → 注意：很多場「英雄收頭但 trail 裡有大量塔／兵傷害」，smell 會標成塔／兵問題，不只看 last-hit。

### 引擎味道（smell）

| smell | 次數 | 含義 |
|------|------|------|
| fair_champ_kill | 135 | 英雄輸出為主，偏正常對線／團戰 |
| tower_dive_or_bail_fail | 14 | 死前 6 秒有明顯塔傷，或越塔／bail 失敗 |
| minion_execute | 8 | 小兵最後一擊或兵傷占比極高 |
| laning_action_then_environment_death | 7 | 還在 farm／lane／siege，卻被塔／兵收 |
| died_to_minions_under_own_tower | 2 | 己方塔下被兵收頭 |
| early_minion_kill | 1 | 前期被兵殺死 |
| fight_into_tower | 1 | fight 意圖進塔 |

---

## 各場摘要

### M1 classic（seed 1000）— 紅勝，37 死
- 前期上路 Aatrox 壓 Garen：英雄換血為主，正常。
- **13:03 Aatrox 在 `recall` 中被小兵磨死**（trail 全是 minion 2～3 點）→ 典型引擎／AI 問題。
- 中後期多起 river 交戰帶塔傷（LeeSin、Viego）：越塔或 bail 太慢。

### M2 engage bot（seed 1100）— 約 30 分結束感，死亡偏多
- Jinx／Nautilus 多起 **siege + tower_bail 仍吃塔死**。
- **29:37 Jinx recall 中被小兵收**（同樣 0% 英雄傷害）。

### M3 assassin mid（seed 1200）
- Zed **28:58 recall 中被小兵收**。
- Graves 在己方河／塔附近被兵 + Viego 混殺（`died_to_minions_under_own_tower`）。

### M4 poke（seed 42）
- Jayce 8:28 敵塔下被 Aatrox 連招 + 塔打爆（`tower_bail` 已觸發仍死）。
- Syndra 殘血在己方側被 Viego 爆發後 **小兵補刀**。

### M5 skirmish（seed 77）
- **6:50 Thresh 前期 recall 被小兵磨死**。
- Jhin 多起敵塔／河戰：`fight` + `tower_bail` 仍死於塔。

---

## 我認為「引擎／設計不好」才導致的（優先修）

### 1. 回城中被小兵磨死（高信心 Bug／AI 洞）
**現象：** 多筆 `decisions=[recall]`、`champDmg=0%`、trail 全是小兵每跳 2～16 傷害（Aatrox、Jinx、Zed、Thresh）。  
**機制推斷：** 小兵傷害會斷回城 → AI 反覆想 B，但人還站在兵堆裡 → 斷線＋繼續吃兵 → 死。  
**不像真實職業：** 殘血會先離開兵線／進草／進塔再 B。  
**建議：**  
- `safeRecallPos` 必須離開敵兵 acquire 範圍  
- 回城前若仍被兵打，優先 `softDisengage` 而不是原地 channel  
- 或：殘血時小兵 aggro 優先級／傷害再壓一點（次要）

### 2. 塔下交戰／推塔：`tower_bail` 太慢或進塔條件過鬆（高信心）
**現象：** 14 次 smell；trail 常見 `tower:100+` 混在英雄傷害裡；決策已有 `tower_bail`／`siege` 仍死。  
**建議：**  
- bail 觸發後強制移動權重大於攻擊  
- 無足夠兵線時禁止貼塔輸出  
- 越塔需要更嚴的 `canCommitDive`（人數、敵血、波）

### 3. 團戰／對線後「小兵補刀」收頭（中信心）
**現象：** 英雄打到殘血，最後一下 via=minion；或己塔下被兵收。  
**真服也有**，但 sim 裡兵會主動追英雄（420 acquire），殘血撤離不夠果斷時被放大。  
**建議：** 殘血 `tryDisengage` 優先於繼續 farm；己塔下敵兵不該輕易把英雄打死（塔應更積極清兵／英雄更快貼塔安全區）。

### 4. 支援前期站位過深（中低信心）
Thresh 6:50 被兵收、多場 SUPPORT 死亡偏高。  
可能是跟線過深 + 回城點差，與 #1 同類。

---

## 比較「正常」的部分

- 多數死亡是英雄技能／普攻／點燃收頭，trail 英雄傷害 ≥70%。  
- 打野 gank（LeeSin Q）、爆發（Syndra R、Aatrox Q3）看起來像對線／遊走結果，不一定是引擎壞掉。  
- 死亡角色分布相對平均（各路 15～23），沒有單一角色被環境虐爆到全場。

---

## 建議修訂順序

1. **回城安全點／斷線迴圈**（直接消掉多筆荒謬死）  
2. **塔仇恨＋bail 執行力**（減少無意義越塔死）  
3. **殘血撤離 vs 小兵追擊**  
4. 再談鍍層、數值微調

本報告之後實作：**防禦塔鍍層（Turret Plating）**。

---

## 修復後複測（同 5 seed／陣容）

| 指標 | 修復前 | 修復後 |
|------|--------|--------|
| 總死亡 | 201 | **131** |
| via=minion | 7 (3.5%) | **1 (0.8%)** |
| via=tower | 4 (2.0%) | **2 (1.5%)** |
| minion_execute smell | 8 | **1** |
| tower_dive_or_bail_fail | 14 | **2** |

根因修法（非傷害打折）：回城安全點含敵兵、channel 中遇威脅改撤退、敵塔下引擎不再硬輸出、dive／兵線掩護條件收緊、殘血遇兵優先撤退。

### 第二輪（塔收頭兩筆）

| 指標 | 上一輪 | 本輪 |
|------|--------|------|
| 總死亡 | 131 | **140** |
| via=tower | 2 | **0** |
| fight_into_tower | 2 | **0** |
| tower_dive_or_bail_fail | 2 | 6（多為英雄收頭、trail 帶一發塔傷） |
| minion_execute | 1 | **2** |

根因：兵線掩護下仍對英雄輸出會引塔仇；`tower_bail` 被引擎當成戰鬥動作而重貼；塔仇恨未納入 canStay。  
修法：有塔仇必撤、塔下非 dive 不換血／不開 skirmish、`tower_bail` 退出戰鬥迴圈、bot 壓力不再塔下偷普攻。
