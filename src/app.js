const STORAGE_KEY = 'eap-v01-state';

const seedMap = [
  { id: 'privilegier', expression: 'privilégier', meaning: '优先选择', example: "Je privilégie les petits commerces.", status: 'Active', reviews: 2, due: '2 天后' },
  { id: 'epanouir', expression: "s’épanouir", meaning: '获得成长与满足', example: "Ce travail me permet de m’épanouir.", status: 'Active', reviews: 2, due: '4 天后' },
  { id: 'accomplissement', expression: "un sentiment d’accomplissement", meaning: '成就感', example: "Cela me donne un sentiment d’accomplissement.", status: 'Emerging', reviews: 1, due: '今天' },
  { id: 'reussir', expression: 'réussir à + infinitif', meaning: '成功做到……', example: "J’ai réussi à trouver un bon équilibre.", status: 'Passive', reviews: 0, due: '今天' }
];

const state = loadState();
state.profile ||= { configured: false, level: 'A2', language: 'zh', topic: 'daily' };
let session = { step: 'scenario', answer: '', selectedGaps: [], transferAnswer: '', transferDone: false };

const copy = {
  zh: { today:'今日练习', map:'Active Map', streak:'连续练习', viewMap:'查看 Active Map', express:'把想法说出来', real:'日常场景', answer:'你的回答', speak:'按下说法语', listen:'听题目', hint:'不追求完美，先自然表达', find:'找出我的 retrieval gaps', saved:'你的练习仅保存在此设备', words:'个词', gapTitle:'你差一点就说出来了', analysis:'你的意思很清楚。下面 3 个不是“错误”，而是能帮你在日常对话中更自然表达的 retrieval gaps。', activate:'开始激活', only:'本轮只激活 3 个高价值表达', quick:'快速激活', mouth:'先把表达放进嘴里', complete:'完成', next:'进入新情境', transfer:'换个情境，再调用一次', noHint:'不提示目标词', transferHint:'不必刻意使用所有新表达。像真实对话一样回答。', finish:'完成今日练习', settings:'学习设置' },
  en: { today:'Today’s practice', map:'Active Map', streak:'day streak', viewMap:'View Active Map', express:'Say what you mean', real:'Everyday situation', answer:'Your answer', speak:'Speak in French', listen:'Listen', hint:'Don’t aim for perfect. Speak naturally first.', find:'Find my retrieval gaps', saved:'Your practice stays on this device', words:'words', gapTitle:'You almost had the words', analysis:'Your meaning is clear. These are not simply “mistakes” — they are three useful retrieval gaps for more natural everyday French.', activate:'Activate expressions', only:'Only 3 high-value expressions this round', quick:'QUICK ACTIVATION', mouth:'Put the expressions into your own speech', complete:'Completed', next:'Try a new situation', transfer:'New situation, retrieve again', noHint:'No target-word hints', transferHint:'You do not need to force every expression. Answer as in a real conversation.', finish:'Finish today’s practice', settings:'Learning settings' },
  es: { today:'Práctica de hoy', map:'Active Map', streak:'días seguidos', viewMap:'Ver Active Map', express:'Expresa lo que piensas', real:'Situación cotidiana', answer:'Tu respuesta', speak:'Hablar en francés', listen:'Escuchar', hint:'No busques la perfección. Habla con naturalidad.', find:'Encontrar mis retrieval gaps', saved:'Tu práctica se guarda solo en este dispositivo', words:'palabras', gapTitle:'Casi encontraste las palabras', analysis:'Tu idea está clara. No son simples “errores”, sino tres retrieval gaps útiles para hablar francés cotidiano con más naturalidad.', activate:'Activar expresiones', only:'Solo 3 expresiones útiles en esta ronda', quick:'ACTIVACIÓN RÁPIDA', mouth:'Lleva las expresiones a tu habla', complete:'Completado', next:'Probar otra situación', transfer:'Otro contexto, vuelve a recordar', noHint:'Sin pistas', transferHint:'No hace falta forzar todas las expresiones. Responde como en una conversación real.', finish:'Terminar la práctica', settings:'Ajustes de aprendizaje' }
};
const t = key => (copy[state.profile.language] || copy.zh)[key] || copy.zh[key] || key;

