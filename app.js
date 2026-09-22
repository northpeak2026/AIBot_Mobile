/* WillBet AI Assistant Client Prototype — native SPA */
const phone = document.querySelector('#phone');
const demo = document.querySelector('#demo-panel');
const toastEl = document.querySelector('#toast');

const KEYS = {
  state: 'willbet_demo_state_v2',
  conversations: 'willbet_ai_conversations_v2',
  active: 'willbet_ai_active_v2',
  shortcut: 'willbet_ai_shortcut_v2',
  fabY: 'willbet_ai_fab_y_v2'
};

const DEFAULT_STATE = {
  route: 'home', loggedIn: true, scenario: 'normal', drawerOpen: false,
  aiMode: false, aiView: 'chat', aiSourceRoute: 'home', returnRoute: 'home',
  scrollPositions: {}, selectedSelection: null, betStake: 100, betSlipOpen: false,
  recentAction: null, myBetsTab: 'sports', pendingAuth: null
};

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
const persisted = readJSON(KEYS.state, {});
const state = { ...DEFAULT_STATE, ...persisted, drawerOpen: false, aiMode: false, aiView: 'chat' };
let aiShortcut = localStorage.getItem(KEYS.shortcut) !== 'false';
let conversations = readJSON(KEYS.conversations, []);
let activeConversationId = localStorage.getItem(KEYS.active) || null;
let loadingTimer = null;
let toastTimer = null;

const routeMeta = {
  home: ['Home', 'Home'], sports: ['Sports', 'Sports Home'], 'sports-event': ['Sports', 'Event Detail'],
  casino: ['Casino', 'Casino Home'], 'casino-category': ['Casino', 'Category'], 'casino-provider': ['Casino', 'Provider'],
  'casino-game': ['Casino', 'Game Detail'], 'casino-play': ['Casino', 'Game Playing'], 'casino-history': ['Casino', 'Game History'],
  prediction: ['Prediction', 'Prediction'], crypto: ['Crypto Games', 'Crypto Games'], wallet: ['Wallet', 'Wallet Home'],
  deposit: ['Wallet', 'Deposit'], withdrawal: ['Wallet', 'Withdrawal'], 'deposit-history': ['Wallet', 'Deposit History'],
  'withdrawal-history': ['Wallet', 'Withdrawal History'], turnover: ['Wallet', 'Turnover'], promotion: ['Promotion', 'Promotion List'],
  'promotion-detail': ['Promotion', 'Promotion Detail'], coupon: ['Promotion', 'Coupon'], vip: ['VIP', 'VIP Home'],
  benefits: ['VIP', 'Benefits'], mission: ['Mission', 'Mission List'], messages: ['Messages', 'Messages List'],
  mybets: ['My Bets', 'Sports'], login: ['Account', 'Login']
};

const suggested = {
  sports: ['怎么体育投注？', '什么是有效流水？', '在哪里看我的注单？'],
  'sports-event': ['-0.5 是什么意思？', '为什么赔率会变化？', '为什么不能下注？', '预计派彩怎么算？'],
  casino: ['RTP 是什么意思？', '什么是游戏波动性？', '最近玩的游戏在哪里？'],
  'casino-game': ['RTP 是什么意思？', '为什么这个游戏打不开？', '这个游戏可以试玩吗？'],
  wallet: ['怎么充值？', '怎么提现？', '什么是有效流水？'],
  withdrawal: ['为什么不能提现？', '我还差多少流水？', '提现手续费是多少？'],
  mybets: ['为什么这张注单输了？', '为什么这张注单是 Void？', '为什么有效流水是这个金额？']
};

function now() { return Date.now(); }
function uid() { return `c_${now()}_${Math.random().toString(36).slice(2, 7)}`; }
function saveState() {
  const safe = { ...state, drawerOpen: false, aiMode: false, aiView: 'chat' };
  localStorage.setItem(KEYS.state, JSON.stringify(safe));
}
function saveConversations() {
  localStorage.setItem(KEYS.conversations, JSON.stringify(conversations));
  if (activeConversationId) localStorage.setItem(KEYS.active, activeConversationId);
  else localStorage.removeItem(KEYS.active);
}

function seedConversations() {
  if (conversations.length) return;
  const base = new Date('2026-09-18T12:00:00+08:00').getTime();
  conversations = [
    { id: uid(), title: 'Why can’t I withdraw?', lastActive: base - 2 * 3600000, messages: [{ role:'user', content:'Why can’t I withdraw?' }, { role:'ai', content:'你目前还有 <strong class="accent">45 USDT 有效流水</strong>尚未完成，因此暂时不能提现。' }] },
    { id: uid(), title: 'Manchester United -0.5', lastActive: base - 86400000, messages: [{ role:'user', content:'-0.5 是什么意思？' }, { role:'ai', content:'-0.5 是让球盘。选择的球队需要获胜，这个 Selection 才会赢。' }] },
    { id: uid(), title: 'Casino RTP', lastActive: new Date('2026-09-15T15:20:00+08:00').getTime(), messages: [{ role:'user', content:'RTP 是什么意思？' }, { role:'ai', content:'RTP 是游戏在长期大量局数中的理论返还率。' }] },
    { id: uid(), title: 'VIP Upgrade', lastActive: new Date('2026-09-12T16:10:00+08:00').getTime(), messages: [{ role:'user', content:'VIP 怎么升级？' }, { role:'ai', content:'完成有效投注并累积经验值可提升 VIP 等级。' }] }
  ];
  activeConversationId = null;
  saveConversations();
}
seedConversations();

function currentConversation() { return conversations.find(c => c.id === activeConversationId) || null; }
function recentConversations() {
  const cutoff = now() - 7 * 86400000;
  return conversations.filter(c => c.messages.length && c.lastActive >= cutoff).sort((a,b) => b.lastActive - a.lastActive);
}
function createConversation() {
  const c = { id: uid(), title: 'New conversation', lastActive: now(), messages: [], unknownCount: 0 };
  conversations.unshift(c); activeConversationId = c.id; saveConversations(); return c;
}
function touchConversation(c) { c.lastActive = now(); saveConversations(); }

function icon(name) {
  const icons = { menu:'☷', casino:'♠', sports:'⚽', mybets:'▤', promotion:'◉' };
  return icons[name] || '•';
}

