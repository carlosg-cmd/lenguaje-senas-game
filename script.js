const SIGN_IMAGES = {
  "A": "assets/signs/A.png", "B": "assets/signs/B.png", "C": "assets/signs/C.png", "D": "assets/signs/D.png", "E": "assets/signs/E.png",
  "F": "assets/signs/F.png", "G": "assets/signs/G.png", "H": "assets/signs/H.png", "I": "assets/signs/I.png", "J": "assets/signs/J.png",
  "K": "assets/signs/K.png", "L": "assets/signs/L.png", "M": "assets/signs/M.png", "N": "assets/signs/N.png", "Ñ": "assets/signs/Ñ.png",
  "O": "assets/signs/O.png", "P": "assets/signs/P.png", "Q": "assets/signs/Q.png", "R": "assets/signs/R.png", "S": "assets/signs/S.png",
  "T": "assets/signs/T.png", "U": "assets/signs/U.png", "V": "assets/signs/V.png", "W": "assets/signs/W.png", "X": "assets/signs/X.png",
  "Y": "assets/signs/Y.png", "Z": "assets/signs/Z.png"
};

let ALL = Object.keys(SIGN_IMAGES);
const VISIBLE = 5;
const DIFF_CONFIG = {
  easy:   { timePerLetter: 20 },
  medium: { timePerLetter: 12 },
  hard:   { timePerLetter: 7  }
};

const MOTIVATIONS = [
  { at: 1,  msg: "¡Buen comienzo! 🌟" },
  { at: 3,  msg: "¡Vas muy bien! 💪" },
  { at: 5,  msg: "¡Excelente ritmo! 🔥" },
  { at: 8,  msg: "¡Imparable! ¡Sigue así! 🚀" },
  { at: 10, msg: "¡Ya vas por 10! ¡Increíble! 🎯" },
  { at: 13, msg: "¡A mitad del abecedario! 🏅" },
  { at: 15, msg: "¡Eres todo un pro! 🏆" },
  { at: 18, msg: "¡Casi lo tienes! ¡No pares! ⚡" },
  { at: 20, msg: "¡Solo faltan 7! ¡Tú puedes! 💎" },
  { at: 23, msg: "¡Ya eres un experto en señas! 🌈" },
  { at: 25, msg: "¡Últimas 2! ¡A por ellas! 🎉" },
  { at: 27, msg: "¡COMPLETADO! ¡Eres increíble! 🎊" },
];

/* ==============================
   STATE & PERSISTENCE
============================== */
let diff = 'easy';
let queue = [];
let visible = [];
let lOrd = [];
let rOrd = [];
let selL = null, selR = null;
let matchedCount = 0;
let errors = 0, score = 0;
let timerInt = null, timeLeft = 0;
let active = false;

/* --- WORD MODE STATE --- */
let gameMode = 'classic'; // 'classic' or 'words'
const WORDS_DB = ['HOLA', 'CARRO', 'GATO', 'MUNDO', 'PERRO', 'AGUA', 'CASA', 'LUNA', 'SOL', 'FLOR'];
let currentWord = '';
let currentWordIndex = 0; // Index of the letter we are waiting for
let wordsCompleted = 0;

let appData = {
  soundOn: true,
  lastDiff: 'easy',
  lastMode: 'classic',
  highscores: { easy: [], medium: [], hard: [] },
  highscoresWords: { easy: [], medium: [], hard: [] }, // New table for words mode
  letterStats: {}
};
ALL.forEach(l => appData.letterStats[l] = { correct: 0, wrong: 0, hints: 0 });

function loadData() {
  const saved = localStorage.getItem('senasGameData');
  if (saved) {
    try {
      let parsed = JSON.parse(saved);
      // Migrate back from category-nested data if they have it
      if(parsed.highscores && parsed.highscores.abecedario) {
        parsed.highscores = parsed.highscores.abecedario;
        parsed.letterStats = parsed.letterStats.abecedario || {};
      }
      if(!parsed.highscoresWords) parsed.highscoresWords = { easy: [], medium: [], hard: [] };
      if(!parsed.lastMode) parsed.lastMode = 'classic';
      appData = { ...appData, ...parsed };
      
      // Ensure all letters exist
      ALL.forEach(l => {
          if(!appData.letterStats[l]) appData.letterStats[l] = { correct: 0, wrong: 0, hints: 0 };
      });
    } catch(e){}
  }
  soundOn = appData.soundOn;
  diff = appData.lastDiff || 'easy';
  gameMode = appData.lastMode || 'classic';
  
  // Set UI Active buttons for Diff
  ['diff-easy','diff-medium','diff-hard'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.classList.remove('active');
  });
  const diffBtn = document.getElementById('diff-'+diff);
  if(diffBtn) diffBtn.classList.add('active');

  // Set UI Active buttons for Mode
  ['mode-classic','mode-words'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.classList.remove('active');
  });
  const modeBtn = document.getElementById('mode-'+gameMode);
  if(modeBtn) modeBtn.classList.add('active');
  updateSoundIcon();
}

