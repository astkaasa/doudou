// Human-reviewed mappings and gameplay parameters. Factual airport/runway data
// remains generated from the pinned OurAirports snapshot.

export const CITY_AIRPORT_MATCH_ALIASES = {
  brunei: ['Bandar Seri Begawan'],
  mecca: ['Mecca', 'Makkah'],
  okinawa: ['Naha', 'Okinawa'],
  panamacity: ['Panama City', 'Ciudad de Panama'],
  rostov: ['Rostov-on-Don'],
  stpetersburg: ['Saint Petersburg', 'St Petersburg'],
  ulanbator: ['Ulaanbaatar'],
};

export const AIRPORT_ASSIGNMENT_OVERRIDES = {
  EGLL: { cityId: 'london', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 5, capacityTier: 5, accessTier: 4, infrastructureTier: 5 } },
  EGKK: { cityId: 'london', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 4, capacityTier: 4, accessTier: 3, infrastructureTier: 5 } },
  EGLC: { cityId: 'london', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 4, capacityTier: 2, accessTier: 5, infrastructureTier: 3 } },
  EGSS: { cityId: 'london', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 3, capacityTier: 4, accessTier: 2, infrastructureTier: 4 } },
  EGGW: { cityId: 'london', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 3, capacityTier: 3, accessTier: 2, infrastructureTier: 4 } },

  RJTT: { cityId: 'tokyo', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 5, capacityTier: 5, accessTier: 5, infrastructureTier: 5 } },
  RJAA: { cityId: 'tokyo', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 4, capacityTier: 5, accessTier: 2, infrastructureTier: 5 } },

  RKSI: { cityId: 'seoul', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 5, capacityTier: 5, accessTier: 3, infrastructureTier: 5 } },
  RKSS: { cityId: 'seoul', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 4, capacityTier: 4, accessTier: 5, infrastructureTier: 4 } },
  RCTP: { cityId: 'taipei', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 5, capacityTier: 5, accessTier: 3, infrastructureTier: 5 } },
  RCSS: { cityId: 'taipei', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 4, capacityTier: 3, accessTier: 5, infrastructureTier: 4 } },
  RJBB: { cityId: 'osaka', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 4, capacityTier: 5, accessTier: 3, infrastructureTier: 5 } },
  RJOO: { cityId: 'osaka', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 4, capacityTier: 4, accessTier: 5, infrastructureTier: 4 } },
  VTBS: { cityId: 'bangkok', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 4, capacityTier: 5, accessTier: 3, infrastructureTier: 5 } },
  VTBD: { cityId: 'bangkok', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 3, capacityTier: 4, accessTier: 4, infrastructureTier: 4 } },
  WSSS: { cityId: 'singapore', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 5, capacityTier: 5, accessTier: 4, infrastructureTier: 5 } },
  WSAP: { cityId: 'singapore', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 3, capacityTier: 3, accessTier: 4, infrastructureTier: 3 } },
  WIII: { cityId: 'jakarta', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 4, capacityTier: 5, accessTier: 3, infrastructureTier: 5 } },
  OIIE: { cityId: 'tehran', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 4, capacityTier: 4, accessTier: 3, infrastructureTier: 5 } },
  OTHH: { cityId: 'doha', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 5, capacityTier: 5, accessTier: 4, infrastructureTier: 5 } },
  OEJN: { cityId: 'jeddah', servedCityIds: ['jeddah', 'mecca'], primary: true, confidence: 'verified', gameplay: { role: 'special', feeTier: 4, capacityTier: 5, accessTier: 3, infrastructureTier: 5 } },

  KJFK: { cityId: 'newyork', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 5, capacityTier: 5, accessTier: 4, infrastructureTier: 5 } },
  KEWR: { cityId: 'newyork', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 5, capacityTier: 5, accessTier: 4, infrastructureTier: 5 } },
  KLGA: { cityId: 'newyork', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 4, capacityTier: 4, accessTier: 5, infrastructureTier: 4 } },

  ZBAA: { cityId: 'beijing', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 5, capacityTier: 5, accessTier: 4, infrastructureTier: 5 } },
  ZBAD: { cityId: 'beijing', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 4, capacityTier: 5, accessTier: 3, infrastructureTier: 5 } },

  ZSPD: { cityId: 'shanghai', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 5, capacityTier: 5, accessTier: 3, infrastructureTier: 5 } },
  ZSSS: { cityId: 'shanghai', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 4, capacityTier: 4, accessTier: 5, infrastructureTier: 4 } },

  LFPG: { cityId: 'paris', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 5, capacityTier: 5, accessTier: 4, infrastructureTier: 5 } },
  LFPO: { cityId: 'paris', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 4, capacityTier: 4, accessTier: 5, infrastructureTier: 5 } },
  LFPB: { cityId: 'paris', confidence: 'candidate', gameplay: { role: 'special', feeTier: 4, capacityTier: 2, accessTier: 4, infrastructureTier: 4 } },

  KDFW: { cityId: 'dallas', primary: true, confidence: 'verified', gameplay: { role: 'primary_hub', feeTier: 5, capacityTier: 5, accessTier: 3, infrastructureTier: 5 } },
  KDAL: { cityId: 'dallas', confidence: 'verified', gameplay: { role: 'secondary', feeTier: 4, capacityTier: 4, accessTier: 5, infrastructureTier: 4 } },
};

