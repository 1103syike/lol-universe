import { describe, expect, it } from 'vitest';
import { DiscreteScheduler } from './discrete-scheduler';

describe('DiscreteScheduler', () => {
  it('runs events in time then order', () => {
    const scheduler = new DiscreteScheduler();
    const seen: string[] = [];
    scheduler.schedule(2, 'b', () => seen.push('b'), 1);
    scheduler.schedule(1, 'a', () => seen.push('a'), 0);
    scheduler.schedule(2, 'c', () => seen.push('c'), 0);
    scheduler.runUntil(3);
    expect(seen).toEqual(['a', 'c', 'b']);
    expect(scheduler.time).toBe(3);
  });

  it('is deterministic for the same schedule', () => {
    const run = () => {
      const scheduler = new DiscreteScheduler();
      const seen: number[] = [];
      scheduler.schedule(1, 'x', (t) => seen.push(t));
      scheduler.schedule(2, 'y', (t) => seen.push(t));
      scheduler.runUntil(2);
      return seen;
    };
    expect(run()).toEqual(run());
  });
});
