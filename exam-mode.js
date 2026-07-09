// ============================================================
// CUSTOM PRACTICE ("Exam Mode") — a fully configurable practice exam
// Lives alongside Daily Challenge, not inside it. Reuses sbFetch, DC_SUBJECTS,
// and dcFormatQuestionText from intelligence.html (loaded first).
//
// Flow: openCustomPractice() -> cpRenderConfig() -> user picks subjects,
// questions-per-subject, and time limit -> cpStartExam() -> cpRenderQuestion()
// -> cpFinishExam() -> cpRenderResults()
// ============================================================

const CP_STATE = {
  // config being built on the setup screen
  selectedSubjects: [],      // array of subject tags, e.g. ['BIO','CHEM']
  perSubjectCounts: {},      // { BIO: 20, CHEM: 15, ... }
  timeMinutes: 30,           // null/0 = untimed
  // live exam state
  questions: [],
  qIdx: 0,
  answers: [],               // { picked, correct, tag }
  locked: false,
  timeLeft: 0,
  timerInterval: null,
  startTime: null
};

const CP_MAX_PER_SUBJECT = 60;
const CP_MIN_PER_SUBJECT = 5;
const CP_TIME_OPTIONS = [
  { label: 'No timer', minutes: 0 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: '90 min', minutes: 90 },
  { label: '120 min', minutes: 120 }
];

// ---------- Entry point ----------
function openCustomPractice(){
  openPanel('custompractice');
  cpRenderConfig();
}

// Stops any running exam timer before leaving the panel, so it doesn't keep
// ticking (and potentially auto-submitting) in the background after navigating away.
function cpBackToRobomed(){
  clearInterval(CP_STATE.timerInterval);
  goBack();
}

// ---------- Config screen ----------
function cpToggleSubject(tag){
  const idx = CP_STATE.selectedSubjects.indexOf(tag);
  if(idx === -1){
    CP_STATE.selectedSubjects.push(tag);
    if(!CP_STATE.perSubjectCounts[tag]) CP_STATE.perSubjectCounts[tag] = 20;
  } else {
    CP_STATE.selectedSubjects.splice(idx, 1);
  }
  cpRenderConfig();
}

function cpSetCount(tag, val){
  let n = parseInt(val, 10);
  if(isNaN(n)) n = CP_MIN_PER_SUBJECT;
  n = Math.max(CP_MIN_PER_SUBJECT, Math.min(CP_MAX_PER_SUBJECT, n));
  CP_STATE.perSubjectCounts[tag] = n;
  const totalEl = document.getElementById('cpTotalQs');
  if(totalEl) totalEl.textContent = cpTotalQuestions();
}

function cpSetTime(minutes){
  CP_STATE.timeMinutes = minutes;
  cpRenderConfig();
}

function cpTotalQuestions(){
  return CP_STATE.selectedSubjects.reduce((sum, tag) => sum + (CP_STATE.perSubjectCounts[tag] || 0), 0);
}

function cpRenderConfig(){
  const body = document.getElementById('cpBody');
  if(!body) return;

  const subjectCards = Object.entries(DC_SUBJECTS).map(([tag, s]) => {
    const active = CP_STATE.selectedSubjects.includes(tag);
    const count = CP_STATE.perSubjectCounts[tag] || 20;
    return `
      <div class="cp-subject-card ${active ? 'cp-active' : ''}" style="border-color:${active ? s.color : 'var(--border)'}">
        <button class="cp-subject-toggle" onclick="cpToggleSubject('${tag}')" style="${active ? `background:${s.color}22;color:${s.color}` : ''}">
          <span>${s.icon}</span>
          <span>${s.name}</span>
          ${active ? '<span class="cp-check">✓</span>' : ''}
        </button>
        ${active ? `
          <div class="cp-count-row">
            <label>Questions</label>
            <input type="number" min="${CP_MIN_PER_SUBJECT}" max="${CP_MAX_PER_SUBJECT}" value="${count}"
              oninput="cpSetCount('${tag}', this.value)" class="cp-count-input">
          </div>
        ` : ''}
      </div>`;
  }).join('');

  const timeButtons = CP_TIME_OPTIONS.map(opt => `
    <button class="cp-time-btn ${CP_STATE.timeMinutes === opt.minutes ? 'cp-active' : ''}" onclick="cpSetTime(${opt.minutes})">${opt.label}</button>
  `).join('');

  const total = cpTotalQuestions();
  const canStart = CP_STATE.selectedSubjects.length > 0 && total > 0;

  body.innerHTML = `
    <div style="padding:14px 4px 6px;text-align:center">
      <span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--font-display);font-size:0.68rem;font-weight:800;letter-spacing:0.1em;color:#a78bfa">🎯 CUSTOM PRACTICE</span>
      <h2 style="font-family:var(--font-display);font-size:clamp(1.2rem,4.5vw,1.6rem);font-weight:900;letter-spacing:-0.03em;line-height:1.15;color:var(--text);margin:6px 0 4px">Build Your Own Exam</h2>
      <p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 10px">Pick subjects, how many questions each, and your time limit</p>
    </div>

    <div class="sec-header" style="margin-top:6px">1. Choose Subjects</div>
    <div class="cp-subject-grid">${subjectCards}</div>

    ${CP_STATE.selectedSubjects.length > 0 ? `
      <div class="sec-header" style="margin-top:18px">2. Time Limit</div>
      <div class="cp-time-grid">${timeButtons}</div>

      <div class="calc-result" style="margin-top:18px;text-align:center">
        <strong>${total}</strong> questions total ${CP_STATE.timeMinutes ? `· <strong>${CP_STATE.timeMinutes}</strong> min` : '· untimed'}
      </div>

      <button class="btn-go" style="width:100%;padding:14px;margin-top:14px" onclick="cpStartExam()" ${canStart ? '' : 'disabled'}>
        Start Exam →
      </button>
    ` : `
      <div class="tip-box" style="margin-top:16px">Select at least one subject above to continue. You can mix subjects — e.g. 20 Biology + 15 Chemistry + 10 Physics in one sitting.</div>
    `}
  `;
  const totalRef = document.getElementById('cpTotalQs');
  if(totalRef) totalRef.textContent = total;
}