function header() {
  return `<header class="topbar">
    <button class="brand" data-route="home" aria-label="Home">Willbet</button>
    <button class="wallet-chip" data-route="wallet">0.04433 <i class="coin">₮</i><span>⌄</span></button>
    <button class="add-btn" data-route="deposit" aria-label="Deposit">＋</button>
    <button class="icon-btn" data-route="messages" aria-label="Messages">♟</button>
    <button class="avatar" data-route="wallet" aria-label="Profile">●</button>
  </header>`;
}

function navActive() {
  const r = state.route;
  if (['casino','casino-category','casino-provider','casino-game','casino-play','casino-history'].includes(r)) return 'casino';
  if (['sports','sports-event'].includes(r)) return 'sports';
  if (r === 'mybets') return 'mybets';
  if (['promotion','promotion-detail','coupon'].includes(r)) return 'promotion';
  return '';
}
function bottomNav() {
  const active = navActive();
  const nav = [['menu','菜单'],['casino','赌场'],['sports','体育'],['mybets','我的投注'],['promotion','福利中心']];
  return `<nav class="bottom-nav" aria-label="主导航">${nav.map(([r,label]) => `<button class="nav-item ${active===r?'active':''}" data-route="${r}"><span class="ni">${icon(r)}</span>${label}</button>`).join('')}</nav>`;
}

function pageTitle(title, back) {
  return `<div class="page-title">${back ? `<button class="round-back" data-route="${back}" aria-label="Back">‹</button>` : ''}<h1>${title}</h1></div>`;
}
function searchBar(text='搜索') { return `<div class="search"><span>⌕</span><span>${text}</span></div>`; }
function chips(items, active=0) { return `<div class="chips">${items.map((x,i)=>`<button class="chip ${i===active?'active':''}">${x}</button>`).join('')}</div>`; }
function emptyPage(title, emoji, copy) {
  return `${pageTitle(title)}<section class="placeholder"><span>${emoji}</span><h2>${title}</h2><p>${copy}</p><button class="secondary" data-toast="Prototype 页面已打开">了解更多</button></section>`;
}

function homePage() {
  return `${header()}<section class="hero"><div class="eyebrow">WILLBET EXCLUSIVE</div><h1>投注返水</h1><p>每日福利，最高返水无上限</p><button class="primary" data-route="promotion-detail">查看规则</button></section>${searchBar('搜索游戏或赛事')}
  <section class="section"><div class="section-head"><h2>🔥 热门赛事</h2><button data-route="sports">更多 》</button></div>
    <article class="event-card" data-route="sports-event"><div class="event-meta">英格兰 · 英格兰足球超级联赛</div><div class="teams"><span>Tottenham</span><span class="vs">VS</span><span>Aston Villa</span></div><div class="odds"><button class="odd">主胜<b>2.06</b></button><button class="odd">-0.5<b>2.05</b></button><button class="odd">客胜<b>3.58</b></button></div></article></section>
  <section class="section"><div class="section-head"><h2>🔥 热门游戏</h2><button data-route="casino">全部 》</button></div><div class="game-grid"><article class="game" data-route="casino-game"><b>Starlight Princess 1000</b><small>Pragmatic Play · RTP 96.5%</small></article><article class="game" data-route="casino-category"><b>凤凰麻将</b><small>Askmeslot · 906 在线</small></article></div></section>`;
}

function sportsPage() {
  return `${header()}${searchBar('搜索赛事')}${chips(['🔥 焦点赛事','▥ 进行中','▣ 即将开始'])}
  <section class="league-tabs"><button class="active">英格兰足球超级联赛</button><button>西班牙足球甲级联赛</button></section>
  <section class="league"><div class="league-head">🏴 英格兰 › <b>英格兰足球超级联赛</b></div>
    ${sportsEventCard('Brentford','Chelsea','3:00 AM',['2.67','2.00','1.95'],false)}
    ${sportsEventCard('Tottenham','Aston Villa','7:30 PM',['2.06','2.05','3.58'],true)}
    ${sportsEventCard('Brighton','Arsenal','10:00 PM',['4.87','1.97','1.70'],false)}
  </section>`;
}
function sportsEventCard(a,b,time,odds,featured) {
  return `<article class="sports-card ${featured?'featured':''}" data-route="sports-event">
    <div class="sports-card-top"><span>明天 ${time}</span><span>♡ 151 个盘口 ›</span></div>
    <div class="sports-event-row"><div class="team-stack"><b>⚪ ${a}</b><b>🔵 ${b}</b></div><div class="market-mini"><span>主胜<strong>${odds[0]}</strong></span><span>${featured?'-0.5':'0'}<strong>${odds[1]}</strong></span><span>客胜<strong>${odds[2]}</strong></span></div></div>
    <div class="card-tags"><span>▦ 动画</span><span>▥ 统计</span></div></article>`;
}

function sportsEventPage() {
  const selected = !!state.selectedSelection;
  return `${header()}${pageTitle('英格兰足球超级联赛','sports')}
  <section class="match-hero"><div class="match-time">Tomorrow · 7:30 PM</div><div class="match-teams"><div><span>⚪</span><b>Tottenham</b></div><strong>VS</strong><div><span>🔵</span><b>Aston Villa</b></div></div><div class="live-note">Pre-match · 151 Markets</div></section>
  <section class="market-block"><div class="market-head"><b>全场让球</b><span>⌃</span></div><button class="selection ${selected?'selected':''}" data-action="select-bet"><span><b>Tottenham</b><small>让球 -0.5</small></span><strong>2.05</strong></button><button class="selection"><span><b>Aston Villa</b><small>让球 +0.5</small></span><strong>1.81</strong></button></section>
  <section class="market-block"><div class="market-head"><b>全场赛果</b><span>⌃</span></div><div class="three-select"><button>Tottenham <b>2.06</b></button><button>Draw <b>3.62</b></button><button>Aston Villa <b>3.58</b></button></div></section>
  ${state.betSlipOpen ? betSlip() : ''}`;
}
function betSlip() {
  return `<section class="bet-slip"><div class="slip-grab"></div><div class="slip-title"><b>Bet Slip · 1</b><button data-action="close-slip">×</button></div><div class="slip-pick"><span>Tottenham -0.5</span><strong>@ 2.05</strong></div><label>Stake (USDT)<input id="stake" inputmode="decimal" value="${state.betStake}"></label><div class="slip-data"><span>Available <b>20 USDT</b></span><span>Est. payout <b>${(state.betStake*2.05).toFixed(2)} USDT</b></span></div><button class="primary full" data-action="place-bet">Place Bet</button></section>`;
}

