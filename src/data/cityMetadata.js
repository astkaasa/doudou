export const MARKET_ROLE_LABELS = {
  core: '核心市场',
  regional: '区域市场',
  event: '事件市场',
  remote: '偏远市场',
  special: '特殊市场',
};

export const CITY_ADDITIONS = [
  { id: 'guangzhou', name: '广州', lat: 23.1291, lon: 113.2644, pop: 0, level: 3, region: 'asia', subRegion: 'east_asia', capital: false, marketRole: 'core' },
  { id: 'shenzhen', name: '深圳', lat: 22.5431, lon: 114.0579, pop: 0, level: 3, region: 'asia', subRegion: 'east_asia', capital: false, marketRole: 'core' },
  { id: 'kualalumpur', name: '吉隆坡', lat: 3.139, lon: 101.6869, pop: 0, level: 2, region: 'asia', subRegion: 'southeast_asia', capital: true, marketRole: 'core' },
  { id: 'hochiminh', name: '胡志明市', lat: 10.8231, lon: 106.6297, pop: 0, level: 2, region: 'asia', subRegion: 'southeast_asia', capital: false, marketRole: 'core' },
  { id: 'dhaka', name: '达卡', lat: 23.8103, lon: 90.4125, pop: 0, level: 2, region: 'asia', subRegion: 'south_asia', capital: true, marketRole: 'core' },
  { id: 'bengaluru', name: '班加罗尔', lat: 12.9716, lon: 77.5946, pop: 0, level: 2, region: 'asia', subRegion: 'south_asia', capital: false, marketRole: 'core' },
  { id: 'doha', name: '多哈', lat: 25.2854, lon: 51.531, pop: 0, level: 2, region: 'asia', subRegion: 'mideast', capital: true, marketRole: 'core' },
  { id: 'jeddah', name: '吉达', lat: 21.4858, lon: 39.1925, pop: 0, level: 2, region: 'asia', subRegion: 'mideast', capital: false, marketRole: 'core' },
  { id: 'frankfurt', name: '法兰克福', lat: 50.1109, lon: 8.6821, pop: 0, level: 3, region: 'europe', subRegion: 'europe', capital: false, marketRole: 'core' },
  { id: 'toronto', name: '多伦多', lat: 43.6532, lon: -79.3832, pop: 0, level: 3, region: 'namerica', subRegion: 'east_namerica', capital: false, marketRole: 'core' },
  { id: 'panamacity', name: '巴拿马城', lat: 8.9824, lon: -79.5199, pop: 0, level: 2, region: 'namerica', subRegion: 'central_namerica', capital: true, marketRole: 'regional' },
  { id: 'auckland', name: '奥克兰', lat: -36.8509, lon: 174.7645, pop: 0, level: 2, region: 'oceania', subRegion: 'oceania', capital: false, marketRole: 'core' },
  { id: 'brisbane', name: '布里斯班', lat: -27.4698, lon: 153.0251, pop: 0, level: 2, region: 'oceania', subRegion: 'oceania', capital: false, marketRole: 'core' },
  { id: 'accra', name: '阿克拉', lat: 5.6037, lon: -0.187, pop: 0, level: 2, region: 'africa', subRegion: 'west_africa', capital: true, marketRole: 'regional' },
];

export const CITY_OVERRIDES = {
  astana: { lat: 51.1801, lon: 71.446, subRegion: 'central_asia', eventZones: ['central_asia'] },
  tashkent: { subRegion: 'central_asia', eventZones: ['central_asia'] },
  islamabad: { subRegion: 'south_asia', eventZones: ['south_asia'] },
  dakar: { subRegion: 'west_africa', eventZones: ['west_africa'] },
  abuja: { subRegion: 'west_africa', eventZones: ['west_africa'] },
  lagos: { subRegion: 'west_africa', eventZones: ['west_africa'] },
  nairobi: { subRegion: 'east_africa', eventZones: ['east_africa'] },
  addisababa: { subRegion: 'east_africa', eventZones: ['east_africa'] },
  daressalaam: { subRegion: 'east_africa', eventZones: ['east_africa'] },
  kinshasa: { subRegion: 'central_africa', eventZones: ['central_africa'] },
  brunei: { name: '斯里巴加湾市', marketRole: 'regional' },
  okinawa: { name: '那霸（冲绳）', marketRole: 'regional' },
  rostov: { name: '顿河畔罗斯托夫', marketRole: 'regional' },
  marseille: { marketRole: 'regional' },
  ottawa: { marketRole: 'regional' },
  minsk: { marketRole: 'regional' },
  hannover: { marketRole: 'event' },
  seville: { marketRole: 'event' },
  guam: { marketRole: 'remote' },
  saipan: { marketRole: 'remote' },
  mecca: { marketRole: 'special' },
};

export function normalizeCityMetadata(city) {
  const merged = { ...city, ...(CITY_OVERRIDES[city.id] || {}) };
  const marketRole = merged.marketRole || (merged.level >= 2 ? 'core' : 'regional');
  return {
    ...merged,
    marketTier: merged.marketTier || merged.level,
    networkRegion: merged.networkRegion || merged.region,
    eventZones: Array.isArray(merged.eventZones) && merged.eventZones.length > 0
      ? [...merged.eventZones]
      : [merged.subRegion],
    marketRole,
  };
}
