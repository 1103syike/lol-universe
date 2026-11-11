# Death Cause Audit

Matches: 5
Total deaths: 178

## Aggregate via
- auto: 31 (17.4%)
- leesin:q2: 17 (9.6%)
- viego:w: 11 (6.2%)
- leesin:r: 9 (5.1%)
- ignite: 9 (5.1%)
- ezreal:r: 8 (4.5%)
- viego:r: 7 (3.9%)
- viego:q: 7 (3.9%)
- darius:r: 6 (3.4%)
- minion: 5 (2.8%)
- syndra:r: 5 (2.8%)
- jinx:r: 5 (2.8%)
- viego:e: 5 (2.8%)
- leesin:e: 4 (2.2%)
- aatrox:q2:sweet: 4 (2.2%)
- tower: 4 (2.2%)
- graves:q: 3 (1.7%)
- aatrox:p: 2 (1.1%)
- aatrox:q1:sweet: 2 (1.1%)
- aatrox:q1: 2 (1.1%)
- syndra:e: 2 (1.1%)
- graves:r: 2 (1.1%)
- annie:q: 2 (1.1%)
- zed:r: 2 (1.1%)
- aatrox:q3:sweet: 2 (1.1%)
- aatrox:q2: 1 (0.6%)
- ahri:w: 1 (0.6%)
- ahri:q: 1 (0.6%)
- syndra:w:sphere: 1 (0.6%)
- annie:w: 1 (0.6%)
- annie:r: 1 (0.6%)
- leesin:q1: 1 (0.6%)
- jayce:q:hammer: 1 (0.6%)
- zed:q: 1 (0.6%)
- ashe:r: 1 (0.6%)
- renekton:q: 1 (0.6%)
- renekton:e: 1 (0.6%)
- aatrox:q3: 1 (0.6%)
- aatrox:w:pull: 1 (0.6%)
- syndra:q: 1 (0.6%)
- aatrox:w: 1 (0.6%)
- ezreal:q: 1 (0.6%)
- camille:q2: 1 (0.6%)
- thresh:q: 1 (0.6%)
- jhin:q: 1 (0.6%)
- jhin:r: 1 (0.6%)
- darius:q: 1 (0.6%)

## Aggregate engine smells
- fair_champ_kill: 138
- unclassified: 35
- tower_dive_or_bail_fail: 10
- minion_execute: 7
- died_under_enemy_tower_low_champ_damage: 3
- laning_action_then_environment_death: 3
- fight_into_tower: 2
- died_to_minions_under_own_tower: 1
- early_minion_kill: 1

## M1 classic (seed 1000)
duration=1800s winner=red deaths=37
KDA:
- blue:TOP:Aatrox 10/2/1 lv16 gold=9744
- blue:JUNGLE:LeeSin 6/6/1 lv14 gold=10425
- blue:MID:Ahri 2/2/8 lv12 gold=7286
- blue:BOT:Jinx 1/4/4 lv12 gold=7332
- blue:SUPPORT:Thresh 0/4/4 lv9 gold=5829
- red:TOP:Garen 0/4/4 lv12 gold=6797
- red:JUNGLE:Viego 10/5/1 lv17 gold=13213
- red:MID:Syndra 7/2/3 lv14 gold=8966
- red:BOT:Ashe 1/5/1 lv11 gold=6748
- red:SUPPORT:Leona 0/3/4 lv7 gold=5771

