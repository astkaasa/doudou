// ===== ui/main-quest-ui.js — 主线任务「苍穹之路」UI =====
// 主线进度Modal + HUD微徽章 + 阶段达成通知 + 通关仪式

// ===== CSS 注入（仅一次） =====
(function(){
  if(document.getElementById('main-quest-styles')) return;
  const s=document.createElement('style');
  s.id='main-quest-styles';
  s.textContent=`
/* ── 阶段达成通知 ── */
.mq-notify-overlay {
  position: fixed; inset: 0; z-index: 10001;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.6); animation: mqFadeIn 0.5s ease-out;
}
.mq-notify-box {
  min-width: 340px; max-width: 460px; text-align: center;
  border: 2px solid #fbbf24; border-radius: 16px;
  padding: 28px 32px; background: linear-gradient(135deg,#1a2d48,#0f1f38);
  box-shadow: 0 8px 40px rgba(251,191,36,0.3);
}
@keyframes mqFadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes mqFadeOut { from { opacity:1; } to { opacity:0; } }

/* ── 通关仪式 ── */
.mq-victory-overlay {
  position: fixed; inset: 0; z-index: 10002;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a15 100%);
  animation: mqFadeIn 1s ease-out;
}
.mq-victory-box {
  min-width: 400px; max-width: 560px; text-align: center;
  border: 2px solid #fbbf24; border-radius: 20px;
  padding: 36px 40px; background: linear-gradient(180deg, #1a2d48 0%, #0f1f38 100%);
  box-shadow: 0 0 60px rgba(251,191,36,0.4);
}
.mq-victory-title {
  font-size: 32px; font-weight: 800; color: #fbbf24;
  text-shadow: 0 0 20px rgba(251,191,36,0.5);
  margin-bottom: 8px;
}
.mq-dimension-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 0; border-bottom: 1px solid #1e3a5f30;
  font-size: 15px;
}
.mq-dim-met { color: #4ade80; font-weight: 700; }
.mq-dim-unmet { color: #94a3b8; }
.mq-grade-badge {
  display: inline-block; font-size: 48px; font-weight: 900;
  margin: 12px 0; text-shadow: 0 0 20px currentColor;
}
.mq-typewriter { overflow: hidden; white-space: nowrap; border-right: 2px solid #fbbf24; animation: mqBlink 0.8s step-end infinite; }
@keyframes mqBlink { 50% { border-color: transparent; } }
  `;
  document.head.appendChild(s);
})();

