# LoL Match Simulation Engine V2 — Phase 0 盤點（已確認）

完整內容見 Cursor plan：`Match Engine V2 Phase0`。

## 實作落點

- 新引擎樹：`src/app/shared/sim-v2/`
- 舊引擎保留：`src/app/shared/sim/`
- 切換：`setSimEngineMode('v1' | 'v2')`（預設已改 `v2`；細節見 `sim-engine-rules-brief.md`）
- Facade：`simulateGame` 依 mode 路由到 V1 或 V2 adapter

## Phase 對應目錄

| Phase | 模組 |
|---|---|
| 1 | `version/` `state/` `scheduler/` `rng.ts` |
| 2 | `map/` |
| 3 | `minion/` |
| 4 | `jungle/` |
| 5 | `combat/` `champion/` |
| 6 | `economy/` |
| 7 | `objectives/` |
| 8 | `ai/` |
| 9 | `replay/` `adapter/` `engine.ts` |
