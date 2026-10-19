export const TIERS = ['언랭크','아이언','브론즈','실버','골드','플래티넘','에메랄드','다이아몬드','마스터','그랜드마스터','챌린저'];
export const POSITIONS = ['상관없음','탑','정글','미드','원딜','서포터'];
export const TTL = 2 * 60 * 60 * 1000;
export const COOLDOWN = 5 * 60 * 1000;
export const millis = value => typeof value?.toMillis === 'function' ? value.toMillis() : 0;
export function normalize(post) {
  return { status:'open', mic:'상관없음', style:'상관없음', availability:'협의', duration:'협의', division:'', ...post };
}
export function stateOf(post, now = Date.now()) {
  if (post.status === 'deleted') return 'deleted';
  if (post.status === 'closed') return 'closed';
  return millis(post.updatedAt) + TTL <= now ? 'expired' : 'open';
}
export function matches(post, filters, now = Date.now()) {
  const p = normalize(post);
  const state = stateOf(p, now);
  if (state === 'deleted' || (filters.state !== 'all' && state !== (filters.state || 'open'))) return false;
  const rank = TIERS.indexOf(p.tier);
  if (filters.minTier && rank < TIERS.indexOf(filters.minTier)) return false;
  if (filters.maxTier && rank > TIERS.indexOf(filters.maxTier)) return false;
  if (filters.search && !p.riotId.toLocaleLowerCase('ko-KR').includes(filters.search.trim().toLocaleLowerCase('ko-KR'))) return false;
  for (const key of ['mode','mic','style','availability','duration']) {
    if (filters[key] && p[key] !== filters[key]) return false;
  }
  for (const key of ['positions','wantedPositions']) {
    const chosen = filters[key] || [];
    if (chosen.length && !chosen.some(position => p[key].includes(position)) && !(filters.includeAny && p[key].includes('상관없음'))) return false;
  }
  return true;
}
export function relativeTime(timestamp, now = Date.now()) {
  const age = Math.max(0, now - millis(timestamp));
  if (age < 60000) return '방금 전';
  if (age < 3600000) return `${Math.floor(age / 60000)}분 전`;
  if (age < 86400000) return `${Math.floor(age / 3600000)}시간 전`;
  return `${Math.floor(age / 86400000)}일 전`;
}
export function profileData(post) {
  const p = normalize(post);
  return Object.fromEntries(['riotId','tier','division','positions','wantedPositions','mode','note','mic','style','availability','duration'].map(key => [key,p[key]]));
}
