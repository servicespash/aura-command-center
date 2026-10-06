export class AsyncLocalStorage {
  run(store: any, callback: (...args: any[]) => any, ...args: any[]) {
    return callback(...args);
  }
  getStore() {
    return undefined;
  }
}
