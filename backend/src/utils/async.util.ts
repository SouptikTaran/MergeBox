export async function mapConcurrent<T, R>(
  values: T[],
  limit: number,
  callback: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, async () => {
      while (cursor < values.length) {
        const index = cursor++;
        results[index] = await callback(values[index]!);
      }
    }),
  );
  return results;
}