// ===== 主线进度 Modal =====
function openMainQuestPanel() {
  if (!G || !G.mainQuest) return;
  G._mainQuestOnboardShown = true;
  completeOnboardStep(4); // Step 5: 苍穹之路 完成
  const stats = getMainQuestStats();
  if (!stats) return;
  const progress = stats.progress;

  let html = `<div style="max-width:520px;margin:0 auto">`;

  // 标题
  const stageIcon = progress.icon || '★';
  const stageTitle = progress.title || '苍穹之路';
  html += `<div style="text-align:center;margin-bottom:20px">
    <div style="font-size:24px;font-weight:800;color:#fbbf24;margin-bottom:4px">${stageIcon} ${stageTitle}</div>
    <div style="font-size:13px;color:#94a3b8">苍穹之路 · 第${progress.stage}阶段</div>
  </div>`;

  // 已通关
  if (G.mainQuest.victoryGrade) {
    const grade = VICTORY_GRADES.find(g => g.grade === G.mainQuest.victoryGrade) || VICTORY_GRADES[3];
    html += `<div style="text-align:center;margin:16px 0">
      <div style="font-size:48px;font-weight:900;color:${grade.color};text-shadow:0 0 20px ${grade.color}">${grade.grade}</div>
      <div style="font-size:16px;color:#fbbf24;font-weight:700">${grade.title}</div>
      <div style="font-size:13px;color:#94a3b8;margin-top:4px">已于第 ${G.mainQuest.victoryTurn} 季通关</div>
    </div>`;
  }

  // 四维度卡片
  if (progress.dimensions) {
    html += `<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">`;
    MAIN_QUEST_DIMS.forEach(dim => {
      const d = progress.dimensions[dim.key];
      if (!d) return;
      const pct = d.target > 0 ? Math.min(100, (d.current / d.target * 100)) : 0;
      const met = d.met;
      const statusColor = met ? '#4ade80' : '#94a3b8';
      const statusText = met ? '✓ 已达标' : '未达标';
      const barColor = met ? 'linear-gradient(90deg,#4ade80,#22c55e)' : 'linear-gradient(90deg,#3b82f6,#2563eb)';

      // 格式化当前值
      let currentStr = '';
      if (dim.key === 'cash') {
        currentStr = fmt(d.current);
      } else if (dim.key === 'routes') {
        currentStr = d.current + '条';
      } else if (dim.key === 'branch') {
        currentStr = d.type === 'region' ? d.current + ' 大洲' : d.current + '个子区域';
      } else if (dim.key === 'profit') {
        currentStr = d.current + '季';
      }

      // 格式化目标值
      let targetStr = '';
      if (dim.key === 'cash') {
        targetStr = fmt(d.target);
      } else if (dim.key === 'routes') {
        targetStr = d.target + '条';
      } else if (dim.key === 'branch') {
        targetStr = d.type === 'region' ? d.target + ' 大洲' : d.target + '个子区域';
      } else if (dim.key === 'profit') {
        targetStr = d.target + '季';
      }

      html += `<div style="background:#1e293b80;border-radius:10px;padding:12px 16px;border:1px solid ${met?'#4ade8040':'#334155'}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:14px;font-weight:600;color:#e0e8f0">${dim.icon} ${dim.label}</span>
          <span style="font-size:12px;color:${statusColor};font-weight:600">${statusText}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:16px;font-weight:700;color:${met?'#4ade80':'#e0e8f0'}">${currentStr}</span>
          <span style="font-size:12px;color:#7ba3cc">/ ${targetStr}</span>
        </div>
        <div style="background:#0f172a;border-radius:4px;height:6px;overflow:hidden">
          <div style="background:${barColor};height:100%;width:${pct}%;border-radius:4px;transition:width 0.5s"></div>
        </div>
      </div>`;
    });
    html += `</div>`;
  }

  // 阶段指示器
  html += `<div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-bottom:16px">`;
  for (let i = 1; i <= 3; i++) {
    const isActive = i === G.mainQuest.currentStage && !G.mainQuest.victoryGrade;
    const isDone = G.mainQuest.stageCompleted.includes(i);
    const stageName = MAIN_QUEST_STAGES[i-1] ? MAIN_QUEST_STAGES[i-1].title : '';
    let dotStyle = 'width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;transition:all 0.3s;';
    if (isDone) {
      dotStyle += 'background:#4ade80;color:#0f172a;';
    } else if (isActive) {
      dotStyle += 'background:#fbbf24;color:#0f172a;box-shadow:0 0 12px rgba(251,191,36,0.5);';
    } else {
      dotStyle += 'background:#334155;color:#7ba3cc;';
    }
    html += `<div style="${dotStyle}" title="${stageName}">${i}</div>`;
    if (i < 3) {
      html += `<div style="width:32px;height:2px;background:${isDone?'#4ade80':'#334155'}"></div>`;
    }
  }
  html += `</div>`;

  // 关闭按钮
  html += `<div style="text-align:center"><button class="btn btn-primary" onclick="closeModal()" style="padding:8px 28px">关闭</button></div>`;
  html += `</div>`;

  $('modal-root').innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="position:relative;max-width:560px;width:560px">${html}</div></div>`;
}

// ===== 阶段达成通知 =====
function showMainQuestStageNotify(data) {
  const overlay = document.createElement('div');
  overlay.className = 'mq-notify-overlay';

  const stageIcon = MAIN_QUEST_STAGES[data.stage - 1] ? MAIN_QUEST_STAGES[data.stage - 1].icon : '★';
  const nextTitle = data.nextTitle || '';

  let inner = `<div class="mq-notify-box">`;
  inner += `<div style="font-size:36px;margin-bottom:8px">${stageIcon}</div>`;
  inner += `<div style="font-size:22px;font-weight:800;color:#fbbf24;margin-bottom:6px">${data.title}</div>`;
  inner += `<div style="font-size:15px;color:#e0e8f0;margin-bottom:12px">${data.subtitle}</div>`;
  if (nextTitle) {
    inner += `<div style="font-size:13px;color:#94a3b8">下一阶段：${nextTitle}</div>`;
  }
  inner += `<div style="margin-top:16px"><button class="btn btn-primary" onclick="this.closest('.mq-notify-overlay').remove()" style="padding:8px 28px">继续</button></div>`;
  inner += `</div>`;

  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  // 5秒后自动关闭
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.style.animation = 'mqFadeOut 0.5s ease-in forwards';
      setTimeout(() => overlay.remove(), 500);
    }
  }, 5000);
}

// ===== 通关仪式 =====
function showVictoryCeremony(data) {
  const overlay = document.createElement('div');
  overlay.className = 'mq-victory-overlay';

  let inner = `<div class="mq-victory-box">`;

  // 阶段一：标题
  inner += `<div class="mq-victory-title">苍穹之巅</div>`;
  inner += `<div style="font-size:14px;color:#94a3b8;margin-bottom:20px">航空帝国已成</div>`;

  // 阶段二：四维度达成数据
  inner += `<div style="margin-bottom:20px">`;
  MAIN_QUEST_DIMS.forEach(dim => {
    const d = data.dimensions[dim.key];
    if (!d) return;
    let valStr = '';
    if (dim.key === 'cash') valStr = fmt(d.current);
    else if (dim.key === 'routes') valStr = d.current + '条';
    else if (dim.key === 'branch') valStr = (d.type === 'region' ? d.current + ' 大洲' : d.current + '子区域');
    else if (dim.key === 'profit') valStr = d.current + '季';

    let targetStr = '';
    if (dim.key === 'cash') targetStr = fmt(d.target);
    else if (dim.key === 'routes') targetStr = d.target + '条';
    else if (dim.key === 'branch') targetStr = (d.type === 'region' ? d.target + ' 大洲' : d.target + '子区域');
    else if (dim.key === 'profit') targetStr = d.target + '季';

    inner += `<div class="mq-dimension-row">
      <span style="font-size:16px">${dim.icon}</span>
      <span style="flex:1;text-align:left;color:#e0e8f0">${dim.label}</span>
      <span class="mq-dim-met">${valStr} / ${targetStr} ✓</span>
    </div>`;
  });
  inner += `</div>`;

  // 阶段三：总结统计
  const grade = VICTORY_GRADES.find(g => g.grade === data.grade) || VICTORY_GRADES[3];
  inner += `<div style="margin-bottom:16px">`;
  inner += `<div class="mq-grade-badge" style="color:${grade.color}">${grade.grade}</div>`;
  inner += `<div style="font-size:18px;font-weight:700;color:#fbbf24;margin-bottom:4px">${grade.title}</div>`;
  inner += `<div style="font-size:13px;color:#94a3b8">经营 ${data.turnsPlayed} 季达成通关</div>`;
  inner += `<div style="font-size:13px;color:#94a3b8;margin-top:2px">累计利润 ${fmt(data.totalProfit)}M</div>`;
  inner += `</div>`;

  // 阶段四：两个按钮
  inner += `<div style="display:flex;gap:12px;justify-content:center;margin-top:20px">`;
  inner += `<button class="btn btn-primary" onclick="endGameFromVictory()" style="padding:10px 24px;font-size:15px">开香庆功</button>`;
  inner += `<button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:10px 24px;font-size:15px;border-radius:6px" onclick="continueFromVictory(this)">继续经营</button>`;
  inner += `</div>`;

  inner += `</div>`;
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);
}