function saveData() {
  appData.soundOn = soundOn;
  appData.lastDiff = diff;
  appData.lastMode = gameMode;
  localStorage.setItem('senasGameData', JSON.stringify(appData));
}

/* ==============================
   SOUND (Web Audio API)
============================== */
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let soundOn = true;

function initAudio() {
  if(!audioCtx) audioCtx = new AudioContext();
  if(audioCtx.state === 'suspended') audioCtx.resume();
}

function toggleSound() {
  soundOn = !soundOn;
  updateSoundIcon();
  saveData();
  if(soundOn) playSound(440, 'sine', 0.1);
}

function updateSoundIcon() {
  const btn = document.getElementById('sound-toggle');
  if(btn) btn.textContent = soundOn ? '🔊' : '🔇';
}

function playSound(freq, type, duration, vol=0.1, slide=false) {
  if (!soundOn) return;
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if(slide) osc.frequency.exponentialRampToValueAtTime(freq/2, audioCtx.currentTime + duration);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playMatch() {
  if(!soundOn) return;
  playSound(440, 'sine', 0.1);
  setTimeout(() => playSound(660, 'sine', 0.15), 100);
}
function playWrong() { playSound(300, 'sawtooth', 0.3, 0.1, true); }
function playWin() {
  if(!soundOn) return;
  [440, 554, 659, 880].forEach((f, i) => setTimeout(() => playSound(f, 'square', 0.2, 0.05), i*150));
}
function playHint() { playSound(880, 'sine', 0.1); }

/* ==============================
   MENU
============================== */
function toggleMenu(){
  document.getElementById('dropdown-menu').classList.toggle('open');
}
function closeMenu(){
  document.getElementById('dropdown-menu').classList.remove('open');
}
document.addEventListener('click', e => {
  if(!e.target.closest('#menu-toggle') && !e.target.closest('#dropdown-menu')) closeMenu();
});

function setDiffMenu(d, btn){
  diff = d;
  saveData();
  ['diff-easy','diff-medium','diff-hard'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.remove('active');
  });
  if(btn) btn.classList.add('active');
  else {
      const el = document.getElementById('diff-'+diff);
      if(el) el.classList.add('active');
  }
  closeMenu();
  resetGame();
}

function showScreenMenu(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
  ['nav-game-btn','nav-repaso-btn','nav-leaderboard-btn'].forEach(bid => {
    const el = document.getElementById(bid);
    if(el) el.classList.remove('active');
  });
  const activeBtn = document.getElementById('nav-'+id+'-btn');
  if(activeBtn) activeBtn.classList.add('active');
  closeMenu();
  if(id==='repaso') buildRepaso();
  if(id==='leaderboard') fetchGlobalScores(diff);
  if(id==='game'){ clearInterval(timerInt); resetGame(); }
}

/* ==============================
   UTILS
============================== */
function shuffle(a){ const b=[...a]; for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; }

/* ==============================
   REPASO
============================== */
function buildRepaso(){
  const grid=document.getElementById('repaso-grid');
  grid.innerHTML='';
  ALL.forEach(lt=>{
    const st=appData.letterStats[lt];
    const total = st.correct + st.wrong;
    const wrate = total>0?(st.wrong/total):0;
    
    let stateClass = '';
    if(total >= 3) {
      if(wrate >= 0.4) stateClass = 'needs-work';
      else if(st.correct >= 5 && wrate <= 0.1) stateClass = 'mastered';
    }

    const card=document.createElement('div');
    card.className='repaso-card ' + stateClass;
    card.innerHTML=`<div class="repaso-letter">${lt}</div><img class="repaso-img" src="${SIGN_IMAGES[lt]}" alt="${lt}">
    <div class="repaso-stats">
      <span style="color:#22c55e">✓${st.correct}</span>
      <span style="color:#ef4444">✗${st.wrong}</span>
      <span style="color:#3b82f6">💡${st.hints}</span>
    </div>`;
    grid.appendChild(card);
  });
}



function clearStats() {
    if(confirm('¿Seguro que deseas borrar todas las estadísticas de aprendizaje?')) {
        ALL.forEach(l => appData.letterStats[l] = { correct: 0, wrong: 0, hints: 0 });
        saveData();
        buildRepaso();
    }
}

/* ==============================
   GAME INIT
============================== */
function setGameMode(mode, el) {
  ['mode-classic','mode-words'].forEach(id => {
      const elbtn = document.getElementById(id);
      if(elbtn) elbtn.classList.remove('active');
  });
  if(el) el.classList.add('active');
  gameMode = mode;
  saveData();
  closeMenu();
  resetGame();
}

