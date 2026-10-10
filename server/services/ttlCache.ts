/** Cache simples em memória com expiração (TTL) e deduplicação de requisições simultâneas. */
export class TtlCache<T> {
  private store = new Map<string, { at: number; ttl: number; value: Promise<T> }>();

  constructor(private max = 500) {}

  async get(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const hit = this.store.get(key);
    if (hit && Date.now() - hit.at < hit.ttl) return hit.value;
    const value = load();
    this.store.set(key, { at: Date.now(), ttl: ttlMs, value });
    if (this.store.size > this.max) this.store.delete(this.store.keys().next().value!);
    try {
      return await value;
    } catch (e) {
      this.store.delete(key);
      throw e;
    }
  }

  clear() {
    this.store.clear();
  }
}
