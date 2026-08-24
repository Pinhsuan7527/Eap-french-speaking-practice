const STORAGE_KEY = 'eap-v01-state';

const seedMap = [
  { id: 'privilegier', expression: 'privilégier', meaning: '优先选择', example: "Je privilégie les petits commerces.", status: 'Active', reviews: 2, due: '2 天后' },
  { id: 'epanouir', expression: "s’épanouir", meaning: '获得成长与满足', example: "Ce travail me permet de m’épanouir.", status: 'Active', reviews: 2, due: '4 天后' },
  { id: 'accomplissement', expression: "un sentiment d’accomplissement", meaning: '成就感', example: "Cela me donne un sentiment d’accomplissement.", status: 'Emerging', reviews: 1, due: '今天' },
  { id: 'reussir', expression: 'réussir à + infinitif', meaning: '成功做到……', example: "J’ai réussi à trouver un bon équilibre.", status: 'Passive', reviews: 0, due: '今天' }
];

const state = loadState();
let session = { step: 'scenario', answer: '', selectedGaps: [], transferAnswer: '', transferDone: false };

const scenarios = [
  {
    eyebrow: 'DAY 2 · 工作与选择',
    prompt: '你的一位朋友收到了一份薪水更高、但工作压力也更大的 offer。他问你会怎么选。',
    helper: '用法语回答。解释你的选择，以及什么对你来说更重要。',
    transfer: '现在换一个情境：你会选择市中心的小公寓，还是郊区更大的房子？请自然地表达你的取舍。'
  }
];

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { day: 2, streak: 2, xp: 0, map: seedMap };
  } catch { return { day: 2, streak: 2, xp: 0, map: seedMap }; }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function icon(name, size = 20) {
  const paths = {
    spark: '<path d="m12 3-1.2 4.1a5.5 5.5 0 0 1-3.7 3.7L3 12l4.1 1.2a5.5 5.5 0 0 1 3.7 3.7L12 21l1.2-4.1a5.5 5.5 0 0 1 3.7-3.7L21 12l-4.1-1.2a5.5 5.5 0 0 1-3.7-3.7L12 3Z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    map: '<path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z"/><path d="M8 3v15M16 6v15"/>',
    home: '<path d="m3 11 9-8 9 8v10h-6v-6H9v6H3V11Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4V5ZM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    mic: '<rect x="8" y="3" width="8" height="12" rx="4"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>',
    stop: '<rect x="7" y="7" width="10" height="10" rx="1"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-5-4-8-7-13 0 4-2 6-4 8-2 2-3 4-3 6 0 3 3 6 7 6Z"/><path d="M12 22c2 0 3.5-1.5 3.5-3.5 0-2-1.5-3.5-3.5-5.5 0 2-1 3-2 4-1 1-1.5 2-1.5 3 0 1.5 1.5 2.5 3.5 2.5Z"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

function shell(content, active = 'practice') {
  return `<div class="app-shell">
    <aside class="sidebar">
      <button class="brand" data-nav="practice" aria-label="EAP 首页"><span class="brand-mark">é</span><span>EAP</span></button>
      <nav>
        <button class="nav-item ${active === 'practice' ? 'active' : ''}" data-nav="practice">${icon('home')}<span>今日练习</span></button>
        <button class="nav-item ${active === 'map' ? 'active' : ''}" data-nav="map">${icon('map')}<span>Active Map</span><b>${state.map.length}</b></button>
      </nav>
      <div class="sidebar-bottom"><div class="streak">${icon('flame',18)}<span><strong>${state.streak} 天</strong> 连续练习</span></div><div class="avatar">P</div></div>
    </aside>
    <main>${content}</main>
  </div>`;
}

function progress(current) {
  const steps = ['表达', '发现 Gap', '激活', '迁移'];
  return `<div class="stepper">${steps.map((s, i) => `<div class="step ${i <= current ? 'on' : ''}"><span>${i < current ? icon('check',13) : i + 1}</span><em>${s}</em></div>${i < 3 ? '<i></i>' : ''}`).join('')}</div>`;
}

function renderPractice() {
  const sc = scenarios[0];
  if (session.step === 'scenario') {
    document.querySelector('#app').innerHTML = shell(`<section class="page practice-page">
      <header class="topbar"><div><p class="overline">${sc.eyebrow}</p><h1>把想法说出来</h1></div><button class="quiet" data-nav="map">查看 Active Map ${icon('arrow',16)}</button></header>
      ${progress(0)}
      <div class="practice-card">
        <div class="prompt-number">01</div>
        <p class="scenario-label">真实场景</p>
        <h2>${sc.prompt}</h2>
        <p class="helper">${sc.helper}</p>
        <div class="answer-label"><label for="answer">你的回答</label><button class="listen-prompt" id="listen-prompt">${icon('volume',16)} 听题目</button></div>
        <div class="voice-input"><textarea id="answer" placeholder="Je pense que…" maxlength="600">${session.answer}</textarea><button class="mic-button" id="mic-answer" aria-label="用法语回答">${icon('mic',21)}<span>按下说法语</span></button></div>
        <div class="speech-status" id="speech-status" aria-live="polite"></div>
        <div class="input-meta"><span id="word-count">${countWords(session.answer)} 个词</span><span>不追求完美，先自然表达</span></div>
        <button id="analyze" class="primary" ${countWords(session.answer) < 5 ? 'disabled' : ''}>找出我的 retrieval gaps ${icon('arrow',18)}</button>
      </div>
      <p class="privacy">你的练习仅保存在此设备</p>
    </section>`);
    bindNav();
    const area = document.querySelector('#answer');
    area.addEventListener('input', () => { session.answer = area.value; document.querySelector('#word-count').textContent = `${countWords(area.value)} 个词`; document.querySelector('#analyze').disabled = countWords(area.value) < 5; });
    document.querySelector('#listen-prompt').onclick = () => speakFrench("Ton ami a reçu une offre avec un salaire plus élevé, mais aussi beaucoup plus de pression. Que choisirais-tu à sa place, et pourquoi ?");
    setupSpeechInput('mic-answer', 'answer', 'speech-status', value => { session.answer = value; });
    document.querySelector('#analyze').onclick = () => { session.answer = area.value; session.step = 'gaps'; renderPractice(); };
  } else if (session.step === 'gaps') renderGaps();
  else if (session.step === 'activate') renderActivate();
  else renderTransfer();
}

function countWords(text) { return text.trim() ? text.trim().split(/\s+/).length : 0; }

function detectGaps() {
  const a = session.answer.toLowerCase();
  return [
    { id: 'equilibre', expression: 'trouver un équilibre', meaning: '找到平衡', why: a.includes('équilibre') ? '你的表达已经接近了，用这个 chunk 会更自然。' : '适合表达薪资与生活之间的取舍。', example: "L’essentiel, c’est de trouver un équilibre." },
    { id: 'au-detriment', expression: 'au détriment de', meaning: '以牺牲……为代价', why: '让“高薪不能牺牲生活”更准确、更有层次。', example: "Je ne veux pas gagner plus au détriment de ma santé." },
    { id: 'tenir-compte', expression: 'tenir compte de', meaning: '将……考虑在内', why: '能把你的判断依据组织得更清楚。', example: "Il faut tenir compte de la qualité de vie." }
  ];
}

function renderGaps() {
  const gaps = detectGaps();
  document.querySelector('#app').innerHTML = shell(`<section class="page">
    <header class="compact-header"><button class="back" id="back">←</button><div><p class="overline">分析完成</p><h1>你差一点就说出来了</h1></div></header>
    ${progress(1)}
    <div class="analysis-intro"><div class="insight-icon">${icon('spark',22)}</div><p>你的观点清楚。下面 3 个不是“语法错误”，而是能让你更精准表达原意的 <strong>retrieval gaps</strong>。</p></div>
    <div class="gap-grid">${gaps.map((g, i) => `<article class="gap-card"><div class="gap-top"><span>0${i+1}</span><button class="sound" aria-label="播放发音">${icon('volume',18)}</button></div><h2>${g.expression}</h2><p class="meaning">${g.meaning}</p><p class="why">${g.why}</p><div class="example">${g.example}</div></article>`).join('')}</div>
    <div class="action-row"><span>本轮只激活 3 个高价值表达</span><button class="primary compact" id="activate">开始激活 ${icon('arrow',18)}</button></div>
  </section>`);
  bindNav(); document.querySelectorAll('.sound').forEach((b,i)=>b.onclick=()=>speakFrench(`${gaps[i].expression}. ${gaps[i].example}`)); document.querySelector('#back').onclick = () => { session.step='scenario'; renderPractice(); }; document.querySelector('#activate').onclick=()=>{session.selectedGaps=gaps;session.step='activate';renderPractice();};
}

function renderActivate() {
  const gaps=session.selectedGaps.length?session.selectedGaps:detectGaps();
  document.querySelector('#app').innerHTML=shell(`<section class="page"><header class="compact-header"><div><p class="overline">快速激活</p><h1>先把表达放进嘴里</h1></div><span class="timer">${icon('clock',17)} 约 2 分钟</span></header>${progress(2)}
  <div class="activation-list">${gaps.map((g,i)=>`<article class="activation-row"><span class="big-num">0${i+1}</span><div><h2>${g.expression}</h2><p>${g.example}</p><button class="inline-sound" data-speak="${i}">${icon('volume',15)} 听发音</button></div><div class="micro-task"><span>补全一句</span><p>${activationPrompt(i,g.expression)}</p></div><label class="check-label"><input type="checkbox" class="activation-check"><span>${icon('check',16)}</span></label></article>`).join('')}</div>
  <div class="action-row"><span id="activation-status">完成 0 / 3</span><button class="primary compact" id="transfer" disabled>进入新情境 ${icon('arrow',18)}</button></div></section>`);
  bindNav(); document.querySelectorAll('[data-speak]').forEach(b=>b.onclick=()=>{const g=gaps[Number(b.dataset.speak)];speakFrench(`${g.expression}. ${g.example}`)}); const checks=[...document.querySelectorAll('.activation-check')]; checks.forEach(c=>c.onchange=()=>{const n=checks.filter(x=>x.checked).length;document.querySelector('#activation-status').textContent=`完成 ${n} / 3`;document.querySelector('#transfer').disabled=n<3;}); document.querySelector('#transfer').onclick=()=>{session.step='transfer';renderPractice();};
}
function activationPrompt(i,e){return ["Pour moi, l’essentiel, c’est de ______ entre le travail et la vie privée.","Je ne veux pas réussir professionnellement ______ de ma santé.","Avant de choisir, il faut ______ ses priorités."][i] || e;}

function renderTransfer() {
  const sc=scenarios[0];
  if(session.transferDone){ return renderComplete(); }
  document.querySelector('#app').innerHTML=shell(`<section class="page practice-page"><header class="topbar"><div><p class="overline">TRANSFER TEST</p><h1>换个情境，再调用一次</h1></div><span class="subtle-tag">不提示目标词</span></header>${progress(3)}
  <div class="practice-card transfer-card"><div class="prompt-number">02</div><p class="scenario-label">新情境</p><h2>${sc.transfer}</h2><p class="helper">不必刻意使用所有新表达。像真实对话一样回答。</p><div class="answer-label"><label for="transfer-answer">你的回答</label><button class="listen-prompt" id="listen-transfer">${icon('volume',16)} 听题目</button></div><div class="voice-input"><textarea id="transfer-answer" placeholder="Personnellement, je choisirais…" maxlength="600">${session.transferAnswer}</textarea><button class="mic-button" id="mic-transfer" aria-label="用法语回答">${icon('mic',21)}<span>按下说法语</span></button></div><div class="speech-status" id="speech-status" aria-live="polite"></div><div class="input-meta"><span id="word-count">${countWords(session.transferAnswer)} 个词</span><span>系统会记录自然调用</span></div><button class="primary" id="finish" ${countWords(session.transferAnswer)<5?'disabled':''}>完成今日练习 ${icon('check',18)}</button></div></section>`);
  bindNav(); const area=document.querySelector('#transfer-answer');area.oninput=()=>{session.transferAnswer=area.value;document.querySelector('#word-count').textContent=`${countWords(area.value)} 个词`;document.querySelector('#finish').disabled=countWords(area.value)<5;}; document.querySelector('#listen-transfer').onclick=()=>speakFrench("Tu dois choisir entre un petit appartement au centre-ville et une maison plus grande en banlieue. Lequel choisirais-tu, et pourquoi ?"); setupSpeechInput('mic-transfer','transfer-answer','speech-status',value=>{session.transferAnswer=value;}); document.querySelector('#finish').onclick=()=>completeSession(area.value);
}

function speakFrench(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR'; utterance.rate = .9;
  const frenchVoice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('fr'));
  if (frenchVoice) utterance.voice = frenchVoice;
  window.speechSynthesis.speak(utterance);
}

function setupSpeechInput(buttonId, textareaId, statusId, onValue) {
  const button = document.getElementById(buttonId), area = document.getElementById(textareaId), status = document.getElementById(statusId);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { button.classList.add('unsupported'); button.querySelector('span').textContent = '此浏览器不支持语音'; button.disabled = true; return; }
  let recognition = null, listening = false, original = '';
  button.onclick = () => {
    if (listening) { recognition.stop(); return; }
    recognition = new Recognition(); recognition.lang = 'fr-FR'; recognition.continuous = true; recognition.interimResults = true; original = area.value.trim();
    recognition.onstart = () => { listening = true; button.classList.add('recording'); button.innerHTML = `${icon('stop',18)}<span>正在听… 点击结束</span>`; status.textContent = '请直接说法语，停顿也没关系'; };
    recognition.onresult = event => { let finalText='', interim=''; for(let i=0;i<event.results.length;i++){const t=event.results[i][0].transcript; event.results[i].isFinal ? finalText+=t : interim+=t;} area.value = [original, finalText || interim].filter(Boolean).join(original ? ' ' : ''); area.dispatchEvent(new Event('input',{bubbles:true})); onValue(area.value); status.textContent = interim ? `识别中：${interim}` : '已记录，可以继续说或点击结束'; };
    recognition.onerror = event => { status.textContent = event.error === 'not-allowed' ? '请允许麦克风权限后再试' : '没有听清，请再试一次'; };
    recognition.onend = () => { listening = false; button.classList.remove('recording'); button.innerHTML = `${icon('mic',21)}<span>按下继续说</span>`; if(!status.textContent.includes('允许')) status.textContent = '语音已转成文字，你可以继续编辑'; };
    recognition.start();
  };
}

function completeSession(answer){
  session.transferAnswer=answer; const gaps=session.selectedGaps.length?session.selectedGaps:detectGaps();
  gaps.forEach(g=>{if(!state.map.some(x=>x.id===g.id))state.map.push({...g,status:'Emerging',reviews:1,due:'2 天后'});});
  state.streak=Math.max(state.streak,3);state.xp+=1;saveState();session.transferDone=true;renderComplete();
}

function renderComplete(){
  const hit=/équilibre|détriment|tenir compte/i.test(session.transferAnswer);
  document.querySelector('#app').innerHTML=shell(`<section class="page complete-page">${progress(3)}<div class="complete-mark">${icon('check',34)}</div><p class="overline">DAY 2 完成</p><h1>今天，你把知识变成了表达。</h1><p class="complete-copy">${hit?'你在新情境中自然调用了刚激活的表达。':'没有刻意套用也没关系。表达已经进入 Emerging，系统会在 2 天后再次触发。'}</p><div class="result-strip"><div><strong>3</strong><span>已激活</span></div><div><strong>${hit?'1':'0'}</strong><span>自然迁移</span></div><div><strong>2 天后</strong><span>下次触发</span></div></div><div class="complete-actions"><button class="secondary" data-nav="map">查看 Active Map</button><button class="primary compact" id="restart">再练一次 ${icon('arrow',18)}</button></div></section>`);
  bindNav();document.querySelector('#restart').onclick=()=>{session={step:'scenario',answer:'',selectedGaps:[],transferAnswer:'',transferDone:false};renderPractice();};
}

function renderMap(){
  const counts=['Passive','Emerging','Active','Automatic'].map(s=>[s,state.map.filter(x=>x.status===s).length]);
  document.querySelector('#app').innerHTML=shell(`<section class="page map-page"><header class="topbar"><div><p class="overline">PERSONAL ACTIVE MAP</p><h1>你真正能调用的法语</h1><p class="header-copy">不是学过多少，而是在真实语境中能否自然说出来。</p></div><button class="primary compact" data-nav="practice">继续练习 ${icon('arrow',18)}</button></header>
  <div class="status-summary">${counts.map(([s,n])=>`<div><span class="status-dot ${s.toLowerCase()}"></span><strong>${n}</strong><em>${s}</em></div>`).join('')}</div>
  <div class="map-table"><div class="table-head"><span>表达</span><span>状态</span><span>复现</span><span>下次触发</span></div>${state.map.map(item=>`<div class="table-row"><div><strong>${item.expression}</strong><small>${item.meaning}</small></div><span class="status-pill ${item.status.toLowerCase()}">${item.status}</span><span>${item.reviews} 次</span><span>${item.due}</span></div>`).join('')}</div>
  <div class="map-note"><span>${icon('spark',20)}</span><p><strong>状态如何变化？</strong> 在不同情境中自然调用后，表达会从 Passive → Emerging → Active → Automatic。系统只在需要时安排下一次触发。</p></div></section>`,'map');bindNav();
}

function bindNav(){document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>b.dataset.nav==='map'?renderMap():renderPractice());}
renderPractice();
