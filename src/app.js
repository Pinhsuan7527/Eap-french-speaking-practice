const STORAGE_KEY = 'eap-v01-state';

const seedMap = [
  { id: 'privilegier', expression: 'privilégier', meaning: '优先选择', example: "Je privilégie les petits commerces.", status: 'Active', reviews: 2, due: '2 天后' },
  { id: 'epanouir', expression: "s’épanouir", meaning: '获得成长与满足', example: "Ce travail me permet de m’épanouir.", status: 'Active', reviews: 2, due: '4 天后' },
  { id: 'accomplissement', expression: "un sentiment d’accomplissement", meaning: '成就感', example: "Cela me donne un sentiment d’accomplissement.", status: 'Emerging', reviews: 1, due: '今天' },
  { id: 'reussir', expression: 'réussir à + infinitif', meaning: '成功做到……', example: "J’ai réussi à trouver un bon équilibre.", status: 'Passive', reviews: 0, due: '今天' }
];

const state = loadState();
state.profile ||= { configured: false, level: 'A2', language: 'zh', topic: 'daily', voice: 'claire' };
state.profile.voice ||= 'claire';
state.round ??= 0;
let session = { step: 'scenario', answer: '', selectedGaps: [], transferAnswer: '', transferDone: false, analysis: null };
let placement = { step: 0, answers: [], draft: '' };
let vocabTest = { selected: new Set(), startedAt: 0, timer: null };

const copy = {
  zh: { today:'今日练习', map:'Active Map', streak:'连续练习', viewMap:'查看 Active Map', express:'把想法说出来', real:'日常场景', answer:'你的回答', speak:'按下说法语', listen:'听题目', hint:'不追求完美，先自然表达', find:'找出我的 retrieval gaps', saved:'你的练习仅保存在此设备', words:'个词', gapTitle:'你差一点就说出来了', analysis:'你的意思很清楚。下面 3 个不是“错误”，而是能帮你在日常对话中更自然表达的 retrieval gaps。', activate:'开始激活', only:'本轮只激活 3 个高价值表达', quick:'快速激活', mouth:'先把表达放进嘴里', complete:'完成', next:'进入新情境', transfer:'换个情境，再调用一次', noHint:'不提示目标词', transferHint:'不必刻意使用所有新表达。像真实对话一样回答。', finish:'完成本轮练习', nextTopic:'换个主题，再练一次', settings:'学习设置' },
  en: { today:'Today’s practice', map:'Active Map', streak:'day streak', viewMap:'View Active Map', express:'Say what you mean', real:'Everyday situation', answer:'Your answer', speak:'Speak in French', listen:'Listen', hint:'Don’t aim for perfect. Speak naturally first.', find:'Find my retrieval gaps', saved:'Your practice stays on this device', words:'words', gapTitle:'You almost had the words', analysis:'Your meaning is clear. These are not simply “mistakes” — they are three useful retrieval gaps for more natural everyday French.', activate:'Activate expressions', only:'Only 3 high-value expressions this round', quick:'QUICK ACTIVATION', mouth:'Put the expressions into your own speech', complete:'Completed', next:'Try a new situation', transfer:'New situation, retrieve again', noHint:'No target-word hints', transferHint:'You do not need to force every expression. Answer as in a real conversation.', finish:'Finish this round', nextTopic:'Practise again with a new topic', settings:'Learning settings' },
  es: { today:'Práctica de hoy', map:'Active Map', streak:'días seguidos', viewMap:'Ver Active Map', express:'Expresa lo que piensas', real:'Situación cotidiana', answer:'Tu respuesta', speak:'Hablar en francés', listen:'Escuchar', hint:'No busques la perfección. Habla con naturalidad.', find:'Encontrar mis retrieval gaps', saved:'Tu práctica se guarda solo en este dispositivo', words:'palabras', gapTitle:'Casi encontraste las palabras', analysis:'Tu idea está clara. No son simples “errores”, sino tres retrieval gaps útiles para hablar francés cotidiano con más naturalidad.', activate:'Activar expresiones', only:'Solo 3 expresiones útiles en esta ronda', quick:'ACTIVACIÓN RÁPIDA', mouth:'Lleva las expresiones a tu habla', complete:'Completado', next:'Probar otra situación', transfer:'Otro contexto, vuelve a recordar', noHint:'Sin pistas', transferHint:'No hace falta forzar todas las expresiones. Responde como en una conversación real.', finish:'Terminar esta ronda', nextTopic:'Practicar otro tema', settings:'Ajustes de aprendizaje' }
};
const t = key => (copy[state.profile.language] || copy.zh)[key] || copy.zh[key] || key;

