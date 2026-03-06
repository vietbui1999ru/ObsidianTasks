import { LRUCache } from "lru-cache";
import { createHash } from "node:crypto";

const DEFAULT_TTL_MS = 3_600_000; // 1 hour
const DEFAULT_MAX_ENTRIES = 100;

interface MemoryEntry {
  value: unknown;
  hash: string;
}

export class MemoryStore {
  private readonly cache: LRUCache<string, MemoryEntry>;
  private readonly defaultTtlMs: number;

  constructor(options?: { maxEntries?: number; defaultTtlMs?: number }) {
    this.defaultTtlMs = options?.defaultTtlMs ?? DEFAULT_TTL_MS;

    this.cache = new LRUCache<string, MemoryEntry>({
      max: options?.maxEntries ?? DEFAULT_MAX_ENTRIES,
      ttl: this.defaultTtlMs,
    });
  }

  /**
   * Stores a value with an optional per-key TTL.
   * Computes a SHA-256 content hash from the serialized value.
   */
  set(key: string, value: unknown, ttlMs?: number): void {
    const serialized = JSON.stringify(value);
    const hash = createHash("sha256").update(serialized).digest("hex");

    this.cache.set(
      key,
      { value, hash },
      { ttl: ttlMs ?? this.defaultTtlMs },
    );
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    return entry?.value as T | undefined;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Returns the content hash for a stored key, or undefined if not present.
   * Useful for checking if cached data has changed.
   */
  getHash(key: string): string | undefined {
    const entry = this.cache.get(key);
    return entry?.hash;
  }
}
