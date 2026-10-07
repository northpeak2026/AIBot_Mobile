/* Business-object resolution and reusable candidate-card renderers. */
const mockOrders = {
  casino: [
    {id:'2099428026690727936',time:'Oct 06 · 20:32',provider:'Evolution',game:'Baccarat A',status:'Lose',stake:100,payout:0,selection:'Banker',result:'Player'},
    {id:'2099428026690727937',time:'Oct 06 · 20:20',provider:'Evolution',game:'Baccarat A',status:'Win',stake:100,payout:195,selection:'Banker',result:'Banker'},
    {id:'2099428026690727938',time:'Oct 06 · 19:45',provider:'WM',game:'WM Baccarat',status:'Tie',stake:100,payout:100,selection:'Player',result:'Tie'}
  ],
  sports: [
    {id:'WBSP140',time:'Oct 06 · 18:32',event:'Manchester United vs Chelsea',market:'Asian Handicap',selection:'Manchester United -0.75',odds:1.8,status:'Half Win',stake:100,payout:140,result:'Manchester United 2–1 Chelsea'},
    {id:'WBSP180',time:'Oct 06 · 18:20',event:'Manchester United vs Chelsea',market:'1X2',selection:'Manchester United',odds:1.8,status:'Win',stake:100,payout:180,result:'Manchester United 2–1 Chelsea'},
    {id:'WBSP000',time:'Oct 06 · 18:10',event:'Manchester United vs Chelsea',market:'Asian Handicap',selection:'Manchester United -0.5',odds:1.8,status:'Lose',stake:100,payout:0,result:'Manchester United 1–1 Chelsea'},
    {id:'WBSP100',time:'Oct 05 · 18:00',event:'Manchester United vs Liverpool',market:'1X2',selection:'Manchester United',odds:1.8,status:'Void',stake:100,payout:100,result:'Event cancelled'},
    {id:'WBSP050',time:'Oct 05 · 17:40',event:'Manchester United vs Arsenal',market:'Asian Handicap',selection:'Manchester United -0.25',odds:1.8,status:'Half Lose',stake:100,payout:50,result:'Manchester United 1–1 Arsenal'}
  ],
  withdrawal: [
    {id:'WD500F',time:'Oct 07 · 18:20',amount:500,currency:'USDT',network:'TRC20',status:'Failed',reason:'Payment channel execution failed',refunded:true},
    {id:'WD500P',time:'Oct 07 · 17:40',amount:500,currency:'USDT',network:'TRC20',status:'Pending'},
    {id:'WD500C',time:'Oct 06 · 16:30',amount:500,currency:'USDT',network:'TRC20',status:'Completed'}
  ]
};
const orderTypes={casino:'casino-bet-list',sports:'sports-bet-list',withdrawal:'withdrawal-list'};
const orderLoading={casino:'正在查询这笔游戏注单…',sports:'正在查询这张体育注单…',withdrawal:'正在确认这笔提现状态…'};
function orderResponse(query){
  const q=query.toLowerCase().replace(/\s/g,'');
  const explicit=Object.entries(mockOrders).flatMap(([kind,records])=>records.map(order=>({kind,order}))).find(({order})=>q.includes(order.id.toLowerCase()));
  const hasIssue=/为什么|为何|怎么|输了|赢了|派彩|结算|void|失败|没到账|没收到|没有收到|处理中|还没|why|payout|status/.test(q);
  if(!explicit&&!hasIssue)return null;
  let kind=explicit?.kind;
  if(!kind){if(/提现|withdraw|usdt.*(收到|到账)/.test(q))kind='withdrawal';else if(/曼联|manchester|体育|赛事|赔率|派彩.*140|void/.test(q))kind='sports';else if(/百家乐|baccarat|游戏.*(注单|投注)|casino/.test(q))kind='casino';else if(state.aiSourceRoute==='withdrawal-detail'&&state.withdrawalOrderId)kind='withdrawal';}
  if(!kind&&/注单|订单号?|orderid/.test(q))kind=state.aiSourceRoute==='mybets'&&state.myBetsTab==='casino'?'casino':'sports';
  if(!kind)return null;
  if(!state.loggedIn)return {requiresLogin:true,loginPrompt:'查看个人订单需要先登录你的 WillBet 账户。登录后会继续查找这次提问对应的订单。'};
  const missing=()=>({type:'text',loading:'正在查找对应记录…',answer:'我暂时没有找到与你描述匹配的记录，你可以补充订单时间、游戏 / 赛事名称或订单号。'});
  const orderId=query.match(/(?:订单号?|order\s*id)\s*[:：#]?\s*([a-z0-9]+)/i)?.[1];
  if(orderId&&!explicit)return missing();
  let candidates=mockOrders[kind];
  if(kind==='sports'&&/曼联|manchester/.test(q))candidates=candidates.filter(o=>o.event.includes('Manchester United'));
  if(kind==='sports'){const selection=candidates.find(o=>o.market==='Asian Handicap'&&q.includes(o.selection.toLowerCase().replace(/\s/g,'')));if(selection)candidates=[selection];}
  if(/利物浦|liverpool/.test(q))candidates=candidates.filter(o=>(o.event||'').includes('Liverpool'));
  if(/arsenal|阿森纳/.test(q))candidates=candidates.filter(o=>(o.event||'').includes('Arsenal'));
  if(/皇马|realmadrid|不存在|找不到的|unknown/.test(q))return missing();
  if(kind==='casino'){const provider=['Evolution','WM','Sexy Gaming','PG'].find(p=>q.includes(p.toLowerCase().replace(/\s/g,'')));if(provider)candidates=candidates.filter(o=>o.provider===provider);const game=candidates.find(o=>q.includes(o.game.toLowerCase().replace(/\s/g,'')))?.game;if(game)candidates=candidates.filter(o=>o.game===game);}
  const time=query.match(/\b(\d{1,2}:\d{2})\b/)?.[1];if(time)candidates=candidates.filter(o=>o.time.includes(time));
  const activeDetailId=location.hash.match(/^#\/withdrawal-detail\/([a-z0-9]+)$/i)?.[1];
  const identified=explicit?.order||(kind==='withdrawal'&&state.aiSourceRoute==='withdrawal-detail'&&activeDetailId===state.withdrawalOrderId?candidates.find(o=>o.id===activeDetailId):null)||
    (kind==='sports'&&/100/.test(q)&&/1[.．]80?/.test(q)&&/140/.test(q)?candidates.find(o=>o.stake===100&&o.odds===1.8&&o.payout===140):null);
  if(identified)return {type:'text',loading:orderLoading[kind],answer:orderExplanation(kind,identified)};
  if(!candidates.length)return missing();
  if(candidates.length===1)return {type:'text',loading:orderLoading[kind],answer:orderExplanation(kind,candidates[0])};
  return {type:orderTypes[kind],loading:'正在查找相关订单…',answer:kind==='withdrawal'?'我找到几笔最近的提现记录，请确认你指的是哪一笔：':'我找到几笔可能相关的注单，请确认你指的是哪一笔：',orders:candidates.slice(0,5).map(o=>o.id)};
}
function orderExplanation(kind,o){
  const amount=n=>`<strong>${n} USDT</strong>`;
  if(kind==='casino'){const explanation=o.status==='Lose'?`这笔百家乐投注选择的是 <strong>${o.selection}</strong>，但该局最终结果为 <strong>${o.result}</strong>，因此这笔投注结算为输。`:o.status==='Win'?`这笔投注选择 <strong>${o.selection}</strong>，该局结果为 <strong>${o.result}</strong>，因此结算为赢。Banker 按本笔订单的 1.95 结算赔率派彩：<strong>100 × 1.95 = 195 USDT</strong>。`:'该局结果为 <strong>Tie（和）</strong>，这笔 Player 投注退回本金。';return `${explanation}<br><br>投注金额：${amount(o.stake)}<br>派彩金额：${amount(o.payout)}<br>订单号：<strong>${o.id}</strong>`;}
  if(kind==='withdrawal'){const base=`这笔 ${amount(o.amount)} 提现${o.status==='Completed'?'在 WillBet 已经完成。':o.status==='Failed'?'最终执行失败。':'当前仍在处理中。'}<br><br>当前状态：<strong>${o.status}</strong><br>网络：<strong>${o.network}</strong>`;return base+(o.status==='Failed'?`<br>失败原因：<strong>${o.reason}</strong><br><br>${o.refunded?'该笔提现资金已经退回你的可用余额。':''}`:o.status==='Pending'?'<br><br>平台还没有返回最终提现结果，请等待状态更新。':'<br><br>如果外部钱包暂时还没有显示，可能仍需要等待链上确认。');}
  const base=`这张注单最终结算为 <strong>${o.status}</strong>。<br><br>投注金额：${amount(o.stake)}<br>赔率：<strong>${o.odds.toFixed(2)}</strong><br><br>`;
  if(o.status==='Half Win')return `${base}<strong>Half Win（赢一半）</strong>会把投注金额拆成两半，而不是全部按获胜计算：<br>• 50 USDT 按正常获胜结算：<strong>50 × 1.80 = 90 USDT</strong><br>• 另外 50 USDT 退回本金：${amount(50)}<br><br>最终派彩：<strong class="accent">90 + 50 = 140 USDT</strong>。`;
  if(o.status==='Half Lose')return `${base}Half Lose（输一半）表示 50 USDT 输掉，另外 50 USDT 退回本金。<br><br>最终派彩：<strong>0 + 50 = 50 USDT</strong>。`;
  if(o.status==='Void')return `${base}该赛事取消，这张注单被作废，按赔率 1.00 退回本金。<br><br>最终派彩：<strong>100 × 1.00 = 100 USDT</strong>。`;
  return `${base}赛事结果：<strong>${o.result}</strong>。${o.status==='Lose'?`你选择 ${o.selection}，球队未能满足盘口获胜条件，因此结算为输。`:'你的 Selection 满足获胜条件。'}<br><br>最终派彩：${o.status==='Win'?'<strong>100 × 1.80 = 180 USDT</strong>':amount(0)}。`;
}
function orderStatusClass(status){return ['Win','Half Win','Completed'].includes(status)?'won':['Lose','Half Lose','Failed','Rejected'].includes(status)?'lost':['Pending','Processing'].includes(status)?'pending':'neutral';}
function orderFields(fields){return `<dl class="order-fields">${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${escapeHTML(String(value))}</dd></div>`).join('')}</dl>`;}
function orderCardHeader(o){return `<div class="order-card-top"><span class="order-status ${orderStatusClass(o.status)}">${escapeHTML(o.status)}</span><time>${o.time}</time></div>`;}
function casinoOrderCard(o){return `${orderCardHeader(o)}<h4>${o.game}</h4><small>${o.provider}</small>${orderFields([['订单号',o.id],['投注金额',`${o.stake} USDT`],['派彩金额',`${o.payout} USDT`]])}`;}
function sportsOrderCard(o){return `${orderCardHeader(o)}<h4>${o.event}</h4><small>${o.market}</small>${orderFields([['Selection',o.selection],['Odds',o.odds.toFixed(2)],['订单号',o.id],['投注额',`${o.stake} USDT`],['派彩金额',`${o.payout} USDT`]])}`;}
function withdrawalOrderCard(o){return `${orderCardHeader(o)}<h4>${o.amount} ${o.currency}</h4>${orderFields([['订单号',o.id],['币种',o.currency],['网络',o.network]])}`;}
function orderMessageHTML(m){
  const kind=Object.keys(orderTypes).find(k=>orderTypes[k]===m.type);if(!kind)return null;
  const renderer={casino:casinoOrderCard,sports:sportsOrderCard,withdrawal:withdrawalOrderCard}[kind];
  return `<article class="message ai"><div class="mini-ai">✦</div><div class="message-body">${m.content}<div class="order-card-list">${(m.orders||[]).map(id=>{const o=mockOrders[kind].find(x=>x.id===id);return o?`<button class="order-card ${m.selectedOrder===id?'selected':''}" data-order-kind="${kind}" data-order-id="${id}" aria-pressed="${m.selectedOrder===id}">${renderer(o)}</button>`:'';}).join('')}</div><div class="message-cta"><button data-cta="${kind==='withdrawal'?'withdrawal-history':'mybets'}">View More</button></div></div></article>`;
}
let orderQueryRunning=false;
function handleOrderClick(e){
  const button=e.target.closest('[data-order-id]');if(!button)return false;e.preventDefault();
  if(orderQueryRunning)return true;
  const kind=button.dataset.orderKind,o=mockOrders[kind].find(x=>x.id===button.dataset.orderId),c=currentConversation();
  if(!o||!c)return true;
  const messageIndex=Array.from(phone.querySelectorAll('#ai-chat > .message')).indexOf(button.closest('.message'));
  const candidate=c.messages[messageIndex];if(candidate)candidate.selectedOrder=o.id;
  orderQueryRunning=true;const progress={role:'ai',loading:true,type:'action-loading',content:orderLoading[kind]};c.messages.push(progress);touchConversation(c);render();
  setTimeout(()=>{const index=c.messages.indexOf(progress);if(index>=0)c.messages.splice(index,1,{role:'ai',type:'text',content:orderExplanation(kind,o)});orderQueryRunning=false;touchConversation(c);if(state.aiMode&&currentConversation()===c)render();},1200);
  return true;
}
function initOrderDetailContext(){
  routeMeta['withdrawal-detail']=['Wallet','Withdrawal Detail'];
  const match=location.hash.match(/^#\/withdrawal-detail\/([a-z0-9]+)$/i);
  if(match&&mockOrders.withdrawal.some(o=>o.id===match[1])){state.withdrawalOrderId=match[1];state.route='withdrawal-detail';}
  else if(state.route==='withdrawal-detail'){state.route='home';state.withdrawalOrderId=null;}
}
function withdrawalOrderDetail(){const o=mockOrders.withdrawal.find(x=>x.id===state.withdrawalOrderId)||mockOrders.withdrawal[0];return `${header()}${pageTitle('Withdrawal Detail','withdrawal-history')}<section class="order-detail">${withdrawalOrderCard(o)}</section>`;}
window.addEventListener('hashchange',()=>{if(/^#\/withdrawal-detail\//.test(location.hash)){initOrderDetailContext();state.aiMode=false;state.historyOpen=false;render();}});