function resetGame(){
  clearInterval(timerInt);
  document.getElementById('result-ov').classList.remove('active');
  matchedCount=0; errors=0; score=0; active=true;

  const hsEl = document.getElementById('hs');
  if(hsEl) {
      if(gameMode === 'classic') hsEl.textContent = (appData.highscores[diff][0] || 0);
      else hsEl.textContent = (appData.highscoresWords[diff][0] || 0);
  }

  if (gameMode === 'classic') {
    document.getElementById('game-area').style.display = 'flex';
    document.getElementById('word-area').style.display = 'none';
    
    const total = ALL.length;
    const cfg = DIFF_CONFIG[diff];
    timeLeft = cfg.timePerLetter * total;
  
    queue = shuffle([...ALL]);
    visible = queue.splice(0, VISIBLE);
    lOrd = shuffle([...visible]);
    rOrd = shuffle([...visible]);
  
    selL=null; selR=null;
    clearLines();
    updateStats();
    renderCards(false);
    startTimer();
  } else {
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('word-area').style.display = 'flex';
    
    wordsCompleted = 0;
    const cfg = DIFF_CONFIG[diff];
    timeLeft = cfg.timePerLetter * 25; // Base time for ~5 words
    
    initNextWord();
    updateStats();
    startTimer();
  }
}

/* ==============================
   WORD MODE LOGIC
============================== */
function initNextWord() {
  if (WORDS_DB.length === 0) return;
  currentWord = WORDS_DB[Math.floor(Math.random() * WORDS_DB.length)];
  currentWordIndex = 0;
  
  const targetEl = document.getElementById('word-target');
  targetEl.innerHTML = `
    <div class="word-display">${currentWord}</div>
    <div class="word-slots" id="word-slots">
      ${currentWord.split('').map((char, i) => `<div class="word-slot" id="slot-${i}"></div>`).join('')}
    </div>
  `;
  document.getElementById('slot-0').classList.add('active');

  let lettersNeeded = currentWord.split('');
  let options = [...lettersNeeded];
  while (options.length < 12) {
    let randomLetter = ALL[Math.floor(Math.random() * ALL.length)];
    if (!options.includes(randomLetter)) {
      options.push(randomLetter);
    }
  }
  options = shuffle(options);

  const handEl = document.getElementById('word-hand');
  handEl.innerHTML = '';
  options.forEach((char, idx) => {
    const card = document.createElement('div');
    card.className = 'word-card';
    card.id = `wcard-${idx}`;
    card.dataset.letter = char;
    card.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.2s, background 0.2s';
    card.innerHTML = `<img src="${SIGN_IMAGES[char]}" alt="seña">`;
    card.onclick = () => tryWordMatch(card, char);
    handEl.appendChild(card);
  });
}

function tryWordMatch(card, char) {
  if (!active || card.classList.contains('solved') || card.classList.contains('flying')) return;

  const expectedChar = currentWord[currentWordIndex];
  const targetSlot = document.getElementById(`slot-${currentWordIndex}`);
  
  // Calculate FLIP target coordinates
  const cardRect = card.getBoundingClientRect();
  const slotRect = targetSlot.getBoundingClientRect();
  const deltaX = slotRect.left - cardRect.left + (slotRect.width - cardRect.width) / 2;
  const deltaY = slotRect.top - cardRect.top + (slotRect.height - cardRect.height) / 2;

  // Fly!
  card.classList.add('flying');
  card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  if(soundOn) playSound(800, 'sine', 0.05);

  setTimeout(() => {
    if (char === expectedChar) {
      // Correct!
      card.classList.remove('flying');
      card.classList.add('solved');
      card.style.transform = ''; // reset translate to attach physically
      targetSlot.appendChild(card);
      targetSlot.classList.remove('active');
      
      score += 20;
      updateStats();
      playMatch();
      
      currentWordIndex++;
      if (currentWordIndex < currentWord.length) {
        document.getElementById(`slot-${currentWordIndex}`).classList.add('active');
      } else {
        // Completed Word
        wordsCompleted++;
        if(soundOn) playSound(600, 'triangle', 0.2);
        
        // Spawn Confetti
        for(let i=0; i<30; i++) spawnConfetti();
        
        setTimeout(() => {
            initNextWord();
        }, 1500);
      }
    } else {
      // Wrong!
      card.classList.add('reject');
      playWrong();
      score = Math.max(0, score - 5);
      errors++;
      updateStats();
      
      setTimeout(() => {
        card.classList.remove('reject');
        card.style.transform = 'translate(0, 0)'; // Fly back
        setTimeout(() => {
            card.classList.remove('flying');
            card.style.transform = '';
        }, 300);
      }, 400); // wait for shake animation
    }
  }, 300); // 300ms flight time
}

