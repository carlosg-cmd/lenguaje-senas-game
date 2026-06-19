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
let timerInt = null, timeLeft = 0, timeSurvived = 0;
let active = false;
let currentCombo = 0;
let maxCombo = 0;

/* --- LEVEL STATE --- */
const LEVELS = [
  ['A', 'B', 'C', 'D', 'E'],
  ['F', 'G', 'H', 'I', 'J'],
  ['K', 'L', 'M', 'N', 'Ñ'],
  ['O', 'P', 'Q', 'R', 'S'],
  ['T', 'U', 'V', 'W', 'X', 'Y', 'Z']
];
let currentLevel = 1;

/* --- WORD MODE STATE --- */
let gameMode = 'classic'; // 'classic' or 'words'

const WORDS_DB = [
  'HOLA', 'GRACIAS', 'PERMISO', 'FAVOR', 'AMIGO', 'FAMILIA', 
  'AYUDA', 'TRABAJO', 'CASA', 'COMIDA', 'AGUA', 'BIEN', 'MAL',
  'MAMA', 'PAPA', 'TIEMPO', 'HOY', 'SIEMPRE', 'NUNCA', 'AMOR',
  'ESCUELA', 'DINERO', 'SALUD', 'DOLOR', 'MEDICO', 'HOSPITAL',
  'BAÑO', 'DORMIR', 'COMER', 'BEBER', 'LEER', 'JUGAR', 'FELIZ'
];
let currentWord = '';
let currentWordIndex = 0; // Index of the letter we are waiting for
let wordsCompleted = 0;

let appData = {
  soundOn: true,
  lastDiff: 'easy',
  lastMode: 'classic',
  maxLevel: 1,
  highscores: { easy: [], medium: [], hard: [] },
  highscoresWords: { easy: [], medium: [], hard: [] },
  highscoresSurvival: { easy: [], medium: [], hard: [] },
  letterStats: {},
  stats: {
    totalCorrect: 0,
    totalWords: 0,
    maxCombo: 0,
    maxSurvivalTime: 0
  },
  achievements: []
};
ALL.forEach(l => appData.letterStats[l] = { correct: 0, wrong: 0, hints: 0 });

