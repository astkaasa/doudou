import { CITIES } from "./cities.js";
import { cityPopulationForEra, cityPopulationQuarterlyRate } from './cityPopulation.js';

const CITY_BY_ID = new Map(CITIES.map((city) => [city.id, city]));

export const CITY_ERA_DATA = {
  "beijing": [
    [
      5.5,
      30,
      22
    ],
    [
      8,
      34,
      25
    ],
    [
      10.5,
      68,
      47
    ]
  ],
  "shanghai": [
    [
      5.8,
      36,
      13
    ],
    [
      7.5,
      38,
      14
    ],
    [
      11,
      71,
      47
    ]
  ],
  "tokyo": [
    [
      9.8,
      55,
      31
    ],
    [
      11,
      73,
      35
    ],
    [
      12.5,
      72,
      53
    ]
  ],
  "seoul": [
    [
      2.4,
      14,
      9
    ],
    [
      5.5,
      28,
      16
    ],
    [
      9.5,
      65,
      43
    ]
  ],
  "hongkong": [
    [
      3,
      49,
      25
    ],
    [
      4,
      64,
      38
    ],
    [
      6.7,
      77,
      49
    ]
  ],
  "urumqi": [
    [
      0.7,
      5,
      20
    ],
    [
      1,
      11,
      22
    ],
    [
      1.8,
      15,
      22
    ]
  ],
  "lhasa": [
    [
      0.15,
      6,
      18
    ],
    [
      0.2,
      11,
      24
    ],
    [
      0.35,
      18,
      35
    ]
  ],
  "chengdu": [
    [
      2.5,
      15,
      5
    ],
    [
      3.5,
      22,
      14
    ],
    [
      6,
      54,
      36
    ]
  ],
  "wuhan": [
    [
      2.2,
      10,
      2
    ],
    [
      3.2,
      20,
      5
    ],
    [
      5.5,
      46,
      22
    ]
  ],
  "harbin": [
    [
      1.8,
      9,
      2
    ],
    [
      2.5,
      12,
      5
    ],
    [
      4.2,
      35,
      15
    ]
  ],
  "xian": [
    [
      1.5,
      10,
      22
    ],
    [
      2.2,
      12,
      25
    ],
    [
      4.5,
      39,
      32
    ]
  ],
  "taipei": [
    [
      1.2,
      25,
      11
    ],
    [
      2.8,
      45,
      18
    ],
    [
      5,
      67,
      38
    ]
  ],
  "fukuoka": [
    [
      1.2,
      21,
      11
    ],
    [
      1.5,
      33,
      21
    ],
    [
      2.2,
      43,
      24
    ]
  ],
  "sapporo": [
    [
      0.8,
      17,
      40
    ],
    [
      1.2,
      24,
      49
    ],
    [
      1.8,
      31,
      47
    ]
  ],
  "okinawa": [
    [
      0.5,
      1,
      40
    ],
    [
      0.7,
      8,
      45
    ],
    [
      1,
      13,
      55
    ]
  ],
  "ulanbator": [
    [
      0.35,
      2,
      5
    ],
    [
      0.45,
      8,
      5
    ],
    [
      0.7,
      10,
      10
    ]
  ],
  "osaka": [
    [
      2,
      38,
      20
    ],
    [
      2.3,
      50,
      28
    ],
    [
      2.7,
      58,
      32
    ]
  ],
  "singapore": [
    [
      1.6,
      40,
      20
    ],
    [
      2.2,
      57,
      28
    ],
    [
      4,
      82,
      54
    ]
  ],
  "bangkok": [
    [
      1.8,
      12,
      21
    ],
    [
      3,
      25,
      30
    ],
    [
      6.5,
      40,
      52
    ]
  ],
  "manila": [
    [
      2.4,
      22,
      11
    ],
    [
      3.5,
      21,
      17
    ],
    [
      10,
      38,
      19
    ]
  ],
  "jakarta": [
    [
      2.8,
      14,
      4
    ],
    [
      5,
      18,
      10
    ],
    [
      8.5,
      36,
      15
    ]
  ],
  "brunei": [
    [
      0.08,
      7,
      1
    ],
    [
      0.1,
      15,
      3
    ],
    [
      0.25,
      20,
      10
    ]
  ],
  "guam": [
    [
      0.06,
      5,
      44
    ],
    [
      0.08,
      9,
      47
    ],
    [
      0.12,
      10,
      54
    ]
  ],
  "saipan": [
    [
      0.01,
      5,
      40
    ],
    [
      0.01,
      5,
      45
    ],
    [
      0.04,
      10,
      50
    ]
  ],
  "male": [
    [
      0.02,
      3,
      42
    ],
    [
      0.03,
      0,
      42
    ],
    [
      0.08,
      10,
      55
    ]
  ],
  "hanoi": [
    [
      0.8,
      7,
      4
    ],
    [
      1.2,
      12,
      2
    ],
    [
      2.8,
      24,
      18
    ]
  ],
  "delhi": [
    [
      2.8,
      25,
      10
    ],
    [
      4.5,
      26,
      15
    ],
    [
      12,
      47,
      27
    ]
  ],
  "mumbai": [
    [
      3.5,
      27,
      10
    ],
    [
      5.5,
      31,
      11
    ],
    [
      14,
      51,
      22
    ]
  ],
  "kolkata": [
    [
      3,
      17,
      7
    ],
    [
      4.5,
      18,
      7
    ],
    [
      11,
      32,
      11
    ]
  ],
  "karachi": [
    [
      2,
      19,
      5
    ],
    [
      4,
      25,
      8
    ],
    [
      10,
      31,
      13
    ]
  ],
  "dubai": [
    [
      0.04,
      15,
      6
    ],
    [
      0.2,
      36,
      11
    ],
    [
      0.8,
      69,
      56
    ]
  ],
  "baghdad": [
    [
      1.2,
      16,
      5
    ],
    [
      2.2,
      21,
      10
    ],
    [
      4.5,
      14,
      10
    ]
  ],
  "tehran": [
    [
      2,
      19,
      10
    ],
    [
      3.5,
      29,
      15
    ],
    [
      7,
      34,
      13
    ]
  ],
  "islamabad": [
    [
      0.1,
      9,
      1
    ],
    [
      0.2,
      10,
      2
    ],
    [
      0.5,
      17,
      10
    ]
  ],
  "mecca": [
    [
      0.2,
      4,
      38
    ],
    [
      0.35,
      2,
      48
    ],
    [
      0.8,
      10,
      61
    ]
  ],
  "riyadh": [
    [
      0.15,
      13,
      2
    ],
    [
      0.6,
      22,
      11
    ],
    [
      2.5,
      40,
      15
    ]
  ],
  "tashkent": [
    [
      1,
      11,
      4
    ],
    [
      1.5,
      11,
      2
    ],
    [
      2.2,
      11,
      10
    ]
  ],
  "astana": [
    [0.13, 8, 4],
    [0.23, 12, 6],
    [0.35, 25, 12]
  ],
  "london": [
    [
      8,
      75,
      42
    ],
    [
      7.5,
      74,
      48
    ],
    [
      7.8,
      85,
      58
    ]
  ],
  "paris": [
    [
      2.8,
      56,
      55
    ],
    [
      2.6,
      56,
      64
    ],
    [
      2.5,
      64,
      75
    ]
  ],
  "istanbul": [
    [
      1.8,
      24,
      40
    ],
    [
      2.8,
      26,
      51
    ],
    [
      8.8,
      47,
      56
    ]
  ],
  "moscow": [
    [
      5,
      42,
      23
    ],
    [
      7,
      45,
      27
    ],
    [
      9,
      47,
      35
    ]
  ],
  "berlin": [
    [
      3.2,
      38,
      12
    ],
    [
      3.1,
      38,
      15
    ],
    [
      3.4,
      50,
      30
    ]
  ],
  "copenhagen": [
    [
      1,
      34,
      16
    ],
    [
      1.1,
      40,
      22
    ],
    [
      1.2,
      51,
      30
    ]
  ],
  "stockholm": [
    [
      0.8,
      28,
      16
    ],
    [
      0.9,
      35,
      21
    ],
    [
      1,
      52,
      29
    ]
  ],
  "oslo": [
    [
      0.5,
      20,
      13
    ],
    [
      0.55,
      25,
      14
    ],
    [
      0.65,
      42,
      22
    ]
  ],
  "rome": [
    [
      2.2,
      30,
      53
    ],
    [
      2.8,
      33,
      54
    ],
    [
      3,
      41,
      63
    ]
  ],
  "madrid": [
    [
      2.5,
      23,
      23
    ],
    [
      3.5,
      29,
      31
    ],
    [
      4.2,
      41,
      45
    ]
  ],
  "lisbon": [
    [
      1.3,
      13,
      18
    ],
    [
      1.5,
      20,
      23
    ],
    [
      2,
      30,
      38
    ]
  ],
  "athens": [
    [
      1.5,
      16,
      44
    ],
    [
      2,
      20,
      52
    ],
    [
      3,
      26,
      55
    ]
  ],
  "warsaw": [
    [
      1.2,
      9,
      8
    ],
    [
      1.4,
      16,
      10
    ],
    [
      1.7,
      26,
      16
    ]
  ],
  "minsk": [
    [
      0.8,
      11,
      2
    ],
    [
      1,
      11,
      3
    ],
    [
      1.2,
      13,
      10
    ]
  ],
  "kyiv": [
    [
      1.1,
      11,
      3
    ],
    [
      1.3,
      17,
      4
    ],
    [
      2.2,
      28,
      16
    ]
  ],
  "amsterdam": [
    [
      0.9,
      46,
      28
    ],
    [
      1,
      48,
      38
    ],
    [
      1.1,
      62,
      47
    ]
  ],
  "zurich": [
    [
      0.4,
      57,
      24
    ],
    [
      0.42,
      59,
      22
    ],
    [
      0.45,
      71,
      32
    ]
  ],
  "vienna": [
    [
      1.6,
      26,
      43
    ],
    [
      1.7,
      33,
      49
    ],
    [
      1.8,
      41,
      55
    ]
  ],
  "rostov": [
    [
      0.6,
      11,
      20
    ],
    [
      0.7,
      12,
      22
    ],
    [
      0.8,
      12,
      22
    ]
  ],
  "barcelona": [
    [
      1.5,
      24,
      19
    ],
    [
      1.8,
      28,
      32
    ],
    [
      2.2,
      41,
      54
    ]
  ],
  "marseille": [
    [
      0.7,
      20,
      12
    ],
    [
      0.75,
      18,
      21
    ],
    [
      0.8,
      24,
      22
    ]
  ],
  "munich": [
    [
      1.2,
      29,
      15
    ],
    [
      1.3,
      39,
      20
    ],
    [
      1.5,
      54,
      33
    ]
  ],
  "stpetersburg": [
    [
      3,
      26,
      15
    ],
    [
      3.5,
      30,
      20
    ],
    [
      4.2,
      32,
      24
    ]
  ],
  "seville": [
    [
      0.5,
      18,
      40
    ],
    [
      0.6,
      22,
      48
    ],
    [
      0.7,
      28,
      52
    ]
  ],
  "hannover": [
    [
      0.4,
      30,
      10
    ],
    [
      0.5,
      35,
      12
    ],
    [
      0.5,
      38,
      15
    ]
  ],
  "milan": [
    [
      1,
      42,
      22
    ],
    [
      1.1,
      50,
      28
    ],
    [
      1.3,
      58,
      35
    ]
  ],
  "algiers": [
    [
      1.2,
      15,
      9
    ],
    [
      1.8,
      12,
      10
    ],
    [
      2.8,
      17,
      12
    ]
  ],
  "dakar": [
    [
      0.5,
      11,
      5
    ],
    [
      0.7,
      10,
      9
    ],
    [
      1.2,
      16,
      11
    ]
  ],
  "abuja": [
    [
      0.1,
      4,
      5
    ],
    [
      0.2,
      10,
      1
    ],
    [
      0.8,
      18,
      10
    ]
  ],
  "casablanca": [
    [
      1.2,
      12,
      11
    ],
    [
      1.8,
      17,
      14
    ],
    [
      3.2,
      25,
      21
    ]
  ],
  "tunis": [
    [
      0.5,
      13,
      7
    ],
    [
      0.7,
      13,
      11
    ],
    [
      0.9,
      15,
      16
    ]
  ],
  "cairo": [
    [
      3.5,
      20,
      40
    ],
    [
      6,
      23,
      47
    ],
    [
      10,
      32,
      53
    ]
  ],
  "nairobi": [
    [
      0.35,
      15,
      8
    ],
    [
      0.6,
      18,
      13
    ],
    [
      2.2,
      24,
      19
    ]
  ],
  "addisababa": [
    [
      0.5,
      6,
      2
    ],
    [
      0.8,
      9,
      9
    ],
    [
      2,
      16,
      12
    ]
  ],
  "daressalaam": [
    [
      0.3,
      2,
      0
    ],
    [
      0.5,
      7,
      3
    ],
    [
      1.5,
      16,
      10
    ]
  ],
  "kinshasa": [
    [
      0.4,
      8,
      3
    ],
    [
      1.2,
      8,
      2
    ],
    [
      5,
      9,
      10
    ]
  ],
  "lagos": [
    [
      0.8,
      8,
      6
    ],
    [
      2.5,
      14,
      4
    ],
    [
      8,
      22,
      10
    ]
  ],
  "johannesburg": [
    [
      1.2,
      24,
      9
    ],
    [
      1.8,
      32,
      11
    ],
    [
      3.2,
      37,
      12
    ]
  ],
  "capetown": [
    [
      0.8,
      16,
      9
    ],
    [
      1.1,
      16,
      13
    ],
    [
      2,
      22,
      21
    ]
  ],
  "newyork": [
    [
      7.8,
      85,
      41
    ],
    [
      7.6,
      83,
      45
    ],
    [
      8,
      87,
      58
    ]
  ],
  "chicago": [
    [
      3.5,
      52,
      17
    ],
    [
      3.2,
      51,
      23
    ],
    [
      2.8,
      54,
      22
    ]
  ],
  "miami": [
    [
      0.3,
      19,
      29
    ],
    [
      0.5,
      28,
      43
    ],
    [
      0.8,
      41,
      56
    ]
  ],
  "washington": [
    [
      0.75,
      45,
      20
    ],
    [
      0.9,
      46,
      29
    ],
    [
      1.2,
      50,
      31
    ]
  ],
  "ottawa": [
    [
      0.35,
      21,
      13
    ],
    [
      0.45,
      27,
      13
    ],
    [
      0.55,
      29,
      17
    ]
  ],
  "atlanta": [
    [
      0.5,
      19,
      15
    ],
    [
      0.7,
      30,
      18
    ],
    [
      1,
      42,
      23
    ]
  ],
  "montreal": [
    [
      1.4,
      42,
      28
    ],
    [
      1.6,
      50,
      32
    ],
    [
      1.7,
      55,
      35
    ]
  ],
  "havana": [
    [
      1.2,
      11,
      28
    ],
    [
      1.5,
      4,
      25
    ],
    [
      2,
      10,
      30
    ]
  ],
  "kingston": [
    [
      0.3,
      8,
      24
    ],
    [
      0.4,
      9,
      26
    ],
    [
      0.55,
      10,
      32
    ]
  ],
  "santodomingo": [
    [
      0.4,
      3,
      25
    ],
    [
      0.6,
      11,
      26
    ],
    [
      0.9,
      17,
      30
    ]
  ],
  "mexicocity": [
    [
      5,
      21,
      20
    ],
    [
      8,
      28,
      19
    ],
    [
      12,
      36,
      32
    ]
  ],
  "dallas": [
    [
      0.7,
      23,
      8
    ],
    [
      1,
      32,
      7
    ],
    [
      1.4,
      41,
      15
    ]
  ],
  "denver": [
    [
      0.4,
      12,
      9
    ],
    [
      0.55,
      21,
      12
    ],
    [
      0.7,
      28,
      13
    ]
  ],
  "houston": [
    [
      0.6,
      17,
      5
    ],
    [
      1,
      27,
      8
    ],
    [
      1.6,
      42,
      15
    ]
  ],
  "losangeles": [
    [
      2.5,
      47,
      43
    ],
    [
      3.2,
      53,
      51
    ],
    [
      3.7,
      63,
      58
    ]
  ],
  "vancouver": [
    [
      0.8,
      15,
      15
    ],
    [
      1.1,
      25,
      20
    ],
    [
      1.8,
      40,
      25
    ]
  ],
  "seattle": [
    [
      0.5,
      18,
      10
    ],
    [
      0.7,
      19,
      10
    ],
    [
      1,
      35,
      19
    ]
  ],
  "honolulu": [
    [
      0.3,
      8,
      45
    ],
    [
      0.35,
      12,
      48
    ],
    [
      0.4,
      18,
      52
    ]
  ],
  "sanfrancisco": [
    [
      0.7,
      32,
      26
    ],
    [
      0.8,
      39,
      30
    ],
    [
      0.9,
      65,
      41
    ]
  ],
  "rio": [
    [
      3.2,
      18,
      30
    ],
    [
      5.5,
      28,
      42
    ],
    [
      6.7,
      35,
      55
    ]
  ],
  "saopaulo": [
    [
      3.5,
      28,
      13
    ],
    [
      7,
      37,
      11
    ],
    [
      12,
      59,
      23
    ]
  ],
  "buenosaires": [
    [
      3.5,
      25,
      13
    ],
    [
      4.5,
      25,
      16
    ],
    [
      5.5,
      42,
      32
    ]
  ],
  "brasilia": [
    [
      0.15,
      7,
      3
    ],
    [
      0.3,
      21,
      5
    ],
    [
      0.8,
      31,
      15
    ]
  ],
  "lima": [
    [
      1.5,
      10,
      9
    ],
    [
      2.5,
      13,
      15
    ],
    [
      5,
      26,
      21
    ]
  ],
  "bogota": [
    [
      1.2,
      12,
      3
    ],
    [
      2,
      17,
      11
    ],
    [
      4,
      34,
      14
    ]
  ],
  "santiago": [
    [
      1.2,
      13,
      6
    ],
    [
      1.8,
      25,
      9
    ],
    [
      3.5,
      46,
      27
    ]
  ],
  "caracas": [
    [
      1.2,
      16,
      6
    ],
    [
      2,
      24,
      10
    ],
    [
      3.5,
      31,
      10
    ]
  ],
  "quito": [
    [
      0.35,
      3,
      4
    ],
    [
      0.5,
      5,
      9
    ],
    [
      0.8,
      22,
      19
    ]
  ],
  "sydney": [
    [
      2,
      27,
      24
    ],
    [
      2.8,
      41,
      31
    ],
    [
      3.8,
      51,
      41
    ]
  ],
  "perth": [
    [
      0.4,
      13,
      11
    ],
    [
      0.6,
      15,
      14
    ],
    [
      0.9,
      25,
      20
    ]
  ],
  "melbourne": [
    [
      1.8,
      26,
      16
    ],
    [
      2.5,
      31,
      25
    ],
    [
      3.2,
      42,
      34
    ]
  ],
  "wellington": [
    [
      0.12,
      13,
      10
    ],
    [
      0.14,
      17,
      8
    ],
    [
      0.16,
      15,
      10
    ]
  ],
  "guangzhou": [
    [1.19, 18, 5],
    [1.64, 32, 8],
    [18.97, 65, 30]
  ],
  "shenzhen": [
    [0.26, 5, 1],
    [0.49, 12, 2],
    [8.18, 72, 20]
  ],
  "kualalumpur": [
    [0.09, 12, 8],
    [0.17, 28, 14],
    [4.14, 67, 45]
  ],
  "hochiminh": [
    [1.46, 10, 8],
    [2.38, 18, 12],
    [6.01, 52, 38]
  ],
  "dhaka": [
    [1.72, 8, 2],
    [5.04, 15, 3],
    [17.43, 35, 8]
  ],
  "bengaluru": [
    [1.48, 12, 4],
    [2.37, 24, 5],
    [6.05, 70, 23]
  ],
  "doha": [
    [0.02, 10, 4],
    [0.04, 18, 5],
    [0.3, 58, 28]
  ],
  "jeddah": [
    [0.05, 16, 12],
    [0.19, 25, 18],
    [1.68, 45, 35]
  ],
  "frankfurt": [
    [0.68, 50, 22],
    [0.68, 60, 27],
    [0.71, 78, 39]
  ],
  "toronto": [
    [1.25, 42, 25],
    [1.98, 52, 30],
    [3.79, 70, 46]
  ],
  "panamacity": [
    [0.15, 20, 17],
    [0.28, 29, 23],
    [0.86, 48, 38]
  ],
  "auckland": [
    [0.18, 25, 20],
    [0.27, 34, 26],
    [0.66, 55, 48]
  ],
  "brisbane": [
    [0.02, 20, 12],
    [0.06, 30, 18],
    [0.57, 52, 35]
  ],
  "accra": [
    [0.49, 13, 8],
    [0.86, 20, 12],
    [2.61, 38, 28]
  ]
};