/* ==============================
   TIMER
============================== */
function startTimer(){
  clearInterval(timerInt); updateTD();
  timerInt=setInterval(()=>{
    timeLeft--;
    updateTD();
    if(timeLeft<=0){ clearInterval(timerInt); active=false; showResult(false); }
  },1000);
}

function updateTD(){
  const el=document.getElementById('td');
  const m=Math.floor(timeLeft/60), s=timeLeft%60;
  el.textContent = m>0 ? m+'m '+String(s).padStart(2,'0')+'s' : timeLeft+'s';
  el.className=timeLeft<=15?'val timer-warn':'val';
}

/* ==============================
   STATS
============================== */
function updateStats(){
  document.getElementById('sd').textContent=score;
  document.getElementById('ed').textContent=errors;
  document.getElementById('pd').textContent=matchedCount+'/'+ALL.length;
  const pct=Math.round(matchedCount/ALL.length*100);
  document.getElementById('pf').style.width=pct+'%';
  document.getElementById('prog-pct').textContent=pct+'%';
  document.getElementById('prog-text').textContent=
    matchedCount===0 ? 'Progreso' :
    matchedCount===ALL.length ? '¡Abecedario completo! 🎉' :
    'Faltan '+(ALL.length-matchedCount)+' letras';
}

/* ==============================
   RENDER CARDS
============================== */
function renderCards(animate){
  const lc=document.getElementById('lcol'), rc=document.getElementById('rcol');
  lc.innerHTML=''; rc.innerHTML='';

  lOrd.forEach(lt=>{
    const c=document.createElement('div');
    c.className='card'+(animate?' pop-in':'');
    c.id='L'+lt; c.textContent=lt;
    c.tabIndex = 0;
    c.onclick=()=>pickL(lt);
    c.onkeydown=(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault(); pickL(lt);}};
    lc.appendChild(c);
  });
  rOrd.forEach(lt=>{
    const c=document.createElement('div');
    c.className='sign-card'+(animate?' pop-in':'');
    c.id='R'+lt;
    c.tabIndex = 0;
    const img=document.createElement('img');
    img.src=SIGN_IMAGES[lt]; img.alt=lt;
    c.appendChild(img);
    c.onclick=()=>pickR(lt);
    c.onkeydown=(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault(); pickR(lt);}};
    rc.appendChild(c);
  });

  setTimeout(()=>{
    const col=document.getElementById('lcol');
    document.getElementById('connection-svg').style.height=col.offsetHeight+'px';
  },50);
}

/* ==============================
   RESHUFFLE REMAINING
============================== */
function reshuffleRemaining(){
  // Animate all remaining (unmatched) cards with reshuffle
  lOrd.forEach(lt=>{
    const el=document.getElementById('L'+lt);
    if(el && !el.classList.contains('matched')){
      el.classList.remove('reshuffle');
      void el.offsetWidth; // reflow
      el.classList.add('reshuffle');
    }
  });
  rOrd.forEach(lt=>{
    const el=document.getElementById('R'+lt);
    if(el && !el.classList.contains('matched')){
      el.classList.remove('reshuffle');
      void el.offsetWidth;
      el.classList.add('reshuffle');
    }
  });

  // After animation, reorder unmatched in DOM
  setTimeout(()=>{
    const lc=document.getElementById('lcol');
    const rc=document.getElementById('rcol');

    // Get unmatched letters
    const unmatchedL = lOrd.filter(l=>{ const el=document.getElementById('L'+l); return el && !el.classList.contains('matched'); });
    const unmatchedR = rOrd.filter(l=>{ const el=document.getElementById('R'+l); return el && !el.classList.contains('matched'); });

    // Shuffle them
    const newL = shuffle([...unmatchedL]);
    const newR = shuffle([...unmatchedR]);

    // Rebuild lOrd/rOrd preserving matched positions
    let ni=0;
    lOrd = lOrd.map(l=>{ const el=document.getElementById('L'+l); if(el&&el.classList.contains('matched')) return l; return newL[ni++]||l; });
    ni=0;
    rOrd = rOrd.map(l=>{ const el=document.getElementById('R'+l); if(el&&el.classList.contains('matched')) return l; return newR[ni++]||l; });

    // Re-render only unmatched cards in new order (swap DOM nodes)
    const lUnmatched = [...lc.querySelectorAll('.card:not(.matched)')];
    const rUnmatched = [...rc.querySelectorAll('.sign-card:not(.matched)')];

    // collect new order of unmatched nodes
    const lNewOrder = newL.map(l=>document.getElementById('L'+l)).filter(Boolean);
    const rNewOrder = newR.map(l=>document.getElementById('R'+l)).filter(Boolean);

    // Reinsert in shuffled order (simple: clone parent and reinsert)
    lNewOrder.forEach((node,i)=>{
      if(lUnmatched[i] && lUnmatched[i] !== node){
        lc.insertBefore(node, lUnmatched[i]);
      }
    });
    rNewOrder.forEach((node,i)=>{
      if(rUnmatched[i] && rUnmatched[i] !== node){
        rc.insertBefore(node, rUnmatched[i]);
      }
    });

    clearLines();
    redrawMatchedLines();

    setTimeout(()=>{
      document.getElementById('connection-svg').style.height=
        document.getElementById('lcol').offsetHeight+'px';
    },50);
  }, 380);
}

