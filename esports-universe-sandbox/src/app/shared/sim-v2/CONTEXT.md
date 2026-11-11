# Sim V2 Laning

對線期兵線與補刀的共用語言。只定義概念，不含實作細節。

## Language

**Wave Clash**:
雙方小兵交戰的相遇點，用線上進度描述位置。
_Avoid_: Midpoint, fight point

**Wave Zone**:
Clash 相對己方／敵方外塔的區域：`own`、`river`、`enemy`。
_Avoid_: Side of map, lane half

**Last Hit**:
英雄最後一擊擊殺敵方小兵並取得 CS／金幣。必須在攻擊距離內完成。
_Avoid_: Soft CS, farm credit

**Freeze**:
只補刀、不主動清線，把 Clash 維持在己方外塔外側附近，迫使對手超前。
_Avoid_: Hold wave, stall

**Slow Push**:
略清敵方（通常先清遠程兵）讓己方兵數慢慢堆高，往敵塔推進。
_Avoid_: Soft shove

**Hard Shove**:
快速清空敵方兵線，讓己方兵線撞上敵塔（Crash）。
_Avoid_: Fast push only when crash is not intended

**Crash**:
己方兵進入敵方外塔攻擊範圍，塔開始清兵。
_Avoid_: Push complete, wave done

**Bounce**:
Crash 後下一波相遇點自然往己方退回的狀態。
_Avoid_: Reset (reset 是中立重置，不完全相同)

**Lane Priority**:
己方先處理完兵線、對手仍被兵線綁住時的行動自由（召回、遊走、視野、目標）。
_Avoid_: Tempo (可作同義，但本專案優先用 Lane Priority)

**Soft Last Hit**:
小兵／防塔擊殺時，僅在英雄已在普攻可及範圍附近才允許把 CS 記給該英雄的模擬補正。
_Avoid_: Lane owner credit, free CS