const scenarios = {
  A1: {
    zh:{eyebrow:'A1 · 第一次对话',prompt:'Bonjour！你叫什么名字？你住在哪里？',helper:'用最简单的法语回答。一个词或一句短句也可以。',transfer:'朋友问你喜欢咖啡还是茶。你怎么回答？'},
    en:{eyebrow:'A1 · FIRST DIALOGUE',prompt:'Bonjour! What is your name, and where do you live?',helper:'Answer with very simple French. One word or one short sentence is fine.',transfer:'A friend asks whether you like coffee or tea. What do you say?'},
    es:{eyebrow:'A1 · PRIMER DIÁLOGO',prompt:'Bonjour. ¿Cómo te llamas y dónde vives?',helper:'Responde con francés muy sencillo. Una palabra o frase corta está bien.',transfer:'Un amigo pregunta si te gusta el café o el té. ¿Qué respondes?'}
  },
  A2: {
    zh:{eyebrow:'A2 · 简单对话',prompt:'Bonjour！你今天怎么样？今天准备做什么？',helper:'像和朋友聊天一样，用 2–4 句简单法语回答。',transfer:'朋友问你周末有没有空。你会怎么回答？'},
    en:{eyebrow:'A2 · SIMPLE DIALOGUE',prompt:'Bonjour! How are you today, and what are you going to do?',helper:'Answer like you are chatting with a friend, using 2–4 simple French sentences.',transfer:'A friend asks if you are free this weekend. How do you answer?'},
    es:{eyebrow:'A2 · DIÁLOGO SENCILLO',prompt:'Bonjour. ¿Cómo estás hoy y qué vas a hacer?',helper:'Responde como si hablaras con un amigo, con 2–4 frases sencillas en francés.',transfer:'Un amigo te pregunta si estás libre este fin de semana. ¿Qué respondes?'}
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
  },
  C1: {
    zh:{eyebrow:'C1 · 观点与语域',prompt:'“永远保持忙碌”为什么在现代社会常被等同于成功？这种观念有什么局限？',helper:'请用法语组织细腻观点，并注意连接和语域。',transfer:'如果你要在正式会议中反驳这种观点，你会怎么表达？'},
    en:{eyebrow:'C1 · NUANCE & REGISTER',prompt:'Why is constant busyness often equated with success, and what are the limits of this idea?',helper:'Build a nuanced argument in French and pay attention to register.',transfer:'How would you challenge this view in a formal meeting?'},
    es:{eyebrow:'C1 · MATIZ Y REGISTRO',prompt:'¿Por qué estar siempre ocupado se asocia con el éxito y qué límites tiene esta idea?',helper:'Construye un argumento matizado en francés y cuida el registro.',transfer:'¿Cómo cuestionarías esta idea en una reunión formal?'}
  },
  C2: {
    zh:{eyebrow:'C2 · 文化与抽象表达',prompt:'语言是在描述现实，还是也在塑造我们能够想象的现实？',helper:'请用法语展开抽象论证，可使用类比、限定和反例。',transfer:'请把同一观点改写成适合大众电台访谈的表达。'},
    en:{eyebrow:'C2 · CULTURE & ABSTRACTION',prompt:'Does language merely describe reality, or does it shape what we are able to imagine?',helper:'Develop an abstract argument in French using analogy, qualification, or counterexample.',transfer:'Reframe the same idea for a general-audience radio interview.'},
    es:{eyebrow:'C2 · CULTURA Y ABSTRACCIÓN',prompt:'¿El lenguaje solo describe la realidad o también moldea lo que podemos imaginar?',helper:'Desarrolla un argumento abstracto en francés con analogías y contraejemplos.',transfer:'Reformula la misma idea para una entrevista de radio generalista.'}
  }
};
const frenchVisibleQuestions={
  A1:{prompt:"Bonjour ! Comment tu t’appelles et où est-ce que tu habites ?",transfer:"Tu préfères le café ou le thé ?"},
  A2:{prompt:"Bonjour ! Comment ça va aujourd’hui ? Qu’est-ce que tu vas faire ?",transfer:"Tu es libre ce week-end ? Qu’est-ce que tu veux faire ?"},
  B1:{prompt:"Tu préfères cuisiner chez toi ou manger au restaurant ? Pourquoi ?",transfer:"Un ami visite ta ville. Où est-ce que vous allez manger ?"},
  B2:{prompt:"Le télétravail améliore-t-il vraiment la qualité de vie ?",transfer:"Que penses-tu d’une semaine avec trois jours obligatoires au bureau ?"},
  C1:{prompt:"Pourquoi le fait d’être constamment occupé est-il souvent assimilé à la réussite ?",transfer:"Comment contesterais-tu cette idée dans une réunion formelle ?"},
  C2:{prompt:"Le langage se contente-t-il de décrire le réel, ou façonne-t-il ce que nous pouvons imaginer ?",transfer:"Comment reformulerais-tu cette idée pour une émission de radio grand public ?"}
};
const dailyVariants={
  A1:[
    {theme:'SE PRÉSENTER',prompt:"Bonjour ! Comment tu t’appelles et où est-ce que tu habites ?",transfer:"Tu préfères le café ou le thé ?"},
    {theme:'AU CAFÉ',prompt:"Bonjour ! Qu’est-ce que tu veux boire ?",transfer:"Tu veux manger quelque chose aussi ?"},
    {theme:'LA FAMILLE',prompt:"Tu as des frères ou des sœurs ?",transfer:"Avec qui est-ce que tu habites ?"}
  ],
  A2:[
    {theme:'LES PROJETS',prompt:"Bonjour ! Comment ça va aujourd’hui ? Qu’est-ce que tu vas faire ?",transfer:"Tu es libre ce week-end ?"},
    {theme:'LES COURSES',prompt:"Qu’est-ce que tu achètes souvent au supermarché ?",transfer:"Tu préfères le marché ou le supermarché ?"},
    {theme:'LES TRANSPORTS',prompt:"Comment est-ce que tu vas au travail ou à l’école ?",transfer:"Quel moyen de transport préfères-tu ?"}
  ],
  B1:[
    {theme:'MANGER',prompt:"Tu préfères cuisiner chez toi ou manger au restaurant ? Pourquoi ?",transfer:"Un ami visite ta ville. Où allez-vous manger ?"},
    {theme:'VOYAGER',prompt:"Quel voyage t’a laissé un bon souvenir ?",transfer:"Tu préfères préparer un voyage ou improviser ?"},
    {theme:'LES HABITUDES',prompt:"Quelle habitude aimerais-tu changer dans ta vie quotidienne ?",transfer:"Comment pourrais-tu commencer cette semaine ?"}
  ],
  B2:[
    {theme:'LE TÉLÉTRAVAIL',prompt:"Le télétravail améliore-t-il vraiment la qualité de vie ?",transfer:"Que penses-tu de trois jours obligatoires au bureau ?"},
    {theme:'LA VILLE',prompt:"Les centres-villes devraient-ils limiter fortement la voiture ?",transfer:"Quelles alternatives seraient réalistes ?"},
    {theme:'L’INFORMATION',prompt:"Est-il devenu plus difficile de distinguer une information fiable ?",transfer:"Qui devrait être responsable de l’éducation aux médias ?"}
  ],
  C1:[
    {theme:'LA RÉUSSITE',prompt:"Pourquoi le fait d’être constamment occupé est-il souvent assimilé à la réussite ?",transfer:"Comment contesterais-tu cette idée dans une réunion formelle ?"},
    {theme:'LE PROGRÈS',prompt:"Toute innovation socialement utile est-elle nécessairement souhaitable ?",transfer:"Comment présenterais-tu une position nuancée à un décideur ?"},
    {theme:'LE TRAVAIL',prompt:"La quête de sens au travail relève-t-elle d’un privilège ou d’un besoin légitime ?",transfer:"Comment adapterais-tu ton argument à un public sceptique ?"}
  ],
  C2:[
    {theme:'LE LANGAGE',prompt:"Le langage se contente-t-il de décrire le réel, ou façonne-t-il ce que nous pouvons imaginer ?",transfer:"Reformule cette idée pour une émission de radio grand public."},
    {theme:'LA MÉMOIRE',prompt:"Une société peut-elle construire un avenir commun sans récit partagé de son passé ?",transfer:"Exprime la même thèse sous la forme d’une courte chronique."},
    {theme:'LA LIBERTÉ',prompt:"La multiplication des choix accroît-elle toujours notre liberté ?",transfer:"Défends brièvement la position inverse de la tienne."}
  ]
};
function currentScenario(){ const base=scenarios[state.profile.level]?.[state.profile.language] || scenarios.A2.zh;const variants=dailyVariants[state.profile.level]||dailyVariants.A2;const variant=variants[state.round%variants.length];return {...base,...variant,eyebrow:`${state.profile.level} · ${variant.theme}`}; }
function frenchAudioPrompt(){ return currentScenario().prompt; }

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
    zh:{kicker:'你的法语开口训练，从这里开始',title:'一分钟，找到合适起点。',body:'选出你真正认识、能理解的法语单词。系统会根据词汇难度快速估算你的起始等级。',language:'界面语言',level:'词汇测试范围',levelHelp:'日常高频词 · 常用表达 · 抽象词汇',topic:'练习将从这里开始',daily:'按能力自适应',start:'开始 1 分钟词汇测试'},
    en:{kicker:'YOUR FRENCH SPEAKING PRACTICE',title:'Find your starting point in one minute.',body:'Select only the French words you genuinely understand. Their difficulty gives you a quick starting-level estimate.',language:'Interface language',level:'Vocabulary range',levelHelp:'Daily words · useful expressions · abstract vocabulary',topic:'Your practice path',daily:'Adaptive to your ability',start:'Start the 1-minute vocabulary test'},
    es:{kicker:'TU PRÁCTICA ORAL DE FRANCÉS',title:'Encuentra tu nivel en un minuto.',body:'Selecciona solo las palabras francesas que realmente comprendes. Su dificultad permite estimar rápidamente tu nivel inicial.',language:'Idioma de la interfaz',level:'Rango de vocabulario',levelHelp:'Palabras cotidianas · expresiones útiles · vocabulario abstracto',topic:'Tu itinerario',daily:'Adaptado a tu capacidad',start:'Empezar la prueba de vocabulario'}
  };
  const w=welcome[state.profile.language]||welcome.zh;
  document.querySelector('#app').innerHTML=shell(`<section class="welcome-page"><div class="welcome-copy"><p class="overline">${w.kicker}</p><h1>${w.title}</h1><p>${w.body}</p><div class="welcome-feature"><span>${icon('spark',23)}</span><div><strong>1-minute check</strong><small>known words → level estimate → adaptive practice</small></div></div></div><div class="setup-card"><label>${w.language}</label><div class="choice-grid language-choice">${[['zh','中文'],['en','English'],['es','Español']].map(([v,l])=>`<button data-language="${v}" class="choice ${state.profile.language===v?'selected':''}">${l}</button>`).join('')}</div><label>Voix française · French voice</label><div class="voice-choice">${[['claire','Claire','♀'],['julien','Julien','♂'],['amelie','Amélie','♀'],['louis','Louis','♂']].map(([v,n,g])=>`<button data-voice="${v}" class="voice-option ${state.profile.voice===v?'selected':''}"><span>${g}</span><strong>${n}</strong><small>Écouter</small></button>`).join('')}</div><label>${w.level}</label><div class="assessment-scale"><div><strong>A2</strong><span>daily basics</span></div><i>${icon('arrow',15)}</i><div><strong>B1</strong><span>conversation</span></div><i>${icon('arrow',15)}</i><div><strong>B2</strong><span>deep ideas</span></div></div><p class="level-help">${w.levelHelp}</p><button class="primary" id="start-profile">${w.start} ${icon('arrow',18)}</button></div></section>`,'practice');
  bindNav();
  document.querySelectorAll('[data-language]').forEach(b=>b.onclick=()=>{state.profile.language=b.dataset.language;saveState();renderWelcome();});
  document.querySelectorAll('[data-voice]').forEach(b=>b.onclick=()=>previewVoice(b));
  document.querySelector('#start-profile').onclick=()=>renderVocabularyTest();
}

