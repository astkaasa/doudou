import {
  STOCK_MAP,
  STOCK_MAX_HOLDING,
  STOCK_SECTORS,
  STOCK_TRADE_FEE,
  buyStock,
  calcNasdouIndex,
  calcPortfolioValue,
  getActiveStocks,
  sellStock,
} from '../domain/stocks.js';
import { byId, fmt } from '../domain/helpers.js';
import { escapeAttr, escapeHtml } from './html.js';

let selectedStockId = null;

export function showStockMarket(state, stockId = selectedStockId) {
  if (!state?.stocks) return;
  const activeStocks = getActiveStocks(state);
  if (activeStocks.length === 0) return;
  selectedStockId = activeStocks.some((stock) => stock.id === stockId) ? stockId : activeStocks[0].id;
  byId('modal-root').innerHTML = `<div class="modal-overlay" data-action="modal-backdrop">${buildStockMarketHtml(state, activeStocks)}</div>`;
}

export function buyStockFromModal(state, stockId, shares) {
  const result = buyStock(state, stockId, shares);
  selectedStockId = stockId;
  showStockMarket(state, stockId);
  return result;
}

export function sellStockFromModal(state, stockId, shares) {
  const result = sellStock(state, stockId, shares);
  selectedStockId = stockId;
  showStockMarket(state, stockId);
  return result;
}

function buildStockMarketHtml(state, activeStocks) {
  const nasdou = calcNasdouIndex(state);
  const nasdouClass = nasdou > 0.001 ? 'up' : nasdou < -0.001 ? 'down' : 'flat';
  const portfolio = calcPortfolioValue(state);
  return `<div class="modal stock-modal">
    <div class="stock-modal-head">
      <div>
        <h2>NASDOU 证券市场</h2>
        <span>${state.year}年 第${state.quarter}季度</span>
      </div>
      <button class="btn btn-sm stock-close" data-action="close-modal">关闭</button>
    </div>
    <div class="stock-index">
      <span>综合指数</span>
      <strong class="${nasdouClass}">${formatPct(nasdou)}</strong>
      <small>${describeNasdou(nasdou)}</small>
    </div>
    <div class="stock-market-layout">
      <div class="stock-list">
        <div class="stock-table-head">
          <span>代码</span><span>名称</span><span>价格</span><span>涨跌</span><span>走势</span><span>持仓</span><span>成本</span>
        </div>
        ${activeStocks.map((stock) => renderStockRow(state, stock)).join('')}
      </div>
      <div class="stock-trade">
        ${renderTradePanel(state)}
        ${renderPortfolioSummary(portfolio)}
        <div class="stock-cash">可用资金 <strong>${fmt(state.cash)}</strong></div>
      </div>
    </div>
  </div>`;
}

function renderStockRow(state, stock) {
  const stockState = state.stocks[stock.id];
  if (!stockState) return '';
  const holding = state.portfolio[stock.id] || null;
  const change = stockState.prevPrice > 0 ? (stockState.price - stockState.prevPrice) / stockState.prevPrice : 0;
  const trendClass = change > 0.001 ? 'up' : change < -0.001 ? 'down' : 'flat';
  const selected = selectedStockId === stock.id;
  const sector = STOCK_SECTORS[stock.sector];
  return `<button class="stock-row ${selected ? 'selected' : ''}" type="button" data-action="select-stock" data-stock-id="${escapeAttr(stock.id)}" style="--sector-color:${sector.color}">
    <span class="stock-code">${escapeHtml(stock.code)}</span>
    <span class="stock-name" title="${escapeAttr(stock.name)}">${escapeHtml(stock.name)}</span>
    <span class="stock-price">$${stockState.price.toFixed(1)}</span>
    <span class="stock-change ${trendClass}">${formatPct(change)}</span>
    ${buildBarChartSvg(stockState.history)}
    <span class="stock-holding">${holding ? `${holding.shares}M` : ''}</span>
    <span class="stock-cost">${holding ? `$${holding.avgCost.toFixed(1)}` : ''}</span>
  </button>`;
}