/* ==============================
   SELECTION & MATCHING
============================== */
function pickL(lt){
  if(!active) return;
  const lc=document.getElementById('L'+lt);
  if(!lc||lc.classList.contains('matched')) return;
  if(selL===lt){ lc.classList.remove('selected'); selL=null; return; }
  if(selL){ const prev=document.getElementById('L'+selL); if(prev) prev.classList.remove('selected'); }
  selL=lt; lc.classList.add('selected');
  if(selR) tryMatch();
}

function pickR(lt){
  if(!active) return;
  const rc=document.getElementById('R'+lt);
  if(!rc||rc.classList.contains('matched')) return;
  if(selR===lt){ rc.classList.remove('selected'); selR=null; return; }
  if(selR){ const prev=document.getElementById('R'+selR); if(prev) prev.classList.remove('selected'); }
  selR=lt; rc.classList.add('selected');
  if(selL) tryMatch();
}

function tryMatch(){
  const lc=document.getElementById('L'+selL), rc=document.getElementById('R'+selR);
  if(!lc||!rc) return;

  if(selL===selR){
    const matchedLetter = selL;
    lc.classList.remove('selected'); lc.classList.add('matched');
    rc.classList.remove('selected'); rc.classList.add('matched');
    drawLine(matchedLetter, true);
    score+=20; matchedCount++;
    selL=null; selR=null;
    appData.letterStats[matchedLetter].correct++;
    saveData();
    playMatch();
    updateStats();
    checkMotivation(matchedCount);

    if(matchedCount===ALL.length){
      clearInterval(timerInt); active=false;
      setTimeout(()=>showResult(true),600);
      confetti(); return;
    }

    // After matched pair disappears, replace & reshuffle rest
    setTimeout(()=>replacePair(matchedLetter), 500);

  } else {
    lc.classList.remove('selected'); lc.classList.add('wrong');
    rc.classList.remove('selected'); rc.classList.add('wrong');
    errors++; score=Math.max(0,score-5); updateStats();
    appData.letterStats[selL].wrong++;
    appData.letterStats[selR].wrong++;
    saveData();
    playWrong();
    setTimeout(()=>{ lc.classList.remove('wrong'); rc.classList.remove('wrong'); },350);
    selL=null; selR=null;
  }
}

/* ==============================
   REPLACE MATCHED PAIR + RESHUFFLE
============================== */
function replacePair(matched){
  const idx = visible.indexOf(matched);
  if(idx !== -1) visible.splice(idx, 1);

  if(queue.length > 0){
    const next = queue.shift();
    visible.push(next);

    const lIdx = lOrd.indexOf(matched);
    const rIdx = rOrd.indexOf(matched);
    lOrd[lIdx] = next;
    rOrd[rIdx] = next;

    const lOld=document.getElementById('L'+matched);
    const rOld=document.getElementById('R'+matched);
    if(lOld) lOld.classList.add('pop-out');
    if(rOld) rOld.classList.add('pop-out');

    setTimeout(()=>{
      const lc=document.getElementById('lcol');
      const rc=document.getElementById('rcol');
      const lCards=[...lc.children];
      const rCards=[...rc.children];
      const li=lCards.findIndex(c=>c.id==='L'+matched);
      const ri=rCards.findIndex(c=>c.id==='R'+matched);

      const newL=document.createElement('div');
      newL.className='card pop-in'; newL.id='L'+next; newL.textContent=next;
      newL.onclick=()=>pickL(next);
      if(li>=0) lc.replaceChild(newL, lCards[li]); else lc.appendChild(newL);

      const newR=document.createElement('div');
      newR.className='sign-card pop-in'; newR.id='R'+next;
      const img=document.createElement('img');
      img.src=SIGN_IMAGES[next]; img.alt=next;
      newR.appendChild(img); newR.onclick=()=>pickR(next);
      if(ri>=0) rc.replaceChild(newR, rCards[ri]); else rc.appendChild(newR);

      clearLines();
      redrawMatchedLines();

      setTimeout(()=>{
        document.getElementById('connection-svg').style.height=
          document.getElementById('lcol').offsetHeight+'px';
      },50);

      // Reshuffle the remaining unmatched cards
      setTimeout(()=>reshuffleRemaining(), 100);

    }, 260);

  } else {
    const lOld=document.getElementById('L'+matched);
    const rOld=document.getElementById('R'+matched);
    if(lOld){ lOld.classList.add('pop-out'); setTimeout(()=>lOld.remove(),260); }
    if(rOld){ rOld.classList.add('pop-out'); setTimeout(()=>rOld.remove(),260); }
    lOrd = lOrd.filter(l=>l!==matched);
    rOrd = rOrd.filter(l=>l!==matched);
    setTimeout(()=>{
      clearLines(); redrawMatchedLines();
      // Reshuffle what's left
      setTimeout(()=>reshuffleRemaining(), 80);
    },300);
  }
}