const SOURCES = Object.freeze({
  narita: 'https://www.narita-airport.jp/en/discover/history/',
  incheon: 'https://www.airport.kr/co_en/4382/subview.do',
  taoyuan: 'https://www.taoyuan-airport.com/api/uploads/files/20220527/e6d234b1-024b-4122-89ed-86f220772895/11/',
  kansai: 'https://www.kansai-airports.co.jp/en/business/airports-kix/',
  itami: 'https://www.kansai-airports.co.jp/business/airports-itm/',
  bangkok: 'https://suvarnabhumi.airportthai.co.th/about-us',
  changi: 'https://www.changiairport.com/en/corporate/about-us.html',
  hongkong: 'https://www.hongkongairport.com/en/about-us/?section=our-history',
  pudong: 'https://service.shanghai.gov.cn/sheninfo/specialdetail.aspx?Id=471fea6a-abec-471a-9882-7a10459f7044',
  daxing: 'https://www.caac.gov.cn/English/News/202305/t20230515_219345.html',
  paris: 'https://www.parisaeroport.fr/docs/default-source/groupe-fichiers/presse/2009_04_16_presse_dp-cdg-35-ans_en.pdf',
  dfw: 'https://www.dfwairport.com/dfwnewsroom/golden-anniversary-dfw-airport-marks-50-years-of-serving-north-texas/',
});

export const AIRPORT_HISTORY_OVERRIDES = {
  RJTT: [
    { fromYear: 1960, toYear: 1977, active: true, primary: true, sourceRefs: [SOURCES.narita] },
    { fromYear: 1978, toYear: null, active: true, primary: false, sourceRefs: [SOURCES.narita] },
  ],
  RJAA: [{ fromYear: 1978, toYear: null, active: true, primary: true, sourceRefs: [SOURCES.narita] }],
  RKSS: [
    { fromYear: 1960, toYear: 2000, active: true, primary: true, sourceRefs: [SOURCES.incheon] },
    { fromYear: 2001, toYear: null, active: true, primary: false, sourceRefs: [SOURCES.incheon] },
  ],
  RKSI: [{ fromYear: 2001, toYear: null, active: true, primary: true, sourceRefs: [SOURCES.incheon] }],
  RCSS: [
    { fromYear: 1960, toYear: 1978, active: true, primary: true, sourceRefs: [SOURCES.taoyuan] },
    { fromYear: 1979, toYear: null, active: true, primary: false, sourceRefs: [SOURCES.taoyuan] },
  ],
  RCTP: [{ fromYear: 1979, toYear: null, active: true, primary: true, sourceRefs: [SOURCES.taoyuan] }],
  RJOO: [
    { fromYear: 1960, toYear: 1993, active: true, primary: true, sourceRefs: [SOURCES.itami] },
    { fromYear: 1994, toYear: null, active: true, primary: false, sourceRefs: [SOURCES.itami] },
  ],
  RJBB: [{ fromYear: 1994, toYear: null, active: true, primary: true, sourceRefs: [SOURCES.kansai] }],
  VTBD: [
    { fromYear: 1960, toYear: 2005, active: true, primary: true, sourceRefs: [SOURCES.bangkok] },
    { fromYear: 2006, toYear: null, active: true, primary: false, sourceRefs: [SOURCES.bangkok] },
  ],
  VTBS: [{ fromYear: 2006, toYear: null, active: true, primary: true, sourceRefs: [SOURCES.bangkok] }],
  WSAP: [{ fromYear: 1960, toYear: 1980, active: true, primary: true, sourceRefs: [SOURCES.changi] }],
  WSSS: [{ fromYear: 1981, toYear: null, active: true, primary: true, sourceRefs: [SOURCES.changi] }],
  VHHH: [{ fromYear: 1998, toYear: null, active: true, primary: true, sourceRefs: [SOURCES.hongkong] }],
  ZSSS: [
    { fromYear: 1960, toYear: 1998, active: true, primary: true, sourceRefs: [SOURCES.pudong] },
    { fromYear: 1999, toYear: null, active: true, primary: false, sourceRefs: [SOURCES.pudong] },
  ],
  ZSPD: [{ fromYear: 1999, toYear: null, active: true, primary: true, sourceRefs: [SOURCES.pudong] }],
  ZBAA: [
    { fromYear: 1960, toYear: 2018, active: true, primary: true, sourceRefs: [SOURCES.daxing] },
    { fromYear: 2019, toYear: null, active: true, primary: true, sourceRefs: [SOURCES.daxing] },
  ],
  ZBAD: [{ fromYear: 2019, toYear: null, active: true, primary: false, sourceRefs: [SOURCES.daxing] }],
  EGLC: [{ fromYear: 1987, toYear: null, active: true, primary: false, sourceRefs: ['https://www.londoncityairport.com/corporate/about-us/our-history'] }],
  LFPO: [
    { fromYear: 1960, toYear: 1973, active: true, primary: true, sourceRefs: [SOURCES.paris] },
    { fromYear: 1974, toYear: null, active: true, primary: false, sourceRefs: [SOURCES.paris] },
  ],
  LFPG: [{ fromYear: 1974, toYear: null, active: true, primary: true, sourceRefs: [SOURCES.paris] }],
  KDAL: [
    { fromYear: 1960, toYear: 1973, active: true, primary: true, sourceRefs: [SOURCES.dfw] },
    { fromYear: 1974, toYear: null, active: true, primary: false, sourceRefs: [SOURCES.dfw] },
  ],
  KDFW: [{ fromYear: 1974, toYear: null, active: true, primary: true, sourceRefs: [SOURCES.dfw] }],
};

