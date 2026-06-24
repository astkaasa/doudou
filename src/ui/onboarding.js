import { byId } from '../domain/helpers.js';

const ONBOARD_STEPS = [
  {
    title: '欢迎启航',
    body: '试试点击「购买飞机」扩充机队，然后在地图上点击总部或分部作为起飞城市来开通航线。',
    trigger: (state) => state.turnsPlayed === 0 && state.routes.length === 0,
  },
  {
    title: '开拓航路',
    body: '已拥有飞机！现在在地图上先点击总部，再点击另一个城市来开通航线。',
    trigger: (state) => state.fleet.filter((plane) => !plane.delivering).length > 0 && state.routes.length === 0,
  },
  {
    title: '推进时间',
    body: '航线已就绪！点击右下角「推进回合」按钮开始运营，查看首季财报。',
    trigger: (state) => state.routes.length > 0 && state.turnsPlayed === 0,
  },
  {
    title: '开设分部',
    body: '航线只能从总部起飞。点击「开设分部」扩展基地网络，在更多城市设立分部即可从那里出发。',
    trigger: (state) => state.turnsPlayed >= 1 && (state.branches || []).length === 0 && state.routes.length >= 2,
  },
  {
    title: '继续成长',
    body: '试试购买更多飞机、开设分部扩展基地，或使用「银行贷款」加速扩张。',
    trigger: (state) => state.turnsPlayed >= 2 && state.turnsPlayed <= 4,
  },
];

export function updateOnboarding(state) {
  const hint = byId('onboard-hint');
  if (!hint) return;
  if (!state || state.gameOver) {
    hint.style.display = 'none';
    return;
  }
  const step = ONBOARD_STEPS.find((item) => item.trigger(state));
  if (!step) {
    hint.style.display = 'none';
    return;
  }
  hint.style.display = 'block';
  hint.querySelector('.hint-title').textContent = step.title;
  hint.querySelector('.hint-body').textContent = step.body;
  hint.querySelector('.hint-step').textContent = '新手引导';
}