const vocabularyBank=[
  ['bonjour','A1'],['maison','A1'],['manger','A1'],['famille','A1'],['aujourd’hui','A1'],['petit','A1'],
  ['souvent','A2'],['choisir','A2'],['rendez-vous','A2'],['oublier','A2'],['avoir besoin de','A2'],['quartier','A2'],
  ['pourtant','B1'],['améliorer','B1'],['réussir à','B1'],['habitude','B1'],['conseiller','B1'],['se rendre compte','B1'],
  ['enjeu','B2'],['nuancer','B2'],['bouleverser','B2'],['épanouissement','B2'],['néanmoins','B2'],['incontournable','B2'],
  ['susciter','C1'],['paradoxal','C1'],['préconiser','C1'],['dérive','C1'],['pérenniser','C1'],['discernement','C1'],
  ['subséquent','C2'],['prolégomènes','C2'],['dilatoire','C2'],['irréfragable','C2'],['obérer','C2'],['palimpseste','C2']
];

function renderVocabularyTest(){
  if(vocabTest.timer)clearInterval(vocabTest.timer);vocabTest={selected:new Set(),startedAt:Date.now(),timer:null};
  const c={zh:{tag:'1 分钟词汇量测试',title:'选出你真正认识的单词',help:'只选择你能解释意思，或能在句子中认出的词。不会扣分，不确定就跳过。',known:'已认识',finish:'完成并估算等级'},en:{tag:'1-MINUTE VOCABULARY CHECK',title:'Select the words you genuinely know',help:'Choose a word only if you can explain it or recognize it in a sentence. Skip anything uncertain.',known:'selected',finish:'Finish and estimate my level'},es:{tag:'PRUEBA DE VOCABULARIO · 1 MIN',title:'Selecciona las palabras que realmente conoces',help:'Elige una palabra solo si puedes explicar su significado o reconocerla en una frase.',known:'seleccionadas',finish:'Terminar y estimar mi nivel'}}[state.profile.language];
  document.querySelector('#app').innerHTML=shell(`<section class="vocab-page"><header><button class="back" id="exit-vocab">←</button><div><p class="overline">${c.tag}</p><h1>${c.title}</h1></div><div class="countdown"><span id="vocab-time">1:00</span><small>${c.known}: <b id="known-count">0</b></small></div></header><p class="vocab-help">${c.help}</p><div class="word-cloud">${vocabularyBank.map(([word,level],i)=>`<button class="word-chip" data-word-index="${i}" aria-pressed="false"><span>${word}</span><i>${icon('check',13)}</i></button>`).join('')}</div><button class="primary finish-vocab" id="finish-vocab">${c.finish} ${icon('arrow',18)}</button></section>`,'practice');
  bindNav();document.querySelector('#exit-vocab').onclick=()=>{clearInterval(vocabTest.timer);renderWelcome();};document.querySelectorAll('[data-word-index]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.wordIndex);vocabTest.selected.has(i)?vocabTest.selected.delete(i):vocabTest.selected.add(i);b.classList.toggle('selected');b.setAttribute('aria-pressed',b.classList.contains('selected'));document.querySelector('#known-count').textContent=vocabTest.selected.size;});document.querySelector('#finish-vocab').onclick=()=>{clearInterval(vocabTest.timer);renderVocabularyResult();};vocabTest.timer=setInterval(()=>{const left=Math.max(0,60-Math.floor((Date.now()-vocabTest.startedAt)/1000));const el=document.querySelector('#vocab-time');if(el)el.textContent=`0:${String(left).padStart(2,'0')}`;if(left===0){clearInterval(vocabTest.timer);renderVocabularyResult();}},1000);
}

function vocabularyLevel(){
  const counts={A1:0,A2:0,B1:0,B2:0,C1:0,C2:0};vocabTest.selected.forEach(i=>counts[vocabularyBank[i][1]]++);
  const levels=['A1','A2','B1','B2','C1','C2'];let result='A1';
  levels.forEach((level,i)=>{const lowerKnown=levels.slice(0,i).reduce((sum,l)=>sum+counts[l],0);if(counts[level]>=3&&lowerKnown>=Math.max(0,i*2))result=level;});
  return result;
}

function renderVocabularyResult(){
  const level=vocabularyLevel();state.profile.level=level;
  const descriptions={zh:{A1:'从打招呼、自我介绍和最基本的生活词汇开始。',A2:'从问路、点餐、购物、朋友和计划等简单对话开始。',B1:'从自然日常对话开始，练习理由、经历和偏好。',B2:'日常热身后进入工作、社会现象和观点讨论。',C1:'训练细腻观点、语域选择、隐含意义和专业讨论。',C2:'进入高度抽象、文化与修辞层面的精确表达。'},en:{A1:'Start with greetings, introductions, and essential everyday words.',A2:'Begin with simple dialogues about food, shopping, friends, and plans.',B1:'Practise natural daily conversation, reasons, experiences, and preferences.',B2:'Warm up with daily language, then discuss work, society, and viewpoints.',C1:'Practise nuance, register, implied meaning, and professional discussion.',C2:'Work on highly abstract, cultural, and rhetorically precise expression.'},es:{A1:'Empieza con saludos, presentaciones y vocabulario cotidiano esencial.',A2:'Empieza con diálogos sencillos sobre comida, compras, amigos y planes.',B1:'Practica conversaciones naturales, razones, experiencias y preferencias.',B2:'Después de un calentamiento cotidiano, debate trabajo y sociedad.',C1:'Practica matices, registros, sentidos implícitos y temas profesionales.',C2:'Trabaja la expresión abstracta, cultural y retóricamente precisa.'}};
  const content={zh:{tag:'词汇测试完成',title:`建议从 ${level} 开始`,start:'进入第一次对话',retry:'重新测试'},en:{tag:'VOCABULARY CHECK COMPLETE',title:`Start at ${level}`,start:'Start my first dialogue',retry:'Retake test'},es:{tag:'PRUEBA TERMINADA',title:`Empieza en ${level}`,start:'Empezar el primer diálogo',retry:'Repetir'}}[state.profile.language];content.desc=descriptions[state.profile.language][level];
  const levelNames={A1:'First words',A2:'Simple dialogue',B1:'Daily conversation',B2:'Discussion',C1:'Nuance',C2:'Mastery'};
  document.querySelector('#app').innerHTML=shell(`<section class="result-page"><div class="level-orbit"><span>${level}</span></div><p class="overline">${content.tag}</p><h1>${content.title}</h1><p>${content.desc}</p><div class="level-path full-path">${['A1','A2','B1','B2','C1','C2'].map((l,i)=>`${i?'<i></i>':''}<span class="${level===l?'active':''}"><b>${l}</b>${levelNames[l]}</span>`).join('')}</div><div class="complete-actions"><button class="secondary" id="retry-vocab">${content.retry}</button><button class="primary compact" id="accept-vocab">${content.start} ${icon('arrow',18)}</button></div></section>`,'practice');bindNav();document.querySelector('#retry-vocab').onclick=renderVocabularyTest;document.querySelector('#accept-vocab').onclick=()=>{state.profile.configured=true;state.day=1;saveState();session={step:'scenario',answer:'',selectedGaps:[],transferAnswer:'',transferDone:false};renderPractice();};
}

const placementQuestions={
  zh:[
    {tag:'第 1 题 · 日常基础',title:'请用法语介绍你今天早上做了什么。',help:'说 3–5 句即可。可以提到时间、早餐和出门。',audio:"Qu’est-ce que tu as fait ce matin ?"},
    {tag:'第 2 题 · 解释理由',title:'你更喜欢独自旅行还是和朋友一起旅行？为什么？',help:'请表达选择，并给出至少两个理由或例子。',audio:"Tu préfères voyager seul ou avec des amis ? Pourquoi ?"},
    {tag:'第 3 题 · 深层观点',title:'社交媒体让人与人更亲近，还是更孤独？请表达你的看法。',help:'可以讨论两面性、条件或反例；不知道也可以尽力回答。',audio:"À ton avis, les réseaux sociaux rapprochent-ils les gens ou les rendent-ils plus seuls ?"}
  ],
  en:[
    {tag:'QUESTION 1 · DAILY BASICS',title:'In French, tell us what you did this morning.',help:'Three to five sentences are enough. You can mention time, breakfast, and leaving home.',audio:"Qu’est-ce que tu as fait ce matin ?"},
    {tag:'QUESTION 2 · GIVING REASONS',title:'Do you prefer travelling alone or with friends? Why?',help:'State your choice in French and give at least two reasons or examples.',audio:"Tu préfères voyager seul ou avec des amis ? Pourquoi ?"},
    {tag:'QUESTION 3 · DEEPER VIEW',title:'Do social media bring people closer, or make them lonelier?',help:'You may discuss both sides, conditions, or a counterexample. Just do your best.',audio:"À ton avis, les réseaux sociaux rapprochent-ils les gens ou les rendent-ils plus seuls ?"}
  ],
  es:[
    {tag:'PREGUNTA 1 · BASE COTIDIANA',title:'Cuenta en francés qué hiciste esta mañana.',help:'Bastan entre tres y cinco frases. Puedes mencionar la hora, el desayuno y la salida.',audio:"Qu’est-ce que tu as fait ce matin ?"},
    {tag:'PREGUNTA 2 · DAR RAZONES',title:'¿Prefieres viajar solo o con amigos? ¿Por qué?',help:'Expresa tu elección en francés y da al menos dos razones o ejemplos.',audio:"Tu préfères voyager seul ou avec des amis ? Pourquoi ?"},
    {tag:'PREGUNTA 3 · OPINIÓN PROFUNDA',title:'¿Las redes sociales acercan a las personas o las hacen sentirse más solas?',help:'Puedes hablar de ambos lados, condiciones o contraejemplos.',audio:"À ton avis, les réseaux sociaux rapprochent-ils les gens ou les rendent-ils plus seuls ?"}
  ]
};

function renderPlacement(){
  const lang=state.profile.language, q=placementQuestions[lang][placement.step];
  const labels={zh:{title:'法语表达分级测试',answer:'用法语回答',speak:'按下说法语',listen:'听法语题目',next:placement.step===2?'查看我的等级':'下一题',note:'这不是语法考试。我们关注你能否自然组织意思。'},en:{title:'French speaking level test',answer:'Answer in French',speak:'Speak in French',listen:'Listen in French',next:placement.step===2?'See my level':'Next question',note:'This is not a grammar exam. We focus on how naturally you organize meaning.'},es:{title:'Prueba de expresión oral',answer:'Responde en francés',speak:'Hablar en francés',listen:'Escuchar en francés',next:placement.step===2?'Ver mi nivel':'Siguiente pregunta',note:'No es un examen de gramática. Evaluamos cómo organizas tus ideas.'}}[lang];
  document.querySelector('#app').innerHTML=shell(`<section class="placement-page"><header><button class="back" id="exit-placement">←</button><div><p class="overline">${labels.title}</p><div class="test-dots">${[0,1,2].map(i=>`<i class="${i<=placement.step?'on':''}"></i>`).join('')}</div></div><span>${placement.step+1} / 3</span></header><div class="placement-card"><p class="scenario-label">${q.tag}</p><h1>${q.title}</h1><p class="helper">${q.help}</p><div class="answer-label"><label for="placement-answer">${labels.answer}</label><button class="listen-prompt" id="listen-placement">${icon('volume',16)} ${labels.listen}</button></div><div class="voice-input"><textarea id="placement-answer" placeholder="En français…" maxlength="900">${placement.draft}</textarea><button class="mic-button" id="mic-placement" aria-label="${labels.speak}">${icon('mic',21)}<span>${labels.speak}</span></button></div><div class="speech-status" id="placement-status" aria-live="polite"></div><div class="input-meta"><span id="placement-count">${countWords(placement.draft)} ${t('words')}</span><span>${labels.note}</span></div><button class="primary" id="next-placement" ${countWords(placement.draft)<3?'disabled':''}>${labels.next} ${icon('arrow',18)}</button></div></section>`,'practice');
  bindNav();const area=document.querySelector('#placement-answer');area.oninput=()=>{placement.draft=area.value;document.querySelector('#placement-count').textContent=`${countWords(area.value)} ${t('words')}`;document.querySelector('#next-placement').disabled=countWords(area.value)<3;};setupSpeechInput('mic-placement','placement-answer','placement-status',v=>placement.draft=v);document.querySelector('#listen-placement').onclick=()=>speakFrench(q.audio);document.querySelector('#exit-placement').onclick=renderWelcome;document.querySelector('#next-placement').onclick=()=>{placement.answers[placement.step]=area.value;if(placement.step<2){placement.step++;placement.draft='';renderPlacement();}else renderPlacementResult();};
}

function estimateLevel(){
  const [a='',b='',c='']=placement.answers;let score=0;
  score+=countWords(a)>=8?2:countWords(a)>=4?1:0;
  score+=countWords(b)>=18?2:countWords(b)>=9?1:0;
  score+=/(parce que|donc|mais|cependant|par exemple|d'abord|ensuite)/i.test(b)?1:0;
  score+=countWords(c)>=25?2:countWords(c)>=12?1:0;
  score+=/(pourtant|en revanche|même si|bien que|d'une part|selon moi|il me semble|tandis que)/i.test(c)?2:0;
  return score>=7?'B2':score>=4?'B1':'A2';
}

function renderPlacementResult(){
  const level=estimateLevel();state.profile.level=level;
  const content={zh:{tag:'测试完成',title:`你的建议起点是 ${level}`,desc:{A2:'你已经能处理熟悉信息。接下来从短句、生活计划和高频表达开始，逐渐增加理由与细节。',B1:'你能描述经历并解释理由。接下来以真实日常对话为主，逐渐加入观点比较与更自然的表达。',B2:'你能组织较复杂的观点。接下来会保留日常表达，同时进入工作、社会和价值判断等深层讨论。'}[level],start:'按这个等级开始练习',retry:'重新测试'},en:{tag:'TEST COMPLETE',title:`Your suggested starting point: ${level}`,desc:{A2:'You can handle familiar information. Start with short sentences, daily plans, and high-frequency chunks, then add reasons and detail.',B1:'You can describe experiences and explain reasons. Practice will focus on real daily conversation and gradually add comparison and nuance.',B2:'You can organize complex views. Practice will include natural daily language and deeper discussions about work, society, and values.'}[level],start:'Start at this level',retry:'Retake test'},es:{tag:'PRUEBA TERMINADA',title:`Tu nivel inicial recomendado: ${level}`,desc:{A2:'Puedes manejar información familiar. Empezaremos con frases cortas, planes cotidianos y expresiones frecuentes.',B1:'Puedes describir experiencias y explicar razones. La práctica se centrará en conversaciones reales y añadirá matices.',B2:'Puedes organizar opiniones complejas. Practicarás lenguaje cotidiano y debates más profundos sobre trabajo, sociedad y valores.'}[level],start:'Empezar con este nivel',retry:'Repetir la prueba'}}[state.profile.language];
  document.querySelector('#app').innerHTML=shell(`<section class="result-page"><div class="level-orbit"><span>${level}</span></div><p class="overline">${content.tag}</p><h1>${content.title}</h1><p>${content.desc}</p><div class="level-path"><span class="${level==='A2'?'active':''}"><b>A2</b> Daily basics</span><i></i><span class="${level==='B1'?'active':''}"><b>B1</b> Real conversation</span><i></i><span class="${level==='B2'?'active':''}"><b>B2</b> Deeper discussion</span></div><div class="complete-actions"><button class="secondary" id="retry-placement">${content.retry}</button><button class="primary compact" id="accept-placement">${content.start} ${icon('arrow',18)}</button></div></section>`,'practice');bindNav();document.querySelector('#retry-placement').onclick=()=>{placement={step:0,answers:[],draft:''};renderPlacement();};document.querySelector('#accept-placement').onclick=()=>{state.profile.configured=true;state.day=1;saveState();session={step:'scenario',answer:'',selectedGaps:[],transferAnswer:'',transferDone:false};renderPractice();};
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
        <button id="analyze" class="primary" ${countWords(session.answer) < minimumWords() ? 'disabled' : ''}>${t('find')} ${icon('arrow',18)}</button>
      </div>
      <p class="privacy">${t('saved')}</p>
    </section>`);
    bindNav();
    const area = document.querySelector('#answer');
    area.addEventListener('input', () => { session.answer = area.value; document.querySelector('#word-count').textContent = `${countWords(area.value)} ${t('words')}`; document.querySelector('#analyze').disabled = countWords(area.value) < minimumWords(); });
    document.querySelector('#listen-prompt').onclick = () => speakFrench(frenchAudioPrompt());
    setupSpeechInput('mic-answer', 'answer', 'speech-status', value => { session.answer = value; });
    document.querySelector('#analyze').onclick = () => { session.answer = area.value; session.analysis=analyzeResponse(area.value); session.step = 'gaps'; renderPractice(); };
  } else if (session.step === 'gaps') renderGaps();
  else if (session.step === 'activate') renderActivate();
  else renderTransfer();
}

function countWords(text) { return text.trim() ? text.trim().split(/\s+/).length : 0; }
function minimumWords(){return state.profile.level==='A1'?2:state.profile.level==='A2'?3:5;}
function escapeHtml(text){return String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));}

function analyzeResponse(answer){
  const rules=[
    {re:/\bje habite\b/gi,wrong:'je habite',right:"j’habite",why:'元音前 je 要省音，写成 j’。'},
    {re:/\bje ai\b/gi,wrong:'je ai',right:"j’ai",why:'元音前 je 要省音。'},
    {re:/à le\b/gi,wrong:'à le',right:'au',why:'à + le 必须缩合成 au。'},
    {re:/\bde le\b/gi,wrong:'de le',right:'du',why:'de + le 必须缩合成 du。'},
    {re:/\bbeaucoup des\b/gi,wrong:'beaucoup des',right:'beaucoup de',why:'数量表达 beaucoup 后通常使用 de。'},
    {re:/\bje suis (\d{1,2}) ans?\b/gi,wrong:'je suis … ans',right:"j’ai … ans",why:'法语用 avoir 表达年龄。'},
    {re:/\bj['’]ai allé\b/gi,wrong:"j’ai allé",right:'je suis allé(e)',why:'aller 的复合过去时使用 être。'},
    {re:/\bje vais au Paris\b/gi,wrong:'je vais au Paris',right:'je vais à Paris',why:'城市名称前通常使用 à。'},
    {re:/\bplus mieux\b/gi,wrong:'plus mieux',right:'mieux',why:'mieux 已经表示“更好”，不再加 plus。'},
    {re:/\bparce que donc\b/gi,wrong:'parce que donc',right:'parce que / donc',why:'原因和结果连接词不要叠加使用。'}
  ];
  const corrections=[];rules.forEach(rule=>{if(rule.re.test(answer))corrections.push(rule);rule.re.lastIndex=0;});
  if(!/[.!?…]$/.test(answer.trim())&&countWords(answer)>7)corrections.push({wrong:'句末缺少标点',right:'在完整句末加句号',why:'清晰的断句能让表达更易理解。'});
  const suggestions=detectGaps();
  return {original:answer,corrections,suggestions,used:usedExpressions(answer,suggestions)};
}

const expressionPatterns={
  'moi-cest':/moi[, ]+c['’]est/i,'jhabite-a':/j['’]habite\s+(à|en|au)/i,'jaime-bien':/j['’]aime bien/i,
  'avoir-envie':/(j['’]|tu as|il a|elle a|nous avons|vous avez|ils ont)\s*envie de/i,'retrouver':/retrouv\w*/i,'ca-me-detend':/ça me détend/i,
  'avoir-habitude':/l['’]habitude de/i,'de-temps-en-temps':/de temps en temps/i,'ca-depend':/ça dépend/i,
  'je-vais-prendre':/je vais prendre/i,'sur-place':/(sur place|à emporter)/i,'sil-vous-plait':/s['’]il vous plaît/i,
  'enfant-unique':/enfant unique/i,'habiter-avec':/(j['’]habite|habiter) avec/i,'sentendre-avec':/(s['’]entend|m['’]entends|t['’]entends) bien/i,
  'il-me-faut':/il me faut/i,'faire-courses':/(faire|fais|fait|faisons|faites|font) les courses/i,'combien-ca-coute':/(ça coûte combien|combien ça coûte)/i,
  'prendre-metro':/(prendre|prends|prend|prenons|prenez|prennent) (le métro|le bus)/i,'a-pied':/à pied/i,'ca-me-prend':/ça me prend/i,
  'equilibre':/(trouver|garder|avoir) un (bon )?équilibre/i,'au-detriment':/au détriment de/i,'tenir-compte':/tenir compte de/i
};
function expressionUsed(answer,gap){return (expressionPatterns[gap.id]||new RegExp(gap.expression.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').split(' + ')[0],'i')).test(answer);}
function usedExpressions(answer,gaps){return gaps.filter(g=>expressionUsed(answer,g));}

function detectGaps() {
  const a = session.answer.toLowerCase();
  const topic=state.round%3;
  if(state.profile.level==='A1'&&topic===1)return[
    {id:'je-vais-prendre',expression:'Je vais prendre…',meaning:'我要……',why:'在法国咖啡馆点单最自然、最常见。',example:"Je vais prendre un café, s’il vous plaît.",natural:'点单时法国人常说 « Je vais prendre… »，比 « je veux » 更自然礼貌。'},
    {id:'sur-place',expression:'sur place / à emporter',meaning:'堂食／外带',why:'店员很可能会直接这样问你。',example:"C’est sur place, s’il vous plaît.",natural:'法国店员常问 « Sur place ou à emporter ? »'},
    {id:'sil-vous-plait',expression:'s’il vous plaît',meaning:'请',why:'点单结尾加上它更符合日常礼貌习惯。',example:"Un thé, s’il vous plaît.",natural:'口语点单可以省略完整句，但通常保留 « s’il vous plaît »。'}];
  if(state.profile.level==='A1'&&topic===2)return[
    {id:'enfant-unique',expression:'être enfant unique',meaning:'是独生子女',why:'介绍家庭成员时非常实用。',example:"Je suis enfant unique.",natural:'法国人直接说 « Je suis enfant unique »。'},
    {id:'habiter-avec',expression:'habiter avec',meaning:'和……一起住',why:'准确说明你的居住情况。',example:"J’habite avec ma sœur.",natural:'日常更常用 « habiter avec »，正式语境才常见 « résider avec »。'},
    {id:'sentendre-avec',expression:"bien s’entendre avec",meaning:'和……相处得好',why:'让家庭介绍不只停留在人数。',example:"Je m’entends bien avec mon frère.",natural:'« On s’entend bien » 是法国日常极常见的说法。'}];
  if(state.profile.level==='A1') return [
    {id:'moi-cest',expression:'Moi, c’est…',meaning:{zh:'我是……／我叫……',en:'I’m… / my name is…',es:'Soy… / me llamo…'}[state.profile.language],why:{zh:'法国日常自我介绍里很自然。',en:'Very natural in casual French introductions.',es:'Muy natural al presentarse en francés.'}[state.profile.language],example:"Bonjour, moi, c’est Lina.",natural:"En France, on dit souvent « Moi, c’est… » dans une présentation informelle."},
    {id:'jhabite-a',expression:'J’habite à + ville',meaning:{zh:'我住在……',en:'I live in…',es:'Vivo en…'}[state.profile.language],why:{zh:'城市前用 à，是最常见的说法。',en:'Use à before a city name.',es:'Se usa à delante de una ciudad.'}[state.profile.language],example:"J’habite à Lyon.",natural:"On dit « j’habite à Paris », mais « j’habite en France »."},
    {id:'jaime-bien',expression:'J’aime bien…',meaning:{zh:'我挺喜欢……',en:'I quite like…',es:'Me gusta bastante…'}[state.profile.language],why:{zh:'比单说 j’aime 语气更轻松自然。',en:'Softer and very common in everyday speech.',es:'Más suave y muy común en el habla cotidiana.'}[state.profile.language],example:"J’aime bien le café.",natural:"Dans la conversation, « j’aime bien » est souvent plus naturel et moins fort que « j’aime »."}
  ];
  if(state.profile.level==='A2') return [
    ...(topic===1?[
      {id:'il-me-faut',expression:'Il me faut…',meaning:'我需要……',why:'买东西时比逐字翻译“我想要”更自然。',example:"Il me faut des tomates.",natural:'列购物需求时常说 « Il me faut… »。'},
      {id:'faire-courses',expression:'faire les courses',meaning:'买日常用品／买菜',why:'法国人描述日常采购的固定说法。',example:"Je fais les courses le samedi.",natural:'« faire du shopping » 多指逛街买衣物；买菜用 « faire les courses »。'},
      {id:'combien-ca-coute',expression:'Ça coûte combien ?',meaning:'这个多少钱？',why:'简单直接的日常问价表达。',example:"Excusez-moi, ça coûte combien ?",natural:'口语常说 « Ça coûte combien ? »；« Combien cela coûte-t-il ? » 更正式。'}
    ]:topic===2?[
      {id:'prendre-metro',expression:'prendre le métro / le bus',meaning:'乘地铁／公交',why:'法语使用 prendre 表达乘坐交通工具。',example:"Je prends le métro tous les jours.",natural:'不要逐字说 « utiliser le métro »；日常通常说 « prendre le métro »。'},
      {id:'a-pied',expression:'à pied',meaning:'步行',why:'回答出行方式的高频短语。',example:"J’y vais à pied.",natural:'法国日常常用 « J’y vais à pied »，y 代替前面提过的地点。'},
      {id:'ca-me-prend',expression:'ça me prend + durée',meaning:'这要花我……时间',why:'可以自然补充通勤时长。',example:"Ça me prend vingt minutes.",natural:'口语中 « Ça me prend vingt minutes » 很自然。'}
    ]:[
    {id:'avoir-envie',expression:'avoir envie de + infinitif',meaning:{zh:'想要做……',en:'to feel like doing',es:'tener ganas de'}[state.profile.language],why:{zh:'表达日常计划时非常常用。',en:'Very useful for everyday plans.',es:'Muy útil para planes cotidianos.'}[state.profile.language],example:"J’ai envie de me promener après les cours."},
    {id:'retrouver',expression:'retrouver quelqu’un',meaning:{zh:'和某人会面',en:'to meet up with someone',es:'quedar con alguien'}[state.profile.language],why:{zh:'比单独使用 voir 更具体自然。',en:'More precise and natural than simply using voir.',es:'Más preciso y natural que usar solo voir.'}[state.profile.language],example:"Je vais retrouver une amie au café."},
    {id:'ca-me-detend',expression:'ça me détend',meaning:{zh:'这让我放松',en:'it helps me relax',es:'me relaja'}[state.profile.language],why:{zh:'用简单句说明你喜欢某件事的原因。',en:'A simple way to explain why you enjoy something.',es:'Una forma sencilla de explicar por qué te gusta algo.'}[state.profile.language],example:"J’aime marcher parce que ça me détend."}
    ])];
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
  const analysis=session.analysis||analyzeResponse(session.answer);const gaps = analysis.suggestions;
  document.querySelector('#app').innerHTML = shell(`<section class="page">
    <header class="compact-header"><button class="back" id="back">←</button><div><p class="overline">RETRIEVAL GAPS</p><h1>${t('gapTitle')}</h1></div></header>
    ${progress(1)}
    <div class="answer-analysis"><div class="original-answer"><span>你的原始回答</span><p>${escapeHtml(analysis.original)}</p></div><div class="grammar-review"><span>语法检查</span>${analysis.corrections.length?analysis.corrections.map(c=>`<div class="correction"><del>${c.wrong}</del><b>→</b><ins>${c.right}</ins><small>${c.why}</small></div>`).join(''):`<p class="no-errors">没有检测到明显的基础语法错误。接下来重点提升表达的自然度。</p>`}</div></div>
    <div class="analysis-intro"><div class="insight-icon">${icon('spark',22)}</div><p>根据你刚才表达的内容，下面是 3 个可以立即加入答案的高价值短语。推荐不等于“已经使用”。</p></div>
    <div class="gap-grid">${gaps.map((g, i) => `<article class="gap-card"><div class="gap-top"><span>0${i+1}</span><button class="sound" aria-label="播放发音">${icon('volume',18)}</button></div><h2>${g.expression}</h2><p class="meaning">${g.meaning}</p><p class="why">${g.why}</p><div class="example">${g.example}</div><div class="france-usage"><b>🇫🇷 En France</b><span>${g.natural||`On entend souvent « ${g.expression} » dans la conversation quotidienne.`}</span></div></article>`).join('')}</div>
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
  const prompts={A1:["Bonjour, ______ Lina.","______ Paris.","______ le café."],A2:["Après les cours, j’______ me promener.","Samedi, je vais ______ une amie.","J’aime cette activité parce que ______."],B1:["J’______ cuisiner le soir.","Je mange dehors ______.","Mon choix, ______ mon emploi du temps."],B2:["Pour moi, l’essentiel, c’est de ______ entre le travail et la vie privée.","Je ne veux pas réussir professionnellement ______ de ma santé.","Avant de choisir, il faut ______ ses priorités."]};
  return (prompts[state.profile.level]||prompts.B2)[i] || e;
}

function renderTransfer() {
  const sc=currentScenario();
  if(session.transferDone){ return renderComplete(); }
  document.querySelector('#app').innerHTML=shell(`<section class="page practice-page"><header class="topbar"><div><p class="overline">TRANSFER TEST</p><h1>${t('transfer')}</h1></div><span class="subtle-tag">${t('noHint')}</span></header>${progress(3)}
  <div class="practice-card transfer-card"><div class="prompt-number">02</div><p class="scenario-label">TRANSFER</p><h2>${sc.transfer}</h2><p class="helper">${t('transferHint')}</p><div class="answer-label"><label for="transfer-answer">${t('answer')}</label><button class="listen-prompt" id="listen-transfer">${icon('volume',16)} ${t('listen')}</button></div><div class="voice-input"><textarea id="transfer-answer" placeholder="Personnellement, je…" maxlength="600">${session.transferAnswer}</textarea><button class="mic-button" id="mic-transfer" aria-label="${t('speak')}">${icon('mic',21)}<span>${t('speak')}</span></button></div><div class="speech-status" id="speech-status" aria-live="polite"></div><div class="input-meta"><span id="word-count">${countWords(session.transferAnswer)} ${t('words')}</span><span>spaced retrieval</span></div><button class="primary" id="finish" ${countWords(session.transferAnswer)<minimumWords()?'disabled':''}>${t('finish')} ${icon('check',18)}</button></div></section>`);
  bindNav(); const area=document.querySelector('#transfer-answer');area.oninput=()=>{session.transferAnswer=area.value;document.querySelector('#word-count').textContent=`${countWords(area.value)} ${t('words')}`;document.querySelector('#finish').disabled=countWords(area.value)<3;}; document.querySelector('#listen-transfer').onclick=()=>speakFrench({A1:"Tu préfères le café ou le thé ?",A2:"Ton ami est libre samedi. Qu’est-ce que vous pouvez faire ensemble ?",B1:"Un ami visite ta ville. Où allez-vous manger, et pourquoi ?",B2:"Ton entreprise demande trois jours au bureau. Qu’en penses-tu ?",C1:"Comment contesterais-tu cette idée dans une réunion formelle ?",C2:"Comment reformulerais-tu cette idée pour une émission de radio grand public ?"}[state.profile.level]); setupSpeechInput('mic-transfer','transfer-answer','speech-status',value=>{session.transferAnswer=value;}); document.querySelector('#finish').onclick=()=>completeSession(area.value);
}

function speakFrench(text, onEnd) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  const presets={claire:{names:/audrey|céline|celine|virginie|female|femme/i,rate:.92,pitch:1.04,index:0},julien:{names:/thomas|henri|daniel|nicolas|male|homme/i,rate:.9,pitch:.9,index:1},amelie:{names:/amélie|amelie|marie|aurelie|aurélie|lea|léa|hortense|female|femme/i,rate:.88,pitch:1.08,index:3},louis:{names:/louis|paul|remy|rémy|jacques|male|homme/i,rate:.94,pitch:.88,index:2}};
  const preset=presets[state.profile.voice]||presets.claire;const voices=window.speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith('fr'));const selected=voices.find(v=>preset.names.test(v.name))||voices[preset.index%Math.max(voices.length,1)];
  utterance.rate=preset.rate;utterance.pitch=preset.pitch;if(selected)utterance.voice=selected;
  utterance.onend=()=>onEnd?.();utterance.onerror=()=>onEnd?.();window.speechSynthesis.speak(utterance);return utterance;
}

function previewVoice(button){
  const same=state.profile.voice===button.dataset.voice;
  if(same&&button.classList.contains('playing')){window.speechSynthesis.cancel();button.classList.remove('playing');button.querySelector('small').textContent='Écouter';return;}
  window.speechSynthesis.cancel();document.querySelectorAll('[data-voice]').forEach(x=>{x.classList.remove('selected','playing');x.querySelector('small').textContent='Écouter';});
  state.profile.voice=button.dataset.voice;saveState();button.classList.add('selected','playing');button.querySelector('small').textContent='Arrêter';
  speakFrench("Bonjour, je m’appelle "+button.querySelector('strong').textContent+". On commence ?",()=>{button.classList.remove('playing');const label=button.querySelector('small');if(label)label.textContent='Écouter';});
}

function setupSpeechInput(buttonId, textareaId, statusId, onValue) {
  const button = document.getElementById(buttonId), area = document.getElementById(textareaId), status = document.getElementById(statusId);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { setupRecorderFallback(button,status); return; }
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

function setupRecorderFallback(button,status){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){button.querySelector('span').textContent='请使用键盘语音输入';status.textContent='此浏览器不支持网页录音。可点击手机键盘上的麦克风进行法语听写。';return;}
  let recorder=null,chunks=[],stream=null;
  button.querySelector('span').textContent='录音回答';
  button.onclick=async()=>{
    if(recorder?.state==='recording'){recorder.stop();return;}
    try{stream=await navigator.mediaDevices.getUserMedia({audio:true});recorder=new MediaRecorder(stream);chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstart=()=>{button.classList.add('recording');button.innerHTML=`${icon('stop',18)}<span>正在录音… 点击结束</span>`;status.textContent='正在录音。此浏览器不支持自动转文字，结束后可回放并在文本框补充答案。';};recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());button.classList.remove('recording');button.innerHTML=`${icon('mic',21)}<span>重新录音</span>`;const old=status.parentElement.querySelector('.voice-playback');if(old)old.remove();const audio=document.createElement('audio');audio.className='voice-playback';audio.controls=true;audio.src=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));status.after(audio);status.textContent='录音已保存。请回放确认，并在上方文本框补充法语文字以获得语法分析。';};recorder.start();}catch(e){status.textContent='无法访问麦克风。请在浏览器设置中允许此网站使用麦克风。';}
  };
}