function loadData() {
  const saved = localStorage.getItem('senasGameData');
  if (saved) {
    try {
      let parsed = JSON.parse(saved);
      if(parsed.highscores && parsed.highscores.abecedario) {
        parsed.highscores = parsed.highscores.abecedario;
        parsed.letterStats = parsed.letterStats.abecedario || {};
      }
      if(!parsed.highscoresWords) parsed.highscoresWords = { easy: [], medium: [], hard: [] };
      if(!parsed.highscoresSurvival) parsed.highscoresSurvival = { easy: [], medium: [], hard: [] };
      if(!parsed.lastMode) parsed.lastMode = 'classic';
      if(!parsed.maxLevel) parsed.maxLevel = 1;
      if(!parsed.stats) parsed.stats = { totalCorrect: 0, totalWords: 0, maxCombo: 0, maxSurvivalTime: 0 };
      if(!parsed.achievements) parsed.achievements = [];
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
  
  // Set initial map diff buttons
  setDiffMenu(diff, null);
  
  // Render Level Map
  renderLevelMap();
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

const bgMusic = new Audio('assets/bgm.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.15;

function initAudio() {
  if(!audioCtx) audioCtx = new AudioContext();
  if(audioCtx.state === 'suspended') audioCtx.resume();
  
  if(soundOn && bgMusic.paused) {
    bgMusic.play().catch(e => console.log('BGM prevented:', e));
  }
}

function toggleSound() {
  soundOn = !soundOn;
  updateSoundIcon();
  saveData();
  if(soundOn) {
    playSound(440, 'sine', 0.1);
    bgMusic.play().catch(e => console.log('BGM prevented:', e));
  } else {
    bgMusic.pause();
  }
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
  
  ['map-diff-easy','map-diff-medium','map-diff-hard'].forEach(id => {
    const el = document.getElementById(id);
    if(el) { el.style.background = 'rgba(255,255,255,0.07)'; el.style.color = '#a0b4cc'; el.style.borderColor = 'rgba(255,255,255,0.18)'; }
  });
  
  const mapEl = document.getElementById('map-diff-'+diff);
  if(mapEl) { 
    if (diff === 'easy') {
      mapEl.style.background = 'rgba(34, 197, 94, 0.2)'; mapEl.style.color = '#22c55e'; mapEl.style.borderColor = 'rgba(34, 197, 94, 0.4)';
    } else if (diff === 'medium') {
      mapEl.style.background = 'rgba(234, 179, 8, 0.2)'; mapEl.style.color = '#eab308'; mapEl.style.borderColor = 'rgba(234, 179, 8, 0.4)';
    } else if (diff === 'hard') {
      mapEl.style.background = 'rgba(239, 68, 68, 0.2)'; mapEl.style.color = '#ef4444'; mapEl.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    }
  }
  
  renderLevelMap();
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
  
  // Ocultar cualquier overlay si el usuario navega
  document.querySelectorAll('.overlay').forEach(ov => ov.classList.remove('active'));
  
  closeMenu();
  if(id==='repaso') buildRepaso();
  if(id==='leaderboard') fetchGlobalScores(diff, gameMode);
  if(id==='game'){ clearInterval(timerInt); resetGame(); }
  
  if (typeof updateBackButtonVisibility === 'function') {
      updateBackButtonVisibility();
  }
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
   MODE & LEVEL SELECT
============================== */
function updateBackButtonVisibility() {
  const btn = document.getElementById('global-back-btn');
  if(!btn) return;
  const isMenu = document.getElementById('mode-select-ov').classList.contains('active');
  btn.style.display = isMenu ? 'none' : 'block';
}

function selectModeGateway(mode) {
  document.getElementById('mode-select-ov').classList.remove('active');
  showScreenMenu('game');
  if(mode === 'classic') {
    renderLevelMap();
    document.getElementById('level-map-ov').classList.add('active');
  } else if(mode === 'words') {
    gameMode = 'words';
    saveData();
    resetGame();
  } else if(mode === 'survival') {
    gameMode = 'survival';
    saveData();
    resetGame();
  }
  updateBackButtonVisibility();
}

function backToModeSelect() {
  showScreenMenu('game');
  document.getElementById('level-map-ov').classList.remove('active');
  document.getElementById('mode-select-ov').classList.add('active');
  updateBackButtonVisibility();
}

function renderLevelMap() {
  const container = document.getElementById('level-nodes');
  if(!container) return;
  
  // Set theme class based on current difficulty
  container.className = 'level-nodes theme-' + diff;
  
  const mapCard = document.querySelector('.level-map-container');
  if (mapCard) {
      if (diff === 'easy') {
          mapCard.style.borderColor = '#22c55e';
          mapCard.style.boxShadow = '0 20px 50px rgba(34,197,94,0.3)';
      } else if (diff === 'medium') {
          mapCard.style.borderColor = '#eab308';
          mapCard.style.boxShadow = '0 20px 50px rgba(234,179,8,0.3)';
      } else if (diff === 'hard') {
          mapCard.style.borderColor = '#ef4444';
          mapCard.style.boxShadow = '0 20px 50px rgba(239,68,68,0.3)';
      }
  }
  
  // Keep connector line, clear nodes
  Array.from(container.children).forEach(c => {
    if(!c.style.position || c.style.position !== 'absolute') c.remove();
  });

  const maxLvl = appData.maxLevel || 1;
  LEVELS.forEach((lvlGroup, index) => {
    const lvlNum = index + 1;
    const isUnlocked = lvlNum <= maxLvl;
    
    const node = document.createElement('div');
    node.className = 'lnode ' + (isUnlocked ? 'unlocked' : '');
    
    if(isUnlocked) {
      node.textContent = lvlNum;
      node.onclick = () => startLevel(lvlNum);
    } else {
      node.innerHTML = '🔒';
      node.onclick = () => showToast('¡Desbloquea el Nivel ' + (lvlNum-1) + ' primero!');
    }
    container.appendChild(node);
  });
}

function startLevel(lvlNum) {
  currentLevel = lvlNum;
  renderLevelMap();
  document.getElementById('level-map-ov').classList.remove('active');
  showScreenMenu('game');
  gameMode = 'classic';
  saveData();
  resetGame();
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
  matchedCount=0; errors=0; score=0; active=false; currentCombo=0; timeSurvived=0;

  const hsEl = document.getElementById('hs');
  if(hsEl) {
      if(gameMode === 'classic') hsEl.textContent = (appData.highscores[diff][0] || 0);
      else if(gameMode === 'words') hsEl.textContent = (appData.highscoresWords[diff][0] || 0);
      else hsEl.textContent = (appData.highscoresSurvival[diff][0] || 0);
  }

  if (gameMode === 'classic') {
    document.getElementById('game-area').style.display = 'flex';
    document.getElementById('word-area').style.display = 'none';
    
    const levelLetters = LEVELS[currentLevel - 1] || ALL;
    const total = levelLetters.length;
    const cfg = DIFF_CONFIG[diff];
    timeLeft = cfg.timePerLetter * total;
  
    queue = shuffle([...levelLetters]);
    visible = queue.splice(0, VISIBLE);
    lOrd = shuffle([...visible]);
    rOrd = shuffle([...visible]);
  
    selL=null; selR=null;
    clearLines();
    updateStats();
    renderCards(false);
  } else if (gameMode === 'words' || gameMode === 'daily') {
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('word-area').style.display = 'flex';
    
    wordsCompleted = 0;
    
    if (gameMode === 'daily') {
        const todayStr = new Date().toDateString();
        if (appData.lastDailyDate === todayStr) {
            alert('¡Ya completaste el Reto Diario de hoy! Vuelve mañana para un nuevo desafío.');
            backToModeSelect();
            return;
        }
        dailyWordsList = getDailyWords();
        timeLeft = 120; // 2 minutos fijos para el reto diario
    } else {
        const cfg = DIFF_CONFIG[diff];
        timeLeft = cfg.timePerLetter * 25; // Base time for ~5 words
    }
    
    initNextWord();
    updateStats();
  } else if (gameMode === 'survival') {
    document.getElementById('game-area').style.display = 'flex';
    document.getElementById('word-area').style.display = 'none';
    
    timeLeft = 45; // Start with 45 seconds
    queue = shuffle([...ALL]);
    visible = queue.splice(0, VISIBLE);
    lOrd = shuffle([...visible]);
    rOrd = shuffle([...visible]);
  
    selL=null; selR=null;
    clearLines();
    updateStats();
    renderCards(false);
  }

  // Prepara el botón de jugar
  const btnContainer = document.getElementById('play-btn-container');
  const btn = document.getElementById('play-btn');
  if(btnContainer && btn) {
    btnContainer.style.display = 'block';
    btn.textContent = 'JUGAR';
    btn.disabled = false;
    btn.style.background = ''; // resetear por si acaso
    btn.style.color = '';
  }
}

function startPlayCountdown() {
  const btn = document.getElementById('play-btn');
  if(!btn) return;
  
  btn.disabled = true;
  let count = 3;
  btn.textContent = count;
  
  const intv = setInterval(() => {
    count--;
    if(count > 0) {
      btn.textContent = count;
    } else if(count === 0) {
      btn.textContent = "¡GO!";
      btn.style.background = "#22c55e"; // verde
      btn.style.color = "#ffffff";
    } else {
      clearInterval(intv);
      document.getElementById('play-btn-container').style.display = 'none';
      active = true;
      startTimer();
    }
  }, 1000);
}

function showFloatingText(text, color, x, y) {
  const el = document.createElement('div');
  el.className = 'time-float';
  el.textContent = text;
  el.style.color = color;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

/* ==============================
   WORD MODE LOGIC
============================== */
let dailyWordsList = [];

function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function getDailyWords() {
    const today = new Date();
    const seedStr = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
        seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
        seed |= 0;
    }
    let pool = [...WORDS_DB];
    let dailyWords = [];
    for(let i = 0; i < 5; i++) {
        let idx = Math.floor(seededRandom(seed++) * pool.length);
        if (idx < 0) idx = -idx;
        dailyWords.push(pool[idx]);
        pool.splice(idx, 1);
    }
    return dailyWords;
}

function initNextWord() {
  if (WORDS_DB.length === 0) return;
  
  if (gameMode === 'daily') {
      if (wordsCompleted >= dailyWordsList.length) {
          appData.lastDailyDate = new Date().toDateString();
          saveData();
          clearInterval(timerInt); active=false;
          setTimeout(()=>showResult(true),600);
          confetti(); return;
      }
      currentWord = dailyWordsList[wordsCompleted];
  } else {
      currentWord = WORDS_DB[Math.floor(Math.random() * WORDS_DB.length)];
  }
  
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

function shuffleWordHand() {
  const handEl = document.getElementById('word-hand');
  if(!handEl) return;
  const remainingCards = Array.from(handEl.children).filter(c => !c.classList.contains('solved') && !c.classList.contains('flying'));
  if(remainingCards.length <= 1) return;
  
  const shuffled = shuffle([...remainingCards]);
  shuffled.forEach(card => handEl.appendChild(card));
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
      
      let pointsGained = 20;
      if (appData.achievements && appData.achievements.includes('ambassador')) {
        pointsGained = Math.floor(pointsGained * 1.15);
      }
      score += pointsGained;
      updateStats();
      playMatch();
      
      currentWordIndex++;
      if (currentWordIndex < currentWord.length) {
        document.getElementById(`slot-${currentWordIndex}`).classList.add('active');
        shuffleWordHand();
      } else {
        // Completed Word
        wordsCompleted++;
        appData.stats.totalWords++;
        if(soundOn) playSound(600, 'triangle', 0.2);
        
        // Spawn Confetti
        confetti();
        
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
            shuffleWordHand();
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
    timeSurvived++;
    if(timeSurvived > appData.stats.maxSurvivalTime && gameMode === 'survival') {
        appData.stats.maxSurvivalTime = timeSurvived;
    }
    updateTD();
    if(timeLeft<=0){ clearInterval(timerInt); active=false; showResult(false); }
  },1000);
}

function updateTD(){
  const el=document.getElementById('td');
  const m=Math.floor(timeLeft/60), s=timeLeft%60;
  el.textContent = m>0 ? m+'m '+String(s).padStart(2,'0')+'s' : timeLeft+'s';
  el.className=timeLeft<=15?'val timer-warn':'val';
  
  if (gameMode === 'survival' && timeLeft <= 10 && timeLeft > 0) {
      document.body.classList.add('danger-mode');
      // Latido de corazón
      playSound(150, 'sine', 0.2, 0.2);
  } else {
      document.body.classList.remove('danger-mode');
  }
}

/* ==============================
   STATS
============================== */
function updateStats(){
  const levelLetters = gameMode === 'classic' ? (LEVELS[currentLevel - 1] || ALL) : ALL;
  const totalLetters = levelLetters.length;
  
  document.getElementById('sd').textContent=score;
  document.getElementById('ed').textContent=errors;
  document.getElementById('pd').textContent=matchedCount+'/'+totalLetters;
  const pct=Math.round(matchedCount/totalLetters*100);
  document.getElementById('pf').style.width=pct+'%';
  document.getElementById('prog-pct').textContent=pct+'%';
  document.getElementById('prog-text').textContent=
    matchedCount===0 ? 'Progreso' :
    matchedCount===totalLetters ? '¡Completado! 🎉' :
    'Faltan '+(totalLetters-matchedCount)+' letras';
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
    matchedCount++;
    selL=null; selR=null;
    appData.letterStats[matchedLetter].correct++;
    appData.stats.totalCorrect++;
    
    currentCombo++;
    if(currentCombo > maxCombo) maxCombo = currentCombo;
    if(currentCombo > appData.stats.maxCombo) appData.stats.maxCombo = currentCombo;
    
    let multiplier = 1;
    if (currentCombo >= 10) multiplier = 4;
    else if (currentCombo >= 5) multiplier = 3;
    else if (currentCombo >= 3) multiplier = 2;
    
    let pointsGained = 20 * multiplier;
    if (appData.achievements && appData.achievements.includes('ambassador')) {
      pointsGained = Math.floor(pointsGained * 1.15);
    }
    
    if (currentCombo >= 3) {
      const rect = lc.getBoundingClientRect();
      showFloatingText(currentCombo + ' Rachas! x' + multiplier, '#ffd200', rect.left, rect.top - 20);
      
      // Añadir brillo a la pantalla si el combo es alto
      if (currentCombo >= 5) {
        document.body.style.boxShadow = 'inset 0 0 50px rgba(247, 151, 30, 0.4)';
        setTimeout(() => document.body.style.boxShadow = 'none', 800);
      }
    }
    
    if (gameMode === 'survival') {
      score += pointsGained;
      timeLeft += 3;
      updateTD();
      const rect = rc.getBoundingClientRect();
      showFloatingText('+3s', '#22c55e', rect.left + rect.width/2 - 20, rect.top);
      saveData();
      playMatch();
      updateStats();
      setTimeout(()=>replacePair(matchedLetter), 500);
    } else {
      score += pointsGained;
      saveData();
      playMatch();
      updateStats();
      checkMotivation(matchedCount);
  
      const levelLetters = LEVELS[currentLevel - 1] || ALL;
      if(matchedCount===levelLetters.length){
        clearInterval(timerInt); active=false;
        setTimeout(()=>showResult(true),600);
        confetti(); return;
      }
      setTimeout(()=>replacePair(matchedLetter), 500);
    }

  } else {
    lc.classList.remove('selected'); lc.classList.add('wrong');
    rc.classList.remove('selected'); rc.classList.add('wrong');
    
    currentCombo = 0; // Se pierde el combo al fallar
    
    if (gameMode === 'survival') {
      timeLeft = Math.max(0, timeLeft - 5);
      updateTD();
      const rect = rc.getBoundingClientRect();
      showFloatingText('-5s', '#ef4444', rect.left + rect.width/2 - 20, rect.top);
    }
    
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

  if (gameMode === 'survival' && queue.length === 0) {
    // Refill queue with random letters not currently visible
    queue = shuffle([...ALL]).filter(l => !visible.includes(l));
  }

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
  const levelLetters = gameMode === 'classic' ? (LEVELS[currentLevel - 1] || ALL) : ALL;
  const timeTaken = DIFF_CONFIG[diff].timePerLetter*levelLetters.length - timeLeft;
  const mins=Math.floor(timeTaken/60), secs=timeTaken%60;
  const timeStr = mins>0 ? mins+'m '+secs+'s' : secs+'s';
  
  let isNewRecord = false;
  if(won || score > 0) {
    const scoresArrayKey = gameMode === 'classic' ? 'highscores' : 
                           gameMode === 'words' ? 'highscoresWords' : 
                           gameMode === 'daily' ? 'highscoresDaily' : 'highscoresSurvival';
    if (!appData[scoresArrayKey]) appData[scoresArrayKey] = { easy: [], medium: [], hard: [] };
    const scores = appData[scoresArrayKey][diff];
    scores.push(score);
    scores.sort((a,b) => b-a);
    if(scores.length > 3) scores.pop();
    if(scores[0] === score && score > 0) isNewRecord = true;
    
    appData[scoresArrayKey][diff] = scores;
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
      if(gameMode === 'classic' && currentLevel < LEVELS.length) {
          if (currentLevel >= appData.maxLevel) {
              appData.maxLevel = currentLevel + 1;
              saveData();
          }
          rTitle = '¡Nivel Completado! 🎉';
      } else {
          rTitle = '¡Completado! 🎉';
      }
  }
  document.getElementById('rtitle').textContent = rTitle;
  document.getElementById('rstars').textContent=stars;
  document.getElementById('rscore').textContent='Puntuación: '+score+' pts';
  
  const nrEl = document.getElementById('rnewrecord');
  if(nrEl) nrEl.style.display = isNewRecord ? 'block' : 'none';

  checkAchievements();

  let detailHtml = '';
  if (gameMode === 'classic') {
    const levelLetters = LEVELS[currentLevel - 1] || ALL;
    detailHtml = '✅ Letras completadas: <b>'+matchedCount+'/'+levelLetters.length+'</b><br>'+  
                 '❌ Errores: <b>'+errors+'</b><br>'+  
                 (won?'⏱ Tiempo: <b>'+timeStr+'</b>':'');
  } else if (gameMode === 'words') {
    detailHtml = '📝 Palabras armadas: <b>'+wordsCompleted+'</b><br>'+  
                 '❌ Errores: <b>'+errors+'</b>';
  } else {
    detailHtml = '🔥 Emparejamientos: <b>'+matchedCount+'</b><br>'+  
                 '❌ Errores: <b>'+errors+'</b>';
  }
  document.getElementById('rdetail').innerHTML = detailHtml;

  let hsHtml = '<b>Mejores Puntuaciones (' + (diff==='easy'?'Fácil':diff==='medium'?'Medio':'Difícil') + '):</b><br>';
  const scoresArrayKey = gameMode === 'classic' ? 'highscores' : (gameMode === 'words' ? 'highscoresWords' : 'highscoresSurvival');
  const localScores = appData[scoresArrayKey][diff] || [];
  localScores.forEach((s, i) => { hsHtml += `${i+1}. ${s} pts<br>`; });
  if(localScores.length === 0) hsHtml += 'Sin registros aún.';
  const hsEl = document.getElementById('rhighscores');
  if(hsEl) hsEl.innerHTML = hsHtml;

  let buttonsHtml = '';
  
  // Share Button always present
  buttonsHtml += `<button class="btn-again" style="background: linear-gradient(90deg, #a855f7, #c084fc); margin-bottom: 5px; animation: pulse 2s infinite;" onclick="shareScore()">📢 Desafiar Amigos</button>`;

  if (gameMode === 'classic') {
    if (won && currentLevel < LEVELS.length) {
      buttonsHtml += `<button class="btn-again" style="background: linear-gradient(90deg,#22c55e,#16a34a);" onclick="startLevel(${currentLevel + 1}); document.getElementById('result-ov').classList.remove('active')">➡️ Siguiente Nivel</button>`;
    }
    if (won && currentLevel === LEVELS.length) {
      buttonsHtml += `<button class="btn-again" onclick="backToModeSelect(); document.getElementById('result-ov').classList.remove('active')">🗺️ Volver al Mapa</button>`;
    }
    buttonsHtml += `<button class="btn-again" onclick="resetGame();document.getElementById('result-ov').classList.remove('active')">🔄 Repetir Nivel</button>`;
  } else {
    buttonsHtml += `<button class="btn-again" onclick="resetGame();document.getElementById('result-ov').classList.remove('active')">🔄 Jugar de nuevo</button>`;
  }
  buttonsHtml += `<button class="btn-again" style="background: transparent; border: 1.5px solid rgba(255,255,255,0.2); color:#a0b4cc; margin-top: 5px;" onclick="backToModeSelect(); document.getElementById('result-ov').classList.remove('active')">🏠 Menú Principal</button>`;
  
  const buttonsDiv = document.getElementById('result-buttons');
  if(buttonsDiv) buttonsDiv.innerHTML = buttonsHtml;

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
    const levelLetters = LEVELS[currentLevel - 1] || ALL;
    if(matchedCount===levelLetters.length){ clearInterval(timerInt); active=false; setTimeout(()=>showResult(true),400); return; }
    setTimeout(()=>replacePair(lt), 500);
  }, 1500);
}

/* ==============================
   BOOT & INTRO ANIMATION
============================== */
loadData();
setDiffMenu(diff);

function playIntroAnimation() {
  const introOv = document.getElementById('intro-ov');
  const logo = document.getElementById('intro-logo');
  
  if(!introOv || !logo) return;
  
  // Aparece el logo suavemente con latido
  setTimeout(() => {
    logo.style.transform = 'scale(1)';
    logo.style.opacity = '1';
    
    // Animación de pulso continuo (añadida vía clase)
    logo.classList.add('pulse-logo');
  }, 300);
  
  // Después de 2 segundos, desvanecer
  setTimeout(() => {
    introOv.style.opacity = '0';
    introOv.style.visibility = 'hidden';
    setTimeout(() => { 
      introOv.style.display = 'none'; 
      if(!appData.tutorialSeen) {
        document.getElementById('welcome-ov').classList.add('active');
      }
    }, 800);
  }, 2200);
}

function closeTutorial() {
  document.getElementById('welcome-ov').classList.remove('active');
  appData.tutorialSeen = true;
  saveData();
}

// Llamar inmediatamente
playIntroAnimation();
// Fallback de seguridad por si algo falla
setTimeout(() => { 
  const introOv = document.getElementById('intro-ov');
  if(introOv) introOv.style.display = 'none'; 
}, 3500);

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

let lbCurrentDiff = 'easy';
let lbCurrentMode = 'classic';

async function fetchGlobalScores(d, m) {
  if (d) lbCurrentDiff = d;
  if (m) lbCurrentMode = m;
  
  const lbTitle = document.getElementById('lb-title');
  const lbList = document.getElementById('lb-list');
  if(!lbTitle || !lbList) return;

  const modeName = lbCurrentMode === 'classic' ? 'Clásico' : (lbCurrentMode === 'words' ? 'Palabras' : 'Supervivencia');
  const diffName = lbCurrentDiff === 'easy' ? 'Fácil' : (lbCurrentDiff === 'medium' ? 'Medio' : 'Difícil');
  lbTitle.textContent = "Cargando " + modeName + " (" + diffName + ")...";
  lbList.innerHTML = "";
  
  try {
    const q = db.collection("highscores")
      .where("difficulty", "==", lbCurrentDiff)
      .where("mode", "==", lbCurrentMode)
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
    lbTitle.textContent = `🏆 Top 10 ${modeName} (${diffName})`;
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
      document.getElementById('mode-select-ov').classList.add('active');
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
      document.getElementById('login-ov').classList.remove('active');
      backToModeSelect();
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
      backToModeSelect();
    }).catch((error) => {
      alert('Error al iniciar sesión: ' + error.message);
    });
}

function playAsGuest() {
  document.getElementById('login-ov').classList.remove('active');
  backToModeSelect();
}

function logout() {
  firebase.auth().signOut().then(() => {
    closeMenu();
    backToModeSelect();
  });
}

/* ==============================
   PROFILE AND ACHIEVEMENTS
============================== */
const ACHIEVEMENTS_DEF = [
  { id: 'first_steps', title: 'Primeros Pasos', desc: 'Acertar 50 señas', check: (s) => s.totalCorrect >= 50, icon: '🥉' },
  { id: 'apprentice', title: 'Aprendiz', desc: 'Acertar 200 señas', check: (s) => s.totalCorrect >= 200, icon: '🥈' },
  { id: 'master', title: 'Maestro', desc: 'Acertar 500 señas', check: (s) => s.totalCorrect >= 500, icon: '🥇' },
  { id: 'words_1', title: 'Letrado', desc: 'Armar 10 palabras', check: (s) => s.totalWords >= 10, icon: '📝' },
  { id: 'words_2', title: 'Diccionario', desc: 'Armar 50 palabras', check: (s) => s.totalWords >= 50, icon: '📚' },
  { id: 'streak_1', title: 'En Llamas', desc: 'Alcanzar combo x5', check: (s) => s.maxCombo >= 5, icon: '🔥' },
  { id: 'streak_2', title: 'Intocable', desc: 'Alcanzar combo x15', check: (s) => s.maxCombo >= 15, icon: '⚡' },
  { id: 'survival_1', title: 'Sobreviviente', desc: 'Sobrevivir 60s', check: (s) => s.maxSurvivalTime >= 60, icon: '⏳' },
  { id: 'survival_2', title: 'Inmortal', desc: 'Sobrevivir 180s', check: (s) => s.maxSurvivalTime >= 180, icon: '💎' },
  { id: 'ambassador', title: 'Embajador VIP', desc: 'Compartiste el juego', check: (s) => false, icon: '👑' },
];

function checkAchievements() {
  let unlocked = false;
  if (!appData.achievements) appData.achievements = [];
  
  ACHIEVEMENTS_DEF.forEach(ach => {
    if (!appData.achievements.includes(ach.id)) {
      if (ach.check(appData.stats)) {
        appData.achievements.push(ach.id);
        unlocked = true;
        showFloatingText('🏆 ¡Logro Desbloqueado: ' + ach.title + '!', '#a855f7', window.innerWidth/2 - 120, 100);
      }
    }
  });
  if (unlocked) saveData();
}

function showProfile() {
  document.getElementById('mode-select-ov').classList.remove('active');
  document.getElementById('profile-ov').classList.add('active');
  
  if (!appData.stats) appData.stats = { totalCorrect: 0, totalWords: 0, maxCombo: 0, maxSurvivalTime: 0 };
  
  document.getElementById('prof-corrects').textContent = appData.stats.totalCorrect;
  document.getElementById('prof-words').textContent = appData.stats.totalWords;
  document.getElementById('prof-combo').textContent = 'x' + appData.stats.maxCombo;
  document.getElementById('prof-survival').textContent = appData.stats.maxSurvivalTime + 's';
  
  const achList = document.getElementById('achievements-list');
  achList.innerHTML = '';
  
  if (!appData.achievements || appData.achievements.length === 0) {
    achList.innerHTML = '<div style="font-size: 11px; color: #a0b4cc; text-align: center; width: 100%;">Aún no has desbloqueado medallas. ¡Sigue jugando!</div>';
  } else {
    ACHIEVEMENTS_DEF.forEach(ach => {
      if (appData.achievements.includes(ach.id)) {
        const d = document.createElement('div');
        d.style = 'background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 10px; width: 90px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;';
        d.innerHTML = `<div style="font-size: 24px; margin-bottom: 5px;">${ach.icon}</div><div style="font-size: 10px; font-weight: bold; color: #ffd200;">${ach.title}</div><div style="font-size: 8px; color: #a0b4cc;">${ach.desc}</div>`;
        achList.appendChild(d);
      }
    });
  }
}

function closeProfile() {
  document.getElementById('profile-ov').classList.remove('active');
  document.getElementById('mode-select-ov').classList.add('active');
}

/* ==============================
   CREDITS LOGIC
============================== */
function showCredits() {
  document.getElementById('mode-select-ov').classList.remove('active');
  document.getElementById('credits-ov').classList.add('active');
}

function closeCredits() {
  document.getElementById('credits-ov').classList.remove('active');
  document.getElementById('mode-select-ov').classList.add('active');
}

/* ==============================
   SOCIAL & EXIT LOGIC
============================== */
function exitApp() {
  try {
    window.close();
  } catch(e) {}
  
  // Si no se cerró, mostrar la pantalla de despedida
  document.querySelectorAll('.overlay').forEach(ov => ov.classList.remove('active'));
  document.getElementById('exit-ov').classList.add('active');
}

function shareScore() {
  const shareText = `¡Acabo de anotar ${score} puntos en el modo ${gameMode === 'survival' ? 'Supervivencia' : gameMode === 'words' ? 'Palabras' : 'Clásico'} de Señas & Letras! 👑\n\n¿Crees que puedes superar mi récord? Juega gratis aquí:`;
  const shareUrl = 'https://carlosg-cmd.github.io/lenguaje-senas-game/';
  
  if (navigator.share) {
    navigator.share({
      title: 'Señas & Letras',
      text: shareText,
      url: shareUrl
    }).then(() => {
      // Recompensa al compartir con éxito
      if (!appData.achievements) appData.achievements = [];
      if (!appData.achievements.includes('ambassador')) {
        appData.achievements.push('ambassador');
        saveData();
        showFloatingText('👑 ¡Medalla de Embajador Desbloqueada! (+15% de puntos)', '#ffd200', window.innerWidth/2 - 150, 50);
      } else {
        showFloatingText('¡Gracias por compartir!', '#22c55e', window.innerWidth/2 - 80, 50);
      }
    }).catch(console.error);
  } else {
    // Fallback si no hay soporte nativo (ej. PC)
    navigator.clipboard.writeText(shareText + ' ' + shareUrl).then(() => {
      alert("¡Texto y enlace copiados al portapapeles! Compártelo con tus amigos.");
      if (!appData.achievements) appData.achievements = [];
      if (!appData.achievements.includes('ambassador')) {
        appData.achievements.push('ambassador');
        saveData();
        showFloatingText('👑 ¡Medalla de Embajador Desbloqueada! (+15% de puntos)', '#ffd200', window.innerWidth/2 - 150, 50);
      }
    });
  }
}