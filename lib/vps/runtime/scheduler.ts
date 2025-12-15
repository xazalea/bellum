export type TaskPriority = 'user' | 'visible' | 'background';

export type ScheduledTask = {
  id: string;
  priority: TaskPriority;
  run: () => void | Promise<void>;
};

export function createFrameScheduler(opts?: { frameBudgetMs?: number }) {
  const budgetMs = Math.max(2, Math.min(12, opts?.frameBudgetMs ?? 8));
  const qUser: ScheduledTask[] = [];
  const qVisible: ScheduledTask[] = [];
  const qBg: ScheduledTask[] = [];

  let running = false;
  let raf: number | null = null;

  const enqueue = (t: ScheduledTask) => {
    if (t.priority === 'user') qUser.push(t);
    else if (t.priority === 'visible') qVisible.push(t);
    else qBg.push(t);
  };

  const popNext = (): ScheduledTask | null => {
    return qUser.shift() || qVisible.shift() || qBg.shift() || null;
  };

  const loop = async () => {
    if (!running) return;
    const start = performance.now();
    while (performance.now() - start < budgetMs) {
      const t = popNext();
      if (!t) break;
      try {
        await t.run();
      } catch {
        // ignore
      }
    }
    raf = window.requestAnimationFrame(() => void loop());
  };

  return {
    start() {
      if (running) return;
      running = true;
      raf = window.requestAnimationFrame(() => void loop());
    },
    stop() {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = null;
    },
    schedule(priority: TaskPriority, run: ScheduledTask['run']) {
      enqueue({ id: crypto.randomUUID(), priority, run });
    },
    stats() {
      return { user: qUser.length, visible: qVisible.length, background: qBg.length, budgetMs };
    },
  };
}

