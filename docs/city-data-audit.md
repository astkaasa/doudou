# 城市数据审计报告

生成日期：2026-07-10

## 结论

- 城市总数：123（原有 109，新增 14）。
- 人口来源覆盖：123/123。
- 人口锚点：1960、1975、1980、1995、2000、2020。
- 市场角色：core: 86；event: 2；regional: 32；remote: 2；special: 1。
- 区域分布：caribbean: 3；central_africa: 1；central_asia: 2；central_namerica: 5；east_africa: 3；east_asia: 19；east_namerica: 8；europe: 27；mideast: 7；north_africa: 4；oceania: 6；samerica: 9；south_africa: 2；south_asia: 8；southeast_asia: 10；west_africa: 4；west_namerica: 5。
- 错误：0；警告：0。

## 已修正的原始数据问题

- 阿斯塔纳坐标由错误经度修正到 51.1801, 71.4460，并与塔什干归入中亚。
- 伊斯兰堡归入南亚；达喀尔、阿布贾、拉各斯归入西非；内罗毕、亚的斯亚贝巴、达累斯萨拉姆归入东非；金沙萨归入中非。
- “文莱”改为城市名“斯里巴加湾市”，“冲绳”改为“那霸（冲绳）”，“罗斯托夫”改为“顿河畔罗斯托夫”。
- 汉诺威、塞维利亚标为事件市场；关岛、塞班标为偏远市场；麦加标为特殊市场。

## 新增城市

- guangzhou：广州，east_asia，core，2000 年人口 18.9703M。
- shenzhen：深圳，east_asia，core，2000 年人口 8.1810M。
- kualalumpur：吉隆坡，southeast_asia，core，2000 年人口 4.1439M。
- hochiminh：胡志明市，southeast_asia，core，2000 年人口 6.0061M。
- dhaka：达卡，south_asia，core，2000 年人口 17.4346M。
- bengaluru：班加罗尔，south_asia，core，2000 年人口 6.0519M。
- doha：多哈，mideast，core，2000 年人口 0.3000M。
- jeddah：吉达，mideast，core，2000 年人口 1.6821M。
- frankfurt：法兰克福，europe，core，2000 年人口 0.7069M。
- toronto：多伦多，east_namerica，core，2000 年人口 3.7935M。
- panamacity：巴拿马城，central_namerica，regional，2000 年人口 0.8644M。
- auckland：奥克兰，oceania，core，2000 年人口 0.6560M。
- brisbane：布里斯班，oceania，core，2000 年人口 0.5701M。
- accra：阿克拉，west_africa，regional，2000 年人口 2.6121M。

## 来源派生值

以下城市在统一城市中心尚未形成或未达到 WUP 阈值的早期年份没有来源行；数值由生成器按受限增长率回推，运行时和审计中保留质量标记：

- abuja：1960 (derived-backcast)、1975 (derived-backcast)、1980 (derived-backcast)
- atlanta：1960 (derived-backcast)、1975 (derived-backcast)、1980 (derived-backcast)
- brasilia：1960 (derived-backcast)
- brisbane：1960 (derived-backcast)
- brunei：1960 (derived-backcast)、1975 (derived-backcast)、1980 (derived-backcast)、1995 (derived-backcast)、2000 (derived-backcast)
- dallas：1960 (derived-backcast)、1975 (derived-backcast)
- doha：1960 (derived-backcast)、1975 (derived-backcast)、1980 (derived-backcast)
- dubai：1960 (derived-backcast)、1975 (derived-backcast)
- lhasa：1960 (derived-backcast)、1975 (derived-backcast)、1980 (derived-backcast)
- male：1960 (derived-backcast)、1975 (derived-backcast)、1980 (derived-backcast)
- perth：1960 (derived-backcast)
- riyadh：1960 (derived-backcast)、1975 (derived-backcast)
- wellington：1960 (derived-backcast)

## 警告

- 无