/* ==============================
   LINES
============================== */
const drawnLines = {};

function drawLine(lt, ok){
  const lc=document.getElementById('L'+lt), rc=document.getElementById('R'+lt);
  if(!lc||!rc) return;
  const svg=document.getElementById('connection-svg');
  const lp=getCenter(lc), rp=getCenter(rc);
  drawnLines[lt]={lp,rp,ok};
  _drawSvgLine(svg,lp,rp,ok);
}

function redrawMatchedLines(){
  const svg=document.getElementById('connection-svg');
  svg.innerHTML='';
  Object.values(drawnLines).forEach(({lp,rp,ok})=>_drawSvgLine(svg,lp,rp,ok));
}

function _drawSvgLine(svg,lp,rp,ok){
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('x1',lp.x); line.setAttribute('y1',lp.y);
  line.setAttribute('x2',rp.x); line.setAttribute('y2',rp.y);
  line.setAttribute('stroke',ok?'#22c55e':'#ef4444');
  line.setAttribute('stroke-width','2');
  line.setAttribute('stroke-dasharray','5,3');
  line.setAttribute('opacity','0.8');
  svg.appendChild(line);
}

function clearLines(){
  document.getElementById('connection-svg').innerHTML='';
  Object.keys(drawnLines).forEach(k=>delete drawnLines[k]);
}

function getCenter(el){
  const mid=document.getElementById('svgmid');
  const mr=mid.getBoundingClientRect(), er=el.getBoundingClientRect();
  return {x:er.left+er.width/2-mr.left, y:er.top+er.height/2-mr.top};
}

/* ==============================
   MOTIVATION
============================== */
function checkMotivation(count){
  const found = MOTIVATIONS.find(m=>m.at===count);
  if(found) showMotive(found.msg);
}

function showMotive(msg){
  const el=document.getElementById('motive-msg');
  if(!el) return;
  el.textContent=msg;
  el.classList.add('show');
  if(window._motiveTimer) clearTimeout(window._motiveTimer);
  window._motiveTimer=setTimeout(()=>el.classList.remove('show'),2600);
}

function showToast(msg){ showMotive(msg); }

/* ==============================
   RESULT
============================== */
function showResult(won){
  if(won) playWin();
  else if(soundOn) playSound(200, 'sawtooth', 0.5, 0.1, true);

  const stars=errors===0?'⭐⭐⭐':errors<=5?'⭐⭐':'⭐';
  const timeTaken = DIFF_CONFIG[diff].timePerLetter*ALL.length - timeLeft;
  const mins=Math.floor(timeTaken/60), secs=timeTaken%60;
  const timeStr = mins>0 ? mins+'m '+secs+'s' : secs+'s';
  
  let isNewRecord = false;
  if(won || score > 0) {
    const scores = gameMode === 'classic' ? appData.highscores[diff] : appData.highscoresWords[diff];
    scores.push(score);
    scores.sort((a,b) => b-a);
    if(scores.length > 3) scores.pop();
    if(scores[0] === score && score > 0) isNewRecord = true;
    
    if (gameMode === 'classic') appData.highscores[diff] = scores;
    else appData.highscoresWords[diff] = scores;
    
    saveData();
    
    // PUSH SCORE TO FIREBASE
    setTimeout(() => {
        if(currentUser) {
            saveGlobalScore(currentUser.displayName, score, diff, currentUser.photoURL, currentUser.uid, gameMode);
        } else {
            alert(`¡Conseguiste ${score} puntos! Tu récord se guardó localmente. Inicia sesión desde el menú para competir en el Top 10 Global.`);
        }
    }, 500);
  }

  let rTitle = '⏰ ¡Se acabó el tiempo!';
  if(won) {
      rTitle = '¡Completado! 🎉';
  }
  document.getElementById('rtitle').textContent = rTitle;
  document.getElementById('rstars').textContent=stars;
  document.getElementById('rscore').textContent='Puntuación: '+score+' pts';
  
  const nrEl = document.getElementById('rnewrecord');
  if(nrEl) nrEl.style.display = isNewRecord ? 'block' : 'none';

  let detailHtml = '';
  if (gameMode === 'classic') {
    detailHtml = '✅ Letras completadas: <b>'+matchedCount+'/'+ALL.length+'</b><br>'+  
                 '❌ Errores: <b>'+errors+'</b><br>'+  
                 (won?'⏱ Tiempo: <b>'+timeStr+'</b>':'');
  } else {
    detailHtml = '📝 Palabras armadas: <b>'+wordsCompleted+'</b><br>'+  
                 '❌ Errores: <b>'+errors+'</b>';
  }
  document.getElementById('rdetail').innerHTML = detailHtml;

  let hsHtml = '<b>Mejores Puntuaciones (' + (diff==='easy'?'Fácil':diff==='medium'?'Medio':'Difícil') + '):</b><br>';
  const localScores = gameMode === 'classic' ? appData.highscores[diff] : appData.highscoresWords[diff];
  localScores.forEach((s, i) => { hsHtml += `${i+1}. ${s} pts<br>`; });
  if(localScores.length === 0) hsHtml += 'Sin registros aún.';
  const hsEl = document.getElementById('rhighscores');
  if(hsEl) hsEl.innerHTML = hsHtml;

  document.getElementById('result-ov').classList.add('active');
}

