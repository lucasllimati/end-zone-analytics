/** Os perfis de carreira são divididos em arquivos ("buckets") para evitar baixar todos os jogadores. */
export const CAREER_BUCKETS = 64;

/** Hash FNV-1a estável → índice de bucket. */
export function careerBucket(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % CAREER_BUCKETS;
}

export const bucketFile = (id: string) => `players/careers/${String(careerBucket(id)).padStart(2, '0')}.json`;
export const gameLogFile = (id: string) => `players/gamelogs/${String(careerBucket(id)).padStart(2, '0')}.json`;
