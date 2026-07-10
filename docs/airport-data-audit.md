# 机场数据匹配审计

快照日期：2026-07-09

- 城市：123
- 精简真实机场：891
- 置信度：verified 14，high 109，medium 0，low 0
- 每座城市均生成一个稳定的 `virtual-{cityId}` 抽象机场；medium/low 匹配默认使用抽象机场。

| cityId | 城市 | 首选真实机场 | 代码 | 距市中心 km | 置信度 | 当前默认 | 警告 |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| beijing | 北京 | Beijing Capital International Airport | PEK | 25.6 | verified | oa-27188 | — |
| shanghai | 上海 | Shanghai Pudong International Airport | PVG | 29.5 | verified | oa-27223 | — |
| tokyo | 东京 | Tokyo Haneda International Airport | HND | 16.7 | verified | oa-5627 | — |
| seoul | 首尔 | Incheon International Airport | ICN | 51.4 | verified | oa-5653 | — |
| hongkong | 香港 | Hong Kong International Airport | HKG | 28.3 | high | oa-26535 | — |
| urumqi | 乌鲁木齐 | Ürümqi Tianshan International Airport | URC | 16.4 | high | oa-27236 | — |
| lhasa | 拉萨 | Lhasa Gonggar International Airport | LXA | 38.2 | high | oa-31867 | — |
| chengdu | 成都 | Chengdu Shuangliu International Airport | CTU | 16.4 | high | oa-27230 | — |
| wuhan | 武汉 | Wuhan Tianhe International Airport | WUH | 21.1 | high | oa-27200 | — |
| harbin | 哈尔滨 | Harbin Taiping International Airport | HRB | 26.8 | high | oa-27238 | — |
| xian | 西安 | Xi'an Xianyang International Airport | XIY | 19.4 | high | oa-27205 | — |
| taipei | 台北 | Taiwan Taoyuan International Airport | TPE | 28.3 | verified | oa-5528 | — |
| fukuoka | 福冈 | Fukuoka Airport | FUK | 6.3 | high | oa-5564 | — |
| sapporo | 札幌 | New Chitose Airport | CTS | 47.3 | high | oa-5544 | — |
| okinawa | 那霸（冲绳） | Naha International Airport | OKA | 13 | high | oa-5671 | — |
| ulanbator | 乌兰巴托 | Ulaanbaatar Chinggis Khaan International Airport | UBN | 28.5 | high | oa-335326 | — |
| osaka | 大阪 | Kansai International Airport | KIX | 37.5 | verified | oa-5536 | — |
| singapore | 新加坡 | Singapore Changi Airport | SIN | 23.4 | high | oa-26887 | — |
| bangkok | 曼谷 | Suvarnabhumi Airport | BKK | 29.3 | verified | oa-28118 | — |
| manila | 马尼拉 | Ninoy Aquino International Airport | MNL | 10.4 | high | oa-5689 | — |
| jakarta | 雅加达 | Soekarno-Hatta International Airport | CGK | 18.5 | verified | oa-26835 | — |
| brunei | 斯里巴加湾市 | Brunei International Airport | BWN | 7.6 | high | oa-26819 | — |
| guam | 关岛 | Antonio B. Won Pat International Airport | GUM | 10.6 | high | oa-5433 | — |
| saipan | 塞班 | Saipan International Airport | SPN | 8.9 | high | oa-5431 | — |
| male | 马累 | Velana International Airport | MLE | 2.1 | high | oa-26636 | — |
| hanoi | 河内 | Noi Bai International Airport | HAN | 23.5 | high | oa-26700 | — |
| delhi | 德里 | Indira Gandhi International Airport | DEL | 9.6 | high | oa-26555 | — |
| mumbai | 孟买 | Chhatrapati Shivaji Maharaj International Airport | BOM | 3.6 | high | oa-26434 | — |
| kolkata | 加尔各答 | Netaji Subhash Chandra Bose International Airport | CCU | 5.7 | high | oa-26496 | — |
| karachi | 卡拉奇 | Jinnah International Airport | KHI | 16.3 | high | oa-5255 | — |
| dubai | 迪拜 | Dubai International Airport | DXB | 9 | high | oa-5235 | — |
| baghdad | 巴格达 | Baghdad International Airport / New Al Muthana Air Base | BGW | 15 | high | oa-5289 | — |
| tehran | 德黑兰 | Imam Khomeini International Airport | IKA | 38.4 | verified | oa-5166 | — |
| islamabad | 伊斯兰堡 | Islamabad International Airport | ISB | 23.9 | high | oa-333692 | — |
| mecca | 麦加 | King Abdulaziz International Airport | JED | 75.3 | verified | oa-5097 | — |
| riyadh | 利雅得 | King Khalid International Airport | RUH | 28.7 | high | oa-5112 | — |
| tashkent | 塔什干 | Tashkent International Airport | TAS | 3.9 | high | oa-26392 | — |
| astana | 阿斯塔纳 | Nursultan Nazarbayev International Airport | NQZ | 17.1 | high | oa-6423 | — |
| london | 伦敦 | London Heathrow Airport | LHR | 24.4 | verified | oa-2434 | — |
| paris | 巴黎 | Paris-Le Bourget International Airport | LBG | 11.5 | high | oa-4183 | — |
| istanbul | 伊斯坦布尔 | İstanbul Airport | IST | 38.9 | high | oa-317457 | — |
| moscow | 莫斯科 | Sheremetyevo International Airport | SVO | 22.3 | high | oa-26396 | — |
| berlin | 柏林 | Berlin Brandenburg Airport | BER | 18.2 | high | oa-301881 | — |
| copenhagen | 哥本哈根 | Copenhagen Kastrup Airport | CPH | 8.8 | high | oa-2542 | — |
| stockholm | 斯德哥尔摩 | Stockholm-Arlanda Airport | ARN | 41.2 | high | oa-2701 | — |
| oslo | 奥斯陆 | Oslo-Gardermoen International Airport | OSL | 39.8 | high | oa-2578 | — |
| rome | 罗马 | Rome–Fiumicino Leonardo da Vinci International Airport | FCO | 22.4 | high | oa-4372 | — |
| madrid | 马德里 | Adolfo Suárez Madrid–Barajas Airport | MAD | 16.4 | high | oa-4019 | — |
| lisbon | 里斯本 | Lisbon Humberto Delgado Airport | LIS | 9.3 | high | oa-4461 | — |
| athens | 雅典 | Athens Eleftherios Venizelos International Airport | ATH | 22.5 | high | oa-4251 | — |
| warsaw | 华沙 | Warsaw Chopin Airport | WAW | 4.1 | high | oa-2637 | — |
| minsk | 明斯克 | Minsk National Airport | MSQ | 28.2 | high | oa-6501 | — |
| kyiv | 基辅 | Boryspil International Airport | KBP | 29.3 | high | oa-6467 | — |
| amsterdam | 阿姆斯特丹 | Amsterdam Airport Schiphol | AMS | 13.7 | high | oa-2513 | — |
| zurich | 苏黎世 | Zürich Airport | ZRH | 8.4 | high | oa-4505 | — |
| vienna | 维也纳 | Vienna International Airport | VIE | 14.9 | high | oa-4434 | — |
| rostov | 顿河畔罗斯托夫 | Platov International Airport | ROV | 36.5 | high | oa-326363 | — |
| barcelona | 巴塞罗那 | Josep Tarradellas Barcelona-El Prat Airport | BCN | 15.3 | high | oa-4004 | — |
| marseille | 马赛 | Marseille Provence Airport | MRS | 20.8 | high | oa-4155 | — |
| munich | 慕尼黑 | Munich Airport | MUC | 31.7 | high | oa-2218 | — |
| stpetersburg | 圣彼得堡 | Pulkovo Airport | LED | 13.6 | high | oa-6489 | — |
| seville | 塞维利亚 | Seville Airport | SVQ | 9.1 | high | oa-4049 | — |
| hannover | 汉诺威 | Hannover Airport | HAJ | 10.6 | high | oa-2224 | — |
| milan | 米兰 | Milano Linate Airport | LIN | 7 | high | oa-4345 | — |
| algiers | 阿尔及尔 | Houari Boumediene Airport | ALG | 22.7 | high | oa-2050 | — |
| dakar | 达喀尔 | Léopold Sédar Senghor International Airport | DKR | 10.2 | high | oa-3125 | — |
| abuja | 阿布贾 | Nnamdi Azikiwe International Airport | ABV | 27.4 | high | oa-2104 | — |
| casablanca | 卡萨布兰卡 | Mohammed V International Airport | CMN | 27 | high | oa-3113 | — |
| tunis | 突尼斯 | Tunis Carthage International Airport | TUN | 7.5 | high | oa-2133 | — |
| cairo | 开罗 | Cairo International Airport | CAI | 21.2 | high | oa-3183 | — |
| nairobi | 内罗毕 | Jomo Kenyatta International Airport | NBO | 15.5 | high | oa-3206 | — |
| addisababa | 亚的斯亚贝巴 | Addis Ababa Bole International Airport | ADD | 11.2 | high | oa-3157 | — |
| daressalaam | 达累斯萨拉姆 | Julius Nyerere International Airport | DAR | 14 | high | oa-3251 | — |
| kinshasa | 金沙萨 | Ndjili International Airport | FIH | 18.7 | high | oa-3040 | — |
| lagos | 拉各斯 | Murtala Muhammed International Airport | LOS | 10.8 | high | oa-2118 | — |
| johannesburg | 约翰内斯堡 | O.R. Tambo International Airport | JNB | 24.9 | high | oa-31055 | — |
| capetown | 开普敦 | Cape Town International Airport | CPT | 16.8 | high | oa-2775 | — |
| newyork | 纽约 | John F. Kennedy International Airport | JFK | 21.4 | verified | oa-3622 | — |
| chicago | 芝加哥 | Chicago O'Hare International Airport | ORD | 27.5 | high | oa-3754 | — |
| miami | 迈阿密 | Miami International Airport | MIA | 8 | high | oa-3685 | — |
| washington | 华盛顿 | Ronald Reagan Washington National Airport | DCA | 6.2 | high | oa-3483 | — |
| ottawa | 渥太华 | Ottawa Macdonald-Cartier International Airport | YOW | 9.2 | high | oa-1840 | — |
| atlanta | 亚特兰大 | Hartsfield Jackson Atlanta International Airport | ATL | 8.3 | high | oa-3384 | — |
| montreal | 蒙特利尔 | Montreal / Pierre Elliott Trudeau International Airport | YUL | 13.9 | high | oa-1928 | — |
| havana | 哈瓦那 | José Martí International Airport | HAV | 11.2 | high | oa-4839 | — |
| kingston | 金斯顿 | Norman Manley International Airport | KIN | 7.2 | high | oa-4680 | — |
| santodomingo | 圣多明各 | Las Américas International Airport | SDQ | 26.6 | high | oa-4638 | — |
| mexicocity | 墨西哥城 | Mexico City Benito Juárez International Airport | MEX | 5.8 | high | oa-4731 | — |
| dallas | 达拉斯 | Dallas Love Field | DAL | 6.7 | high | oa-3479 | — |
| denver | 丹佛 | Denver International Airport | DEN | 33.2 | high | oa-3486 | — |
| houston | 休斯敦 | George Bush Intercontinental Airport | IAH | 20.2 | high | oa-3604 | — |
| losangeles | 洛杉矶 | Los Angeles International Airport | LAX | 25.9 | high | oa-3632 | — |
| vancouver | 温哥华 | Vancouver International Airport | YVR | 14 | high | oa-1941 | — |
| seattle | 西雅图 | Seattle–Tacoma International Airport | SEA | 15.9 | high | oa-3875 | — |
| honolulu | 檀香山 | Daniel K. Inouye International Airport | HNL | 6.9 | high | oa-5453 | — |
| sanfrancisco | 旧金山 | San Francisco International Airport | SFO | 20.2 | high | oa-3878 | — |
| rio | 里约热内卢 | Rio Galeão – Tom Jobim International Airport | GIG | 13.8 | high | oa-5906 | — |
| saopaulo | 圣保罗 | São Paulo/Guarulhos–Governor André Franco Montoro International Airport | GRU | 14.2 | high | oa-5910 | — |
| buenosaires | 布宜诺斯艾利斯 | Aeroparque Jorge Newbery | AEP | 5.1 | high | oa-5771 | — |
| brasilia | 巴西利亚 | Presidente Juscelino Kubitschek International Airport | BSB | 7.7 | high | oa-5872 | — |
| lima | 利马 | Jorge Chávez International Airport | LIM | 12.5 | high | oa-6217 | — |
| bogota | 波哥大 | El Dorado International Airport | BOG | 6.3 | high | oa-6104 | — |
| santiago | 圣地亚哥 | Comodoro Arturo Merino Benítez International Airport | SCL | 8.2 | high | oa-6015 | — |
| caracas | 加拉加斯 | Maiquetía Simón Bolívar International Airport | CCS | 16.7 | high | oa-6300 | — |
| quito | 基多 | Mariscal Sucre International Airport | UIO | 20.2 | high | oa-308273 | — |
| sydney | 悉尼 | Sydney Kingsford Smith International Airport | SYD | 6.6 | high | oa-27145 | — |
| perth | 珀斯 | Perth International Airport | PER | 9.4 | high | oa-27119 | — |
| melbourne | 墨尔本 | Melbourne Airport | MEL | 20.9 | high | oa-27066 | — |
| wellington | 惠灵顿 | Wellington International Airport | WLG | 4.2 | high | oa-5063 | — |
| guangzhou | 广州 | Guangzhou Baiyun International Airport | CAN | 29.5 | high | oa-27194 | — |
| shenzhen | 深圳 | Shenzhen Bao'an International Airport | SZX | 28.3 | high | oa-27198 | — |
| kualalumpur | 吉隆坡 | Kuala Lumpur International Airport | KUL | 43.8 | high | oa-26874 | — |
| hochiminh | 胡志明市 | Tan Son Nhat International Airport | SGN | 2.5 | high | oa-26708 | — |
| dhaka | 达卡 | Hazrat Shahjalal International Airport | DAC | 4 | high | oa-26534 | — |
| bengaluru | 班加罗尔 | Kempegowda International Airport Bengaluru | BLR | 27.9 | high | oa-35145 | — |
| doha | 多哈 | Hamad International Airport | DOH | 7.9 | verified | oa-44686 | — |
| jeddah | 吉达 | King Abdulaziz International Airport | JED | 21.9 | verified | oa-5097 | — |
| frankfurt | 法兰克福 | Frankfurt Main Airport | FRA | 12.9 | high | oa-2212 | — |
| toronto | 多伦多 | Toronto Pearson International Airport | YYZ | 20 | high | oa-1990 | — |
| panamacity | 巴拿马城 | Tocumen International Airport | PTY | 18 | high | oa-4793 | — |
| auckland | 奥克兰 | Auckland International Airport | AKL | 18 | high | oa-5023 | — |
| brisbane | 布里斯班 | Brisbane International Airport | BNE | 13.1 | high | oa-26901 | — |
| accra | 阿克拉 | Kotoka International Airport | ACC | 2.2 | high | oa-2090 | — |