function casinoPage() {
  return `${header()}<section class="casino-banner"><small>EZUGI LIVE</small><h1>真人娱乐城</h1><p>畅玩百家乐 · 轮盘 · 21点</p><button class="primary" data-route="casino-provider">立即体验</button></section>${searchBar('搜索游戏')}<div class="chips"><button class="chip" data-route="casino-history">◷ 最近</button><button class="chip active">▦ 大厅</button><button class="chip" data-route="casino-category">🔥 热门游戏</button><button class="chip" data-route="casino-provider">♜ PP电子</button></div>
  <section class="section casino-section"><div class="section-head"><h2>🔥 热门游戏</h2><button data-route="casino-category">全部 》</button></div><div class="casino-grid">${gameTile('starlight','Starlight Princess 1000','Pragmatic Play','casino-game')}${gameTile('mahjong','凤凰麻将','Askmeslot','casino-game')}${gameTile('space','太空冲刺','Willbet','casino-game')}</div></section>
  <section class="section casino-section"><div class="section-head"><h2>♜ PP电子</h2><button data-route="casino-provider">全部 》</button></div><div class="casino-grid">${gameTile('zeus','奥林匹斯之门1000','Pragmatic Play','casino-game')}${gameTile('cleopatra','神秘埃及','Pragmatic Play','casino-game')}${gameTile('candy','甜蜜博彩扎1000','Pragmatic Play','casino-game')}</div></section>`;
}
function gameTile(kind,title,provider,route) { return `<article class="casino-tile ${kind}" data-route="${route}"><div class="game-art"><span>${kind==='starlight'?'✦':kind==='space'?'🚀':kind==='mahjong'?'🀄':kind==='zeus'?'⚡':kind==='cleopatra'?'𓂀':'●'}</span></div><b>${title}</b><small>${provider}</small><div class="tile-meta"><i></i> 961 <em>RTP 96.5%</em></div></article>`; }
function casinoListPage(type) {
  const title = type==='provider'?'Pragmatic Play':'热门游戏';
  return `${header()}${pageTitle(title,'casino')}${searchBar('搜索游戏')}<section class="section"><div class="casino-grid wrap">${gameTile('starlight','Starlight Princess 1000','Pragmatic Play','casino-game')}${gameTile('zeus','奥林匹斯之门1000','Pragmatic Play','casino-game')}${gameTile('cleopatra','神秘埃及','Pragmatic Play','casino-game')}${gameTile('candy','Candy Stars','Pragmatic Play','casino-game')}</div></section>`;
}
function casinoGamePage() {
  return `${header()}${pageTitle('Game Detail','casino')}<section class="game-detail-art"><span>✦</span><div><small>PRAGMATIC PLAY</small><h1>Starlight<br>Princess 1000</h1></div></section><section class="game-detail-info"><div><h2>Starlight Princess 1000</h2><p>Pragmatic Play · Slots</p></div><button class="favorite">♡</button><dl><div><dt>RTP</dt><dd>96.5%</dd></div><div><dt>Volatility</dt><dd>High</dd></div><div><dt>Availability</dt><dd>Region dependent</dd></div></dl><button class="primary full" data-action="play-game">Play</button><button class="secondary full" data-route="casino-play">Try Demo</button></section>`;
}
function casinoPlayPage() { return `${pageTitle('Starlight Princess 1000','casino-game')}<section class="play-stage"><span>✦</span><h2>Game Loading</h2><p>Demo game surface</p></section>`; }
function casinoHistoryPage() { return `${header()}${pageTitle('Game History','casino')}${betsList('casino')}`; }

function walletPage() {
  return `${header()}${pageTitle('Wallet')}<section class="balance-card"><small>Total balance</small><h1>520.00 <span>USDT</span></h1><p>≈ 520.00 USD</p><div><button class="primary" data-route="deposit">Deposit</button><button class="secondary" data-route="withdrawal">Withdraw</button></div></section>
  <section class="wallet-actions"><button data-route="deposit"><span>＋</span>Deposit</button><button data-route="withdrawal"><span>↗</span>Withdrawal</button><button data-route="turnover"><span>◎</span>Turnover</button><button data-route="coupon"><span>◇</span>Coupon</button></section>
  <section class="menu-card"><button data-route="deposit-history">Deposit History <span>›</span></button><button data-route="withdrawal-history">Withdrawal History <span>›</span></button><button data-route="turnover">Turnover progress <span>›</span></button></section>`;
}
function depositPage() { return `${header()}${pageTitle('Deposit','wallet')}<section class="form-card"><label>Currency<select><option>USDT</option><option>BTC</option></select></label><label>Network<select><option>TRC20</option><option>ERC20</option></select></label><label>Amount<input value="100" inputmode="decimal"></label><button class="primary full" data-toast="Deposit request created">Continue</button></section>`; }
function withdrawalPage() {
  const blocked = state.recentAction==='withdrawFailed';
  return `${header()}${pageTitle('Withdrawal','wallet')}<section class="balance-inline"><span>Withdrawable balance</span><b>500 USDT</b></section><section class="form-card"><label>Currency<select><option>USDT</option></select></label><label>Network<select><option>TRC20</option></select></label><label>Amount<input value="100" inputmode="decimal"></label><div class="turnover-mini"><span>Required turnover <b>100 USDT</b></span><span>Completed <b>55 USDT</b></span><div><i style="width:55%"></i></div></div>${blocked?'<p class="inline-error">Withdrawal unavailable: turnover requirement is incomplete.</p>':''}<button class="primary full" data-action="withdraw">Withdraw</button></section>`;
}
function historyPage(kind) {
  const isDeposit = kind==='deposit';
  return `${header()}${pageTitle(isDeposit?'Deposit History':'Withdrawal History','wallet')}<section class="history-list"><article><div><b>${isDeposit?'Deposit':'Withdrawal'} · USDT</b><small>Sep 17, 2026 · TRC20</small></div><strong class="${isDeposit?'success':'pending'}">${isDeposit?'+200':'-80'} USDT</strong></article><article><div><b>${isDeposit?'Deposit':'Withdrawal'} · USDT</b><small>Sep 12, 2026 · TRC20</small></div><strong class="success">${isDeposit?'+100':'-40'} USDT</strong></article></section>`;
}
function turnoverPage() { return `${header()}${pageTitle('Turnover','wallet')}<section class="turnover-hero"><span>55%</span><div><small>Remaining</small><h1>45 USDT</h1><p>Complete valid bets to unlock withdrawal.</p></div></section><section class="data-list"><div><span>Current requirement</span><b>100 USDT</b></div><div><span>Completed</span><b>55 USDT</b></div><div><span>Remaining</span><b class="accent">45 USDT</b></div></section><section class="info-box"><b>What counts as valid turnover?</b><p>Settled real-money bets contribute according to each product’s turnover rules. Void bets do not count.</p></section>`; }

