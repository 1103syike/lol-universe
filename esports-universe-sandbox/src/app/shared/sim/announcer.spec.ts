import { describe, expect, it } from 'vitest';
import { KillAnnouncerTracker } from './announcer';

describe('KillAnnouncerTracker', () => {
  it('announces first blood, multi-kill, spree, shutdown and ace', () => {
    const tracker = new KillAnnouncerTracker();
    const blue = ['b1', 'b2', 'b3', 'b4', 'b5'];
    const red = ['r1', 'r2', 'r3', 'r4', 'r5'];

    expect(
      tracker.observe({
        t: 120,
        killerId: 'b1',
        victimId: 'r1',
        victimTeamPlayerIds: red,
        isFirstBlood: true,
        isMistake: false,
      }).label,
    ).toBe('首殺');

    expect(
      tracker.observe({
        t: 125,
        killerId: 'b1',
        victimId: 'r2',
        victimTeamPlayerIds: red,
        isFirstBlood: false,
        isMistake: false,
      }).label,
    ).toBe('雙殺');

    expect(
      tracker.observe({
        t: 128,
        killerId: 'b1',
        victimId: 'r3',
        victimTeamPlayerIds: red,
        isFirstBlood: false,
        isMistake: false,
      }).label,
    ).toBe('三殺');

    expect(
      tracker.observe({
        t: 200,
        killerId: 'b2',
        victimId: 'r4',
        victimTeamPlayerIds: red,
        isFirstBlood: false,
        isMistake: false,
      }).label,
    ).toBe('擊殺');

    expect(
      tracker.observe({
        t: 260,
        killerId: 'b2',
        victimId: 'r5',
        victimTeamPlayerIds: red,
        isFirstBlood: false,
        isMistake: false,
      }).label,
    ).toBe('擊殺');

    expect(
      tracker.observe({
        t: 300,
        killerId: 'b2',
        victimId: 'r1',
        victimTeamPlayerIds: red,
        isFirstBlood: false,
        isMistake: false,
      }).label,
    ).toBe('大殺特殺');

    expect(
      tracker.observe({
        t: 360,
        killerId: 'r2',
        victimId: 'b2',
        victimTeamPlayerIds: blue,
        isFirstBlood: false,
        isMistake: false,
      }).label,
    ).toBe('終結');

    const late = new KillAnnouncerTracker();
    const killers = ['b1', 'b2', 'b3', 'b4', 'b5'];
    let last = '';
    for (const [index, victim] of red.entries()) {
      last = late.observe({
        t: 600 + index * 8,
        killerId: killers[index],
        victimId: victim,
        victimTeamPlayerIds: red,
        isFirstBlood: false,
        isMistake: false,
      }).label;
    }
    expect(last).toBe('團滅');
  });
});
