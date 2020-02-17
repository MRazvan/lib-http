export function EmptyWrap(val?: any): any {
  return val;
}

export function isAwaitable(obj: any): boolean {
  return obj && typeof obj.then === 'function';
}