export const SUB_REGION_GROWTH = {
  "east_asia": {
    "era1": {
      "pop": 0.006,
      "biz": 0.08,
      "tour": 0.06
    },
    "era2": {
      "pop": 0.01,
      "biz": 0.22,
      "tour": 0.12
    },
    "era3": {
      "pop": 0.012,
      "biz": 0.18,
      "tour": 0.2
    }
  },
  "southeast_asia": {
    "era1": {
      "pop": 0.008,
      "biz": 0.06,
      "tour": 0.1
    },
    "era2": {
      "pop": 0.012,
      "biz": 0.15,
      "tour": 0.18
    },
    "era3": {
      "pop": 0.014,
      "biz": 0.12,
      "tour": 0.22
    }
  },
  "south_asia": {
    "era1": {
      "pop": 0.01,
      "biz": 0.05,
      "tour": 0.04
    },
    "era2": {
      "pop": 0.012,
      "biz": 0.1,
      "tour": 0.06
    },
    "era3": {
      "pop": 0.014,
      "biz": 0.15,
      "tour": 0.1
    }
  },
  "central_asia": {
    "era1": { "pop": 0.006, "biz": 0.06, "tour": 0.04 },
    "era2": { "pop": 0.008, "biz": 0.08, "tour": 0.06 },
    "era3": { "pop": 0.01, "biz": 0.12, "tour": 0.1 }
  },
  "mideast": {
    "era1": {
      "pop": 0.012,
      "biz": 0.18,
      "tour": 0.05
    },
    "era2": {
      "pop": 0.016,
      "biz": 0.15,
      "tour": 0.1
    },
    "era3": {
      "pop": 0.014,
      "biz": 0.1,
      "tour": 0.18
    }
  },
  "europe": {
    "era1": {
      "pop": 0.003,
      "biz": 0.06,
      "tour": 0.1
    },
    "era2": {
      "pop": 0.002,
      "biz": 0.08,
      "tour": 0.12
    },
    "era3": {
      "pop": 0.002,
      "biz": 0.06,
      "tour": 0.08
    }
  },
  "north_africa": {
    "era1": {
      "pop": 0.01,
      "biz": 0.04,
      "tour": 0.06
    },
    "era2": {
      "pop": 0.012,
      "biz": 0.06,
      "tour": 0.1
    },
    "era3": {
      "pop": 0.014,
      "biz": 0.05,
      "tour": 0.08
    }
  },
  "west_africa": {
    "era1": { "pop": 0.01, "biz": 0.05, "tour": 0.04 },
    "era2": { "pop": 0.013, "biz": 0.08, "tour": 0.06 },
    "era3": { "pop": 0.015, "biz": 0.12, "tour": 0.1 }
  },
  "east_africa": {
    "era1": { "pop": 0.011, "biz": 0.05, "tour": 0.05 },
    "era2": { "pop": 0.014, "biz": 0.08, "tour": 0.08 },
    "era3": { "pop": 0.016, "biz": 0.12, "tour": 0.12 }
  },
  "central_africa": {
    "era1": {
      "pop": 0.014,
      "biz": 0.03,
      "tour": 0.02
    },
    "era2": {
      "pop": 0.018,
      "biz": 0.05,
      "tour": 0.04
    },
    "era3": {
      "pop": 0.02,
      "biz": 0.06,
      "tour": 0.05
    }
  },
  "south_africa": {
    "era1": {
      "pop": 0.01,
      "biz": 0.05,
      "tour": 0.04
    },
    "era2": {
      "pop": 0.012,
      "biz": 0.06,
      "tour": 0.08
    },
    "era3": {
      "pop": 0.008,
      "biz": 0.08,
      "tour": 0.1
    }
  },
  "east_namerica": {
    "era1": {
      "pop": 0.004,
      "biz": 0.06,
      "tour": 0.08
    },
    "era2": {
      "pop": 0.003,
      "biz": 0.05,
      "tour": 0.1
    },
    "era3": {
      "pop": 0.003,
      "biz": 0.04,
      "tour": 0.06
    }
  },
  "caribbean": {
    "era1": {
      "pop": 0.008,
      "biz": 0.03,
      "tour": 0.12
    },
    "era2": {
      "pop": 0.008,
      "biz": 0.04,
      "tour": 0.1
    },
    "era3": {
      "pop": 0.006,
      "biz": 0.05,
      "tour": 0.08
    }
  },
  "central_namerica": {
    "era1": {
      "pop": 0.008,
      "biz": 0.06,
      "tour": 0.05
    },
    "era2": {
      "pop": 0.01,
      "biz": 0.1,
      "tour": 0.06
    },
    "era3": {
      "pop": 0.008,
      "biz": 0.08,
      "tour": 0.06
    }
  },
  "west_namerica": {
    "era1": {
      "pop": 0.01,
      "biz": 0.08,
      "tour": 0.08
    },
    "era2": {
      "pop": 0.008,
      "biz": 0.12,
      "tour": 0.08
    },
    "era3": {
      "pop": 0.006,
      "biz": 0.15,
      "tour": 0.06
    }
  },
  "samerica": {
    "era1": {
      "pop": 0.01,
      "biz": 0.05,
      "tour": 0.04
    },
    "era2": {
      "pop": 0.012,
      "biz": 0.06,
      "tour": 0.06
    },
    "era3": {
      "pop": 0.008,
      "biz": 0.08,
      "tour": 0.08
    }
  },
  "oceania": {
    "era1": {
      "pop": 0.01,
      "biz": 0.06,
      "tour": 0.08
    },
    "era2": {
      "pop": 0.008,
      "biz": 0.08,
      "tour": 0.1
    },
    "era3": {
      "pop": 0.006,
      "biz": 0.06,
      "tour": 0.08
    }
  }
};