// 通关后「开香庆功」— 结束游戏
function endGameFromVictory() {
  if (!G) return;
  G.gameOver = true;
  const grade = VICTORY_GRADES.find(g => g.grade === G.mainQuest.victoryGrade) || VICTORY_GRADES[3];
  // 移除通关仪式弹窗
  const overlay = document.querySelector('.mq-victory-overlay');
  if (overlay) overlay.remove();
  // 显示结局画面
  $('modal-root').innerHTML = `<div class="modal-overlay"><div class="modal gameover">
    <h1 style="color:#fbbf24">苍穹之巅</h1>
    <div style="font-size:48px;font-weight:900;color:${grade.color};margin:8px 0;text-shadow:0 0 20px ${grade.color}">${grade.grade}</div>
    <div style="font-size:18px;font-weight:700;color:#fbbf24;margin-bottom:12px">${grade.title}</div>
    <p style="color:#e0e8f0">你的航空帝国已然建成！</p>
    <p style="color:#94a3b8">经营了 ${G.turnsPlayed} 个季度</p>
    <p style="color:#94a3b8">最终资金：${fmt(G.cash)} · 累计利润：${fmt(G.totalProfit)}</p>
    <p style="color:#94a3b8">拥有 ${G.routes.length} 条航线 · ${G.fleet.length} 架飞机</p>
    <button class="btn btn-primary" onclick="location.reload()" style="margin-top:16px;padding:10px 32px">重新开始</button>
  </div></div>`;
}

// 通关后「继续经营」— 进入沙箱模式
function continueFromVictory(btn) {
  const overlay = btn.closest('.mq-victory-overlay');
  if (overlay) {
    overlay.style.animation = 'mqFadeOut 0.5s ease-in forwards';
    setTimeout(() => overlay.remove(), 500);
  }
  showBanner('沙箱模式 · 继续经营', '#4ade80');
}
