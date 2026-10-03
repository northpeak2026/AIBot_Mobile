/* Typed AI business messages and simulated betting. No network requests. */
const mockMarketState = JSON.parse(localStorage.getItem('willbet_mock_markets') || '{}');
let mockBetRunning = false;
function extendBusinessMocks() {
  ['arsenal','liverpool','city'].forEach((id,i)=>{
    const home=['Arsenal','Liverpool','Manchester City'][i],away=['Brighton','Everton','Newcastle'][i];
    sportsMockEvents[id]={league:'Premier League',time:i===1?"Live · 32'":`Oct ${4+i} · 20:00`,home,away,markets:'151 Markets',handicap:[[home,'Handicap -0.5','1.95'],[away,'Handicap +0.5','1.88']],result:[[home,'2.05'],['Draw','3.40'],[away,'3.25']],total:[['Over 2.5','1.93'],['Under 2.5','1.91']]};
  });
  sportsMockEvents.manchester.time='Oct 4 · 20:00';
  sportsMockEvents.manchester.handicap[0][2]='1.95';
  const games=[['pg-mahjong','Mahjong Ways','PG','mahjong','🀄'],['pg-fortune','Fortune Tiger','PG','cleopatra','♛'],['pg-dragon','Dragon Hatch','PG','zeus','⚡'],['pg-candy','Candy Bonanza','PG','candy','♥'],['pp-starlight','Starlight Princess 1000','Pragmatic Play','starlight','✦'],['evolution-roulette','Live Roulette','Evolution','cleopatra','♛'],['evolution-blackjack','Live Blackjack','Evolution','mahjong','♦']];
  games.forEach(([id,title,provider,kind,art])=>casinoGames[id]={id,title,provider,kind,art,category:id.includes('roulette')?'Roulette':id.includes('blackjack')?'Blackjack':'Slot',rtp:'96.5%',volatility:'Medium'});
}
function businessSearch(q) {
  const s=q.toLowerCase().replace(/\s/g,'');
  const categories={baccarat:['百家乐','baccarat','บาคาร่า'],slot:['slot','老虎机','电子'],roulette:['roulette','轮盘'],blackjack:['blackjack','二十一点','21点']};
  const category=Object.keys(categories).find(k=>categories[k].some(word=>s.includes(word)));
  const providers={'Pragmatic Play':['pragmatic','pp的','pp游戏'],'PG':['pg'],'Evolution':['evolution'],'WM':['wm'],'Sexy Gaming':['sexy']};
  const provider=Object.keys(providers).find(k=>providers[k].some(word=>s.includes(word)));
  // Knowledge questions keep the existing plain-text answers.
  if((category||provider)&&!s.includes('rtp')&&!s.includes('什么意思')&&!s.includes('是什么')){
    const games=Object.values(casinoGames).filter(g=>(!category||g.category.toLowerCase().includes(category))&&(!provider||g.provider===provider)).slice(0,6).map(g=>g.id);
    return {type:'game-list',loading:'正在查找游戏…',answer:games.length?`找到以下 ${escapeHTML(provider||category)} 游戏：`:'暂无符合条件的 Mock 游戏。',games,cta:{label:'View More Games',action:category==='baccarat'?'baccarat-category':'casino'}};
  }
  const team=['曼联','manchesterunited','manunited'].some(x=>s.includes(x));
  const league=s.includes('英超')||s.includes('premierleague');
  if((team||league)&&['比赛','赛事','下一场','match','game'].some(x=>s.includes(x)))return {type:'event-list',loading:'正在查找赛事…',answer:team?'Manchester United 的 Mock 赛事：':'找到以下 Premier League Mock 赛事：',events:team?['manchester']:['manchester','tottenham','arsenal','liverpool','city'],cta:{label:'View More Events',action:'sports'}};
  return null;
}
function marketKey(eventId,market,index){return `${eventId}:${market}:${index}`;}
function marketSelection(eventId,market,index){
  const event=sportsMockEvents[eventId],row=event?.[market]?.[index];if(!row)return null;
  const key=marketKey(eventId,market,index),update=mockMarketState[key]||{};
  return {key,eventId,market,index,label:market==='handicap'?`${row[0]} ${row[1]}`:row[0],odds:Number(update.odds||row[row.length-1]),status:update.status||'open'};
}
function aiEventCard(id){
  const event=sportsMockEvents[id];if(!event)return '';
  return `<article class="sports-card ai-event-card" data-ai-event="${id}"><div class="sports-card-top"><span>${event.time}</span><span>${event.markets.match(/\d+/)?.[0]||151} 个盘口 ›</span></div><small class="ai-event-league">${event.league}</small><div class="sports-event-row"><div class="team-stack"><b><i class="team-logo">${event.home.split(' ').map(x=>x[0]).join('')}</i><span class="ai-team-name" title="${event.home}">${event.home}</span></b><b><i class="team-logo away">${event.away.split(' ').map(x=>x[0]).join('')}</i><span class="ai-team-name" title="${event.away}">${event.away}</span></b></div><div class="market-mini ai-single-market">${event.result.map((_,index)=>{const pick=marketSelection(id,'result',index);return `<button data-ai-pick="${pick.key}" ${pick.status!=='open'?'disabled':''} class="${mockMarketState[pick.key]?.odds?'odds-updated':''}"><span>${['主胜','和局','客胜'][index]}</span><strong>${pick.status==='open'?pick.odds.toFixed(2):pick.status==='suspended'?'Suspended':'Closed'}</strong></button>`;}).join('')}</div></div><div class="card-tags"><span>▦ 动画</span><span>▥ 统计</span></div></article>`;
}
function businessMessageHTML(m){
  if(m.type==='game-list'||m.type==='event-list')return `<article class="message ai"><div class="mini-ai">✦</div><div class="message-body">${m.content}${m.type==='game-list'?aiGameResults(m.games||[]):(m.events||[]).map(aiEventCard).join('')}${m.cta?`<div class="message-cta"><button data-cta="${m.cta.action}">${m.cta.label}</button></div>`:''}</div></article>`;
  if(m.type==='bet-confirmation')return betConfirmationHTML(m);
  if(m.type==='action-loading')return `<article class="message ai"><div class="thinking"><i>✦</i><span>${m.content}</span></div></article>`;
  if(m.type==='bet-result')return `<article class="message ai"><div class="mini-ai">✦</div><div class="message-body">${m.content}${m.cta?`<div class="message-cta"><button data-cta="${m.cta.action}">${m.cta.label}</button></div>`:''}</div></article>`;
  return null;
}
function betConfirmationHTML(m){
  const event=sportsMockEvents[m.pick.eventId],locked=m.status!=='pending';
  return `<article class="message ai"><div class="message-body bet-confirmation"><h3>Confirm Bet <small>Mock only</small></h3><p>${event.home} vs ${event.away}</p><dl><div><dt>Selection</dt><dd>${escapeHTML(m.pick.label)}</dd></div><div><dt>Odds</dt><dd>${m.pick.odds.toFixed(2)}</dd></div></dl><label>Stake · USDT<input data-ai-stake="${m.id}" type="number" min="1" max="1000" step="0.01" placeholder="请输入投注金额" value="${m.stake||''}" ${locked?'disabled':''}></label><div class="bet-totals"><span>Available Balance <b>${m.availableBalance??500} USDT</b></span><span>Potential Payout <b data-payout="${m.id}">${((Number(m.stake)||0)*m.pick.odds).toFixed(2)} USDT</b></span></div><p class="bet-error" data-bet-error="${m.id}">${m.error||''}</p>${locked?`<small>${m.status==='running'?'Submitting…':m.status==='done'?'Completed':'Cancelled'}</small>`:`<div class="bet-buttons"><button data-ai-cancel="${m.id}">Cancel</button><button data-ai-confirm="${m.id}">Confirm Bet</button></div>`}</div></article>`;
}
function findBet(id){return currentConversation()?.messages.find(m=>m.type==='bet-confirmation'&&m.id===id);}
function appendBusinessMessage(message){const c=currentConversation();c.feedback=null;c.messages.push({role:'ai',...message});touchConversation(c);render();}
function handleBusinessClick(e){
  const pickButton=e.target.closest('[data-ai-pick]');
  if(pickButton){e.preventDefault();e.stopPropagation();if(mockBetRunning)return true;const [id,market,index]=pickButton.dataset.aiPick.split(':');const pick=marketSelection(id,market,Number(index));if(pick?.status==='open'){appendBusinessMessage({type:'bet-confirmation',id:uid(),pick,stake:state.betSlipOpen?state.betStake:'',availableBalance:Math.random()<0.2?20:500,status:'pending'});}return true;}
  const cancel=e.target.closest('[data-ai-cancel]');if(cancel){const m=findBet(cancel.dataset.aiCancel);if(m?.status==='pending'){m.status='cancelled';touchConversation(currentConversation());render();}return true;}
  const confirm=e.target.closest('[data-ai-confirm]');if(confirm){resumeMockBet(confirm.dataset.aiConfirm);return true;}
  const event=e.target.closest('[data-ai-event]');if(event){state.currentSportsEvent=event.dataset.aiEvent;state.selectedSelection=null;state.betSlipOpen=false;navigate('sports-event');return true;}
  return false;
}
function updateMockMarket(pick,update){mockMarketState[pick.key]={...mockMarketState[pick.key],...update};localStorage.setItem('willbet_mock_markets',JSON.stringify(mockMarketState));}
async function resumeMockBet(id){
  const c=currentConversation(),m=findBet(id);if(!m||m.status!=='pending'||mockBetRunning)return;
  const stake=Number(m.stake);m.error='';
  if(!Number.isFinite(stake)||stake<1||stake>1000){m.error='Enter a stake between 1 and 1,000 USDT.';render();return;}
  if(!state.loggedIn){state.pendingAuth={conversationId:c.id,betId:id};saveState();appendBusinessMessage({type:'bet-result',content:'登录后才能完成投注。',cta:{label:'Log In',action:'login'}});return;}
  const live=marketSelection(m.pick.eventId,m.pick.market,m.pick.index);
  if(live.status!=='open'){m.status='done';appendBusinessMessage({type:'bet-result',content:`This market is ${live.status} and cannot accept new bets.`});return;}
  if(live.odds!==m.pick.odds){const old=m.pick.odds;m.pick.odds=live.odds;m.error=`The odds have changed from ${old.toFixed(2)} to ${live.odds.toFixed(2)}. Review and confirm again.`;touchConversation(c);render();return;}
  m.scenario=stake>(m.availableBalance??500)?'balance':(['success','success','success','suspended','closed','odds'][Math.floor(Math.random()*6)]);
  mockBetRunning=true;m.status='running';const progress={role:'ai',type:'action-loading',loading:true,content:'正在提交投注…'};c.messages.push(progress);render();
  for(const text of ['正在确认赔率…','正在确认盘口状态…','正在等待投注平台结果…']){await new Promise(resolve=>setTimeout(resolve,450));progress.content=text;if(state.aiMode&&currentConversation()===c)render();}
  await new Promise(resolve=>setTimeout(resolve,450));c.messages.splice(c.messages.indexOf(progress),1);m.status='done';
  let content,cta=null;
  if(m.scenario==='suspended'||m.scenario==='closed'){updateMockMarket(m.pick,{status:m.scenario});content=`This market is currently ${m.scenario} and cannot accept new bets.`;}
  else if(m.scenario==='odds'){const old=m.pick.odds,newOdds=Number((old-0.07).toFixed(2));updateMockMarket(m.pick,{odds:newOdds});m.pick.odds=newOdds;m.scenario='success';m.status='pending';content=`The odds have changed from ${old.toFixed(2)} to ${newOdds.toFixed(2)}. Please review the updated odds and Confirm Bet again.`;}
  else if(stake>(m.availableBalance??500)){content=`Your available balance is ${m.availableBalance??500} USDT, which is not enough for this ${stake} USDT bet.`;cta={label:'Go to Wallet',action:'wallet'};}
  else {const betId=`WB${Date.now()}`;content=`<strong class="success">Bet Placed Successfully</strong><br><small>Mock bet · no real money wagered</small><br><br>${escapeHTML(m.pick.label)} @${m.pick.odds.toFixed(2)}<br>Stake: <strong>${stake} USDT</strong><br>Potential Payout: <strong>${(stake*m.pick.odds).toFixed(2)} USDT</strong><br>Bet ID: <strong>${betId}</strong>`;cta={label:'View My Bets',action:'mybets'};}
  c.messages.push({role:'ai',type:'bet-result',content,cta});mockBetRunning=false;touchConversation(c);if(state.aiMode&&currentConversation()===c)render();
}
document.addEventListener('input',e=>{const id=e.target.dataset.aiStake;if(!id)return;const m=findBet(id);if(m?.status!=='pending')return;m.stake=e.target.value;const payout=phone.querySelector(`[data-payout="${id}"]`);if(payout)payout.textContent=`${((Number(m.stake)||0)*m.pick.odds).toFixed(2)} USDT`;touchConversation(currentConversation());});
