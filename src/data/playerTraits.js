export const PLAYER_TRAITS = {
  '辣': {
    symbol: '辣',
    name: '辣豆豆',
    desc: '每季度获得当前资金 2.5% 的辣豆基金收入',
    color: '#f87171',
  },
  '机': {
    symbol: '机',
    name: '呼呼 ✈',
    desc: '所有执飞飞机维护费降低10%',
    color: '#60a5fa',
  },
  '豆': {
    symbol: '豆',
    name: 'OIL 🛢',
    desc: '所有执飞飞机油耗降低10%',
    color: '#4ade80',
  },
};

export const PLAYER_TRAIT_SYMBOLS = Object.keys(PLAYER_TRAITS);

export function normalizePlayerTrait(trait) {
  return PLAYER_TRAITS[trait] ? trait : null;
}

export function shufflePlayerTraits(random = Math.random) {
  const traits = [...PLAYER_TRAIT_SYMBOLS];
  for (let i = traits.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [traits[i], traits[j]] = [traits[j], traits[i]];
  }
  return traits;
}
