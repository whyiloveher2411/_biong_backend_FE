/**
 * Chạy asyncFn trên items với concurrency giới hạn; trả về mảng kết quả đúng thứ tự.
 * Fail-fast: lỗi đầu tiên reject toàn pool (task đang chạy vẫn hoàn tất nhưng không start task mới).
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<R>} asyncFn
 * @returns {Promise<R[]>}
 */
export async function mapPool(items, concurrency, asyncFn) {
  const n = items.length;
  if (n === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, n));
  const results = new Array(n);
  let nextIndex = 0;
  let failed = null;

  async function worker() {
    while (true) {
      if (failed) return;
      const i = nextIndex++;
      if (i >= n) return;
      try {
        results[i] = await asyncFn(items[i], i);
      } catch (err) {
        failed = err;
        return;
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  if (failed) throw failed;
  return results;
}

/**
 * Parse concurrency từ env, clamp [min, max], default nếu thiếu/invalid.
 */
export function resolveConcurrency(envValue, { defaultValue = 3, min = 1, max = 4 } = {}) {
  const n = parseInt(String(envValue ?? ""), 10);
  if (!Number.isFinite(n) || n < 1) return defaultValue;
  return Math.max(min, Math.min(max, n));
}
