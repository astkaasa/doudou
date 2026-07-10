import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { CITIES } from '../src/data/cities.js';
import { CITY_ERA_DATA, initCityStates } from '../src/data/cityEraData.js';
import { CITY_POPULATION_ANCHOR_YEARS, CITY_POPULATION_DATA } from '../src/data/cityPopulationData.generated.js';
import { validateStaticData } from '../src/domain/invariants.js';

const projectRoot = resolve(import.meta.dirname, '..');
const sourceFile = resolve(projectRoot, 'data-sources/city-population-wup-2025.json');
const reportFile = resolve(projectRoot, 'docs/city-data-audit.md');
const source = JSON.parse(readFileSync(sourceFile, 'utf8'));
const errors = [];
const warnings = [];
const ids = new Set();

for (const city of CITIES) {
  if (ids.has(city.id)) errors.push(`duplicate city id: ${city.id}`);
  ids.add(city.id);
  const population = CITY_POPULATION_DATA[city.id];
  const market = CITY_ERA_DATA[city.id];
  if (!population) errors.push(`${city.id}: missing generated population data`);
  if (!source.records?.[city.id]) errors.push(`${city.id}: missing source record`);
  if (!Array.isArray(market) || market.length < 3) errors.push(`${city.id}: missing three era market rows`);
  if (!['core', 'regional', 'event', 'remote', 'special'].includes(city.marketRole)) {
    errors.push(`${city.id}: invalid market role ${city.marketRole}`);
  }
  if (!Array.isArray(city.eventZones) || city.eventZones.length === 0) errors.push(`${city.id}: missing event zones`);
  if (population) {
    CITY_POPULATION_ANCHOR_YEARS.forEach((year) => {
      if (!Number.isFinite(population.populationM[year]) || population.populationM[year] <= 0) {
        errors.push(`${city.id}: invalid ${year} population`);
      }
    });
    if (population.matchDistanceKm > 50) warnings.push(`${city.id}: source centre is ${population.matchDistanceKm} km away`);
  }
}

const orphanSourceIds = Object.keys(source.records || {}).filter((cityId) => !ids.has(cityId));
orphanSourceIds.forEach((cityId) => errors.push(`${cityId}: source record has no city`));
errors.push(...validateStaticData());

const derivedRows = Object.entries(CITY_POPULATION_DATA)
  .map(([cityId, record]) => ({
    cityId,
    years: Object.entries(record.qualityByYear)
      .filter(([, quality]) => quality !== 'source')
      .map(([year, quality]) => `${year} (${quality})`),
  }))
  .filter((row) => row.years.length > 0);
const roleCounts = Object.groupBy(CITIES, (city) => city.marketRole);
const subRegionCounts = Object.groupBy(CITIES, (city) => city.subRegion);
const era3 = initCityStates('era3');

function listCounts(groups) {
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => `${key}: ${values.length}`)
    .join('；');
}

function buildReport() {
  return `# 城市数据审计报告\n\n`
    + `生成日期：${source.generatedAt}\n\n`
    + `## 结论\n\n`
    + `- 城市总数：${CITIES.length}（原有 109，新增 ${CITIES.length - 109}）。\n`
    + `- 人口来源覆盖：${Object.keys(CITY_POPULATION_DATA).length}/${CITIES.length}。\n`
    + `- 人口锚点：${CITY_POPULATION_ANCHOR_YEARS.join('、')}。\n`
    + `- 市场角色：${listCounts(roleCounts)}。\n`
    + `- 区域分布：${listCounts(subRegionCounts)}。\n`
    + `- 错误：${errors.length}；警告：${warnings.length}。\n\n`
    + `## 已修正的原始数据问题\n\n`
    + `- 阿斯塔纳坐标由错误经度修正到 51.1801, 71.4460，并与塔什干归入中亚。\n`
    + `- 伊斯兰堡归入南亚；达喀尔、阿布贾、拉各斯归入西非；内罗毕、亚的斯亚贝巴、达累斯萨拉姆归入东非；金沙萨归入中非。\n`
    + `- “文莱”改为城市名“斯里巴加湾市”，“冲绳”改为“那霸（冲绳）”，“罗斯托夫”改为“顿河畔罗斯托夫”。\n`
    + `- 汉诺威、塞维利亚标为事件市场；关岛、塞班标为偏远市场；麦加标为特殊市场。\n\n`
    + `## 新增城市\n\n`
    + `${CITIES.slice(109).map((city) => `- ${city.id}：${city.name}，${city.subRegion}，${city.marketRole}，2000 年人口 ${era3[city.id].pop.toFixed(4)}M。`).join('\n')}\n\n`
    + `## 来源派生值\n\n`
    + `以下城市在统一城市中心尚未形成或未达到 WUP 阈值的早期年份没有来源行；数值由生成器按受限增长率回推，运行时和审计中保留质量标记：\n\n`
    + `${derivedRows.length > 0 ? derivedRows.map((row) => `- ${row.cityId}：${row.years.join('、')}`).join('\n') : '- 无'}\n\n`
    + `## 警告\n\n`
    + `${warnings.length > 0 ? warnings.map((warning) => `- ${warning}`).join('\n') : '- 无'}\n`;
}

if (process.argv.includes('--write')) {
  writeFileSync(reportFile, buildReport());
  console.log(`Wrote ${reportFile}`);
}
console.log(`Cities: ${CITIES.length}`);
console.log(`Sources: ${Object.keys(CITY_POPULATION_DATA).length}`);
console.log(`Derived histories: ${derivedRows.length}`);
console.log(`Warnings: ${warnings.length}`);
if (errors.length > 0) {
  errors.forEach((error) => console.error(`ERROR ${error}`));
  process.exitCode = 1;
} else {
  console.log('City data audit passed.');
}