const DEFAULT_BIZ = 20;
const DEFAULT_TOUR = 15;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function fallbackCityState(city) {
  const rawPop = normalizeNumber(city?.pop, 0);
  const pop = rawPop > 1000 ? rawPop / 1000 : rawPop;
  return {
    pop: Number(pop.toFixed(2)),
    biz: DEFAULT_BIZ,
    tour: DEFAULT_TOUR,
  };
}

function eraSlot(eraId) {
  if (eraId === "era2") return 1;
  if (eraId === "era3") return 2;
  return 0;
}

function cityRecord(city, eraId) {
  const rows = CITY_ERA_DATA[city.id];
  const row = Array.isArray(rows) ? rows[eraSlot(eraId)] : null;
  const fallback = fallbackCityState(city);
  const population = cityPopulationForEra(city.id, eraId);
  if (!Array.isArray(row)) return { ...fallback, pop: population ?? fallback.pop };
  return { pop: population ?? row[0], biz: row[1], tour: row[2] };
}

function normalizeMarketRecord(record, fallback) {
  return {
    pop: Math.max(0, normalizeNumber(record?.pop, fallback.pop)),
    biz: clamp(normalizeNumber(record?.biz, fallback.biz), 0, 100),
    tour: clamp(normalizeNumber(record?.tour, fallback.tour), 0, 100),
  };
}