function promotionPage() { return `${header()}${pageTitle('Promotion')}<section class="promo-list"><article data-route="promotion-detail"><div class="promo-art purple">返</div><div><b>Daily Betting Rebate</b><p>Claim your daily rebate with no upper limit.</p><span>View promotion ›</span></div></article><article data-route="promotion-detail"><div class="promo-art orange">VIP</div><div><b>VIP Weekly Bonus</b><p>Exclusive rewards for every VIP level.</p><span>View promotion ›</span></div></article></section>`; }
function promotionDetailPage() { return `${header()}${pageTitle('Daily Betting Rebate','promotion')}<section class="detail-banner">投注返水</section><section class="article-copy"><h2>Daily Betting Rebate</h2><p>Eligible settled bets receive a daily rebate based on the applicable product rate.</p><h3>How to claim</h3><p>Open Promotion, review your available reward and tap Claim.</p><button class="primary full" data-toast="Reward claimed for demo">Claim Now</button></section>`; }
function couponPage() { return `${header()}${pageTitle('Coupon','promotion')}<section class="coupon"><span>WILLBET</span><div><b>10 USDT</b><small>Valid until Sep 30, 2026</small></div><button data-toast="Coupon applied">Use</button></section>`; }

function vipPage() { return `${header()}${pageTitle('VIP Club')}<section class="vip-card"><small>CURRENT LEVEL</small><h1>VIP 3</h1><p>1,260 / 2,000 XP</p><div><i></i></div><button class="primary" data-route="benefits">View Benefits</button></section><section class="data-list"><div><span>Weekly bonus</span><b>8 USDT</b></div><div><span>Withdrawal limit</span><b>10,000 USDT</b></div><div><span>Rebate boost</span><b>+0.15%</b></div></section>`; }
function benefitsPage() { return `${header()}${pageTitle('VIP Benefits','vip')}<section class="benefit-grid"><article><span>♛</span><b>Weekly Reward</b><p>Receive up to 8 USDT every week.</p></article><article><span>↗</span><b>Higher Limits</b><p>Enjoy increased withdrawal limits.</p></article><article><span>✦</span><b>Exclusive Offers</b><p>Access member-only promotions.</p></article><article><span>◉</span><b>Priority Support</b><p>Faster service for VIP members.</p></article></section>`; }
function missionPage() { return `${header()}${pageTitle('Mission Center')}<section class="mission-list"><article><span>01</span><div><b>Make 3 sports bets</b><p>2 / 3 completed</p><div><i style="width:66%"></i></div></div><button data-route="sports">Go</button></article><article><span>02</span><div><b>Play a casino game</b><p>Reward: 2 USDT</p><div><i style="width:10%"></i></div></div><button data-route="casino">Go</button></article></section>`; }
function messagesPage() { return `${header()}${pageTitle('Messages')}<section class="message-list"><article><span>🎁</span><div><b>Your daily rebate is ready</b><p>Claim your reward before it expires.</p><small>Today · 10:30</small></div></article><article><span>✓</span><div><b>Withdrawal status</b><p>Your previous withdrawal was completed.</p><small>Yesterday · 16:12</small></div></article></section>`; }

function myBetsPage() {
  const tabs = ['casino','sports','crypto','prediction'];
  return `${header()}${pageTitle('My Bets')}<div class="mybets-tabs">${tabs.map(t=>`<button class="${state.myBetsTab===t?'active':''}" data-bets-tab="${t}">${titleCase(t)}</button>`).join('')}</div>${betsList(state.myBetsTab)}`;
}
function titleCase(s){ return s.replace(/^./,c=>c.toUpperCase()).replace('Crypto','Crypto Games'); }
function betsList(type) {
  if (type==='sports') return `<section class="bet-list"><article><div class="bet-status lost">Lost</div><small>Sep 17, 2026 · Single</small><h3>Tottenham -0.5 @2.05</h3><p>Tottenham vs Aston Villa</p><div><span>Stake <b>100 USDT</b></span><span>Payout <b>0 USDT</b></span></div></article><article><div class="bet-status won">Won</div><small>Sep 15, 2026 · Single</small><h3>Arsenal -0.75 @1.88</h3><p>Brighton vs Arsenal</p><div><span>Stake <b>50 USDT</b></span><span>Payout <b>94 USDT</b></span></div></article></section>`;
  if (type==='casino') return `<section class="bet-list"><article><div class="bet-status lost">Lost</div><small>Sep 14, 2026 · 05:20 PM</small><h3>Starlight Princess 1000</h3><p>Pragmatic Play</p><div><span>Bet amount <b>0.4 USDT</b></span><span>Payout <b>0 USDT</b></span></div></article></section>`;
  return `<section class="placeholder compact"><span>◎</span><h2>No ${titleCase(type)} bets</h2><p>Your settled bets will appear here.</p></section>`;
}

function loginPage() { return `<header class="login-head"><button data-action="cancel-login">‹</button><div class="brand">Willbet</div></header><section class="login-card"><span class="login-icon">●</span><h1>Welcome back</h1><p>Sign in to continue your WillBet AI request.</p><label>Email or phone<input value="demo@willbet.com"></label><label>Password<input type="password" value="password"></label><button class="primary full" data-action="login-success">Login Success</button><button class="text-btn" data-action="cancel-login">Cancel</button></section>`; }

