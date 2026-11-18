/**
 * Deterministic PRNG (mulberry32) for Roblox Storage Hunters: Open World.
 */

export function createRng(seed = 1337) {
  let state = (Number(seed) | 0) >>> 0;

  function rand() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  rand.next = rand;

  rand.range = (min, max) => min + rand() * (max - min);

  rand.int = (min, max) => {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return lo + Math.floor(rand() * (hi - lo + 1));
  };

  rand.pick = (arr) => {
    if (!arr || arr.length === 0) return undefined;
    return arr[Math.floor(rand() * arr.length)];
  };

  rand.chance = (prob) => rand() < prob;

  return rand;
}
