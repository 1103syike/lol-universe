export type ScheduledHandler = (t: number) => void;

export interface ScheduledEvent {
  id: number;
  t: number;
  kind: string;
  order: number;
  handler: ScheduledHandler;
}

export class DiscreteScheduler {
  private nextId = 1;
  private queue: ScheduledEvent[] = [];
  private nowSec = 0;

  get time(): number {
    return this.nowSec;
  }

  setTime(t: number): void {
    this.nowSec = Math.max(this.nowSec, t);
  }

  clear(): void {
    this.queue = [];
    this.nextId = 1;
    this.nowSec = 0;
  }

  schedule(t: number, kind: string, handler: ScheduledHandler, order = 0): number {
    const id = this.nextId;
    this.nextId += 1;
    this.queue.push({ id, t: Math.max(this.nowSec, t), kind, order, handler });
    this.queue.sort((a, b) => a.t - b.t || a.order - b.order || a.id - b.id);
    return id;
  }

  scheduleAfter(delaySec: number, kind: string, handler: ScheduledHandler, order = 0): number {
    return this.schedule(this.nowSec + delaySec, kind, handler, order);
  }

  cancel(id: number): void {
    this.queue = this.queue.filter((event) => event.id !== id);
  }

  peek(): ScheduledEvent | null {
    return this.queue[0] ?? null;
  }

  step(): ScheduledEvent | null {
    const next = this.queue.shift();
    if (!next) {
      return null;
    }
    this.nowSec = next.t;
    next.handler(next.t);
    return next;
  }

  runUntil(endSec: number, onStep?: (event: ScheduledEvent) => void): void {
    while (this.queue.length > 0 && this.queue[0].t <= endSec) {
      const event = this.step();
      if (event && onStep) {
        onStep(event);
      }
    }
    if (this.nowSec < endSec) {
      this.nowSec = endSec;
    }
  }

  pendingCount(): number {
    return this.queue.length;
  }
}