function renderTradePanel(state) {
  const stock = STOCK_MAP[selectedStockId];
  const stockState = state.stocks[selectedStockId];
  if (!stock || !stockState) {
    return '<div class="stock-empty">选择股票后交易</div>';
  }
  const sector = STOCK_SECTORS[stock.sector];
  const holding = state.portfolio[selectedStockId] || { shares: 0, avgCost: 0 };
  const change = stockState.prevPrice > 0 ? (stockState.price - stockState.prevPrice) / stockState.prevPrice : 0;
  const trendClass = change > 0.001 ? 'up' : change < -0.001 ? 'down' : 'flat';
  const canBuyMore = holding.shares < STOCK_MAX_HOLDING;
  return `<div class="stock-detail" style="--sector-color:${sector.color}">
    <h3>${escapeHtml(stock.name)}</h3>
    <div class="stock-meta">${escapeHtml(stock.code)} · ${escapeHtml(sector.name)}</div>
    <div class="stock-price-line">
      <span>当前价 <strong>$${stockState.price.toFixed(1)}</strong></span>
      <b class="${trendClass}">${formatPct(change)}</b>
    </div>
    <div class="stock-position">
      <span>持仓 ${holding.shares > 0 ? `${holding.shares}M` : '--'}</span>
      <span>成本 ${holding.shares > 0 ? `$${holding.avgCost.toFixed(1)}` : '--'}</span>
    </div>
  </div>
  <div class="stock-actions">
    <strong>买入</strong>
    <div class="stock-action-row">${[1, 5, 10, 50, 100].map((shares) => {
      const total = stockState.price * shares * (1 + STOCK_TRADE_FEE);
      const disabled = !canBuyMore || holding.shares + shares > STOCK_MAX_HOLDING || state.cash < total;
      return tradeButton('buy-stock', selectedStockId, shares, disabled);
    }).join('')}</div>
    <small>1M花费 $${(stockState.price * (1 + STOCK_TRADE_FEE)).toFixed(1)}M，含手续费1%</small>
  </div>
  <div class="stock-actions">
    <strong>卖出</strong>
    <div class="stock-action-row">
      ${[1, 5, 10, 50, 100].map((shares) => tradeButton('sell-stock', selectedStockId, shares, holding.shares < shares)).join('')}
      ${tradeButton('sell-stock', selectedStockId, holding.shares, holding.shares <= 0, '全部')}
    </div>
    <small>1M到账 $${(stockState.price * (1 - STOCK_TRADE_FEE)).toFixed(1)}M，扣手续费1%</small>
  </div>`;
}

function tradeButton(action, stockId, shares, disabled, label = `${shares}M`) {
  return `<button class="btn btn-sm stock-${action.startsWith('buy') ? 'buy' : 'sell'}" type="button" data-action="${action}" data-stock-id="${escapeAttr(stockId)}" data-shares="${Number(shares) || 0}" ${disabled ? 'disabled' : ''}>${escapeHtml(label)}</button>`;
}

function renderPortfolioSummary(portfolio) {
  const trendClass = portfolio.floatingPnL > 0.001 ? 'up' : portfolio.floatingPnL < -0.001 ? 'down' : 'flat';
  const sign = portfolio.floatingPnL >= 0 ? '+' : '';
  return `<div class="stock-portfolio">
    <strong>持仓汇总</strong>
    <div><span>持仓市值</span><b>$${portfolio.marketValue.toFixed(1)}M</b></div>
    <div><span>浮盈</span><b class="${trendClass}">${sign}$${portfolio.floatingPnL.toFixed(1)}M</b></div>
  </div>`;
}

function buildBarChartSvg(history) {
  if (!Array.isArray(history) || history.length < 2) {
    return '<span class="stock-bars empty"></span>';
  }
  const values = history.slice(-8);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 74;
  const height = 16;
  const bars = values.map((value, index) => {
    const previous = values[index - 1] || value;
    const change = previous > 0 ? (value - previous) / previous : 0;
    const cls = change > 0.001 ? '#ef4444' : change < -0.001 ? '#22c55e' : '#64748b';
    const barHeight = Math.max(2, Math.round(((value - min) / range) * (height - 2) + 2));
    const x = 1 + index * 9;
    const y = height - barHeight;
    return `<rect x="${x}" y="${y}" width="8" height="${barHeight}" fill="${cls}" rx="1"></rect>`;
  }).join('');
  return `<svg class="stock-bars" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">${bars}</svg>`;
}

function formatPct(value) {
  const sign = value > 0.001 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
}

export function describeNasdou(value) {
  if (value > 0.05) return '市场全面走强，多个板块上涨。';
  if (value < -0.05) return '市场明显承压，避险情绪升温。';
  if (value > 0.005) return '市场小幅上行，走势偏暖。';
  if (value < -0.005) return '市场小幅回落，交易偏谨慎。';
  return '市场整体平稳，板块波动有限。';
}