/* ==============================
   CONFETTI
============================== */
function confetti(){
  const cols=['#ffd200','#f7971e','#22c55e','#64b4ff','#f472b6'];
  for(let i=0;i<40;i++) setTimeout(()=>{
    const p=document.createElement('div'); p.className='confetti-piece';
    p.style.left=Math.random()*100+'vw';
    p.style.background=cols[Math.floor(Math.random()*cols.length)];
    p.style.animationDuration=(1.2+Math.random()*0.8)+'s';
    document.body.appendChild(p); setTimeout(()=>p.remove(),2500);
  },i*45);
}

/* ==============================
   HINT — 2 STEP WITH LOCKED IMAGE
============================== */
function openHint(){
  if(!active) return;
  const grid=document.getElementById('hgrid'); grid.innerHTML='';
  const um=visible.filter(l=>{
    const el=document.getElementById('L'+l);
    return el && !el.classList.contains('matched');
  });
  if(!um.length) return;
  um.forEach(lt=>{
    const b=document.createElement('button'); b.className='hlb'; b.textContent=lt;
    b.onclick=()=>showHintStep2(lt); grid.appendChild(b);
  });
  document.getElementById('hs1').style.display='';
  document.getElementById('hs2').style.display='none';
  document.getElementById('hint-ov').classList.add('active');
}

function showHintStep2(lt){
  document.getElementById('hint-ltr-show').textContent = lt;
  // Set image blurred — NOT revealed yet
  const img = document.getElementById('hint-img-preview');
  img.src = SIGN_IMAGES[lt];
  img.classList.remove('revealed');
  // Show lock
  const lockIcon = document.getElementById('hint-lock-icon');
  lockIcon.classList.remove('gone');

  document.getElementById('hs1').style.display='none';
  document.getElementById('hs2').style.display='';
  document.getElementById('buse').onclick=()=>applyHint(lt);
}

function back1(){
  document.getElementById('hs1').style.display='';
  document.getElementById('hs2').style.display='none';
}
function closeHint(){ document.getElementById('hint-ov').classList.remove('active'); }

function applyHint(lt){
  // First reveal the image
  const img = document.getElementById('hint-img-preview');
  const lockIcon = document.getElementById('hint-lock-icon');
  img.classList.add('revealed');
  lockIcon.classList.add('gone');
  // Disable button to prevent double-click
  document.getElementById('buse').disabled = true;

  // Wait for user to see, then apply and close
  setTimeout(()=>{
    score=Math.max(0,score-10); updateStats(); closeHint();
    appData.letterStats[lt].hints++;
    saveData();
    playHint();
    document.getElementById('buse').disabled = false;
    ['L'+lt,'R'+lt].forEach(id=>{
      const el=document.getElementById(id);
      if(el){ el.classList.remove('selected','wrong'); el.classList.add('matched'); }
    });
    drawLine(lt, true);
    matchedCount++;
    checkMotivation(matchedCount);
    updateStats();
    if(selL===lt) selL=null; if(selR===lt) selR=null;
    if(matchedCount===ALL.length){ clearInterval(timerInt); active=false; setTimeout(()=>showResult(true),400); return; }
    setTimeout(()=>replacePair(lt), 500);
  }, 1500);
}

/* ==============================
   BOOT
============================== */
loadData();
setDiffMenu(diff);

/* ==============================
   PWA & SERVICE WORKER
============================== */
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('btn-install');
  if(btn) btn.style.display = 'flex';
});

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      deferredPrompt = null;
      document.getElementById('btn-install').style.display = 'none';
    });
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW reg fail:', err));
  });
}