// ---------- Exam runner ----------
async function cpStartExam(){
  const body = document.getElementById('cpBody');
  const subjects = CP_STATE.selectedSubjects.slice();
  if(subjects.length === 0) return;

  body.innerHTML = `
    <div style="text-align:center;padding:60px 20px">
      <div class="cp-spinner"></div>
      <p style="margin-top:16px;color:var(--text-muted);font-size:.85rem">Building your exam...</p>
    </div>`;

  try {
    const fetched = await dcFetchQuestionsDetailed(subjects);
    const byTag = {};
    subjects.forEach(tag => { byTag[tag] = fetched.questions.filter(q => q.tag === tag); });

    const finalSet = [];
    let shortfall = [];
    subjects.forEach(tag => {
      const wanted = CP_STATE.perSubjectCounts[tag] || 20;
      const pool = cpShuffle(byTag[tag] || []);
      const taken = pool.slice(0, wanted);
      if(taken.length < wanted){
        shortfall.push(`${DC_SUBJECTS[tag]?.name || tag}: only ${taken.length} of ${wanted} available`);
      }
      finalSet.push(...taken);
    });

    if(finalSet.length === 0){
      body.innerHTML = `<div class="danger-box">Couldn't load questions for this selection. Please try again or pick different subjects.
        <button class="btn-go" style="margin-top:10px" onclick="cpRenderConfig()">← Back to Setup</button></div>`;
      return;
    }

    CP_STATE.questions = cpShuffle(finalSet);
    CP_STATE.qIdx = 0;
    CP_STATE.answers = new Array(CP_STATE.questions.length).fill(null);
    CP_STATE.locked = false;
    CP_STATE.startTime = Date.now();
    CP_STATE.timeLeft = CP_STATE.timeMinutes ? CP_STATE.timeMinutes * 60 : 0;

    if(shortfall.length){
      console.warn('[CustomPractice] Shortfall:', shortfall);
    }

    if(CP_STATE.timeMinutes > 0){
      clearInterval(CP_STATE.timerInterval);
      CP_STATE.timerInterval = setInterval(cpTickTimer, 1000);
    }

    cpRenderQuestion(shortfall);
  } catch(e){
    console.error('[CustomPractice] Failed to start exam', e);
    body.innerHTML = `<div class="danger-box">Something went wrong loading your exam. Please try again.
      <button class="btn-go" style="margin-top:10px" onclick="cpRenderConfig()">← Back to Setup</button></div>`;
  }
}