function completeSession(answer){
  session.transferAnswer=answer; const gaps=session.selectedGaps.length?session.selectedGaps:detectGaps();
  const combined=`${session.answer} ${answer}`;gaps.forEach(g=>{const used=expressionUsed(combined,g);const existing=state.map.find(x=>x.id===g.id);if(!existing)state.map.push({...g,status:used?'Emerging':'Passive',reviews:used?1:0,due:used?'2 天后':'下个主题'});else if(used){existing.reviews=(existing.reviews||0)+1;existing.status=existing.reviews>=4?'Automatic':existing.reviews>=3?'Active':'Emerging';existing.due=existing.status==='Automatic'?'7 天后':'2 天后';}});
  state.streak=Math.max(state.streak,3);state.xp+=1;saveState();session.transferDone=true;renderComplete();
}

function renderComplete(){
  const learned=session.selectedGaps.length?session.selectedGaps:detectGaps();const actuallyUsed=usedExpressions(`${session.answer} ${session.transferAnswer}`,learned);const hit=actuallyUsed.length>0;
  const completedRound=(state.round%3)+1;
  document.querySelector('#app').innerHTML=shell(`<section class="page complete-page">${progress(3)}<div class="complete-mark">${icon('check',34)}</div><p class="overline">DAY ${state.day} · ROUND ${completedRound}</p><h1>本轮练习完成。</h1><p class="complete-copy">${hit?`实际检测到你使用了：${actuallyUsed.map(g=>`「${g.expression}」`).join('、')}。`:'本轮没有检测到你实际使用推荐短语，因此它们只会进入 Passive。下个主题会再次给你练习机会。'}</p><div class="result-strip"><div><strong>${actuallyUsed.length}</strong><span>实际使用短语</span></div><div><strong>${learned.length-actuallyUsed.length}</strong><span>待练推荐短语</span></div><div><strong>${completedRound}</strong><span>今日已练主题</span></div></div><div class="recommended-recap"><span>下轮可以尝试</span>${learned.filter(g=>!actuallyUsed.includes(g)).map(g=>`<b>${g.expression}</b>`).join('')}</div><div class="complete-actions"><button class="secondary" data-nav="map">查看 Active Map</button><button class="primary compact" id="restart">${t('nextTopic')} ${icon('arrow',18)}</button></div></section>`);
  bindNav();document.querySelector('#restart').onclick=()=>{state.round++;saveState();session={step:'scenario',answer:'',selectedGaps:[],transferAnswer:'',transferDone:false,analysis:null};renderPractice();};
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