const scenarios = {
  A2: {
    zh:{eyebrow:'A2 · 日常生活',prompt:'今天下班或放学后，你想做什么？说说你的简单计划和原因。',helper:'用 3–5 句法语回答。你可以说时间、地点和一起去的人。',transfer:'你的朋友周六有空。你建议你们一起做什么？为什么？'},
    en:{eyebrow:'A2 · DAILY LIFE',prompt:'What would you like to do after work or school today? Describe your simple plan and why.',helper:'Answer in 3–5 French sentences. You can mention the time, place, and who will join you.',transfer:'Your friend is free on Saturday. What do you suggest doing together, and why?'},
    es:{eyebrow:'A2 · VIDA DIARIA',prompt:'¿Qué quieres hacer hoy después del trabajo o de clase? Explica tu plan y por qué.',helper:'Responde con 3–5 frases en francés. Puedes decir la hora, el lugar y con quién vas.',transfer:'Tu amigo está libre el sábado. ¿Qué propones hacer juntos y por qué?'}
  },
  B1: {
    zh:{eyebrow:'B1 · 日常选择',prompt:'你更喜欢在家做饭还是出去吃？请说说你的习惯、偏好和原因。',helper:'用法语回答，并举一个最近的例子。',transfer:'朋友来你的城市待一天。你会安排在哪里吃饭？为什么？'},
    en:{eyebrow:'B1 · EVERYDAY CHOICES',prompt:'Do you prefer cooking at home or eating out? Explain your habits, preference, and reasons.',helper:'Answer in French and include a recent example.',transfer:'A friend visits your city for one day. Where would you take them to eat, and why?'},
    es:{eyebrow:'B1 · ELECCIONES COTIDIANAS',prompt:'¿Prefieres cocinar en casa o comer fuera? Explica tus hábitos, preferencias y razones.',helper:'Responde en francés e incluye un ejemplo reciente.',transfer:'Un amigo visita tu ciudad por un día. ¿Dónde comeríais y por qué?'}
  },
  B2: {
    zh:{eyebrow:'B2 · 生活方式',prompt:'远程办公让生活更自由，也可能让工作和私人生活的界限消失。你怎么看？',helper:'用法语表达立场、一个理由和一个具体例子。',transfer:'如果公司要求每周回办公室三天，你会如何评价这个决定？'},
    en:{eyebrow:'B2 · LIFESTYLE',prompt:'Remote work offers freedom but can blur the line between work and private life. What is your view?',helper:'State your position in French, with one reason and one concrete example.',transfer:'How would you react if your company required three office days per week?'},
    es:{eyebrow:'B2 · ESTILO DE VIDA',prompt:'El teletrabajo da libertad, pero puede borrar el límite entre trabajo y vida privada. ¿Qué opinas?',helper:'Expresa tu postura en francés con una razón y un ejemplo concreto.',transfer:'¿Qué pensarías si tu empresa exigiera tres días por semana en la oficina?'}
  }
};
function currentScenario(){ return scenarios[state.profile.level]?.[state.profile.language] || scenarios.A2.zh; }
function frenchAudioPrompt(){ return {A2:"Qu’est-ce que tu veux faire après le travail ou les cours aujourd’hui ? Explique ton programme et pourquoi.",B1:"Tu préfères cuisiner chez toi ou manger au restaurant ? Explique tes habitudes et tes raisons.",B2:"Le télétravail donne de la liberté, mais il peut effacer la frontière entre vie professionnelle et vie privée. Qu’en penses-tu ?"}[state.profile.level]; }

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { day: 1, streak: 0, xp: 0, map: seedMap, profile:{configured:false,level:'A2',language:'zh',topic:'daily'} };
  } catch { return { day: 1, streak: 0, xp: 0, map: seedMap, profile:{configured:false,level:'A2',language:'zh',topic:'daily'} }; }
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
        <button class="nav-item ${active === 'practice' ? 'active' : ''}" data-nav="practice">${icon('home')}<span>${t('today')}</span></button>
        <button class="nav-item ${active === 'map' ? 'active' : ''}" data-nav="map">${icon('map')}<span>${t('map')}</span><b>${state.map.length}</b></button>
      </nav>
      <div class="sidebar-bottom"><div class="streak">${icon('flame',18)}<span><strong>${state.streak}</strong> ${t('streak')}</span></div><button class="avatar" id="profile-settings" title="${t('settings')}">${state.profile.level}</button></div>
    </aside>
    <main>${content}</main>
  </div>`;
}

function progress(current) {
  const steps = ['表达', '发现 Gap', '激活', '迁移'];
  return `<div class="stepper">${steps.map((s, i) => `<div class="step ${i <= current ? 'on' : ''}"><span>${i < current ? icon('check',13) : i + 1}</span><em>${s}</em></div>${i < 3 ? '<i></i>' : ''}`).join('')}</div>`;
}

function renderWelcome(){
  const welcome = {
    zh:{kicker:'你的法语开口训练，从这里开始',title:'先认识你，再开始说。',body:'选择你最容易理解的界面语言和当前法语水平。练习会从日常生活开始，并自动调整表达难度。',language:'界面语言',level:'当前法语水平',levelHelp:'A2 从短句和熟悉场景开始；你之后可以随时修改。',topic:'第一组练习主题',daily:'日常生活',start:'开始第一次练习'},
    en:{kicker:'YOUR FRENCH SPEAKING PRACTICE',title:'A little about you first.',body:'Choose your preferred interface language and current French level. Practice starts with everyday life and adapts the expressions to you.',language:'Interface language',level:'Current French level',levelHelp:'A2 starts with short sentences and familiar situations. You can change this later.',topic:'First practice theme',daily:'Everyday life',start:'Start my first practice'},
    es:{kicker:'TU PRÁCTICA ORAL DE FRANCÉS',title:'Primero, cuéntanos sobre ti.',body:'Elige el idioma de la interfaz y tu nivel actual de francés. Empezaremos con situaciones cotidianas y adaptaremos la dificultad.',language:'Idioma de la interfaz',level:'Nivel actual de francés',levelHelp:'A2 empieza con frases cortas y situaciones familiares. Puedes cambiarlo después.',topic:'Primer tema',daily:'Vida cotidiana',start:'Empezar mi primera práctica'}
  };
  const w=welcome[state.profile.language]||welcome.zh;
  document.querySelector('#app').innerHTML=shell(`<section class="welcome-page"><div class="welcome-copy"><p class="overline">${w.kicker}</p><h1>${w.title}</h1><p>${w.body}</p><div class="welcome-feature"><span>${icon('mic',23)}</span><div><strong>Speak first</strong><small>French voice → useful expressions → new situation</small></div></div></div><div class="setup-card"><label>${w.language}</label><div class="choice-grid language-choice">${[['zh','中文'],['en','English'],['es','Español']].map(([v,l])=>`<button data-language="${v}" class="choice ${state.profile.language===v?'selected':''}">${l}</button>`).join('')}</div><label>${w.level}</label><div class="choice-grid level-choice">${['A2','B1','B2'].map(v=>`<button data-level="${v}" class="choice ${state.profile.level===v?'selected':''}"><strong>${v}</strong><span>${v==='A2'?'Débutant +':v==='B1'?'Intermédiaire':'Avancé'}</span></button>`).join('')}</div><p class="level-help">${w.levelHelp}</p><label>${w.topic}</label><button class="topic-choice selected"><span>☕</span><div><strong>${w.daily}</strong><small>routine · food · friends · plans</small></div>${icon('check',17)}</button><button class="primary" id="start-profile">${w.start} ${icon('arrow',18)}</button></div></section>`,'practice');
  bindNav();
  document.querySelectorAll('[data-language]').forEach(b=>b.onclick=()=>{state.profile.language=b.dataset.language;saveState();renderWelcome();});
  document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{state.profile.level=b.dataset.level;document.querySelectorAll('[data-level]').forEach(x=>x.classList.toggle('selected',x===b));});
  document.querySelector('#start-profile').onclick=()=>{state.profile.configured=true;state.day=1;saveState();session={step:'scenario',answer:'',selectedGaps:[],transferAnswer:'',transferDone:false};renderPractice();};
}

function renderPractice() {
  if (!state.profile.configured) return renderWelcome();
  const sc = currentScenario();
  if (session.step === 'scenario') {
    document.querySelector('#app').innerHTML = shell(`<section class="page practice-page">
      <header class="topbar"><div><p class="overline">DAY ${state.day} · ${sc.eyebrow}</p><h1>${t('express')}</h1></div><button class="quiet" data-nav="map">${t('viewMap')} ${icon('arrow',16)}</button></header>
      ${progress(0)}
      <div class="practice-card">
        <div class="prompt-number">01</div>
        <p class="scenario-label">${t('real')}</p>
        <h2>${sc.prompt}</h2>
        <p class="helper">${sc.helper}</p>
        <div class="answer-label"><label for="answer">${t('answer')}</label><button class="listen-prompt" id="listen-prompt">${icon('volume',16)} ${t('listen')}</button></div>
        <div class="voice-input"><textarea id="answer" placeholder="Je pense que…" maxlength="600">${session.answer}</textarea><button class="mic-button" id="mic-answer" aria-label="${t('speak')}">${icon('mic',21)}<span>${t('speak')}</span></button></div>
        <div class="speech-status" id="speech-status" aria-live="polite"></div>
        <div class="input-meta"><span id="word-count">${countWords(session.answer)} ${t('words')}</span><span>${t('hint')}</span></div>
        <button id="analyze" class="primary" ${countWords(session.answer) < 5 ? 'disabled' : ''}>${t('find')} ${icon('arrow',18)}</button>
      </div>
      <p class="privacy">${t('saved')}</p>
    </section>`);
    bindNav();
    const area = document.querySelector('#answer');
    area.addEventListener('input', () => { session.answer = area.value; document.querySelector('#word-count').textContent = `${countWords(area.value)} ${t('words')}`; document.querySelector('#analyze').disabled = countWords(area.value) < 5; });
    document.querySelector('#listen-prompt').onclick = () => speakFrench(frenchAudioPrompt());
    setupSpeechInput('mic-answer', 'answer', 'speech-status', value => { session.answer = value; });
    document.querySelector('#analyze').onclick = () => { session.answer = area.value; session.step = 'gaps'; renderPractice(); };
  } else if (session.step === 'gaps') renderGaps();
  else if (session.step === 'activate') renderActivate();
  else renderTransfer();
}

function countWords(text) { return text.trim() ? text.trim().split(/\s+/).length : 0; }

function detectGaps() {
  const a = session.answer.toLowerCase();
  if(state.profile.level==='A2') return [
    {id:'avoir-envie',expression:'avoir envie de + infinitif',meaning:{zh:'想要做……',en:'to feel like doing',es:'tener ganas de'}[state.profile.language],why:{zh:'表达日常计划时非常常用。',en:'Very useful for everyday plans.',es:'Muy útil para planes cotidianos.'}[state.profile.language],example:"J’ai envie de me promener après les cours."},
    {id:'retrouver',expression:'retrouver quelqu’un',meaning:{zh:'和某人会面',en:'to meet up with someone',es:'quedar con alguien'}[state.profile.language],why:{zh:'比单独使用 voir 更具体自然。',en:'More precise and natural than simply using voir.',es:'Más preciso y natural que usar solo voir.'}[state.profile.language],example:"Je vais retrouver une amie au café."},
    {id:'ca-me-detend',expression:'ça me détend',meaning:{zh:'这让我放松',en:'it helps me relax',es:'me relaja'}[state.profile.language],why:{zh:'用简单句说明你喜欢某件事的原因。',en:'A simple way to explain why you enjoy something.',es:'Una forma sencilla de explicar por qué te gusta algo.'}[state.profile.language],example:"J’aime marcher parce que ça me détend."}
  ];
  if(state.profile.level==='B1') return [
    {id:'avoir-habitude',expression:'avoir l’habitude de',meaning:{zh:'习惯于',en:'to be used to',es:'tener la costumbre de'}[state.profile.language],why:'A useful chunk for describing your routine.',example:"J’ai l’habitude de cuisiner le soir."},
    {id:'de-temps-en-temps',expression:'de temps en temps',meaning:{zh:'偶尔',en:'from time to time',es:'de vez en cuando'}[state.profile.language],why:'It makes frequency sound natural.',example:"Je mange au restaurant de temps en temps."},
    {id:'ca-depend',expression:'ça dépend de',meaning:{zh:'这取决于',en:'it depends on',es:'depende de'}[state.profile.language],why:'Useful for giving a balanced answer.',example:"Ça dépend de mon emploi du temps."}
  ];
  return [
    { id: 'equilibre', expression: 'trouver un équilibre', meaning: '找到平衡', why: a.includes('équilibre') ? '你的表达已经接近了，用这个 chunk 会更自然。' : '适合表达薪资与生活之间的取舍。', example: "L’essentiel, c’est de trouver un équilibre." },
    { id: 'au-detriment', expression: 'au détriment de', meaning: '以牺牲……为代价', why: '让“高薪不能牺牲生活”更准确、更有层次。', example: "Je ne veux pas gagner plus au détriment de ma santé." },
    { id: 'tenir-compte', expression: 'tenir compte de', meaning: '将……考虑在内', why: '能把你的判断依据组织得更清楚。', example: "Il faut tenir compte de la qualité de vie." }
  ];
}

function renderGaps() {
  const gaps = detectGaps();
  document.querySelector('#app').innerHTML = shell(`<section class="page">
    <header class="compact-header"><button class="back" id="back">←</button><div><p class="overline">RETRIEVAL GAPS</p><h1>${t('gapTitle')}</h1></div></header>
    ${progress(1)}
    <div class="analysis-intro"><div class="insight-icon">${icon('spark',22)}</div><p>${t('analysis')}</p></div>
    <div class="gap-grid">${gaps.map((g, i) => `<article class="gap-card"><div class="gap-top"><span>0${i+1}</span><button class="sound" aria-label="播放发音">${icon('volume',18)}</button></div><h2>${g.expression}</h2><p class="meaning">${g.meaning}</p><p class="why">${g.why}</p><div class="example">${g.example}</div></article>`).join('')}</div>
    <div class="action-row"><span>${t('only')}</span><button class="primary compact" id="activate">${t('activate')} ${icon('arrow',18)}</button></div>
  </section>`);
  bindNav(); document.querySelectorAll('.sound').forEach((b,i)=>b.onclick=()=>speakFrench(`${gaps[i].expression}. ${gaps[i].example}`)); document.querySelector('#back').onclick = () => { session.step='scenario'; renderPractice(); }; document.querySelector('#activate').onclick=()=>{session.selectedGaps=gaps;session.step='activate';renderPractice();};
}

function renderActivate() {
  const gaps=session.selectedGaps.length?session.selectedGaps:detectGaps();
  document.querySelector('#app').innerHTML=shell(`<section class="page"><header class="compact-header"><div><p class="overline">${t('quick')}</p><h1>${t('mouth')}</h1></div><span class="timer">${icon('clock',17)} 2 min</span></header>${progress(2)}
  <div class="activation-list">${gaps.map((g,i)=>`<article class="activation-row"><span class="big-num">0${i+1}</span><div><h2>${g.expression}</h2><p>${g.example}</p><button class="inline-sound" data-speak="${i}">${icon('volume',15)} 听发音</button></div><div class="micro-task"><span>补全一句</span><p>${activationPrompt(i,g.expression)}</p></div><label class="check-label"><input type="checkbox" class="activation-check"><span>${icon('check',16)}</span></label></article>`).join('')}</div>
  <div class="action-row"><span id="activation-status">${t('complete')} 0 / 3</span><button class="primary compact" id="transfer" disabled>${t('next')} ${icon('arrow',18)}</button></div></section>`);
  bindNav(); document.querySelectorAll('[data-speak]').forEach(b=>b.onclick=()=>{const g=gaps[Number(b.dataset.speak)];speakFrench(`${g.expression}. ${g.example}`)}); const checks=[...document.querySelectorAll('.activation-check')]; checks.forEach(c=>c.onchange=()=>{const n=checks.filter(x=>x.checked).length;document.querySelector('#activation-status').textContent=`完成 ${n} / 3`;document.querySelector('#transfer').disabled=n<3;}); document.querySelector('#transfer').onclick=()=>{session.step='transfer';renderPractice();};
}
function activationPrompt(i,e){
  const prompts={A2:["Après les cours, j’______ me promener.","Samedi, je vais ______ une amie.","J’aime cette activité parce que ______."],B1:["J’______ cuisiner le soir.","Je mange dehors ______.","Mon choix, ______ mon emploi du temps."],B2:["Pour moi, l’essentiel, c’est de ______ entre le travail et la vie privée.","Je ne veux pas réussir professionnellement ______ de ma santé.","Avant de choisir, il faut ______ ses priorités."]};
  return prompts[state.profile.level][i] || e;
}

function renderTransfer() {
  const sc=currentScenario();
  if(session.transferDone){ return renderComplete(); }
  document.querySelector('#app').innerHTML=shell(`<section class="page practice-page"><header class="topbar"><div><p class="overline">TRANSFER TEST</p><h1>${t('transfer')}</h1></div><span class="subtle-tag">${t('noHint')}</span></header>${progress(3)}
  <div class="practice-card transfer-card"><div class="prompt-number">02</div><p class="scenario-label">TRANSFER</p><h2>${sc.transfer}</h2><p class="helper">${t('transferHint')}</p><div class="answer-label"><label for="transfer-answer">${t('answer')}</label><button class="listen-prompt" id="listen-transfer">${icon('volume',16)} ${t('listen')}</button></div><div class="voice-input"><textarea id="transfer-answer" placeholder="Personnellement, je…" maxlength="600">${session.transferAnswer}</textarea><button class="mic-button" id="mic-transfer" aria-label="${t('speak')}">${icon('mic',21)}<span>${t('speak')}</span></button></div><div class="speech-status" id="speech-status" aria-live="polite"></div><div class="input-meta"><span id="word-count">${countWords(session.transferAnswer)} ${t('words')}</span><span>spaced retrieval</span></div><button class="primary" id="finish" ${countWords(session.transferAnswer)<5?'disabled':''}>${t('finish')} ${icon('check',18)}</button></div></section>`);
  bindNav(); const area=document.querySelector('#transfer-answer');area.oninput=()=>{session.transferAnswer=area.value;document.querySelector('#word-count').textContent=`${countWords(area.value)} ${t('words')}`;document.querySelector('#finish').disabled=countWords(area.value)<5;}; document.querySelector('#listen-transfer').onclick=()=>speakFrench({A2:"Ton ami est libre samedi. Qu’est-ce que vous pouvez faire ensemble, et pourquoi ?",B1:"Un ami visite ta ville pour une journée. Où allez-vous manger, et pourquoi ?",B2:"Ton entreprise demande trois jours au bureau par semaine. Que penses-tu de cette décision ?"}[state.profile.level]); setupSpeechInput('mic-transfer','transfer-answer','speech-status',value=>{session.transferAnswer=value;}); document.querySelector('#finish').onclick=()=>completeSession(area.value);
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

function bindNav(){document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>b.dataset.nav==='map'?renderMap():renderPractice());const p=document.querySelector('#profile-settings');if(p)p.onclick=()=>{state.profile.configured=false;saveState();renderWelcome();};}
renderPractice();