function contextLabel() {
  const meta = routeMeta[state.aiSourceRoute] || ['WillBet','Page'];
  if (state.aiSourceRoute==='mybets') return `My Bets · ${titleCase(state.myBetsTab)}`;
  return `${meta[0]} · ${meta[1]}`;
}
function aiPage() {
  if (state.aiView==='history') return historyView();
  const c = currentConversation();
  const isEmpty = !c || !c.messages.length;
  return `<section class="ai-screen">
    <header class="ai-header"><button data-action="close-ai" aria-label="Back">‹</button><div><b>WillBet AI</b><small>From ${contextLabel()}</small></div><button data-action="ai-history" aria-label="History">◷</button>${isEmpty?'':newChatButton()}</header>
    <div class="ai-chat" id="ai-chat">${isEmpty ? aiWelcome() : c.messages.map(messageHTML).join('') + conversationFeedback(c)}</div>
    <form class="ai-input" id="ai-form"><input id="ai-question" autocomplete="off" placeholder="Ask WillBet AI..."><button type="submit" aria-label="Send">↑</button></form>
  </section>`;
}
function newChatButton() { return '<button class="header-new-chat" data-action="new-chat" aria-label="New Chat" title="New Chat"><span>＋</span><small>New</small></button>'; }
function aiWelcome() {
  const qs = suggested[state.aiSourceRoute] || [];
  const previous = recentConversations()[0];
  return `<div class="ai-welcome"><div class="ai-orb">✦</div><h1>Hi, I’m WillBet AI</h1><p>How can I help you?</p>${qs.length?`<div class="suggestions"><small>Suggested Questions</small>${qs.map(q=>`<button data-question="${q}">${q}<span>›</span></button>`).join('')}</div>`:''}${previous?`<button class="continue-conversation" data-conversation="${previous.id}"><small>Continue previous conversation</small><b>${escapeHTML(previous.title)}</b><span>${relativeTime(previous.lastActive)} <em>›</em></span></button>`:''}</div>`;
}
function messageHTML(m) {
  if (m.loading) return `<article class="message ai loading-message"><div class="thinking"><i>✦</i><span>${m.content}</span></div></article>`;
  return `<article class="message ${m.role}">${m.role==='ai'?'<div class="mini-ai">✦</div>':''}<div class="message-body">${m.content}${m.cta?`<div class="message-cta"><button data-cta="${m.cta.action}">${m.cta.label}</button></div>`:''}</div></article>`;
}
function conversationFeedback(c) {
  const last = c.messages[c.messages.length - 1];
  if (!last || last.role !== 'ai' || last.loading) return '';
  if (c.feedback) return `<section class="conversation-feedback answered" aria-live="polite"><span>${c.feedback==='yes'?'👍':'👎'}</span><small>Thanks for your feedback.</small></section>`;
  return `<section class="conversation-feedback"><small>Did WillBet AI solve your problem?</small><div><button data-feedback="yes" aria-label="Yes, the AI solved my problem"><span>👍</span>Yes</button><button data-feedback="no" aria-label="No, the AI did not solve my problem"><span>👎</span>No</button></div></section>`;
}
function historyView() {
  const list = recentConversations();
  const groups = {};
  list.forEach(c=>{ const k=historyGroup(c.lastActive); (groups[k] ||= []).push(c); });
  return `<section class="ai-screen"><header class="ai-header history-head"><button data-action="back-chat">‹</button><div><b>Recent Conversations</b><small>Last 7 days</small></div>${newChatButton()}</header><div class="conversation-list">${Object.entries(groups).map(([g,items])=>`<section><h2>${g}</h2>${items.map(c=>`<button data-conversation="${c.id}"><span>◴</span><b>${escapeHTML(c.title)}</b><small>${formatTime(c.lastActive)}</small><em>›</em></button>`).join('')}</section>`).join('') || '<p class="history-empty">No recent conversations.</p>'}</div></section>`;
}
function historyGroup(ts) {
  const d=new Date(ts), n=new Date();
  if (d.toDateString()===n.toDateString()) return 'Today';
  const y=new Date(n.getTime()-86400000); if(d.toDateString()===y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}
function formatTime(ts){ return new Date(ts).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}); }
function relativeTime(ts) {
  const diff = Math.max(0, now() - ts);
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
  return `${Math.floor(diff / 86400000)} days ago`;
}
function escapeHTML(s){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function drawer() {
  const items = [
    ['casino','♠','Casino'],['sports','⚽','Sports'],['prediction','◇','Prediction'],['crypto','◉','Crypto Games'],['promotion','⚑','Promotion'],['mission','◎','Mission'],['vip','♛','VIP'],
    ['placeholder','✉','Invite'],['placeholder','♟','Affiliate'],['placeholder','▤','Chat'],['placeholder','▰','Blog'],['placeholder','↓','Download App'],['support','◉','Online Support'],['placeholder','◎','Language']
  ];
  return `<div class="drawer-backdrop" data-action="close-drawer"></div><aside class="drawer"><div class="drawer-top"><div class="brand">Willbet</div><button data-action="close-drawer">×</button></div>${searchBar('搜索')}
    <div class="drawer-list"><button data-action="open-ai"><span class="drawer-ai">✦</span><b>WillBet AI</b><em>›</em></button><label class="shortcut-toggle"><span>Show AI shortcut</span><input type="checkbox" id="shortcut-switch" ${aiShortcut?'checked':''}><i></i></label>${items.map(([r,ic,label])=>`<button ${r==='support'?`data-action="support"`:r==='placeholder'?`data-toast="${label} placeholder"`:`data-route="${r}"`}><span>${ic}</span><b>${label}</b><em>›</em></button>`).join('')}</div></aside>`;
}

function floatingButton() {
  if (!aiShortcut || state.aiMode || state.route==='login') return '';
  const y = Number(localStorage.getItem(KEYS.fabY));
  const style = y ? `style="top:${y}px;bottom:auto"` : '';
  return `<button class="ai-fab" ${style} data-action="open-ai" aria-label="Open WillBet AI">✦</button>`;
}

function syncFloatingButton() {
  if (state.aiMode || state.route==='login') return;
  const existing = phone.querySelector('.ai-fab');
  if (!aiShortcut) { existing?.remove(); return; }
  if (existing) return;
  const template = document.createElement('template');
  template.innerHTML = floatingButton();
  const fab = template.content.firstElementChild;
  if (!fab) return;
  const nav = phone.querySelector('.bottom-nav');
  if (nav) phone.insertBefore(fab, nav); else phone.appendChild(fab);
  bindFabDrag();
}

function businessPage() {
  switch(state.route) {
    case 'home': return homePage(); case 'sports': return sportsPage(); case 'sports-event': return sportsEventPage();
    case 'casino': return casinoPage(); case 'casino-category': return casinoListPage('category'); case 'casino-provider': return casinoListPage('provider');
    case 'casino-game': return casinoGamePage(); case 'casino-play': return casinoPlayPage(); case 'casino-history': return casinoHistoryPage();
    case 'wallet': return walletPage(); case 'deposit': return depositPage(); case 'withdrawal': return withdrawalPage(); case 'deposit-history': return historyPage('deposit');
    case 'withdrawal-history': return historyPage('withdrawal'); case 'turnover': return turnoverPage(); case 'promotion': return promotionPage(); case 'promotion-detail': return promotionDetailPage();
    case 'coupon': return couponPage(); case 'vip': return vipPage(); case 'benefits': return benefitsPage(); case 'mission': return missionPage(); case 'messages': return messagesPage();
    case 'mybets': return myBetsPage(); case 'prediction': return `${header()}${emptyPage('Prediction','◇','Prediction markets are available in the full WillBet client.')}`;
    case 'crypto': return `${header()}${emptyPage('Crypto Games','◉','Crypto games are available in the full WillBet client.')}`;
    case 'login': return loginPage(); default: return homePage();
  }
}

function render({preserveScroll=false}={}) {
  const oldScroller = phone.querySelector('.page-scroll');
  const oldScroll = oldScroller ? oldScroller.scrollTop : 0;
  if (state.aiMode) phone.innerHTML = aiPage();
  else {
    const noNav = state.route==='login';
    phone.innerHTML = `<div class="page-scroll">${businessPage()}</div>${noNav?'':floatingButton()+bottomNav()}${state.drawerOpen?drawer():''}`;
  }
  renderDemo();
  if (!state.aiMode) {
    const scroller=phone.querySelector('.page-scroll');
    if(scroller) requestAnimationFrame(()=>{ scroller.scrollTop = preserveScroll ? oldScroll : (state.scrollPositions[state.route] || 0); });
    bindFabDrag();
  } else requestAnimationFrame(scrollChatBottom);
}

function renderDemo() {
  demo.innerHTML = `<p class="demo-title">Demo Controls</p><p class="demo-sub">Product demo only · not part of WillBet UI</p>
    <label class="demo-label">Login State<select id="demo-login"><option value="guest" ${!state.loggedIn?'selected':''}>Guest</option><option value="logged" ${state.loggedIn?'selected':''}>Logged In</option></select></label>
    <label class="demo-label">Mock Scenario<select id="demo-scenario"><option value="normal">Normal</option><option value="betFailed" ${state.scenario==='betFailed'?'selected':''}>Bet Failed</option><option value="withdrawalBlocked" ${state.scenario==='withdrawalBlocked'?'selected':''}>Withdrawal Blocked</option><option value="regionRestricted" ${state.scenario==='regionRestricted'?'selected':''}>Casino Region Restricted</option></select></label>
    <div class="context-card"><small>LIVE PAGE CONTEXT</small><b>${state.aiMode?contextLabel():((routeMeta[state.route]||['WillBet','Home']).join(' · '))}</b><span>${state.recentAction ? `Recent: ${state.recentAction}` : 'No recent action'}</span></div>
    <button class="demo-btn" data-demo="clear">Clear Conversations</button><button class="demo-btn danger" data-demo="reset">Reset Prototype</button>`;
}

function navigate(route) {
  if (state.aiMode) state.aiMode=false;
  state.drawerOpen=false; state.route=route;
  if(route==='mybets' && !state.myBetsTab) state.myBetsTab='sports';
  saveState(); render();
}
function openAI() {
  const scroller=phone.querySelector('.page-scroll');
  if(scroller) state.scrollPositions[state.route]=scroller.scrollTop;
  state.aiSourceRoute=state.route; state.returnRoute=state.route; state.aiMode=true; state.aiView='chat'; state.drawerOpen=false;
  const c=currentConversation(); if(c) touchConversation(c); saveState(); render();
}
function closeAI() { state.aiMode=false; state.route=state.returnRoute; saveState(); render(); }
function newChat() { activeConversationId=null; saveConversations(); state.aiView='chat'; render(); requestAnimationFrame(()=>phone.querySelector('#ai-question')?.focus()); }
function scrollChatBottom(){ const el=phone.querySelector('#ai-chat'); if(el) el.scrollTop=el.scrollHeight; }

function sendQuestion(text, options={}) {
  text=String(text||'').trim(); if(!text) return;
  let c=currentConversation() || createConversation();
  c.feedback=null;
  if(!options.noUserMessage) c.messages.push({role:'user',content:escapeHTML(text)});
  if(c.title==='New conversation') c.title=text.slice(0,34)+(text.length>34?'…':'');
  c.lastActive=now(); saveConversations(); render();
  const result=mockResponse(text,c);
  if(result.requiresLogin) {
    c.messages.push({role:'ai',content:'要查看你当前的有效流水进度，需要先登录你的 WillBet 账户。',cta:{label:'Log In',action:'login'}});
    state.pendingAuth={conversationId:c.id,question:text}; touchConversation(c); render(); return;
  }
  c.messages.push({role:'ai',content:result.loading,loading:true}); touchConversation(c); render();
  clearTimeout(loadingTimer);
  loadingTimer=setTimeout(()=>{
    const target=conversations.find(x=>x.id===c.id); if(!target) return;
    const idx=target.messages.findIndex(m=>m.loading);
    if(idx>=0) target.messages.splice(idx,1,{role:'ai',content:result.answer,cta:result.cta||null});
    touchConversation(target); if(state.aiMode && activeConversationId===target.id) render();
  }, result.delay || 1200);
}

function mockResponse(q,c) {
  const s=q.toLowerCase().replace(/\s/g,'');
  const has=(...keys)=>keys.some(k=>s.includes(k.toLowerCase().replace(/\s/g,'')));
  if(has('-0.5','－0.5','让球')) return {loading:'正在思考…',answer:'<strong>-0.5 是让球盘。</strong><br><br>如果你选择 Tottenham -0.5，那么 Tottenham 需要在对应结算时段获胜，这个 Selection 才会赢。<br><br>如果比赛打平或 Tottenham 输球，这笔投注会输。'};
  if(has('为什么不能下注','不能下注','下注失败')) return {loading:'正在检查当前投注状态…',answer:'当前投注金额是 <strong class="accent">100 USDT</strong>，但你的可用余额只有 <strong class="accent">20 USDT</strong>，因此无法完成这笔投注。',cta:{label:'Go to Wallet',action:'wallet'}};
  if(has('为什么不能提现','不能提现','提现失败')) {
    if(!state.loggedIn) return {requiresLogin:true};
    return {loading:'正在确认你的提现状态…',answer:'你目前还有 <strong class="accent">45 USDT 有效流水</strong>尚未完成，因此暂时不能提现。<br><br>当前要求：<strong>100 USDT</strong><br>已完成：<strong>55 USDT</strong><br>剩余：<strong class="accent">45 USDT</strong><br><br>完成剩余流水后，可以再次尝试提现。',cta:{label:'View Turnover',action:'turnover'}};
  }
  if(has('还差多少','流水进度','我的流水')) {
    if(!state.loggedIn) return {requiresLogin:true};
    return {loading:'正在获取你的流水进度…',answer:'你当前还剩 <strong class="accent">45 USDT</strong> 有效流水需要完成。<br><br>当前要求：<strong>100 USDT</strong><br>已完成：<strong>55 USDT</strong>',cta:{label:'View Turnover',action:'turnover'}};
  }
  if(has('为什么这个游戏打不开','游戏打不开','地区')) return {loading:'正在确认游戏当前状态…',answer:'这个游戏目前在你所在地区暂不可用。<br><br>如果你正在使用 VPN，可以关闭后重新尝试，但关闭 VPN 并不代表该游戏一定可以使用。',cta:{label:'Browse Other Games',action:'casino'}};
  if(has('什么是有效流水','有效流水是什么')) return {loading:'正在思考…',answer:'有效流水是平台用于计算提现流水任务、VIP 经验值等场景的有效投注金额。<br><br>不同业务的有效流水计算规则可能不同。<br><br>如果你想查看自己的当前流水进度，需要登录并查看实际账户数据。',cta:state.loggedIn?{label:'View Turnover',action:'turnover'}:null};
  if(has('rtp')) return {loading:'正在思考…',answer:'RTP 是理论玩家返还率，表示游戏在长期大量局数中的理论返还比例。<br><br>例如 RTP 96.5% 并不代表每次投注都返还 96.5%，短期结果仍可能有较大波动。'};
  if(has('波动性')) return {loading:'正在思考…',answer:'游戏波动性描述中奖频率与单次奖金幅度。高波动游戏通常中奖频率较低，但潜在奖金更高。'};
  if(has('怎么体育投注','怎么下注')) return {loading:'正在思考…',answer:'进入 Sports，选择赛事与盘口，点击赔率加入 Bet Slip，输入投注金额后确认 Place Bet 即可。'};
  if(has('赔率会变化')) return {loading:'正在检查当前盘口状态…',answer:'赔率会根据市场投注情况、球队消息和比赛时间临近等因素变化。提交注单前，请确认 Bet Slip 中显示的最新赔率。'};
  if(has('预计派彩')) return {loading:'正在思考…',answer:'预计派彩 = 投注金额 × 当前赔率。<br><br>例如投注 <strong>100 USDT</strong>，赔率为 <strong>2.05</strong>，预计派彩为 <strong class="accent">205 USDT</strong>。'};
  if(has('哪里看我的注单','我的注单','最近玩的游戏')) return {loading:'正在思考…',answer:'你可以在底部导航的 My Bets 查看投注记录，并通过顶部 Tab 切换 Sports、Casino、Crypto Games 与 Prediction。',cta:{label:'View My Bets',action:'mybets'}};
  if(has('怎么充值')) return {loading:'正在思考…',answer:'进入 Wallet 后点击 Deposit，选择币种与网络，并按页面提示完成充值。请确保转账网络与页面显示一致。',cta:{label:'Go to Wallet',action:'deposit'}};
  if(has('怎么提现')) return {loading:'正在思考…',answer:'进入 Wallet 后点击 Withdrawal，选择币种和网络，输入金额并提交。提现前需要满足账户的有效流水要求。',cta:{label:'Go to Wallet',action:'withdrawal'}};
  if(has('提现手续费')) return {loading:'正在确认提现规则…',answer:'本次 USDT · TRC20 提现的模拟手续费为 <strong class="accent">1 USDT</strong>。实际手续费请以提交页面显示为准。'};
  if(has('可以试玩')) return {loading:'正在确认游戏当前状态…',answer:'该游戏支持 Demo 试玩。你可以返回 Game Detail 并点击 Try Demo。'};
  if(has('注单输了')) return {loading:'正在查询这张注单…',answer:'这张注单选择了 Tottenham -0.5。由于 Tottenham 未能在结算时段获胜，Selection 判定为输。'};
  if(has('void')) return {loading:'正在查询这张注单…',answer:'Void 表示注单或某个 Selection 被作废。作废部分通常按赔率 1.00 结算，投注本金会按规则返还。'};
  if(has('为什么有效流水是这个金额')) return {loading:'正在查询这张注单…',answer:'这张注单的有效流水按实际合资格投注额计算。被取消、Void 或不符合活动条件的部分不会计入。'};
  if(has('vip怎么升级','vip升级')) return {loading:'正在思考…',answer:'完成符合条件的有效投注可累积 VIP 经验值。达到下一级要求后会自动升级。',cta:{label:'View Benefits',action:'benefits'}};
  c.unknownCount=(c.unknownCount||0)+1;
  if(c.unknownCount===1) return {loading:'正在思考…',answer:'我暂时没能确定你想查询什么。<br><br>你可以补充一下具体是：<br>• 注单<br>• 充值<br>• 提现<br>• 游戏<br>• 活动'};
  return {loading:'正在思考…',answer:'我暂时无法确认这个问题，你可以联系 WillBet 客服进一步处理。',cta:{label:'Contact Support',action:'support'}};
}

function ctaAction(action) {
  if(action==='login') { state.aiMode=false; state.route='login'; saveState(); render(); return; }
  if(action==='support') { copySupport(); return; }
  if(action==='mybets') state.myBetsTab='sports';
  state.aiMode=false; state.route=action; state.drawerOpen=false; saveState(); render();
}
function copySupport() {
  const value='@willbet_cs';
  if(navigator.clipboard?.writeText) navigator.clipboard.writeText(value).catch(()=>fallbackCopy(value)); else fallbackCopy(value);
  showToast('已复制客服联系方式到剪切板');
}
function fallbackCopy(value) { const ta=document.createElement('textarea'); ta.value=value; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy')}catch{} ta.remove(); }
function showToast(msg) { clearTimeout(toastTimer); toastEl.textContent=msg; toastEl.classList.add('show'); toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2200); }

function bindFabDrag() {
  const fab=phone.querySelector('.ai-fab'); if(!fab) return;
  let startY=0,startTop=0,moved=false;
  fab.addEventListener('pointerdown',e=>{ startY=e.clientY; startTop=fab.getBoundingClientRect().top-phone.getBoundingClientRect().top; moved=false; fab.setPointerCapture(e.pointerId); });
  fab.addEventListener('pointermove',e=>{ if(!fab.hasPointerCapture(e.pointerId)) return; const dy=e.clientY-startY; if(Math.abs(dy)>4)moved=true; const max=phone.clientHeight-145; const y=Math.max(92,Math.min(max,startTop+dy)); fab.style.top=`${y}px`; fab.style.bottom='auto'; });
  fab.addEventListener('pointerup',e=>{ if(!fab.hasPointerCapture(e.pointerId))return; fab.releasePointerCapture(e.pointerId); const y=parseFloat(fab.style.top)||startTop; localStorage.setItem(KEYS.fabY,String(y)); if(!moved)openAI(); });
  fab.addEventListener('click',e=>e.preventDefault());
}

document.addEventListener('click', e => {
  const route=e.target.closest('[data-route]'); if(route){ const r=route.dataset.route; if(r==='menu'){state.drawerOpen=true;render({preserveScroll:true});}else navigate(r); return; }
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action){
    if(action==='open-ai')openAI();
    else if(action==='close-ai')closeAI();
    else if(action==='ai-history'){state.aiView='history';render();}
    else if(action==='back-chat'){state.aiView='chat';render();}
    else if(action==='new-chat')newChat();
    else if(action==='close-drawer'){state.drawerOpen=false;render({preserveScroll:true});}
    else if(action==='select-bet'){state.selectedSelection='Tottenham -0.5 @2.05';state.betSlipOpen=true;state.recentAction='selectionAdded';saveState();render({preserveScroll:true});showToast('Selection added to Bet Slip');}
    else if(action==='close-slip'){state.betSlipOpen=false;saveState();render({preserveScroll:true});}
    else if(action==='place-bet'){const input=phone.querySelector('#stake');state.betStake=Number(input?.value)||100;state.recentAction='betFailed';state.scenario='betFailed';saveState();render({preserveScroll:true});showToast('Unable to place bet · Insufficient balance');}
    else if(action==='withdraw'){state.recentAction='withdrawFailed';state.scenario='withdrawalBlocked';saveState();render({preserveScroll:true});showToast('Withdrawal unavailable · Turnover incomplete');}
    else if(action==='play-game'){state.recentAction='gameFailed';state.scenario='regionRestricted';saveState();render({preserveScroll:true});showToast('Not available in your region');}
    else if(action==='support')copySupport();
    else if(action==='login-success'){
      state.loggedIn=true; const pending=state.pendingAuth; state.route=state.returnRoute||'home'; state.aiMode=true; state.aiView='chat'; state.pendingAuth=null;
      if(pending){activeConversationId=pending.conversationId;localStorage.setItem(KEYS.active,activeConversationId);} saveState(); render(); if(pending)sendQuestion(pending.question,{noUserMessage:true});
    }
    else if(action==='cancel-login'){state.route=state.returnRoute||'home';state.aiMode=!!state.pendingAuth;render();}
    return;
  }
  const question=e.target.closest('[data-question]')?.dataset.question; if(question){sendQuestion(question);return;}
  const feedback=e.target.closest('[data-feedback]')?.dataset.feedback; if(feedback){const c=currentConversation();if(c){c.feedback=feedback;saveConversations();render();}return;}
  const cta=e.target.closest('[data-cta]')?.dataset.cta; if(cta){ctaAction(cta);return;}
  const conv=e.target.closest('[data-conversation]')?.dataset.conversation; if(conv){activeConversationId=conv;localStorage.setItem(KEYS.active,conv);const c=currentConversation();touchConversation(c);state.aiView='chat';render();return;}
  const tab=e.target.closest('[data-bets-tab]')?.dataset.betsTab; if(tab){state.myBetsTab=tab;saveState();render({preserveScroll:true});return;}
  const demoAction=e.target.closest('[data-demo]')?.dataset.demo;
  if(demoAction==='clear'){conversations=[];activeConversationId=null;localStorage.removeItem(KEYS.conversations);localStorage.removeItem(KEYS.active);render();showToast('Conversations cleared');}
  if(demoAction==='reset'){Object.values(KEYS).forEach(k=>localStorage.removeItem(k));location.reload();}
  const toast=e.target.closest('[data-toast]')?.dataset.toast; if(toast)showToast(toast);
});

document.addEventListener('submit',e=>{ if(e.target.id==='ai-form'){e.preventDefault();const input=phone.querySelector('#ai-question');sendQuestion(input.value);input.value='';} });
document.addEventListener('change',e=>{
  if(e.target.id==='shortcut-switch'){aiShortcut=e.target.checked;localStorage.setItem(KEYS.shortcut,String(aiShortcut));syncFloatingButton();}
  if(e.target.id==='demo-login'){state.loggedIn=e.target.value==='logged';saveState();render();showToast(state.loggedIn?'Demo state: Logged In':'Demo state: Guest');}
  if(e.target.id==='demo-scenario'){state.scenario=e.target.value;if(state.scenario==='betFailed')state.recentAction='betFailed';else if(state.scenario==='withdrawalBlocked')state.recentAction='withdrawFailed';else if(state.scenario==='regionRestricted')state.recentAction='gameFailed';else state.recentAction=null;saveState();render();}
});

render();
