import { PLANES } from '../data/planes.js';

export function aircraftMarketNewsForPeriod(year, quarter) {
  if (!Number.isInteger(year) || quarter !== 1) return [];
  const enteringMarket = PLANES.filter((plane) => plane.serviceStart === year);
  // serviceEnd is inclusive, so removal takes effect in the following year.
  const leavingMarket = PLANES.filter((plane) => plane.serviceEnd === year - 1);
  return [
    buildMarketEntryNews(enteringMarket),
    buildMarketExitNews(leavingMarket),
  ].filter(Boolean);
}

function buildMarketEntryNews(planes) {
  if (planes.length === 0) return null;
  const fictional = planes.filter((plane) => plane.fictional);
  const historical = planes.filter((plane) => !plane.fictional);
  const title = fictional.length === planes.length
    ? '架空科技线更新采购目录'
    : fictional.length > 0
      ? '飞机市场新增历史与架空机型'
      : '年度飞机采购目录上新';
  const groups = [];
  if (historical.length > 0) groups.push(`${planeNames(historical)}加入采购目录`);
  if (fictional.length > 0) groups.push(`${planeNames(fictional)}作为架空科技线方案开放采购`);
  return {
    category: 'aviation',
    title,
    desc: `${groups.join('；')}。${capabilitySummary(planes)}`,
    effect: `飞机市场新增 ${planes.length} 款可购机型`,
    stockEffect: { tech: 0.04, finance: 0.02 },
    _aircraftMarket: 'entry',
  };
}

function buildMarketExitNews(planes) {
  if (planes.length === 0) return null;
  return {
    category: 'aviation',
    title: planes.every((plane) => plane.fictional) ? '架空机型停止接受新订单' : '部分机型停止接受新订单',
    desc: `${planeNames(planes)}退出新机采购目录，现有机队仍可继续运营和转售。`,
    effect: `飞机市场减少 ${planes.length} 款可购机型`,
    stockEffect: { tech: -0.01, finance: -0.01 },
    _aircraftMarket: 'exit',
  };
}

function capabilitySummary(planes) {
  const seats = planes.map((plane) => plane.seats);
  const ranges = planes.map((plane) => plane.range);
  const runways = planes.map((plane) => plane.airportPerformance?.minRunwayM).filter(Number.isFinite);
  const tiers = planes.map((plane) => plane.airportPerformance?.requiredInfrastructureTier).filter(Number.isFinite);
  if (planes.length === 1) {
    const plane = planes[0];
    const airportRequirement = runways.length > 0 && tiers.length > 0
      ? `；部署前需确认机场至少具备 ${runways[0]} 米跑道和 ${tiers[0]} 级基础设施`
      : '';
    return `${plane.seats} 座、航程 ${plane.range} 公里${airportRequirement}。`;
  }
  const airportRequirement = runways.length > 0 && tiers.length > 0
    ? `；其中最高要求 ${Math.max(...runways)} 米跑道和 ${Math.max(...tiers)} 级基础设施`
    : '';
  return `座位覆盖 ${Math.min(...seats)}-${Math.max(...seats)}，最长航程 ${Math.max(...ranges)} 公里${airportRequirement}。`;
}

function planeNames(planes) {
  return planes.map((plane) => plane.name).join('、');
}