function growthProfile(subRegion, eraId, year) {
  const profile = SUB_REGION_GROWTH[subRegion];
  if (!profile) return { pop: 0.005, biz: 0.05, tour: 0.05 };
  if (eraId === "era4") {
    if (year < 1975) return profile.era1;
    if (year < 2000) return profile.era2;
    return profile.era3;
  }
  return profile[eraId] || profile.era1;
}

export function initCityStates(eraId = "era1") {
  return Object.fromEntries(CITIES.map((city) => {
    const fallback = fallbackCityState(city);
    return [city.id, normalizeMarketRecord(cityRecord(city, eraId), fallback)];
  }));
}

export function normalizeCityStates(state) {
  const defaults = initCityStates(state?.era);
  const source = state?.cityStates && typeof state.cityStates === "object" ? state.cityStates : {};
  return Object.fromEntries(CITIES.map((city) => {
    const fallback = defaults[city.id] ?? fallbackCityState(city);
    const current = source[city.id] && typeof source[city.id] === "object" ? source[city.id] : {};
    return [city.id, normalizeMarketRecord(current, fallback)];
  }));
}

export function getCityMarketState(state, cityId) {
  const city = CITY_BY_ID.get(cityId);
  if (!city) return { pop: 0, biz: DEFAULT_BIZ, tour: DEFAULT_TOUR };
  const market = state?.cityStates?.[cityId];
  if (!market || typeof market !== "object") return fallbackCityState(city);
  return normalizeMarketRecord(market, fallbackCityState(city));
}

export function growCityStates(state, random = () => 0.5) {
  const current = normalizeCityStates(state);
  const next = {};
  for (const city of CITIES) {
    const market = current[city.id];
    const region = growthProfile(city.subRegion, state.era, state.year);
    const populationRate = cityPopulationQuarterlyRate(city.id, state.year, state.quarter);
    const bizDiminish = 1 - market.biz / 120;
    const tourDiminish = 1 - market.tour / 120;
    next[city.id] = {
      pop: Math.round(market.pop * (1 + populationRate + (random() - 0.5) * 0.0005) * 10000) / 10000,
      biz: Math.round(clamp(market.biz + region.biz * Math.max(0.15, bizDiminish) + (random() - 0.5) * 0.1, 0, 100)),
      tour: Math.round(clamp(market.tour + region.tour * Math.max(0.15, tourDiminish) + (random() - 0.5) * 0.1, 0, 100)),
    };
  }
  state.cityStates = next;
  return next;
}
