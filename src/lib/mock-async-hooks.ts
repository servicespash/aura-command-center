export class AsyncLocalStorage<T = unknown> {
  run(store: T, callback: (...args: unknown[]) => unknown, ...args: unknown[]) {
    return callback(...args);
  }
  getStore(): T | undefined {
    return undefined;
  }
}