export const HISTORIC_AIRPORTS = [{
  id: 'historic-hongkong-kaitak',
  cityId: 'hongkong',
  servedCityIds: ['hongkong'],
  name: 'Kai Tak Airport',
  lat: 22.3286,
  lon: 114.1947,
  source: {
    provider: 'historical_override',
    ident: 'KAI-TAK',
  },
  codes: { iata: 'HKG', icao: 'VHHH', ident: 'KAI-TAK' },
  factual: {
    type: 'large_airport',
    elevationFt: 28,
    scheduledService: true,
    maxRunwayM: 3390,
    hardSurface: true,
    lighted: true,
    openRunwayCount: 1,
    runways: [],
  },
  history: [{ fromYear: 1960, toYear: 1997, active: true, primary: true, sourceRefs: [SOURCES.hongkong] }],
  gameplay: { role: 'primary_hub', feeTier: 4, capacityTier: 4, accessTier: 5, infrastructureTier: 5 },
  audit: { confidence: 'verified', matchScore: null, distanceKm: 4.5, sourceRefs: [SOURCES.hongkong] },
}];

export const AIRPORT_MIGRATION_OVERRIDES = [
  { id: 'paris-cdg-1974', cityId: 'paris', fromIdent: 'LFPO', toIdent: 'LFPG', year: 1974, mandatory: false, sourceRefs: [SOURCES.paris] },
  { id: 'dallas-dfw-1974', cityId: 'dallas', fromIdent: 'KDAL', toIdent: 'KDFW', year: 1974, mandatory: false, sourceRefs: [SOURCES.dfw] },
  { id: 'tokyo-narita-1978', cityId: 'tokyo', fromIdent: 'RJTT', toIdent: 'RJAA', year: 1978, mandatory: false, sourceRefs: [SOURCES.narita] },
  { id: 'taipei-taoyuan-1979', cityId: 'taipei', fromIdent: 'RCSS', toIdent: 'RCTP', year: 1979, mandatory: false, sourceRefs: [SOURCES.taoyuan] },
  { id: 'singapore-changi-1981', cityId: 'singapore', fromIdent: 'WSAP', toIdent: 'WSSS', year: 1981, mandatory: true, sourceRefs: [SOURCES.changi] },
  { id: 'osaka-kansai-1994', cityId: 'osaka', fromIdent: 'RJOO', toIdent: 'RJBB', year: 1994, mandatory: false, sourceRefs: [SOURCES.kansai, SOURCES.itami] },
  { id: 'hongkong-cheklapkok-1998', cityId: 'hongkong', fromIdent: 'KAI-TAK', toIdent: 'VHHH', year: 1998, mandatory: true, sourceRefs: [SOURCES.hongkong] },
  { id: 'shanghai-pudong-1999', cityId: 'shanghai', fromIdent: 'ZSSS', toIdent: 'ZSPD', year: 1999, mandatory: false, sourceRefs: [SOURCES.pudong] },
  { id: 'seoul-incheon-2001', cityId: 'seoul', fromIdent: 'RKSS', toIdent: 'RKSI', year: 2001, mandatory: false, sourceRefs: [SOURCES.incheon] },
  { id: 'bangkok-suvarnabhumi-2006', cityId: 'bangkok', fromIdent: 'VTBD', toIdent: 'VTBS', year: 2006, mandatory: false, sourceRefs: [SOURCES.bangkok] },
  { id: 'beijing-daxing-2019', cityId: 'beijing', fromIdent: 'ZBAA', toIdent: 'ZBAD', year: 2019, mandatory: false, sourceRefs: [SOURCES.daxing] },
];
