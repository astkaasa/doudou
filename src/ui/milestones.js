import { MILESTONE_CATEGORIES, MILESTONES } from '../data/milestones.js';
import { getMilestoneStats } from '../domain/milestones.js';
import { renderHtml } from './html.js';
import { showModal } from './modal.js';

const TROPHY_MATERIALS = {
  1: { fill: '#8b6914', stroke: '#654321' },
  2: { fill: '#9ed6e6', stroke: '#5aa8bf' },
  3: { fill: '#cd7f32', stroke: '#8b4513' },
  4: { fill: '#c0c0c0', stroke: '#808080' },
  5: { fill: '#ffd700', stroke: '#b8860b' },
};

let milestoneQueue = [];
let milestoneShowing = false;

export function showMilestoneNotification(milestones) {
  if (!milestones.length) return;
  milestoneQueue.push(milestones);
  if (!milestoneShowing) showNextMilestone();
}

export function showMilestoneList(state) {
  if (!state) return;
  const stats = getMilestoneStats(state);
  const pct = stats.total > 0 ? (stats.unlocked / stats.total) * 100 : 0;
  let html = `<div class="milestone-modal">
    <div class="milestone-header">
      <h2>奖杯陈列室</h2>
      <div class="milestone-progress">
        <span>收集进度</span>
        <progress class="milestone-progress-track" max="100" value="${pct}" aria-label="里程碑收集进度"></progress>
        <strong>${stats.unlocked} / ${stats.total}</strong>
      </div>
    </div>
    <div class="milestone-shelf-grid">`;

  MILESTONE_CATEGORIES.forEach((category) => {
    const items = MILESTONES.filter((milestone) => milestone.category === category.id);
    const categoryStats = stats.categories[category.id] || { unlocked: 0, total: 0 };
    html += `<section class="milestone-shelf">
      <div class="milestone-shelf-title"><span>${category.id}</span><small>${categoryStats.unlocked}/${categoryStats.total}</small></div>
      <div class="milestone-row">`;
    for (let level = 1; level <= 5; level++) {
      const milestone = items.find((item) => item.level === level);
      if (!milestone) continue;
      const unlocked = Boolean(state.milestones?.[milestone.id]);
      const secret = milestone.secret && !unlocked;
      html += `<div class="milestone-slot">
        ${renderTrophy(milestone.level, unlocked, 52)}
        <div class="milestone-label ${unlocked ? '' : 'locked'}">${unlocked ? milestone.title : '???'}</div>
        <div class="milestone-tooltip">
          <div class="tt-title">${secret ? '???' : milestone.title}</div>
          <div class="tt-desc">${secret ? '???' : milestone.description}</div>
          ${unlocked ? `<div class="tt-note">${milestone.notification}</div>` : '<div class="tt-locked">未解锁</div>'}
        </div>
      </div>`;
    }
    html += '</div></section>';
  });

  html += `</div>
    <div class="milestone-footer"><button class="btn btn-primary" type="button" data-action="close-modal">关闭</button></div>
  </div>`;
  showModal(html, { wide: true });
}

function showNextMilestone() {
  if (milestoneQueue.length === 0) {
    milestoneShowing = false;
    return;
  }
  milestoneShowing = true;
  const list = milestoneQueue.shift();
  const popup = document.createElement('div');
  popup.id = 'milestone-toast';
  renderHtml(popup, `<div class="milestone-toast-card">${buildToastHtml(list)}</div>`);
  document.body.appendChild(popup);
  popup._timer = setTimeout(dismissMilestone, 3000);
}

function dismissMilestone() {
  const popup = document.getElementById('milestone-toast');
  if (!popup) {
    showNextMilestone();
    return;
  }
  clearTimeout(popup._timer);
  popup.classList.add('leaving');
  setTimeout(() => {
    popup.remove();
    showNextMilestone();
  }, 300);
}

function buildToastHtml(list) {
  if (list.length === 1) {
    const milestone = list[0];
    return `<div class="milestone-toast-single">
      ${renderTrophy(milestone.level, true, 64)}
      <div class="milestone-toast-kicker">里程碑达成</div>
      <div class="milestone-toast-title">${milestone.title}</div>
      <div class="milestone-toast-desc">${milestone.description}</div>
      <div class="milestone-toast-note">${milestone.notification}</div>
    </div>`;
  }
  return `<div class="milestone-toast-title">达成 ${list.length} 个里程碑</div>
    <div class="milestone-toast-list">${list.map((milestone) => `<div>
      ${renderTrophy(milestone.level, true, 32)}
      <span><strong>${milestone.title}</strong><small>${milestone.description}</small></span>
    </div>`).join('')}</div>`;
}

function renderTrophy(level, unlocked, size) {
  const material = TROPHY_MATERIALS[level] || TROPHY_MATERIALS[1];
  return `<span class="trophy trophy-size-${size} trophy-lv-${level} ${unlocked ? '' : 'locked'}">
    <svg viewBox="0 0 56 56" width="${size}" height="${size}" aria-hidden="true">
      <path d="M16 10 L14 30 Q14 42 28 42 Q42 42 42 30 L40 10 Z" fill="${material.fill}" stroke="${material.stroke}" stroke-width="1.5"/>
      <path d="M16 14 Q8 14 8 22 Q8 30 14 30" fill="none" stroke="${material.stroke}" stroke-width="2" stroke-linecap="round"/>
      <path d="M40 14 Q48 14 48 22 Q48 30 42 30" fill="none" stroke="${material.stroke}" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="28" cy="10" rx="14" ry="3" fill="${material.stroke}" stroke="${material.stroke}" stroke-width="1"/>
      <text x="28" y="30" text-anchor="middle" font-size="12" fill="${level >= 4 ? '#fff' : '#ffe08a'}" font-weight="bold">★</text>
      <rect x="25" y="42" width="6" height="5" fill="${material.stroke}" rx="1"/>
      <rect x="18" y="47" width="20" height="5" fill="${material.fill}" stroke="${material.stroke}" stroke-width="1" rx="2"/>
      <rect x="16" y="51" width="24" height="3" fill="${material.stroke}" rx="1.5"/>
    </svg>
  </span>`;
}