function cpShuffle(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cpTickTimer(){
  CP_STATE.timeLeft--;
  const el = document.getElementById('cpTimerDisplay');
  if(el) el.textContent = cpFormatTime(CP_STATE.timeLeft);
  if(CP_STATE.timeLeft <= 0){
    clearInterval(CP_STATE.timerInterval);
    cpFinishExam();
  }
}

function cpFormatTime(s){
  if(s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function cpRenderQuestion(shortfallWarning){
  const body = document.getElementById('cpBody');
  const q = CP_STATE.questions[CP_STATE.qIdx];
  const subj = DC_SUBJECTS[q.tag] || { icon: '📚', color: '#94a3b8' };
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const existing = CP_STATE.answers[CP_STATE.qIdx];
  CP_STATE.locked = !!existing;
  const total = CP_STATE.questions.length;
  const pct = Math.round((CP_STATE.qIdx / total) * 100);

  const warningHtml = (shortfallWarning && shortfallWarning.length) ? `
    <div class="tip-box" style="margin-bottom:12px;font-size:.75rem">Note: ${shortfallWarning.join(' · ')}</div>
  ` : '';

  body.innerHTML = `
    ${warningHtml}
    <div class="school-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:.75rem;font-weight:700;color:${subj.color}">${subj.icon} ${subj.name}</span>
        <span style="font-size:.75rem;color:var(--text-muted)">Q${CP_STATE.qIdx + 1} / ${total}</span>
        ${CP_STATE.timeMinutes > 0 ? `<span id="cpTimerDisplay" style="font-size:.8rem;font-weight:800;color:${CP_STATE.timeLeft < 60 ? '#f87171' : 'var(--primary-light)'}">${cpFormatTime(CP_STATE.timeLeft)}</span>` : ''}
      </div>
      <div style="height:5px;background:var(--surface-raised);border-radius:3px;margin-bottom:14px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${subj.color};transition:width .3s"></div>
      </div>
      <div style="font-size:.95rem;font-weight:600;color:var(--text);line-height:1.55">${dcFormatQuestionText(q.q)}</div>
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
        ${q.opts.map((opt, i) => {
          let cls = 'cp-option';
          if(existing){
            if(i === existing.correct) cls += ' cp-correct';
            else if(i === existing.picked && i !== existing.correct) cls += ' cp-wrong';
          }
          return `<button class="${cls}" onclick="cpSelectAnswer(${i})" ${existing ? 'disabled' : ''}>
            <span class="cp-opt-letter">${letters[i]}</span><span>${opt}</span>
          </button>`;
        }).join('')}
      </div>
      ${existing && q.exp ? `<div class="tip-box" style="margin-top:12px"><strong>Explanation:</strong> ${q.exp}</div>` : ''}
    </div>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="btn-go" style="flex:1;background:var(--surface-raised);border:1px solid var(--border);color:var(--text-light)" onclick="cpPrevQuestion()" ${CP_STATE.qIdx === 0 ? 'disabled' : ''}>← Previous</button>
      ${CP_STATE.qIdx === total - 1
        ? `<button class="btn-go" style="flex:1" onclick="cpFinishExam()">Submit Exam ✓</button>`
        : `<button class="btn-go" style="flex:1" onclick="cpNextQuestion()">Next →</button>`}
    </div>
  `;
}

function cpSelectAnswer(idx){
  if(CP_STATE.locked) return;
  const q = CP_STATE.questions[CP_STATE.qIdx];
  CP_STATE.answers[CP_STATE.qIdx] = { picked: idx, correct: q.a, tag: q.tag };
  CP_STATE.locked = true;
  cpRenderQuestion();
}

function cpNextQuestion(){
  if(CP_STATE.qIdx < CP_STATE.questions.length - 1){
    CP_STATE.qIdx++;
    cpRenderQuestion();
  }
}

function cpPrevQuestion(){
  if(CP_STATE.qIdx > 0){
    CP_STATE.qIdx--;
    cpRenderQuestion();
  }
}

// XP formula for Custom Practice: deliberately smaller and flatter than Daily Challenge's
// (60 base + up to 200 for correct + up to 50 perfect + up to 50 streak), since Custom
// Practice sessions can run far longer (up to 60 Q x several subjects) and must never
// approach the 500-XP-per-write ceiling enforced by the check_player_before_update trigger.
// No base bonus, no streak/badge interaction — Custom Practice is a pure XP top-up, not a
// second streak system (streak stays a once-daily Daily Challenge concept).
const CP_XP_PER_CORRECT = 5;
const CP_XP_MAX = 150;

function cpCalcXp(correct){
  return Math.min(correct * CP_XP_PER_CORRECT, CP_XP_MAX);
}

async function cpFinishExam(){
  clearInterval(CP_STATE.timerInterval);
  const body = document.getElementById('cpBody');
  const total = CP_STATE.questions.length;
  const answered = CP_STATE.answers.filter(a => a).length;
  const correct = CP_STATE.answers.filter(a => a && a.picked === a.correct).length;
  const scorePct = total ? Math.round((correct / total) * 100) : 0;

  // Per-subject breakdown
  const bySubject = {};
  CP_STATE.questions.forEach((q, i) => {
    if(!bySubject[q.tag]) bySubject[q.tag] = { correct: 0, total: 0 };
    bySubject[q.tag].total++;
    const ans = CP_STATE.answers[i];
    if(ans && ans.picked === ans.correct) bySubject[q.tag].correct++;
  });

  const breakdownHtml = Object.entries(bySubject).map(([tag, s]) => {
    const subj = DC_SUBJECTS[tag] || { icon: '📚', name: tag, color: '#94a3b8' };
    const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:.85rem"><span style="color:${subj.color}">${subj.icon}</span> ${subj.name}</span>
      <span style="font-size:.85rem;font-weight:700">${s.correct}/${s.total} (${pct}%)</span>
    </div>`;
  }).join('');

  const timeTakenSec = Math.round((Date.now() - CP_STATE.startTime) / 1000);
  const xpEarned = cpCalcXp(correct);

  // Only award real XP to a logged-in player with a loaded player row — Custom Practice is
  // otherwise fully anonymous/local, so there's no players row to safely credit.
  let xpHtml;
  if(dcIsLoggedIn() && dcState.player){
    let saveConfirmed = false;
    try {
      const newXp = (dcState.player.xp || 0) + xpEarned;
      saveConfirmed = await dcUpdatePlayer(dcState.player.id, { xp: newXp });
      if(saveConfirmed) dcState.player.xp = newXp;
    } catch(e){ console.error('[CustomPractice] Failed to award XP', e); }
    xpHtml = saveConfirmed
      ? `<div class="tip-box" style="margin-top:10px;text-align:center"><strong>+${xpEarned} XP earned</strong> — added to your total</div>`
      : `<div class="tip-box" style="margin-top:10px;text-align:center">Scored ${xpEarned} XP, but we couldn't save it just now. Your practice score above is still accurate.</div>`;
  } else {
    xpHtml = `<div class="tip-box" style="margin-top:10px;text-align:center">Sign up to bank <strong>${xpEarned} XP</strong> from this session — right now it's practice-only. <button class="btn-go" style="margin-top:8px;padding:10px 16px" onclick="dcShowAuthNudge('Save your progress?','Create a free account to start earning XP from Custom Practice too.')">Sign Up Free</button></div>`;
  }

  body.innerHTML = `
    <div style="text-align:center;padding:20px 4px">
      <div style="font-size:2.6rem;font-weight:900;font-family:var(--font-display);color:${scorePct >= 70 ? '#4ade80' : scorePct >= 50 ? '#fbbf24' : '#f87171'}">${scorePct}%</div>
      <p style="font-size:.9rem;color:var(--text-muted);margin:4px 0 0">${correct} of ${total} correct · ${answered} answered · ${cpFormatTime(timeTakenSec)} taken</p>
    </div>
    ${xpHtml}
    <div class="school-card" style="margin-top:10px">
      <div class="sec-header" style="margin-top:0">Breakdown by Subject</div>
      ${breakdownHtml}
    </div>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="btn-go" style="flex:1;background:var(--surface-raised);border:1px solid var(--border);color:var(--text-light)" onclick="cpReviewAnswers()">Review Answers</button>
      <button class="btn-go" style="flex:1" onclick="cpResetToConfig()">New Exam</button>
    </div>
  `;
}

function cpReviewAnswers(){
  const body = document.getElementById('cpBody');
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const rows = CP_STATE.questions.map((q, i) => {
    const ans = CP_STATE.answers[i];
    const subj = DC_SUBJECTS[q.tag] || { icon: '📚', color: '#94a3b8' };
    const isCorrect = ans && ans.picked === ans.correct;
    return `
      <div class="school-card" style="margin-bottom:10px">
        <div style="font-size:.72rem;font-weight:700;color:${subj.color};margin-bottom:6px">${subj.icon} Q${i + 1}</div>
        <div style="font-size:.88rem;font-weight:600;color:var(--text);line-height:1.5;margin-bottom:10px">${dcFormatQuestionText(q.q)}</div>
        ${q.opts.map((opt, oi) => {
          let cls = 'cp-option cp-review';
          if(oi === q.a) cls += ' cp-correct';
          else if(ans && oi === ans.picked) cls += ' cp-wrong';
          return `<div class="${cls}"><span class="cp-opt-letter">${letters[oi]}</span><span>${opt}</span></div>`;
        }).join('')}
        ${!ans ? '<div style="font-size:.78rem;color:var(--text-muted);margin-top:6px">Not answered</div>' : ''}
        ${q.exp ? `<div class="tip-box" style="margin-top:10px"><strong>Explanation:</strong> ${q.exp}</div>` : ''}
      </div>`;
  }).join('');

  body.innerHTML = `
    <div class="sec-header">📋 Full Review</div>
    ${rows}
    <button class="btn-go" style="width:100%;padding:13px;margin-top:10px" onclick="cpResetToConfig()">New Exam</button>
  `;
}

function cpResetToConfig(){
  CP_STATE.selectedSubjects = [];
  CP_STATE.perSubjectCounts = {};
  CP_STATE.timeMinutes = 30;
  CP_STATE.questions = [];
  CP_STATE.answers = [];
  CP_STATE.qIdx = 0;
  clearInterval(CP_STATE.timerInterval);
  cpRenderConfig();
}
