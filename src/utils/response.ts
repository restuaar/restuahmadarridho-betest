export function ok<T>(data: T, meta?: unknown) {
  return meta === undefined
    ? { success: true as const, data }
    : { success: true as const, data, meta };
}