/* ==============================
   FIREBASE LEADERBOARD
============================== */
const firebaseConfig = {
  apiKey: "AIzaSyBl59bWU0aNoGbPzKiGGVErIr40tEdp86U",
  authDomain: "juego-de-senas.firebaseapp.com",
  projectId: "juego-de-senas",
  storageBucket: "juego-de-senas.firebasestorage.app",
  messagingSenderId: "16907373133",
  appId: "1:16907373133:web:78719626c2d6969afeaa04"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

async function saveGlobalScore(nickname, score, difficulty, photoURL, uid, mode) {
  try {
    await db.collection("highscores").add({
      nickname: nickname,
      score: score,
      difficulty: difficulty,
      mode: mode || 'classic',
      photoURL: photoURL,
      uid: uid,
      date: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error("Error al guardar en Firebase:", e);
  }
}

async function fetchGlobalScores(d) {
  const lbTitle = document.getElementById('lb-title');
  const lbList = document.getElementById('lb-list');
  if(!lbTitle || !lbList) return;

  lbTitle.textContent = "Cargando " + (d==='easy'?'Fácil':d==='medium'?'Medio':'Difícil') + "...";
  lbList.innerHTML = "";
  
  try {
    const q = db.collection("highscores")
      .where("difficulty", "==", d)
      .where("mode", "==", gameMode)
      .orderBy("score", "desc")
      .limit(10);
      
    const querySnapshot = await q.get();
    let html = "";
    let rank = 1;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const pfp = data.photoURL || 'assets/icon.png';
      html += `<div style="display:flex; justify-content:space-between; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px; align-items: center;">
        <span style="font-size: 14px; display:flex; align-items:center; gap:8px;">
          <strong>#${rank}</strong> 
          <img src="${pfp}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;">
          <span>${data.nickname}</span>
        </span>
        <span style="color:#eab308; font-weight:bold; font-size: 16px;">${data.score} pts</span>
      </div>`;
      rank++;
    });
    if (html === "") html = `<div style='text-align:center; color:#94a3b8; padding: 20px 0;'>Aún no hay récords.<br>¡Juega y sé el primero! 🚀</div>`;
    lbList.innerHTML = html;
    const modeName = gameMode === 'classic' ? 'Clásico' : 'Palabras';
    lbTitle.textContent = `🏆 Top 10 ${modeName} (${d==='easy'?'Fácil':d==='medium'?'Medio':'Difícil'})`;
  } catch(e) {
    console.error(e);
    let msg = "Error al cargar récords.";
    if (e.message && e.message.includes("indexes")) {
        msg = "Falta crear el índice en Firebase. Revisa la consola.";
        console.warn("Ve a Firebase Console -> Firestore -> Indexes y crea un índice compuesto para: collection 'highscores', fields 'difficulty' (Ascending), 'mode' (Ascending) y 'score' (Descending).");
    }
    lbTitle.textContent = msg;
    lbList.innerHTML = "<div style='text-align:center; color:#ef4444; font-size: 12px;'>" + e.message + "</div>";
  }
}

/* ==============================
   FIREBASE AUTHENTICATION
============================== */
let currentUser = null;

firebase.auth().onAuthStateChanged((user) => {
  const profileDiv = document.getElementById('user-profile');
  const avatarImg = document.getElementById('user-avatar');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');

  if (user) {
    currentUser = user;
    if(avatarImg && user.photoURL) avatarImg.src = user.photoURL;
    if(profileDiv) profileDiv.style.display = 'flex';
    if(btnLogin) btnLogin.style.display = 'none';
    if(btnLogout) btnLogout.style.display = 'flex';
    const loginOv = document.getElementById('login-ov');
    if(loginOv && loginOv.classList.contains('active')) {
      loginOv.classList.remove('active');
      document.getElementById('welcome-ov').classList.add('active');
    }
  } else {
    currentUser = null;
    if(profileDiv) profileDiv.style.display = 'none';
    if(btnLogin) btnLogin.style.display = 'flex';
    if(btnLogout) btnLogout.style.display = 'none';
  }
});

function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      console.log('User logged in:', result.user);
      closeMenu();
    }).catch((error) => {
      console.error('Login error:', error);
      alert('Error al iniciar sesión: ' + error.message);
    });
}

function gatewayLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      document.getElementById('login-ov').classList.remove('active');
      document.getElementById('welcome-ov').classList.add('active');
    }).catch((error) => {
      alert('Error al iniciar sesión: ' + error.message);
    });
}

function playAsGuest() {
  document.getElementById('login-ov').classList.remove('active');
  document.getElementById('welcome-ov').classList.add('active');
}

function logout() {
  firebase.auth().signOut().then(() => {
    closeMenu();
    // Opcional: mostrar de nuevo el gateway si cierran sesión
    // document.getElementById('login-ov').classList.add('active');
  });
}