Deaths:
- 3:03 red:SUPPORT:Leona lv3 <- blue:JUNGLE:LeeSin via=leesin:q2 zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,lane,wave_shove] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:LeeSin/leesin:q1:164@182.7 | blue:JUNGLE:LeeSin/leesin:e:124@182.7 | blue:JUNGLE:LeeSin/leesin:q2:244@183.0
- 3:29 blue:JUNGLE:LeeSin lv4 <- red:MID:Syndra via=auto zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:MID:Syndra/auto:57@208.0 | red:MID:Syndra/syndra:w:sphere:83@208.0 | red:MID:Syndra/syndra:e:67@208.2 | red:MID:Syndra/auto:57@209.7
- 6:30 red:JUNGLE:Viego lv6 <- blue:JUNGLE:LeeSin via=leesin:r zone=top_side ownTower=false enemyTower=false
  champDmg=99% decisions=[objective,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: monster/monster:8@386.4 | monster/monster:8@387.9 | blue:JUNGLE:LeeSin/leesin:e:154@389.0 | blue:JUNGLE:LeeSin/auto:136@389.2 | blue:JUNGLE:LeeSin/leesin:q1:220@389.2 | blue:JUNGLE:LeeSin/leesin:q2:274@389.4 | blue:JUNGLE:LeeSin/leesin:r:406@390.0
- 8:06 blue:SUPPORT:Thresh lv4 <- red:BOT:Ashe via=minion zone=bot_side ownTower=false enemyTower=true
  champDmg=0% decisions=[retreat,tower_bail] smells=[minion_execute,tower_dive_or_bail_fail,died_under_enemy_tower_low_champ_damage]
  note: 塔傷參與過高：越塔／撤離判斷或塔仇恨處理可能有問題。
  trail: tower/tower:121@483.0 | tower/tower:121@484.4 | tower/tower:121@485.7 | minion/minion:6@486.2 | minion/minion:6@486.7 | minion/minion:3@486.7
- 8:25 red:BOT:Ashe lv5 <- blue:TOP:Aatrox via=aatrox:q2 zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,objective,fight] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:TOP:Aatrox/auto:155@504.2 | blue:TOP:Aatrox/aatrox:w:89@504.2 | blue:TOP:Aatrox/aatrox:q1:146@504.9 | blue:TOP:Aatrox/aatrox:w:pull:89@505.7 | blue:TOP:Aatrox/auto:155@505.9 | blue:TOP:Aatrox/aatrox:q2:183@505.9
- 8:59 blue:SUPPORT:Thresh lv5 <- red:JUNGLE:Viego via=viego:r zone=top_side ownTower=false enemyTower=false
  champDmg=96% decisions=[objective,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/viego:q:247@534.2 | monster/monster:32@537.2 | red:JUNGLE:Viego/auto:138@538.5 | red:JUNGLE:Viego/viego:q:248@538.5 | red:JUNGLE:Viego/viego:w:127@538.7 | monster/monster:32@538.7 | red:JUNGLE:Viego/viego:e:109@539.0 | red:JUNGLE:Viego/viego:r:427@539.0
- 9:02 red:TOP:Garen lv8 <- blue:JUNGLE:LeeSin via=leesin:e zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:LeeSin/leesin:q1:252@541.6 | blue:JUNGLE:LeeSin/leesin:q2:330@541.7 | blue:JUNGLE:LeeSin/auto:142@542.0 | blue:JUNGLE:LeeSin/leesin:e:153@542.0
- 9:04 red:JUNGLE:Viego lv8 <- blue:TOP:Aatrox via=aatrox:p zone=top_side ownTower=false enemyTower=false
  champDmg=99% decisions=[fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Ahri/auto:51@542.2 | blue:MID:Ahri/ahri:w:43@542.2 | blue:MID:Ahri/ahri:w:17@542.2 | blue:MID:Ahri/ahri:w:17@542.2 | blue:BOT:Jinx/auto:68@543.0 | blue:BOT:Jinx/auto:68@543.7 | blue:TOP:Aatrox/auto:117@544.5 | blue:TOP:Aatrox/aatrox:p:78@544.5
- 9:09 blue:MID:Ahri lv6 <- red:MID:Syndra via=syndra:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,fight,objective] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:MID:Syndra/auto:75@549.0 | red:MID:Syndra/syndra:q:273@549.0 | red:MID:Syndra/syndra:w:sphere:173@549.0 | red:MID:Syndra/syndra:e:124@549.0 | red:MID:Syndra/syndra:r:466@549.0
- 9:33 red:MID:Syndra lv7 <- blue:TOP:Aatrox via=aatrox:q1:sweet zone=top_side ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:TOP:Aatrox/aatrox:w:88@573.0 | blue:TOP:Aatrox/aatrox:q1:sweet:304@573.0
- 9:55 red:BOT:Ashe lv5 <- blue:TOP:Aatrox via=aatrox:q1 zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,lane] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:TOP:Aatrox/auto:165@595.7 | blue:TOP:Aatrox/aatrox:p:69@595.7 | blue:TOP:Aatrox/aatrox:q1:183@595.7
- 10:05 red:TOP:Garen lv8 <- blue:TOP:Aatrox via=aatrox:p zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:TOP:Aatrox/auto:134@601.0 | blue:BOT:Jinx/auto:76@603.0 | blue:TOP:Aatrox/auto:134@603.2 | blue:TOP:Aatrox/auto:134@605.2 | blue:TOP:Aatrox/aatrox:p:98@605.2
- 11:06 red:MID:Syndra lv8 <- blue:JUNGLE:LeeSin via=leesin:q2 zone=river ownTower=false enemyTower=false
  champDmg=98% decisions=[farm,wave_shove,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:2@660.0 | blue:JUNGLE:LeeSin/auto:169@665.5 | blue:JUNGLE:LeeSin/leesin:e:170@665.5 | minion/minion:9@665.5 | minion/minion:5@665.5 | minion/minion:5@665.5 | blue:JUNGLE:LeeSin/leesin:q1:320@666.0 | blue:JUNGLE:LeeSin/leesin:q2:434@666.0
- 12:20 red:JUNGLE:Viego lv9 <- blue:JUNGLE:LeeSin via=leesin:q2 zone=river ownTower=true enemyTower=false
  champDmg=95% decisions=[retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:3@739.4 | blue:JUNGLE:LeeSin/leesin:q1:300@740.0 | blue:JUNGLE:LeeSin/leesin:e:186@740.0 | minion/minion:6@740.2 | minion/minion:6@740.2 | minion/minion:6@740.2 | minion/minion:6@740.2 | blue:JUNGLE:LeeSin/leesin:q2:448@740.5
- 13:30 blue:JUNGLE:LeeSin lv11 <- red:JUNGLE:Viego via=auto zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/auto:127@808.2 | red:JUNGLE:Viego/viego:q:226@808.2 | red:JUNGLE:Viego/viego:w:132@808.2 | red:JUNGLE:Viego/viego:e:89@809.0 | red:JUNGLE:Viego/auto:127@809.2 | red:JUNGLE:Viego/auto:127@810.2
- 14:32 red:TOP:Garen lv9 <- blue:TOP:Aatrox via=aatrox:q1:sweet zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[lane,objective,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Ahri/ahri:w:103@868.0 | blue:MID:Ahri/ahri:w:41@868.0 | blue:MID:Ahri/ahri:w:41@868.0 | blue:MID:Ahri/auto:66@868.6 | blue:MID:Ahri/auto:66@870.2 | blue:MID:Ahri/auto:66@871.7 | blue:TOP:Aatrox/aatrox:w:84@872.0 | blue:TOP:Aatrox/aatrox:q1:sweet:335@872.0
- 14:40 red:BOT:Ashe lv7 <- blue:TOP:Aatrox via=aatrox:q1 zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,wave_shove] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Ahri/auto:79@874.7 | blue:TOP:Aatrox/auto:186@879.4 | blue:TOP:Aatrox/aatrox:q1:228@880.2
- 14:42 red:JUNGLE:Viego lv10 <- blue:JUNGLE:LeeSin via=leesin:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:LeeSin/auto:189@880.2 | blue:JUNGLE:LeeSin/leesin:q1:286@880.2 | blue:JUNGLE:LeeSin/leesin:e:190@880.2 | blue:JUNGLE:LeeSin/auto:189@882.0 | blue:JUNGLE:LeeSin/leesin:q2:368@882.0 | blue:JUNGLE:LeeSin/leesin:r:555@882.0
- 14:44 red:SUPPORT:Leona lv6 <- blue:TOP:Aatrox via=aatrox:q2:sweet zone=bot_side ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:TOP:Aatrox/aatrox:q2:sweet:413@884.0
- 15:01 blue:SUPPORT:Thresh lv5 <- red:MID:Syndra via=minion zone=bot_side ownTower=false enemyTower=true
  champDmg=79% decisions=[retreat,objective] smells=[minion_execute,tower_dive_or_bail_fail,fair_champ_kill]
  note: 塔傷參與過高：越塔／撤離判斷或塔仇恨處理可能有問題。
  trail: minion/minion:14@900.0 | minion/minion:4@900.9 | red:MID:Syndra/auto:82@901.0 | minion/minion:8@901.0 | minion/minion:8@901.0 | minion/minion:8@901.0 | minion/minion:14@901.0 | minion/minion:8@901.0
- 16:28 blue:JUNGLE:LeeSin lv11 <- red:JUNGLE:Viego via=viego:q zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/auto:158@985.2 | red:JUNGLE:Viego/viego:q:243@985.2 | red:JUNGLE:Viego/viego:e:115@985.5 | red:JUNGLE:Viego/viego:w:149@986.0 | red:JUNGLE:Viego/viego:r:399@986.0 | red:JUNGLE:Viego/auto:158@986.2 | red:JUNGLE:Viego/auto:158@987.2 | red:JUNGLE:Viego/viego:q:243@988.0
- 16:32 red:JUNGLE:Viego lv12 <- blue:TOP:Aatrox via=auto zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:TOP:Aatrox/auto:131@989.2 | blue:TOP:Aatrox/aatrox:p:129@989.2 | blue:TOP:Aatrox/aatrox:q1:158@989.2 | blue:TOP:Aatrox/aatrox:q2:sweet:345@990.2 | blue:TOP:Aatrox/aatrox:q3:sweet:431@991.6 | blue:TOP:Aatrox/aatrox:w:69@991.6 | blue:TOP:Aatrox/auto:131@992.7
- 19:17 blue:BOT:Jinx lv10 <- red:JUNGLE:Viego via=viego:q zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[trade,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/auto:245@1151.7 | red:JUNGLE:Viego/viego:q:340@1157.0
- 19:48 blue:JUNGLE:LeeSin lv12 <- red:JUNGLE:Viego via=viego:q zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[jungle,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:MID:Syndra/auto:61@1188.2 | red:MID:Syndra/syndra:q:386@1188.2 | red:MID:Syndra/syndra:e:143@1188.5 | red:JUNGLE:Viego/auto:182@1188.7 | red:JUNGLE:Viego/viego:q:249@1188.7
- 20:36 red:BOT:Ashe lv10 <- blue:BOT:Jinx via=jinx:r zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:BOT:Jinx/auto:158@1236.0 | blue:BOT:Jinx/jinx:e:255@1236.0 | blue:BOT:Jinx/jinx:w:334@1236.0 | blue:BOT:Jinx/jinx:r:644@1236.0
- 21:01 blue:TOP:Aatrox lv14 <- red:JUNGLE:Viego via=viego:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[wave_shove,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/auto:189@1260.7 | red:JUNGLE:Viego/viego:q:260@1260.7 | red:JUNGLE:Viego/viego:w:165@1260.7 | red:JUNGLE:Viego/viego:e:157@1260.7 | red:JUNGLE:Viego/viego:r:461@1261.0
- 21:11 blue:BOT:Jinx lv11 <- red:MID:Syndra via=syndra:e zone=bot_side ownTower=false enemyTower=false
  champDmg=94% decisions=[objective,retreat,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: monster/monster:27@1266.0 | monster/monster:27@1267.5 | monster/monster:27@1269.0 | red:MID:Syndra/auto:85@1271.0 | red:MID:Syndra/syndra:q:466@1271.0 | red:MID:Syndra/syndra:w:sphere:447@1271.0 | red:MID:Syndra/syndra:e:172@1271.0
- 21:37 blue:JUNGLE:LeeSin lv13 <- red:MID:Syndra via=syndra:e zone=river ownTower=false enemyTower=false
  champDmg=71% decisions=[farm,siege,retreat] smells=[tower_dive_or_bail_fail,fair_champ_kill]
  note: 塔傷參與過高：越塔／撤離判斷或塔仇恨處理可能有問題。
  trail: tower/tower:90@1294.0 | minion/minion:11@1295.0 | minion/minion:11@1295.0 | minion/minion:11@1295.0 | red:MID:Syndra/auto:65@1297.0 | red:MID:Syndra/syndra:q:402@1297.0 | red:MID:Syndra/syndra:w:sphere:386@1297.0 | red:MID:Syndra/syndra:e:148@1297.0
- 21:43 red:SUPPORT:Leona lv6 <- blue:MID:Ahri via=ahri:w zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[lane,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Ahri/ahri:e:191@1302.0 | blue:MID:Ahri/auto:61@1302.0 | blue:MID:Ahri/ahri:q:203@1302.0 | blue:MID:Ahri/ahri:q:return:335@1302.0 | blue:MID:Ahri/ahri:w:134@1303.0 | blue:MID:Ahri/ahri:w:53@1303.0 | blue:MID:Ahri/ahri:w:53@1303.0
- 24:34 blue:MID:Ahri lv11 <- red:JUNGLE:Viego via=viego:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/auto:322@1473.2 | red:JUNGLE:Viego/viego:q:396@1473.2 | red:JUNGLE:Viego/viego:w:257@1473.2 | red:JUNGLE:Viego/viego:e:236@1473.2 | red:JUNGLE:Viego/viego:r:702@1474.0
- 24:57 blue:JUNGLE:LeeSin lv13 <- red:MID:Syndra via=syndra:r zone=river ownTower=false enemyTower=true
  champDmg=84% decisions=[siege,retreat,tower_bail] smells=[tower_dive_or_bail_fail,fair_champ_kill]
  note: 塔傷參與過高：越塔／撤離判斷或塔仇恨處理可能有問題。
  trail: minion/minion:13@1495.7 | tower/tower:88@1496.0 | minion/minion:7@1496.0 | minion/minion:3@1496.2 | minion/minion:7@1496.2 | minion/minion:7@1496.5 | minion/minion:13@1496.7 | red:MID:Syndra/syndra:r:955@1497.0
- 24:57 red:TOP:Garen lv12 <- blue:TOP:Aatrox via=aatrox:q2:sweet zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[farm,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:TOP:Aatrox/auto:282@1495.2 | blue:TOP:Aatrox/aatrox:p:188@1495.2 | blue:TOP:Aatrox/aatrox:w:142@1495.2 | blue:TOP:Aatrox/aatrox:q1:sweet:485@1496.0 | blue:TOP:Aatrox/aatrox:w:pull:142@1496.7 | blue:TOP:Aatrox/auto:282@1497.0 | blue:TOP:Aatrox/aatrox:q2:sweet:606@1497.0
- 26:29 blue:BOT:Jinx lv12 <- red:JUNGLE:Viego via=viego:w zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[lane,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/viego:q:371@1589.0 | red:JUNGLE:Viego/viego:e:220@1589.0 | red:JUNGLE:Viego/viego:w:301@1589.0
- 26:45 red:BOT:Ashe lv11 <- blue:MID:Ahri via=ahri:q zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[lane,objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Ahri/auto:81@1605.0 | blue:MID:Ahri/ahri:e:337@1605.0 | blue:MID:Ahri/ahri:w:217@1605.0 | blue:MID:Ahri/ahri:w:87@1605.0 | blue:MID:Ahri/ahri:w:87@1605.0 | blue:MID:Ahri/ahri:q:319@1605.0
- 27:15 blue:SUPPORT:Thresh lv8 <- red:JUNGLE:Viego via=auto zone=bot_side ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat,objective] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/viego:q:394@1635.0 | red:JUNGLE:Viego/viego:e:234@1635.0 | red:JUNGLE:Viego/viego:w:255@1635.0 | red:JUNGLE:Viego/auto:334@1635.0 | red:JUNGLE:Viego/auto:334@1636.0
- 28:01 blue:TOP:Aatrox lv16 <- red:JUNGLE:Viego via=viego:r zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[farm,lane,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/auto:220@1680.5 | red:JUNGLE:Viego/viego:q:258@1680.5 | red:JUNGLE:Viego/viego:w:249@1680.7 | red:JUNGLE:Viego/viego:e:153@1681.0 | red:JUNGLE:Viego/viego:r:522@1681.0
- 28:06 blue:BOT:Jinx lv12 <- red:MID:Syndra via=syndra:w:sphere zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/auto:316@1681.5 | red:JUNGLE:Viego/auto:316@1682.5 | red:MID:Syndra/auto:94@1686.5 | red:MID:Syndra/syndra:q:536@1686.5 | red:MID:Syndra/syndra:w:sphere:588@1686.5

## M2 engage bot (seed 1100)
duration=1800s winner=red deaths=34
KDA:
- blue:TOP:Camille 0/4/1 lv12 gold=5255
- blue:JUNGLE:Graves 3/8/0 lv16 gold=10456
- blue:MID:Orianna 0/9/2 lv11 gold=5888
- blue:BOT:Jinx 3/2/0 lv14 gold=8096
- blue:SUPPORT:Nautilus 0/5/2 lv7 gold=5480
- red:TOP:Darius 6/0/1 lv17 gold=10158
- red:JUNGLE:LeeSin 13/0/1 lv18 gold=15947
- red:MID:Annie 4/4/5 lv12 gold=8311
- red:BOT:Ezreal 5/0/5 lv13 gold=9072
- red:SUPPORT:Lux 0/2/7 lv5 gold=6320

Deaths:
- 2:51 blue:MID:Orianna lv4 <- red:JUNGLE:LeeSin via=leesin:q2 zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[farm,retreat,fight] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:LeeSin/auto:123@171.4 | red:JUNGLE:LeeSin/leesin:q1:216@171.4 | red:JUNGLE:LeeSin/leesin:e:147@171.4 | red:JUNGLE:LeeSin/leesin:q2:261@171.7
- 4:57 red:SUPPORT:Lux lv3 <- blue:BOT:Jinx via=minion zone=bot_side ownTower=true enemyTower=false
  champDmg=88% decisions=[retreat,lane,defend] smells=[minion_execute,died_to_minions_under_own_tower,early_minion_kill,laning_action_then_environment_death,fair_champ_kill]
  note: 環境傷害（小兵）收尾過強，或對線殘血後沒有拉開／回城。
  trail: blue:BOT:Jinx/auto:78@296.7 | blue:BOT:Jinx/jinx:e:97@297.0 | blue:BOT:Jinx/jinx:w:69@297.0 | blue:BOT:Jinx/jinx:r:269@297.0 | minion/minion:3@297.4 | minion/minion:3@297.4 | minion/minion:3@297.4 | minion/minion:3@297.4
- 5:09 blue:MID:Orianna lv5 <- red:JUNGLE:LeeSin via=leesin:r zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:LeeSin/leesin:q1:209@308.2 | red:JUNGLE:LeeSin/leesin:e:149@308.2 | red:JUNGLE:LeeSin/auto:107@308.4 | red:JUNGLE:LeeSin/leesin:q2:261@308.4 | red:JUNGLE:LeeSin/leesin:r:378@309.0
- 6:00 blue:JUNGLE:Graves lv5 <- red:BOT:Ezreal via=ezreal:r zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:BOT:Ezreal/ezreal:q:138@358.0 | red:BOT:Ezreal/ezreal:e:86@358.0 | red:BOT:Ezreal/auto:70@359.7 | red:BOT:Ezreal/ezreal:w:detonate:91@359.7 | red:MID:Annie/auto:53@360.0 | red:MID:Annie/annie:q:174@360.0 | red:MID:Annie/annie:w:81@360.0 | red:BOT:Ezreal/ezreal:r:362@360.0
- 6:40 blue:TOP:Camille lv5 <- red:MID:Annie via=auto zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:BOT:Ezreal/auto:65@397.0 | red:BOT:Ezreal/auto:65@398.0 | red:MID:Annie/auto:49@399.0 | red:BOT:Ezreal/auto:65@399.0 | red:BOT:Ezreal/auto:65@400.0 | red:SUPPORT:Lux/auto:40@400.0 | red:SUPPORT:Lux/lux:q:76@400.0 | red:MID:Annie/auto:49@400.7
- 7:15 blue:SUPPORT:Nautilus lv4 <- red:TOP:Darius via=ignite zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,lane,wave_shove] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Darius/auto:98@434.4 | red:TOP:Darius/darius:q:216@434.4 | red:TOP:Darius/ignite:135@435.0
- 9:38 blue:JUNGLE:Graves lv7 <- red:JUNGLE:LeeSin via=leesin:q2 zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,retreat,fight] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:LeeSin/auto:178@578.7 | red:JUNGLE:LeeSin/leesin:q1:284@578.7 | red:JUNGLE:LeeSin/leesin:e:182@578.7 | red:JUNGLE:LeeSin/leesin:q2:415@579.0
- 9:54 blue:SUPPORT:Nautilus lv4 <- red:JUNGLE:LeeSin via=leesin:q2 zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,retreat,fight] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:LeeSin/auto:42@594.0 | red:JUNGLE:LeeSin/leesin:q1:284@594.0 | red:JUNGLE:LeeSin/leesin:q2:381@594.2
- 10:27 blue:BOT:Jinx lv6 <- red:TOP:Darius via=darius:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,lane,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Darius/darius:q:308@626.7 | red:TOP:Darius/darius:w:117@626.7 | red:TOP:Darius/auto:180@627.0 | red:TOP:Darius/darius:e:109@627.0 | red:TOP:Darius/darius:r:552@627.0
- 10:56 red:MID:Annie lv8 <- blue:JUNGLE:Graves via=graves:r zone=river ownTower=false enemyTower=false
  champDmg=99% decisions=[wave_shove,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Graves/auto:184@655.2 | minion/minion:3@655.5 | minion/minion:5@655.7 | blue:JUNGLE:Graves/graves:r:389@656.0
- 12:08 blue:JUNGLE:Graves lv8 <- red:JUNGLE:LeeSin via=leesin:q2 zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[jungle,fight] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:LeeSin/auto:197@728.0 | red:JUNGLE:LeeSin/leesin:q1:311@728.0 | red:JUNGLE:LeeSin/leesin:e:200@728.0 | red:JUNGLE:LeeSin/leesin:q2:424@728.2
- 12:47 blue:MID:Orianna lv8 <- red:JUNGLE:LeeSin via=leesin:e zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,farm] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:LeeSin/leesin:q1:397@767.0 | red:JUNGLE:LeeSin/leesin:e:215@767.0
- 13:53 blue:TOP:Camille lv7 <- red:TOP:Darius via=auto zone=bot_side ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Darius/darius:q:299@833.0 | red:TOP:Darius/darius:e:108@833.0 | red:TOP:Darius/darius:w:105@833.0 | red:TOP:Darius/darius:r:543@833.0 | red:TOP:Darius/auto:169@833.0
- 14:04 blue:MID:Orianna lv8 <- red:BOT:Ezreal via=ezreal:r zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,objective] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:BOT:Ezreal/auto:134@841.0 | red:BOT:Ezreal/ezreal:q:283@841.0 | red:BOT:Ezreal/ezreal:w:detonate:149@841.0 | red:BOT:Ezreal/auto:134@842.4 | red:BOT:Ezreal/auto:134@843.5 | red:BOT:Ezreal/ezreal:r:469@844.0
- 14:57 blue:SUPPORT:Nautilus lv5 <- red:TOP:Darius via=ignite zone=bot_side ownTower=true enemyTower=false
  champDmg=98% decisions=[retreat,lane,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Darius/auto:168@896.5 | minion/minion:3@896.5 | minion/minion:3@896.5 | red:BOT:Ezreal/auto:104@897.0 | minion/minion:6@897.0 | minion/minion:6@897.0 | minion/minion:6@897.0 | red:TOP:Darius/ignite:187@897.0
- 15:50 blue:JUNGLE:Graves lv10 <- red:JUNGLE:LeeSin via=auto zone=river ownTower=false enemyTower=false
  champDmg=97% decisions=[retreat,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:3@948.2 | minion/minion:5@948.5 | minion/minion:5@948.5 | minion/minion:10@948.5 | red:JUNGLE:LeeSin/leesin:q1:278@949.0 | red:JUNGLE:LeeSin/leesin:r:541@949.0 | red:JUNGLE:LeeSin/leesin:q2:365@950.0 | red:JUNGLE:LeeSin/auto:186@950.0
- 16:25 blue:MID:Orianna lv8 <- red:TOP:Darius via=darius:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[wave_shove] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Darius/darius:q:390@984.2 | red:TOP:Darius/darius:w:139@984.2 | red:TOP:Darius/auto:229@984.5 | red:TOP:Darius/darius:e:157@984.5 | red:TOP:Darius/darius:r:849@985.0
- 17:21 red:MID:Annie lv9 <- blue:JUNGLE:Graves via=graves:q zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,objective,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Graves/auto:263@1038.2 | blue:JUNGLE:Graves/auto:263@1040.5 | blue:JUNGLE:Graves/graves:q:407@1041.2
- 18:08 blue:JUNGLE:Graves lv11 <- red:JUNGLE:LeeSin via=auto zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:LeeSin/auto:188@1082.5 | red:JUNGLE:LeeSin/leesin:q1:280@1082.5 | red:JUNGLE:LeeSin/leesin:e:188@1082.5 | red:JUNGLE:LeeSin/leesin:q1:279@1086.2 | red:JUNGLE:LeeSin/leesin:r:543@1087.0 | red:JUNGLE:LeeSin/auto:188@1088.0
- 19:40 blue:MID:Orianna lv9 <- red:JUNGLE:LeeSin via=leesin:r zone=bot_side ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:LeeSin/leesin:q1:412@1180.0 | red:JUNGLE:LeeSin/leesin:e:269@1180.0 | red:JUNGLE:LeeSin/leesin:r:804@1180.0
- 19:41 blue:SUPPORT:Nautilus lv6 <- red:BOT:Ezreal via=ezreal:r zone=bot_side ownTower=false enemyTower=false
  champDmg=97% decisions=[objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: monster/monster:0@1176.5 | monster/monster:21@1178.0 | monster/monster:21@1179.5 | red:BOT:Ezreal/auto:130@1181.0 | red:BOT:Ezreal/ezreal:e:193@1181.0 | red:BOT:Ezreal/ezreal:w:detonate:143@1181.0 | red:BOT:Ezreal/ezreal:q:241@1181.0 | red:BOT:Ezreal/ezreal:r:552@1181.0
- 21:04 blue:MID:Orianna lv9 <- red:MID:Annie via=annie:w zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,objective] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:MID:Annie/auto:65@1263.0 | red:MID:Annie/annie:q:379@1263.0 | red:MID:Annie/annie:w:282@1264.0
- 21:55 blue:JUNGLE:Graves lv12 <- red:JUNGLE:LeeSin via=leesin:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: monster/monster:7@1309.7 | red:JUNGLE:LeeSin/auto:219@1315.0 | red:JUNGLE:LeeSin/leesin:q1:292@1315.0 | red:JUNGLE:LeeSin/leesin:e:259@1315.0 | red:JUNGLE:LeeSin/leesin:q2:387@1315.0 | red:JUNGLE:LeeSin/leesin:r:650@1315.0
- 21:58 red:MID:Annie lv10 <- blue:BOT:Jinx via=jinx:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:BOT:Jinx/auto:195@1318.0 | blue:BOT:Jinx/jinx:e:300@1318.0 | blue:BOT:Jinx/jinx:w:389@1318.0 | blue:BOT:Jinx/jinx:r:727@1318.0
- 21:59 blue:BOT:Jinx lv10 <- red:BOT:Ezreal via=ezreal:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:BOT:Ezreal/auto:175@1318.0 | red:BOT:Ezreal/ezreal:e:271@1318.0 | red:BOT:Ezreal/ezreal:w:detonate:201@1318.0 | red:BOT:Ezreal/ezreal:q:324@1318.7 | red:BOT:Ezreal/auto:175@1319.0 | red:BOT:Ezreal/ezreal:r:772@1319.0
- 22:04 blue:TOP:Camille lv8 <- red:BOT:Ezreal via=auto zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,objective] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:BOT:Ezreal/auto:150@1322.7 | red:BOT:Ezreal/ezreal:q:277@1323.0 | red:BOT:Ezreal/auto:150@1323.5 | red:BOT:Ezreal/ezreal:w:detonate:184@1323.5 | red:BOT:Ezreal/auto:150@1324.2
- 22:42 blue:MID:Orianna lv9 <- red:JUNGLE:LeeSin via=leesin:q2 zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[defend,farm,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:LeeSin/auto:293@1362.2 | red:JUNGLE:LeeSin/leesin:q1:392@1362.2 | red:JUNGLE:LeeSin/leesin:q2:562@1363.0
- 24:37 blue:TOP:Camille lv9 <- red:TOP:Darius via=auto zone=top_side ownTower=false enemyTower=false
  champDmg=98% decisions=[lane,retreat,farm] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Darius/auto:194@1476.0 | minion/minion:7@1476.5 | minion/minion:7@1476.5 | minion/minion:7@1476.7 | red:TOP:Darius/ignite:250@1477.0 | ignite_dot/ignite_dot:7@1477.0 | ignite_dot/ignite_dot:9@1477.2 | red:TOP:Darius/auto:194@1477.2
- 25:42 blue:SUPPORT:Nautilus lv7 <- red:MID:Annie via=annie:q zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:MID:Annie/auto:41@1537.0 | red:MID:Annie/annie:q:269@1537.0 | red:MID:Annie/annie:w:203@1537.0 | red:MID:Annie/annie:r:306@1537.0 | red:MID:Annie/auto:41@1538.7 | red:MID:Annie/auto:41@1542.0 | red:MID:Annie/annie:q:269@1542.0
- 26:30 red:SUPPORT:Lux lv5 <- blue:JUNGLE:Graves via=auto zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[lane,defend,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Graves/auto:321@1585.7 | blue:JUNGLE:Graves/graves:r:636@1586.0 | blue:JUNGLE:Graves/auto:320@1590.0
- 26:43 blue:MID:Orianna lv11 <- red:JUNGLE:LeeSin via=leesin:r zone=top_side ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:LeeSin/leesin:q1:333@1603.0 | red:JUNGLE:LeeSin/leesin:e:304@1603.0 | red:JUNGLE:LeeSin/leesin:r:738@1603.0
- 28:07 blue:JUNGLE:Graves lv15 <- red:MID:Annie via=annie:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[defend,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:MID:Annie/auto:44@1685.5 | red:MID:Annie/annie:q:334@1685.7 | red:MID:Annie/annie:w:290@1686.0 | red:BOT:Ezreal/ezreal:q:274@1686.0 | red:BOT:Ezreal/auto:157@1686.2 | red:BOT:Ezreal/ezreal:w:detonate:211@1686.2 | red:BOT:Ezreal/ezreal:e:370@1686.5 | red:MID:Annie/annie:r:374@1687.0
- 28:58 red:MID:Annie lv12 <- blue:BOT:Jinx via=jinx:r zone=top_side ownTower=false enemyTower=false
  champDmg=96% decisions=[siege,retreat,tower_bail] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:20@1735.5 | minion/minion:11@1735.5 | minion/minion:11@1735.5 | minion/minion:11@1736.0 | blue:BOT:Jinx/auto:225@1738.0 | blue:BOT:Jinx/jinx:e:338@1738.0 | blue:BOT:Jinx/jinx:w:582@1738.0 | blue:BOT:Jinx/jinx:r:1084@1738.0
- 29:43 blue:JUNGLE:Graves lv16 <- red:JUNGLE:LeeSin via=leesin:q1 zone=river ownTower=true enemyTower=false
  champDmg=81% decisions=[retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:8@1782.2 | minion/minion:8@1782.2 | minion/minion:8@1782.2 | minion/minion:8@1782.2 | minion/minion:8@1782.2 | minion/minion:14@1782.5 | minion/minion:4@1782.7 | red:JUNGLE:LeeSin/leesin:q1:222@1783.0

## M3 assassin mid (seed 1200)
duration=1800s winner=blue deaths=35
KDA:
- blue:TOP:Renekton 4/1/3 lv12 gold=6934
- blue:JUNGLE:Viego 18/0/1 lv18 gold=17300
- blue:MID:Zed 5/4/1 lv12 gold=7396
- blue:BOT:Ashe 2/0/0 lv12 gold=7192
- blue:SUPPORT:Thresh 0/1/2 lv10 gold=6488
- red:TOP:Jayce 2/6/1 lv11 gold=5987
- red:JUNGLE:Graves 3/9/1 lv14 gold=9656
- red:MID:Ahri 1/8/1 lv9 gold=5655
- red:BOT:Jhin 0/3/1 lv10 gold=5671
- red:SUPPORT:Leona 0/3/1 lv7 gold=5422

Deaths:
- 2:44 blue:TOP:Renekton lv2 <- red:TOP:Jayce via=auto zone=top_side ownTower=true enemyTower=false
  champDmg=98% decisions=[farm,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Jayce/jayce:e:hammer:165@163.0 | red:TOP:Jayce/jayce:w:hammer:45@163.0 | minion/minion:3@163.0 | minion/minion:3@163.0 | minion/minion:3@163.0 | minion/minion:3@163.0 | minion/minion:3@163.7 | red:TOP:Jayce/auto:102@164.0
- 2:51 red:BOT:Jhin lv3 <- blue:JUNGLE:Viego via=auto zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,lane,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Viego/viego:q:153@167.2 | blue:JUNGLE:Viego/viego:w:96@167.2 | blue:JUNGLE:Viego/viego:e:74@167.2 | blue:JUNGLE:Viego/auto:90@167.4 | blue:JUNGLE:Viego/auto:90@168.9 | blue:JUNGLE:Viego/auto:90@171.0
- 3:03 red:SUPPORT:Leona lv2 <- blue:JUNGLE:Viego via=viego:w zone=bot_side ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Viego/viego:q:122@183.0 | blue:JUNGLE:Viego/viego:e:58@183.0 | blue:JUNGLE:Viego/viego:w:84@183.0
- 3:07 red:TOP:Jayce lv4 <- blue:MID:Zed via=ignite zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[farm,retreat,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Zed/auto:93@186.2 | blue:MID:Zed/zed:q:201@186.4 | blue:MID:Zed/zed:e:119@186.7 | blue:MID:Zed/ignite:103@187.0
- 3:47 red:MID:Ahri lv4 <- blue:JUNGLE:Viego via=viego:w zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Viego/auto:96@221.4 | blue:JUNGLE:Viego/viego:q:195@226.0 | blue:JUNGLE:Viego/viego:w:99@227.0
- 5:47 blue:SUPPORT:Thresh lv5 <- red:MID:Ahri via=tower zone=bot_side ownTower=false enemyTower=true
  champDmg=0% decisions=[retreat] smells=[minion_execute,tower_dive_or_bail_fail,died_under_enemy_tower_low_champ_damage]
  note: 塔傷參與過高：越塔／撤離判斷或塔仇恨處理可能有問題。
  trail: minion/minion:3@346.0 | minion/minion:3@346.0 | minion/minion:3@346.0 | minion/minion:3@347.0 | minion/minion:3@347.0 | minion/minion:3@347.0 | tower/tower:114@347.7
- 7:06 red:JUNGLE:Graves lv6 <- blue:JUNGLE:Viego via=viego:q zone=mid_side ownTower=true enemyTower=false
  champDmg=97% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: monster/monster:1@421.2 | monster/monster:4@421.4 | monster/monster:1@421.6 | blue:JUNGLE:Viego/viego:q:215@426.0
- 7:50 red:MID:Ahri lv5 <- blue:MID:Zed via=zed:r zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[lane,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Zed/zed:q:365@470.0 | blue:MID:Zed/zed:r:461@470.0
- 7:58 blue:MID:Zed lv7 <- red:TOP:Jayce via=jayce:q:hammer zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[fight,tower_bail,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Graves/graves:q:249@472.2 | red:TOP:Jayce/jayce:q:hammer:353@478.0
- 8:21 red:JUNGLE:Graves lv7 <- blue:JUNGLE:Viego via=viego:e zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Viego/viego:q:215@501.0 | blue:JUNGLE:Viego/viego:e:75@501.0
- 9:45 red:MID:Ahri lv6 <- blue:JUNGLE:Viego via=viego:e zone=river ownTower=true enemyTower=false
  champDmg=87% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:5@584.2 | minion/minion:5@584.2 | minion/minion:5@584.2 | minion/minion:5@584.5 | minion/minion:3@585.0 | minion/minion:5@585.0 | blue:JUNGLE:Viego/viego:q:316@585.0 | blue:JUNGLE:Viego/viego:e:123@585.0
- 11:17 blue:MID:Zed lv8 <- red:JUNGLE:Graves via=graves:r zone=river ownTower=false enemyTower=false
  champDmg=98% decisions=[farm,retreat,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Graves/auto:187@676.0 | red:JUNGLE:Graves/graves:q:305@676.0 | minion/minion:5@676.2 | minion/minion:5@676.2 | minion/minion:5@676.2 | red:JUNGLE:Graves/graves:r:369@677.0
- 11:49 red:JUNGLE:Graves lv9 <- blue:JUNGLE:Viego via=auto zone=bot_side ownTower=false enemyTower=false
  champDmg=99% decisions=[objective,fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: monster/monster:7@704.7 | monster/monster:7@706.2 | blue:JUNGLE:Viego/viego:q:293@708.2 | blue:JUNGLE:Viego/auto:196@708.5 | blue:JUNGLE:Viego/viego:w:164@708.7 | blue:JUNGLE:Viego/viego:e:139@709.0 | blue:JUNGLE:Viego/viego:r:411@709.0 | blue:JUNGLE:Viego/auto:196@709.5
- 12:14 red:MID:Ahri lv7 <- blue:JUNGLE:Viego via=auto zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Viego/auto:255@731.5 | blue:JUNGLE:Viego/viego:q:377@732.0 | blue:JUNGLE:Viego/viego:w:179@732.0 | blue:JUNGLE:Viego/auto:255@732.5 | blue:JUNGLE:Viego/auto:255@734.0
- 12:30 red:TOP:Jayce lv8 <- blue:MID:Zed via=zed:q zone=mid_side ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:TOP:Renekton/renekton:e:161@749.0 | blue:TOP:Renekton/renekton:w:115@749.0 | blue:TOP:Renekton/renekton:r:107@749.0 | blue:TOP:Renekton/auto:120@749.0 | blue:MID:Zed/zed:q:333@750.0
- 12:55 red:MID:Ahri lv7 <- blue:JUNGLE:Viego via=auto zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Viego/viego:w:181@774.5 | blue:JUNGLE:Viego/viego:e:181@774.5 | blue:JUNGLE:Viego/auto:258@774.7 | blue:JUNGLE:Viego/viego:q:382@774.7 | blue:JUNGLE:Viego/auto:258@775.7
- 13:11 red:JUNGLE:Graves lv9 <- blue:JUNGLE:Viego via=viego:w zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[objective,fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Viego/auto:193@785.2 | blue:JUNGLE:Viego/viego:q:286@785.2 | blue:JUNGLE:Viego/viego:e:136@785.5 | blue:JUNGLE:Viego/auto:179@786.2 | blue:JUNGLE:Viego/auto:179@787.2 | blue:JUNGLE:Viego/viego:q:287@791.0 | blue:JUNGLE:Viego/viego:w:170@791.0
- 15:38 red:MID:Ahri lv7 <- blue:MID:Zed via=ignite zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Zed/ignite:193@938.0
- 15:55 red:JUNGLE:Graves lv10 <- blue:JUNGLE:Viego via=viego:e zone=top_side ownTower=false enemyTower=false
  champDmg=99% decisions=[objective,retreat,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: monster/monster:6@950.5 | blue:JUNGLE:Viego/auto:243@954.5 | blue:JUNGLE:Viego/viego:q:312@954.5 | blue:JUNGLE:Viego/viego:w:197@954.5 | blue:JUNGLE:Viego/viego:e:187@955.0
- 16:07 red:TOP:Jayce lv9 <- blue:JUNGLE:Viego via=viego:w zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Viego/auto:289@965.2 | blue:JUNGLE:Viego/viego:e:220@965.2 | blue:JUNGLE:Viego/auto:289@967.0 | blue:JUNGLE:Viego/viego:q:367@967.0 | blue:JUNGLE:Viego/viego:w:238@967.0
- 16:28 red:BOT:Jhin lv5 <- blue:TOP:Renekton via=ignite zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:TOP:Renekton/renekton:q:250@983.2 | blue:TOP:Renekton/renekton:w:122@983.2 | blue:TOP:Renekton/auto:128@987.2 | blue:TOP:Renekton/ignite:160@988.0
- 17:56 red:JUNGLE:Graves lv10 <- blue:JUNGLE:Viego via=viego:w zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Viego/viego:q:319@1076.0 | blue:JUNGLE:Viego/viego:e:190@1076.0 | blue:JUNGLE:Viego/viego:w:243@1076.0
- 18:13 red:TOP:Jayce lv10 <- blue:MID:Zed via=zed:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[lane,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Zed/auto:156@1093.0 | blue:MID:Zed/zed:q:334@1093.0 | blue:MID:Zed/zed:e:194@1093.0 | blue:MID:Zed/zed:r:514@1093.0
- 18:48 red:BOT:Jhin lv7 <- blue:BOT:Ashe via=ashe:r zone=bot_side ownTower=false enemyTower=false
  champDmg=88% decisions=[objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: monster/monster:30@1122.5 | monster/monster:30@1124.0 | monster/monster:30@1125.5 | blue:BOT:Ashe/auto:104@1128.0 | blue:BOT:Ashe/ashe:w:185@1128.0 | blue:BOT:Ashe/ashe:r:349@1128.0
- 19:16 blue:MID:Zed lv11 <- red:JUNGLE:Graves via=graves:q zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Graves/auto:195@1151.0 | red:JUNGLE:Graves/graves:r:455@1152.0 | red:JUNGLE:Graves/graves:q:316@1156.7
- 20:06 red:JUNGLE:Graves lv11 <- blue:JUNGLE:Viego via=viego:w zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[jungle,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Viego/viego:q:338@1206.0 | blue:JUNGLE:Viego/viego:e:200@1206.0 | blue:JUNGLE:Viego/viego:w:301@1206.0
- 20:19 red:MID:Ahri lv9 <- blue:TOP:Renekton via=renekton:q zone=river ownTower=false enemyTower=false
  champDmg=82% decisions=[wave_shove,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:11@1219.0 | minion/minion:11@1219.0 | ignite_dot/ignite_dot:6@1219.2 | minion/minion:11@1219.2 | minion/minion:11@1219.2 | minion/minion:11@1219.2 | ignite_dot/ignite_dot:6@1219.5 | blue:TOP:Renekton/renekton:q:253@1219.5
- 21:13 red:TOP:Jayce lv11 <- blue:BOT:Ashe via=auto zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:BOT:Ashe/auto:98@1271.0 | blue:BOT:Ashe/ashe:w:169@1271.0 | blue:BOT:Ashe/ashe:r:582@1271.0 | blue:BOT:Ashe/auto:98@1271.7 | blue:BOT:Ashe/auto:98@1272.5 | blue:BOT:Ashe/auto:98@1273.0
- 21:29 red:SUPPORT:Leona lv7 <- blue:JUNGLE:Viego via=auto zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[lane,defend,retreat,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Viego/viego:q:326@1289.0 | blue:JUNGLE:Viego/viego:e:193@1289.0 | blue:JUNGLE:Viego/viego:w:280@1289.0 | blue:JUNGLE:Viego/auto:279@1289.0
- 23:15 blue:MID:Zed lv11 <- red:JUNGLE:Graves via=graves:q zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Graves/graves:q:333@1395.0
- 23:18 red:MID:Ahri lv9 <- blue:TOP:Renekton via=renekton:e zone=red_base ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:TOP:Renekton/renekton:e:181@1398.0
- 23:56 red:TOP:Jayce lv11 <- blue:TOP:Renekton via=ignite zone=top_side ownTower=true enemyTower=false
  champDmg=98% decisions=[wave_shove,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:14@1430.5 | blue:TOP:Renekton/renekton:e:171@1435.0 | blue:TOP:Renekton/renekton:w:114@1435.0 | blue:TOP:Renekton/auto:141@1435.0 | blue:TOP:Renekton/ignite:143@1436.0
- 26:10 red:JUNGLE:Graves lv13 <- blue:JUNGLE:Viego via=auto zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,jungle,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Viego/auto:289@1570.0 | blue:JUNGLE:Viego/viego:w:378@1570.0 | blue:JUNGLE:Viego/viego:q:314@1570.2 | minion/minion:4@1570.7 | blue:JUNGLE:Viego/auto:289@1571.0
- 27:23 red:SUPPORT:Leona lv7 <- blue:JUNGLE:Viego via=auto zone=river ownTower=true enemyTower=false
  champDmg=99% decisions=[lane,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Viego/auto:261@1641.7 | blue:JUNGLE:Viego/viego:q:284@1641.7 | minion/minion:7@1641.7 | minion/minion:7@1641.7 | blue:JUNGLE:Viego/viego:e:166@1642.0 | blue:JUNGLE:Viego/viego:w:305@1643.0 | blue:JUNGLE:Viego/auto:261@1643.0
- 29:08 red:JUNGLE:Graves lv14 <- blue:JUNGLE:Viego via=minion zone=river ownTower=false enemyTower=false
  champDmg=98% decisions=[farm,lane,fight,retreat] smells=[minion_execute,laning_action_then_environment_death,fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:Viego/viego:q:336@1747.7 | blue:JUNGLE:Viego/viego:w:378@1747.7 | minion/minion:4@1747.7 | blue:JUNGLE:Viego/viego:r:640@1748.0 | minion/minion:15@1748.2 | minion/minion:8@1748.2 | minion/minion:8@1748.2 | minion/minion:8@1748.2

## M4 poke (seed 42)
duration=1800s winner=blue deaths=43
KDA:
- blue:TOP:Jayce 0/8/3 lv11 gold=5523
- blue:JUNGLE:LeeSin 5/10/2 lv16 gold=10974
- blue:MID:Syndra 4/4/4 lv14 gold=8555
- blue:BOT:Ezreal 5/1/1 lv15 gold=9007
- blue:SUPPORT:Lux 0/5/4 lv5 gold=6064
- red:TOP:Aatrox 9/1/1 lv17 gold=9435
- red:JUNGLE:Viego 17/2/1 lv18 gold=16614
- red:MID:Orianna 0/4/5 lv12 gold=6347
- red:BOT:Jinx 2/5/4 lv11 gold=7094
- red:SUPPORT:Nautilus 0/3/6 lv9 gold=6077

Deaths:
- 2:39 blue:TOP:Jayce lv2 <- red:TOP:Aatrox via=aatrox:q3 zone=top_side ownTower=true enemyTower=false
  champDmg=94% decisions=[retreat,farm] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:3@159.9 | minion/minion:3@159.9 | minion/minion:3@159.9 | minion/minion:5@159.9 | minion/minion:3@159.9 | minion/minion:3@159.9 | minion/minion:3@159.9 | red:TOP:Aatrox/aatrox:q3:141@160.0
- 3:25 blue:JUNGLE:LeeSin lv4 <- red:JUNGLE:Viego via=auto zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/viego:q:130@205.0 | red:JUNGLE:Viego/viego:e:63@205.0 | red:JUNGLE:Viego/viego:w:88@205.0 | red:JUNGLE:Viego/auto:76@205.0
- 4:09 red:MID:Orianna lv5 <- blue:JUNGLE:LeeSin via=leesin:e zone=river ownTower=true enemyTower=false
  champDmg=87% decisions=[fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:5@243.9 | minion/minion:1@244.9 | minion/minion:1@244.9 | minion/minion:5@244.9 | minion/minion:1@245.9 | minion/minion:1@245.9 | minion/minion:5@245.9 | blue:JUNGLE:LeeSin/leesin:e:165@249.0
- 4:18 red:SUPPORT:Nautilus lv3 <- blue:BOT:Ezreal via=ezreal:r zone=bot_side ownTower=false enemyTower=false
  champDmg=99% decisions=[lane,farm,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:3@255.7 | minion/minion:3@257.7 | blue:BOT:Ezreal/auto:63@258.0 | blue:BOT:Ezreal/ezreal:e:73@258.0 | blue:BOT:Ezreal/ezreal:w:detonate:77@258.0 | blue:BOT:Ezreal/ezreal:q:127@258.0 | blue:BOT:Ezreal/ezreal:r:306@258.0
- 5:22 blue:TOP:Jayce lv4 <- red:TOP:Aatrox via=aatrox:q3:sweet zone=top_side ownTower=true enemyTower=false
  champDmg=97% decisions=[wave_shove,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:1@321.9 | minion/minion:1@321.9 | minion/minion:1@321.9 | minion/minion:5@321.9 | minion/minion:3@321.9 | minion/minion:3@321.9 | minion/minion:3@321.9 | red:TOP:Aatrox/aatrox:q3:sweet:412@322.0
- 5:51 blue:MID:Syndra lv6 <- red:JUNGLE:Viego via=viego:r zone=bot_side ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat,objective] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/viego:q:199@351.0 | red:JUNGLE:Viego/viego:e:80@351.0 | red:JUNGLE:Viego/viego:w:112@351.0 | red:JUNGLE:Viego/viego:r:410@351.0
- 6:15 blue:SUPPORT:Lux lv2 <- red:JUNGLE:Viego via=auto zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/viego:q:230@372.0 | red:JUNGLE:Viego/viego:e:92@372.0 | red:JUNGLE:Viego/viego:w:117@372.0 | red:JUNGLE:Viego/auto:133@372.0 | red:JUNGLE:Viego/auto:133@375.0
- 6:39 red:BOT:Jinx lv5 <- blue:JUNGLE:LeeSin via=leesin:r zone=bot_side ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:LeeSin/leesin:q1:266@399.0 | blue:JUNGLE:LeeSin/leesin:e:163@399.0 | blue:JUNGLE:LeeSin/leesin:r:487@399.0
- 7:07 red:MID:Orianna lv5 <- blue:MID:Syndra via=syndra:r zone=river ownTower=false enemyTower=false
  champDmg=95% decisions=[farm,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:2@426.7 | minion/minion:2@426.7 | minion/minion:2@426.7 | minion/minion:3@426.9 | minion/minion:3@426.9 | minion/minion:3@426.9 | minion/minion:3@426.9 | blue:MID:Syndra/syndra:r:512@427.0
- 7:08 blue:JUNGLE:LeeSin lv7 <- red:JUNGLE:Viego via=viego:q zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/auto:94@428.0 | red:JUNGLE:Viego/viego:q:186@428.0
- 7:35 blue:MID:Syndra lv7 <- red:JUNGLE:Viego via=auto zone=river ownTower=false enemyTower=false
  champDmg=97% decisions=[farm,fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/viego:w:119@454.0 | red:JUNGLE:Viego/viego:r:361@454.0 | minion/minion:1@454.2 | minion/minion:1@454.2 | minion/minion:3@454.4 | minion/minion:3@454.4 | minion/minion:3@454.4 | red:JUNGLE:Viego/auto:124@455.4
- 8:28 blue:TOP:Jayce lv5 <- red:TOP:Aatrox via=aatrox:w:pull zone=top_side ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Aatrox/aatrox:w:100@507.0 | red:TOP:Aatrox/aatrox:q1:sweet:346@507.0 | red:TOP:Aatrox/aatrox:q2:sweet:433@508.0 | red:TOP:Aatrox/aatrox:w:pull:100@508.5
- 8:47 red:MID:Orianna lv7 <- blue:MID:Syndra via=syndra:q zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Syndra/auto:74@521.0 | blue:MID:Syndra/syndra:q:326@521.0 | blue:MID:Syndra/auto:74@524.5 | blue:MID:Syndra/syndra:q:327@527.0
- 8:51 blue:SUPPORT:Lux lv3 <- red:BOT:Jinx via=jinx:r zone=river ownTower=false enemyTower=false
  champDmg=99% decisions=[lane,objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:3@526.0 | minion/minion:3@530.2 | minion/minion:3@530.2 | minion/minion:3@530.2 | red:BOT:Jinx/auto:92@531.0 | red:BOT:Jinx/jinx:e:175@531.0 | red:BOT:Jinx/jinx:w:126@531.0 | red:BOT:Jinx/jinx:r:486@531.0
- 9:00 red:BOT:Jinx lv7 <- blue:JUNGLE:LeeSin via=leesin:q2 zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:LeeSin/leesin:q1:322@538.7 | blue:JUNGLE:LeeSin/leesin:r:544@539.0 | blue:JUNGLE:LeeSin/auto:199@539.0 | blue:JUNGLE:LeeSin/leesin:q2:445@540.2
- 9:32 blue:JUNGLE:LeeSin lv8 <- red:JUNGLE:Viego via=viego:q zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/auto:135@570.0 | red:JUNGLE:Viego/viego:q:240@570.0 | red:JUNGLE:Viego/viego:r:308@570.0 | red:JUNGLE:Viego/auto:135@571.0 | red:JUNGLE:Viego/viego:w:129@571.2 | red:JUNGLE:Viego/auto:135@572.0 | red:JUNGLE:Viego/viego:q:241@572.7
- 9:40 red:MID:Orianna lv7 <- blue:BOT:Ezreal via=ezreal:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:BOT:Ezreal/auto:102@578.0 | blue:BOT:Ezreal/ezreal:e:155@578.0 | blue:BOT:Ezreal/ezreal:w:detonate:117@578.0 | blue:BOT:Ezreal/auto:102@579.0 | blue:BOT:Ezreal/ezreal:q:239@579.5 | blue:BOT:Ezreal/auto:102@580.0 | blue:BOT:Ezreal/ezreal:r:408@580.0
- 10:24 blue:SUPPORT:Lux lv3 <- red:BOT:Jinx via=jinx:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,objective] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:BOT:Jinx/auto:97@624.0 | red:BOT:Jinx/jinx:e:184@624.0 | red:BOT:Jinx/jinx:w:132@624.0 | red:BOT:Jinx/jinx:r:486@624.0
- 11:36 red:BOT:Jinx lv8 <- blue:MID:Syndra via=syndra:r zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[wave_shove,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Syndra/auto:73@694.0 | blue:MID:Syndra/syndra:q:339@694.0 | blue:MID:Syndra/syndra:w:sphere:250@694.0 | blue:MID:Syndra/syndra:e:134@694.0 | blue:MID:Syndra/auto:73@695.7 | blue:MID:Syndra/syndra:r:486@696.0
- 12:02 red:JUNGLE:Viego lv11 <- blue:JUNGLE:LeeSin via=leesin:q2 zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[fight,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Syndra/syndra:w:sphere:217@718.0 | blue:MID:Syndra/syndra:e:116@718.0 | blue:MID:Syndra/auto:53@719.7 | blue:MID:Syndra/auto:53@721.5 | blue:JUNGLE:LeeSin/auto:144@721.7 | blue:JUNGLE:LeeSin/leesin:q1:248@721.7 | blue:JUNGLE:LeeSin/leesin:e:162@721.7 | blue:JUNGLE:LeeSin/leesin:q2:353@722.0
- 13:17 blue:JUNGLE:LeeSin lv10 <- red:JUNGLE:Viego via=viego:r zone=river ownTower=false enemyTower=true
  champDmg=87% decisions=[jungle,retreat,fight] smells=[tower_dive_or_bail_fail,fair_champ_kill]
  note: 塔傷參與過高：越塔／撤離判斷或塔仇恨處理可能有問題。
  trail: tower/tower:86@791.2 | tower/tower:86@792.5 | red:JUNGLE:Viego/auto:174@796.5 | red:JUNGLE:Viego/viego:q:257@796.7 | red:JUNGLE:Viego/viego:w:158@796.7 | red:JUNGLE:Viego/viego:e:122@797.0 | red:JUNGLE:Viego/viego:r:449@797.0
- 14:31 blue:MID:Syndra lv10 <- red:JUNGLE:Viego via=viego:w zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,farm,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/auto:249@871.5 | red:JUNGLE:Viego/viego:q:352@871.5 | red:JUNGLE:Viego/viego:w:188@872.0
- 14:33 blue:TOP:Jayce lv8 <- red:TOP:Aatrox via=aatrox:q2:sweet zone=top_side ownTower=true enemyTower=false
  champDmg=97% decisions=[retreat,farm] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Aatrox/aatrox:q1:sweet:426@872.0 | minion/minion:13@872.7 | minion/minion:7@872.7 | minion/minion:7@872.7 | minion/minion:7@872.7 | red:TOP:Aatrox/aatrox:q2:sweet:533@873.0
- 15:33 blue:TOP:Jayce lv8 <- red:TOP:Aatrox via=aatrox:q3:sweet zone=top_side ownTower=true enemyTower=false
  champDmg=98% decisions=[farm,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Aatrox/aatrox:q2:sweet:541@932.0 | minion/minion:7@932.7 | minion/minion:7@932.7 | minion/minion:7@932.7 | red:TOP:Aatrox/aatrox:q3:sweet:676@933.1
- 15:50 red:JUNGLE:Viego lv12 <- blue:MID:Syndra via=syndra:r zone=river ownTower=false enemyTower=false
  champDmg=94% decisions=[defend,retreat,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Syndra/auto:58@949.5 | minion/minion:5@949.5 | minion/minion:5@949.7 | minion/minion:5@949.7 | minion/minion:5@950.0 | minion/minion:10@950.0 | minion/minion:5@950.0 | blue:MID:Syndra/syndra:r:472@950.0
- 16:11 red:SUPPORT:Nautilus lv7 <- blue:BOT:Ezreal via=ezreal:r zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[lane,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:BOT:Ezreal/auto:107@971.0 | blue:BOT:Ezreal/ezreal:e:251@971.0 | blue:BOT:Ezreal/ezreal:w:detonate:137@971.0 | blue:BOT:Ezreal/ezreal:r:588@971.0
- 17:26 blue:TOP:Jayce lv8 <- red:TOP:Aatrox via=aatrox:w zone=top_side ownTower=false enemyTower=false
  champDmg=93% decisions=[objective,retreat,lane] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: monster/monster:30@1041.5 | monster/monster:30@1043.2 | red:TOP:Aatrox/auto:262@1046.5 | red:TOP:Aatrox/aatrox:p:106@1046.5 | red:TOP:Aatrox/aatrox:q1:276@1046.5 | red:TOP:Aatrox/aatrox:w:121@1046.5
- 17:50 blue:BOT:Ezreal lv12 <- red:TOP:Aatrox via=auto zone=bot_side ownTower=false enemyTower=false
  champDmg=98% decisions=[objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: monster/monster:27@1066.2 | red:TOP:Aatrox/auto:261@1068.2 | red:TOP:Aatrox/aatrox:p:177@1068.2 | red:TOP:Aatrox/aatrox:q1:272@1068.2 | red:TOP:Aatrox/aatrox:w:120@1068.5 | red:MID:Orianna/orianna:q:338@1069.0 | red:TOP:Aatrox/auto:261@1070.5
- 18:12 red:TOP:Aatrox lv13 <- blue:JUNGLE:LeeSin via=leesin:q2 zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[wave_shove,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:LeeSin/leesin:q1:231@1092.0 | blue:JUNGLE:LeeSin/leesin:r:449@1092.0 | blue:JUNGLE:LeeSin/leesin:q2:339@1092.5
- 18:14 blue:JUNGLE:LeeSin lv13 <- red:JUNGLE:Viego via=tower zone=river ownTower=false enemyTower=true
  champDmg=81% decisions=[defend,fight,tower_bail] smells=[tower_dive_or_bail_fail,fight_into_tower,fair_champ_kill]
  note: 塔傷參與過高：越塔／撤離判斷或塔仇恨處理可能有問題。
  trail: red:JUNGLE:Viego/viego:w:161@1092.5 | minion/minion:5@1092.7 | red:JUNGLE:Viego/viego:e:149@1093.0 | red:JUNGLE:Viego/viego:r:416@1093.0 | red:JUNGLE:Viego/auto:179@1093.5 | tower/tower:86@1093.5 | minion/minion:5@1093.7 | tower/tower:86@1094.7
- 20:08 blue:JUNGLE:LeeSin lv14 <- red:JUNGLE:Viego via=viego:q zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[lane,siege,retreat,objective] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:BOT:Jinx/auto:121@1207.0 | red:BOT:Jinx/jinx:e:190@1207.0 | red:BOT:Jinx/jinx:w:246@1207.0 | red:BOT:Jinx/jinx:r:449@1207.0 | red:BOT:Jinx/auto:121@1208.0 | red:JUNGLE:Viego/auto:201@1208.5 | red:JUNGLE:Viego/viego:q:262@1208.5
- 20:22 red:BOT:Jinx lv10 <- blue:BOT:Ezreal via=ezreal:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:BOT:Ezreal/auto:172@1220.0 | blue:BOT:Ezreal/ezreal:q:318@1220.0 | blue:BOT:Ezreal/auto:172@1221.0 | blue:BOT:Ezreal/ezreal:w:detonate:199@1221.0 | blue:BOT:Ezreal/auto:172@1221.7 | blue:BOT:Ezreal/ezreal:r:747@1222.0
- 20:23 blue:SUPPORT:Lux lv4 <- red:TOP:Aatrox via=aatrox:q2:sweet zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Aatrox/aatrox:w:178@1222.0 | red:TOP:Aatrox/aatrox:q1:sweet:649@1222.0 | red:TOP:Aatrox/aatrox:q2:sweet:812@1223.1
- 20:24 blue:TOP:Jayce lv9 <- red:TOP:Aatrox via=auto zone=river ownTower=false enemyTower=false
  champDmg=84% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: ignite_dot/ignite_dot:1@1223.0 | ignite_dot/ignite_dot:2@1223.0 | ignite_dot/ignite_dot:2@1223.1 | ignite_dot/ignite_dot:6@1223.2 | ignite_dot/ignite_dot:1@1223.5 | ignite_dot/ignite_dot:4@1223.5 | ignite_dot/ignite_dot:5@1223.7 | red:TOP:Aatrox/auto:292@1224.0
- 21:23 blue:JUNGLE:LeeSin lv14 <- red:JUNGLE:Viego via=viego:w zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/auto:203@1277.0 | red:JUNGLE:Viego/viego:q:262@1282.0 | red:JUNGLE:Viego/viego:e:157@1282.0 | red:JUNGLE:Viego/auto:203@1283.0 | red:JUNGLE:Viego/viego:w:245@1283.0
- 21:39 blue:SUPPORT:Lux lv4 <- red:JUNGLE:Viego via=viego:e zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,objective] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/auto:357@1299.2 | red:JUNGLE:Viego/viego:q:460@1299.2 | red:JUNGLE:Viego/viego:e:276@1299.2
- 22:16 red:SUPPORT:Nautilus lv8 <- blue:BOT:Ezreal via=ezreal:q zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[lane,objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:BOT:Ezreal/auto:120@1336.0 | blue:BOT:Ezreal/ezreal:e:280@1336.0 | blue:BOT:Ezreal/ezreal:w:detonate:147@1336.0 | blue:BOT:Ezreal/ezreal:q:222@1336.0
- 23:42 blue:JUNGLE:LeeSin lv15 <- red:JUNGLE:Viego via=viego:w zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/auto:234@1416.0 | minion/minion:3@1416.2 | red:JUNGLE:Viego/viego:q:262@1421.0 | red:JUNGLE:Viego/viego:e:155@1421.0 | red:JUNGLE:Viego/viego:w:267@1422.0
- 24:08 blue:TOP:Jayce lv10 <- red:JUNGLE:Viego via=viego:e zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[lane,objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/auto:347@1448.7 | red:JUNGLE:Viego/viego:q:395@1448.7 | red:JUNGLE:Viego/viego:e:233@1448.7
- 25:12 red:BOT:Jinx lv11 <- minion via=minion zone=top_side ownTower=false enemyTower=false
  champDmg=0% decisions=[retreat] smells=[minion_execute]
  note: 小兵補刀式擊殺：殘血被兵收，需看是否過深或不敢撤。
  trail: minion/minion:8@1510.0 | minion/minion:28@1510.0 | minion/minion:8@1511.7 | minion/minion:8@1511.7 | minion/minion:28@1511.7 | minion/minion:8@1513.0 | minion/minion:8@1513.0 | minion/minion:28@1513.0
- 25:28 blue:JUNGLE:LeeSin lv15 <- red:JUNGLE:Viego via=viego:r zone=river ownTower=true enemyTower=false
  champDmg=99% decisions=[farm,lane,retreat,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:6@1522.2 | minion/minion:6@1523.2 | red:JUNGLE:Viego/auto:219@1525.2 | red:JUNGLE:Viego/viego:e:146@1525.2 | red:JUNGLE:Viego/viego:q:248@1525.5 | red:JUNGLE:Viego/viego:q:248@1528.0 | red:JUNGLE:Viego/viego:w:333@1528.0 | red:JUNGLE:Viego/viego:r:494@1528.0
- 27:14 blue:MID:Syndra lv14 <- red:JUNGLE:Viego via=viego:w zone=river ownTower=true enemyTower=false
  champDmg=92% decisions=[lane,farm,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:9@1631.7 | minion/minion:9@1632.7 | minion/minion:9@1632.7 | minion/minion:9@1633.7 | minion/minion:9@1633.7 | red:JUNGLE:Viego/viego:q:392@1634.0 | red:JUNGLE:Viego/viego:e:229@1634.0 | red:JUNGLE:Viego/viego:w:403@1634.0
- 29:00 blue:JUNGLE:LeeSin lv16 <- red:JUNGLE:Viego via=auto zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[lane,fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:JUNGLE:Viego/viego:e:148@1736.0 | red:JUNGLE:Viego/auto:237@1736.5 | red:JUNGLE:Viego/viego:w:340@1736.7 | red:JUNGLE:Viego/viego:r:469@1737.0 | red:JUNGLE:Viego/auto:237@1737.5 | red:JUNGLE:Viego/viego:q:253@1738.0 | red:JUNGLE:Viego/auto:237@1738.5 | red:JUNGLE:Viego/auto:237@1740.0

## M5 skirmish (seed 77)
duration=1800s winner=blue deaths=29
KDA:
- blue:TOP:Darius 5/4/1 lv12 gold=7390
- blue:JUNGLE:LeeSin 10/0/0 lv18 gold=14412
- blue:MID:Annie 2/2/5 lv12 gold=7505
- blue:BOT:Jhin 3/0/4 lv12 gold=8087
- blue:SUPPORT:Thresh 2/1/7 lv10 gold=7520
- red:TOP:Camille 6/3/0 lv16 gold=8291
- red:JUNGLE:Graves 0/6/0 lv17 gold=10828
- red:MID:Ahri 0/7/2 lv9 gold=5604
- red:BOT:Ashe 0/4/1 lv9 gold=5901
- red:SUPPORT:Leona 0/2/0 lv11 gold=5426

Deaths:
- 3:38 red:MID:Ahri lv4 <- blue:JUNGLE:LeeSin via=leesin:q2 zone=river ownTower=false enemyTower=false
  champDmg=100% decisions=[farm,retreat,fight] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:LeeSin/leesin:q1:252@218.4 | blue:JUNGLE:LeeSin/leesin:e:144@218.4 | blue:JUNGLE:LeeSin/leesin:q2:371@218.7
- 3:46 blue:TOP:Darius lv5 <- red:TOP:Camille via=camille:q2 zone=top_side ownTower=true enemyTower=false
  champDmg=100% decisions=[wave_shove,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Camille/camille:q1:79@226.0 | red:TOP:Camille/camille:e:110@226.0 | red:TOP:Camille/camille:w:91@226.0 | red:TOP:Camille/auto:88@226.0 | red:TOP:Camille/camille:q2:127@226.9
- 3:55 red:JUNGLE:Graves lv4 <- blue:JUNGLE:LeeSin via=tower zone=river ownTower=false enemyTower=true
  champDmg=86% decisions=[jungle,fight,retreat,tower_bail] smells=[tower_dive_or_bail_fail,fight_into_tower,fair_champ_kill]
  note: 塔傷參與過高：越塔／撤離判斷或塔仇恨處理可能有問題。
  trail: monster/monster:1@230.2 | monster/monster:4@230.4 | blue:JUNGLE:LeeSin/auto:104@231.4 | blue:JUNGLE:LeeSin/leesin:q1:207@231.4 | blue:JUNGLE:LeeSin/leesin:q2:256@232.0 | blue:JUNGLE:LeeSin/leesin:e:140@232.0 | minion/minion:3@235.2 | tower/tower:104@235.2
- 7:18 red:JUNGLE:Graves lv6 <- blue:JUNGLE:LeeSin via=leesin:q2 zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[jungle,fight,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:1@434.9 | minion/minion:1@435.9 | blue:JUNGLE:LeeSin/auto:160@436.7 | blue:JUNGLE:LeeSin/leesin:q1:262@436.7 | minion/minion:1@436.9 | blue:JUNGLE:LeeSin/leesin:r:441@437.0 | minion/minion:1@438.0 | blue:JUNGLE:LeeSin/leesin:q2:405@438.2
- 9:01 red:MID:Ahri lv6 <- blue:MID:Annie via=auto zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Annie/auto:69@536.5 | blue:MID:Annie/auto:69@538.2 | blue:MID:Annie/auto:69@540.0 | blue:SUPPORT:Thresh/auto:28@541.0 | blue:MID:Annie/auto:69@541.7
- 9:04 red:SUPPORT:Leona lv7 <- blue:JUNGLE:LeeSin via=leesin:e zone=red_base ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:LeeSin/leesin:q1:257@544.0 | blue:JUNGLE:LeeSin/leesin:e:161@544.0
- 9:16 red:BOT:Ashe lv4 <- blue:SUPPORT:Thresh via=thresh:q zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:MID:Annie/auto:70@550.5 | blue:MID:Annie/auto:70@552.2 | blue:MID:Annie/auto:70@554.0 | blue:SUPPORT:Thresh/auto:28@554.0 | blue:SUPPORT:Thresh/thresh:e:55@555.2 | blue:MID:Annie/auto:70@555.7 | blue:SUPPORT:Thresh/auto:28@556.0 | blue:SUPPORT:Thresh/thresh:q:96@556.5
- 9:51 red:MID:Ahri lv6 <- blue:TOP:Darius via=darius:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:SUPPORT:Thresh/auto:28@587.2 | blue:SUPPORT:Thresh/auto:28@589.0 | blue:TOP:Darius/auto:147@590.5 | blue:SUPPORT:Thresh/auto:28@590.7 | blue:TOP:Darius/darius:q:292@591.0 | blue:TOP:Darius/darius:w:105@591.0 | blue:TOP:Darius/darius:r:499@591.0
- 9:53 red:JUNGLE:Graves lv8 <- blue:JUNGLE:LeeSin via=leesin:q2 zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:JUNGLE:LeeSin/leesin:q1:276@593.0 | blue:JUNGLE:LeeSin/leesin:q2:413@593.5
- 9:57 blue:MID:Annie lv8 <- red:TOP:Camille via=ignite zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[wave_shove,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Camille/auto:131@595.5 | red:TOP:Camille/camille:q1:144@595.5 | red:TOP:Camille/camille:w:124@595.7 | red:TOP:Camille/camille:e:186@596.0 | red:TOP:Camille/camille:r:90@596.0 | red:TOP:Camille/camille:q2:238@596.2 | minion/minion:3@596.5 | red:TOP:Camille/ignite:191@597.0
- 10:19 red:TOP:Camille lv10 <- blue:JUNGLE:LeeSin via=leesin:q2 zone=top_side ownTower=false enemyTower=false
  champDmg=95% decisions=[farm,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:4@615.4 | minion/minion:4@615.4 | minion/minion:4@615.4 | minion/minion:2@615.7 | minion/minion:2@615.7 | blue:JUNGLE:LeeSin/leesin:q1:288@617.7 | blue:JUNGLE:LeeSin/auto:167@617.9 | blue:JUNGLE:LeeSin/leesin:q2:400@619.0
- 14:15 red:JUNGLE:Graves lv10 <- blue:TOP:Darius via=darius:r zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[jungle,retreat,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:BOT:Jhin/jhin:q:217@854.0 | blue:BOT:Jhin/jhin:w:135@854.0 | blue:BOT:Jhin/jhin:r:351@854.0 | blue:TOP:Darius/auto:113@854.0 | blue:TOP:Darius/darius:q:247@854.0 | blue:TOP:Darius/darius:w:79@854.5 | blue:TOP:Darius/darius:e:77@855.0 | blue:TOP:Darius/darius:r:613@855.0
- 14:33 red:TOP:Camille lv11 <- blue:JUNGLE:LeeSin via=leesin:q2 zone=top_side ownTower=false enemyTower=true
  champDmg=95% decisions=[lane,farm,fight] smells=[tower_dive_or_bail_fail]
  note: 塔傷參與過高：越塔／撤離判斷或塔仇恨處理可能有問題。
  trail: tower/tower:89@872.7 | blue:JUNGLE:LeeSin/auto:194@873.0 | blue:JUNGLE:LeeSin/leesin:q1:291@873.0 | blue:JUNGLE:LeeSin/leesin:e:191@873.0 | blue:JUNGLE:LeeSin/leesin:r:565@873.0 | blue:JUNGLE:LeeSin/leesin:q2:403@873.7
- 15:03 red:BOT:Ashe lv7 <- blue:BOT:Jhin via=jhin:q zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,wave_shove] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:BOT:Jhin/auto:203@903.0 | blue:BOT:Jhin/jhin:q:295@903.0
- 16:30 red:MID:Ahri lv7 <- blue:TOP:Darius via=darius:r zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,objective,wave_shove] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:BOT:Jhin/auto:220@985.0 | blue:MID:Annie/annie:w:202@985.0 | blue:MID:Annie/auto:69@985.7 | blue:MID:Annie/auto:69@987.4 | blue:TOP:Darius/auto:157@989.7 | blue:TOP:Darius/darius:r:536@990.0
- 17:23 blue:TOP:Darius lv10 <- red:TOP:Camille via=auto zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[wave_shove,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Camille/camille:w:136@1042.0 | red:TOP:Camille/camille:r:131@1042.0 | red:TOP:Camille/camille:q2:306@1043.0 | red:TOP:Camille/ignite:244@1043.0 | ignite_dot/ignite_dot:1@1043.0 | ignite_dot/ignite_dot:3@1043.1 | ignite_dot/ignite_dot:1@1043.2 | red:TOP:Camille/auto:179@1043.2
- 18:17 red:JUNGLE:Graves lv12 <- blue:JUNGLE:LeeSin via=leesin:r zone=river ownTower=false enemyTower=false
  champDmg=94% decisions=[fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:6@1095.4 | blue:JUNGLE:LeeSin/auto:195@1096.4 | minion/minion:6@1096.4 | blue:JUNGLE:LeeSin/leesin:e:223@1096.7 | minion/minion:6@1096.7 | blue:JUNGLE:LeeSin/leesin:q1:282@1096.9 | blue:JUNGLE:LeeSin/leesin:q2:386@1097.0 | blue:JUNGLE:LeeSin/leesin:r:549@1097.0
- 19:01 red:MID:Ahri lv7 <- blue:JUNGLE:LeeSin via=leesin:q2 zone=river ownTower=true enemyTower=false
  champDmg=90% decisions=[farm,retreat] smells=[unclassified]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: minion/minion:4@1139.5 | minion/minion:4@1139.5 | minion/minion:9@1139.7 | minion/minion:9@1139.7 | minion/minion:9@1139.7 | blue:JUNGLE:LeeSin/leesin:q1:402@1141.0 | blue:JUNGLE:LeeSin/leesin:e:280@1141.0 | blue:JUNGLE:LeeSin/leesin:q2:552@1141.5
- 20:56 blue:MID:Annie lv10 <- red:TOP:Camille via=auto zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Camille/camille:q1:210@1256.0 | red:TOP:Camille/camille:e:385@1256.0 | red:TOP:Camille/camille:w:183@1256.0 | red:TOP:Camille/auto:243@1256.0
- 20:57 blue:TOP:Darius lv11 <- red:TOP:Camille via=ignite zone=river ownTower=true enemyTower=false
  champDmg=100% decisions=[wave_shove,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Camille/camille:w:127@1256.0 | red:TOP:Camille/camille:q2:334@1256.9 | red:TOP:Camille/ignite:280@1257.0
- 21:01 red:BOT:Ashe lv8 <- blue:SUPPORT:Thresh via=auto zone=top_side ownTower=false enemyTower=false
  champDmg=98% decisions=[objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:SUPPORT:Thresh/ignite:98@1260.0 | ignite_dot/ignite_dot:5@1260.0 | ignite_dot/ignite_dot:6@1260.2 | ignite_dot/ignite_dot:6@1260.4 | blue:BOT:Jhin/auto:219@1260.4 | ignite_dot/ignite_dot:6@1260.7 | ignite_dot/ignite_dot:1@1260.9 | blue:SUPPORT:Thresh/auto:28@1261.0
- 21:33 red:SUPPORT:Leona lv10 <- blue:JUNGLE:LeeSin via=leesin:r zone=top_side ownTower=false enemyTower=false
  champDmg=90% decisions=[objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: monster/monster:33@1287.4 | monster/monster:33@1288.9 | monster/monster:19@1290.4 | monster/monster:33@1291.9 | blue:JUNGLE:LeeSin/auto:203@1292.7 | blue:JUNGLE:LeeSin/leesin:q1:272@1293.0 | blue:JUNGLE:LeeSin/leesin:r:604@1293.0
- 22:38 red:MID:Ahri lv7 <- blue:BOT:Jhin via=jhin:r zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[defend,farm,lane,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:BOT:Jhin/auto:238@1358.0 | blue:BOT:Jhin/jhin:q:340@1358.0 | blue:BOT:Jhin/jhin:w:258@1358.0 | blue:BOT:Jhin/jhin:r:1004@1358.0
- 22:49 red:JUNGLE:Graves lv13 <- blue:MID:Annie via=annie:q zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,fight,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:SUPPORT:Thresh/thresh:e:57@1366.0 | blue:SUPPORT:Thresh/auto:19@1367.0 | blue:BOT:Jhin/auto:162@1368.0 | blue:BOT:Jhin/jhin:q:231@1368.0 | blue:BOT:Jhin/jhin:w:175@1368.4 | blue:SUPPORT:Thresh/auto:20@1368.7 | blue:MID:Annie/auto:47@1369.0 | blue:MID:Annie/annie:q:331@1369.0
- 23:38 red:TOP:Camille lv14 <- blue:TOP:Darius via=darius:r zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat,objective,defend,fight] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:TOP:Darius/auto:142@1417.4 | blue:TOP:Darius/darius:q:246@1417.4 | blue:TOP:Darius/darius:e:89@1417.4 | blue:TOP:Darius/darius:w:87@1417.9 | blue:TOP:Darius/darius:r:782@1418.0
- 23:46 red:BOT:Ashe lv8 <- blue:TOP:Darius via=darius:q zone=bot_side ownTower=true enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:TOP:Darius/darius:q:365@1426.0
- 23:58 red:MID:Ahri lv7 <- blue:BOT:Jhin via=auto zone=bot_side ownTower=false enemyTower=false
  champDmg=100% decisions=[objective,retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: blue:TOP:Darius/darius:q:393@1434.2 | blue:TOP:Darius/auto:231@1434.4 | blue:TOP:Darius/darius:w:140@1434.7 | blue:BOT:Jhin/auto:240@1437.0 | blue:BOT:Jhin/auto:240@1438.4
- 25:40 blue:TOP:Darius lv12 <- red:TOP:Camille via=ignite zone=top_side ownTower=false enemyTower=false
  champDmg=100% decisions=[retreat] smells=[fair_champ_kill]
  note: 以英雄傷害為主的擊殺，比較像對線／團戰結果。
  trail: red:TOP:Camille/ignite:302@1540.0
- 29:13 blue:SUPPORT:Thresh lv10 <- tower:red via=tower zone=bot_side ownTower=false enemyTower=true
  champDmg=0% decisions=[lane,retreat] smells=[minion_execute,tower_dive_or_bail_fail,died_under_enemy_tower_low_champ_damage,laning_action_then_environment_death]
  note: 塔傷參與過高：越塔／撤離判斷或塔仇恨處理可能有問題。
  trail: minion/minion:9@1752.2 | minion/minion:9@1752.2 | tower/tower:115@1752.4 | minion/minion:16@1752.9 | minion/minion:9@1753.2 | minion/minion:9@1753.2 | minion/minion:9@1753.2 | tower/tower:115@1753.7

## Engine design concerns (from sample)
- **minion_execute** x7
- **early_minion_kill** x1
- **died_to_minions_under_own_tower** x1
- **laning_action_then_environment_death** x3
- **tower_dive_or_bail_fail** x10
- **fight_into_tower** x2
- **died_under_enemy_tower_low_champ_damage** x3