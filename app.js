const demoState = {
  questionCount: 10,
  currentTab: 'quiz',
  currentPack: null,
  flashcardIndex: 0,
  flashcardKnown: new Set()
};

const stopwords = new Set([
  'the', 'and', 'a', 'an', 'to', 'of', 'in', 'for', 'on', 'with', 'is', 'are', 'was',
  'were', 'be', 'as', 'by', 'that', 'this', 'it', 'from', 'or', 'at', 'into', 'over',
  'after', 'before', 'about', 'their', 'them', 'they', 'we', 'you', 'your', 'our',
  'not', 'no', 'yes', 'if', 'than', 'then', 'but', 'so', 'such', 'can', 'also', 'more',
  'most', 'less', 'least', 'up', 'down', 'out', 'off', 'within', 'without'
]);

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const navToggle = $('.nav-toggle');
const navLinks = $('.nav-links');

navToggle?.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  navLinks.classList.toggle('active');
});

navToggle?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    navToggle.click();
  }
});

$$('[data-scroll]').forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.scroll;
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
    navLinks.classList.remove('active');
    navToggle?.setAttribute('aria-expanded', 'false');
  });
});

$$('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    event.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    navLinks.classList.remove('active');
    navToggle?.setAttribute('aria-expanded', 'false');
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  },
  { threshold: 0.2 }
);

$$('.reveal').forEach((el) => observer.observe(el));

const accordionItems = $$('.accordion-item');
accordionItems.forEach((item) => {
  item.addEventListener('click', () => {
    const expanded = item.getAttribute('aria-expanded') === 'true';
    accordionItems.forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
    item.setAttribute('aria-expanded', String(!expanded));
  });
});

const notesInput = $('#notes');
const charCount = $('#char-count');

notesInput?.addEventListener('input', () => {
  charCount.textContent = `${notesInput.value.length} characters`;
});

$$('.pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    $$('.pill').forEach((btn) => btn.classList.remove('active'));
    pill.classList.add('active');
    demoState.questionCount = Number(pill.dataset.count);
    updateShareCard();
  });
});

$('#use-sample')?.addEventListener('click', () => {
  notesInput.value = notesInput.placeholder.trim();
  notesInput.dispatchEvent(new Event('input'));
});

$('#reset')?.addEventListener('click', () => {
  notesInput.value = '';
  notesInput.dispatchEvent(new Event('input'));
  resetOutputs();
});

const progressStep = $('#progress-step');
const generateBtn = $('#generate');

$('#subject')?.addEventListener('change', updateShareCard);
$('#difficulty')?.addEventListener('change', updateShareCard);

$('#generate')?.addEventListener('click', () => {
  const text = notesInput.value.trim();
  if (!text) {
    showToast('Paste some notes to generate your study pack.', true);
    return;
  }

  generateBtn.disabled = true;
  progressStep.textContent = 'Step 1/3: Extracting topics...';
  showSkeleton();

  setTimeout(() => {
    progressStep.textContent = 'Step 2/3: Writing questions...';
  }, 600);

  setTimeout(() => {
    progressStep.textContent = 'Step 3/3: Building plan...';
  }, 1100);

  setTimeout(() => {
    const subject = $('#subject').value;
    const difficulty = $('#difficulty').value;
    const parsed = parseInput(text);
    const packId = createPackId(parsed.normalized, subject, difficulty, demoState.questionCount);
    const readiness = computeReadinessScore(parsed);

    const pack = {
      packId,
      meta: {
        subject,
        difficulty,
        questionCount: demoState.questionCount,
        timestamp: new Date().toLocaleString()
      },
      quiz: generateQuiz(parsed, demoState.questionCount, packId),
      flashcards: generateFlashcards(parsed),
      summary: generateSummary(parsed),
      plan: generateStudyPlan(parsed),
      readiness,
      keywords: parsed.keywords.slice(0, 8)
    };

    demoState.currentPack = pack;
    demoState.flashcardIndex = 0;
    demoState.flashcardKnown = new Set();
    storePack(pack);

    updateOutput();
    progressStep.textContent = 'Done! Your study pack is ready.';
    generateBtn.disabled = false;
  }, 1700);
});

const tabs = $$('.tab');
const panels = $$('.tab-panel');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});

function setActiveTab(tabName) {
  demoState.currentTab = tabName;
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  panels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });
  renderTab(tabName);
}

$('#copy-output')?.addEventListener('click', () => {
  const content = getCopyContent();
  copyToClipboard(content);
});

$('#export-output')?.addEventListener('click', () => {
  if (!demoState.currentPack) return;
  const { meta } = demoState.currentPack;
  const dateLabel = new Date().toLocaleDateString();
  const tab = demoState.currentTab;

  if (tab === 'quiz') {
    exportQuizToHTML(meta.subject, demoState.currentPack.quiz, meta);
  } else if (tab === 'flashcards') {
    exportFlashcardsToCSV(meta.subject, demoState.currentPack.flashcards, dateLabel);
  } else if (tab === 'summary') {
    downloadText(`summary-${meta.subject}-${dateLabel}.md`, formatSummaryMarkdown(demoState.currentPack.summary));
  } else {
    downloadText(`study-plan-${meta.subject}-${dateLabel}.md`, formatPlanMarkdown(demoState.currentPack.plan));
  }
});

$('#copy-caption')?.addEventListener('click', () => {
  copyToClipboard('I pasted my notes and it made a quiz in seconds. Try it: notetoquiz.com');
});

$('#download-card')?.addEventListener('click', () => {
  downloadShareCard();
});

const waitlistForm = $('#waitlist-form');
waitlistForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const emailInput = $('#email');
  const email = emailInput.value.trim().toLowerCase();
  if (!validateEmail(email)) {
    showToast('Please enter a valid email.', true);
    return;
  }

  const stored = JSON.parse(localStorage.getItem('waitlistEmails') || '[]');
  if (stored.includes(email)) {
    showToast('You are already on the list!', true);
    return;
  }
  stored.push(email);
  localStorage.setItem('waitlistEmails', JSON.stringify(stored));
  showToast('You’re on the list!');
  emailInput.value = '';
});

const toast = $('#toast');
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.style.background = isError ? 'rgba(255, 107, 107, 0.2)' : 'rgba(54, 211, 153, 0.2)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
}

function normalizeText(text) {
  return text
    .replace(/Example:/gi, '')
    .replace(/\\n/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/—/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseInput(text) {
  const normalized = normalizeText(text);
  const sentenceSource = normalized
    .replace(/\s*[-•]\s+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = sentenceSource
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 4);

  const tokens = normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((token) => token.length >= 3)
    .filter((token) => !stopwords.has(token))
    .filter((token) => !/^\d+$/.test(token));

  const freq = tokens.reduce((acc, token) => {
    acc[token] = (acc[token] || 0) + 1;
    return acc;
  }, {});

  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .filter((word, index, arr) => arr.indexOf(word) === index)
    .slice(0, 14);

  return { normalized, tokens, keywords, sentences };
}

function generateQuiz(parsed, questionCount, packId) {
  const mcqCount = Math.max(3, Math.round(questionCount * 0.6));
  const shortCount = Math.max(2, questionCount - mcqCount);
  const baseSentences = parsed.sentences.length ? parsed.sentences : [parsed.normalized || ''];
  const keySentences = pickKeySentences(baseSentences, parsed.keywords, questionCount);
  const questions = [];
  const seed = seedFromString(packId);

  for (let i = 0; i < mcqCount; i++) {
    const sentence = keySentences[i % keySentences.length] || baseSentences[i % baseSentences.length] || '';
    const keyword = findKeywordInSentence(sentence, parsed.keywords) || parsed.keywords[i] || 'topic';
    const correct = summarizeSentence(sentence);
    const distractors = buildDistractors(baseSentences, sentence, parsed.keywords, keyword, seed + i);
    const choices = seededShuffle([correct, ...distractors], seed + i).slice(0, 4);
    const answerIndex = choices.indexOf(correct);

    questions.push({
      id: `mcq-${i + 1}`,
      type: 'MCQ',
      prompt: `Which statement best explains ${keyword}?`,
      context: sentence,
      choices,
      answerIndex,
      explanation: `Based on your notes, ${keyword} is tied to: ${correct}`
    });
  }

  for (let i = 0; i < shortCount; i++) {
    const sentence = keySentences[(i + mcqCount) % keySentences.length] || baseSentences[i % baseSentences.length] || '';
    const keyword = findKeywordInSentence(sentence, parsed.keywords) || parsed.keywords[(i + 2) % parsed.keywords.length] || 'concept';
    questions.push({
      id: `short-${i + 1}`,
      type: 'Short Answer',
      prompt: `In 2–3 sentences, explain how ${keyword} connects to this topic.`,
      context: sentence,
      answerText: sentence,
      answerKeywords: extractKeywords(sentence),
      explanation: `Your notes highlight: ${summarizeSentence(sentence)}`
    });
  }

  return { questions };
}

function generateFlashcards({ keywords, sentences }) {
  const cards = [];
  const cardCount = Math.min(10, Math.max(6, keywords.length));

  for (let i = 0; i < cardCount; i++) {
    const term = keywords[i % keywords.length] || `Term ${i + 1}`;
    const sentence = sentences.find((s) => s.toLowerCase().includes(term)) || sentences[i] || '';
    cards.push({
      id: `card-${i + 1}`,
      front: capitalize(term),
      back: sentence || `Definition and context for ${term}.`
    });
  }

  return cards;
}

function generateSummary({ keywords, sentences }) {
  const sections = [];
  const sectionCount = Math.min(4, Math.max(2, Math.ceil(keywords.length / 3)));

  for (let i = 0; i < sectionCount; i++) {
    const keyword = keywords[i] || 'Overview';
    const related = sentences.filter((sentence) => sentence.toLowerCase().includes(keyword)).slice(0, 4);
    const fallback = sentences.slice(i * 3, i * 3 + 4);
    const bullets = (related.length ? related : fallback)
      .map(cleanBullet)
      .filter(Boolean);

    if (bullets.length === 0) {
      bullets.push('Add more notes to expand this section.');
    }

    sections.push({
      title: `${capitalize(keyword)} focus`,
      bullets
    });
  }

  return { sections };
}

function generateStudyPlan({ keywords }) {
  const topic = capitalize(keywords[0] || 'this unit');
  const tasks = [
    'Review the summary and highlight key terms',
    'Answer 5 quiz questions and check mistakes',
    'Drill flashcards for 10 minutes',
    'Rewrite tricky concepts in your own words',
    'Take a full practice quiz and score it',
    'Teach a friend or record a 2-minute recap',
    'Final review + quick self-test'
  ];

  const days = tasks.map((task, index) => {
    const time = 25 + index * 5;
    return {
      day: index + 1,
      title: `Day ${index + 1}`,
      timeEstimate: `${time} min`,
      tasks: [
        { id: `${index}-a`, text: task, minutes: time },
        { id: `${index}-b`, text: `Review ${topic} keywords (${10 + index * 2} min)`, minutes: 10 + index * 2 },
        { id: `${index}-c`, text: 'Reflect on what felt hardest', minutes: 5 + index },
        ...(index % 2 === 0 ? [{ id: `${index}-d`, text: 'Schedule a spaced recall check', minutes: 8 }] : [])
      ]
    };
  });

  return { days };
}

function computeReadinessScore({ tokens, keywords }) {
  const lengthScore = Math.min(60, tokens.length / 4);
  const diversityScore = Math.min(40, keywords.length * 3);
  return Math.round(50 + (lengthScore + diversityScore) / 2);
}

function updateOutput() {
  if (!demoState.currentPack) return;
  $('#timestamp').textContent = `Generated from your notes • ${demoState.currentPack.meta.timestamp}`;
  updateShareCard();
  renderTab(demoState.currentTab);
}

function renderTab(tabName) {
  const panel = document.getElementById(`tab-${tabName}`);
  if (!panel) return;

  panel.classList.remove('fade-in');
  if (!demoState.currentPack) {
    panel.innerHTML = '<p class="muted">Generate a study pack to see results here.</p>';
    return;
  }

  if (tabName === 'quiz') {
    renderQuiz(panel, demoState.currentPack.quiz);
  } else if (tabName === 'flashcards') {
    renderFlashcards(panel, demoState.currentPack.flashcards);
  } else if (tabName === 'summary') {
    renderSummary(panel, demoState.currentPack.summary);
  } else {
    renderPlan(panel, demoState.currentPack.plan, demoState.currentPack.packId);
  }

  requestAnimationFrame(() => panel.classList.add('fade-in'));
}

function renderQuiz(container, quiz) {
  container.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'quiz-header';
  header.innerHTML = `
    <div>
      <h4>Practice Quiz</h4>
      <p class="muted">Answer the questions, then check your score.</p>
    </div>
    <div class="quiz-actions">
      <button class="btn btn-subtle" id="reset-quiz">Reset quiz</button>
      <button class="btn btn-primary" id="check-quiz">Check answers</button>
    </div>
  `;

  const list = document.createElement('div');
  list.className = 'quiz-list';

  quiz.questions.forEach((question, index) => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.dataset.questionId = question.id;

    const meta = document.createElement('div');
    meta.className = 'quiz-meta';
    meta.innerHTML = `<span>Q${index + 1}</span><span>${question.type}</span>`;

    const prompt = document.createElement('h5');
    prompt.textContent = question.prompt;

    const context = document.createElement('p');
    context.className = 'quiz-context';
    context.textContent = question.context;

    card.append(meta, prompt, context);

    if (question.type === 'MCQ') {
      const choices = document.createElement('div');
      choices.className = 'quiz-choices';
      question.choices.forEach((choice, idx) => {
        const label = document.createElement('label');
        label.className = 'choice';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = question.id;
        input.value = String(idx);
        const span = document.createElement('span');
        span.textContent = choice;
        label.append(input, span);
        choices.appendChild(label);
      });
      card.appendChild(choices);
    } else {
      const input = document.createElement('textarea');
      input.className = 'quiz-input';
      input.rows = 3;
      input.placeholder = 'Type your answer here...';
      input.dataset.questionId = question.id;
      card.appendChild(input);
    }

    const feedback = document.createElement('div');
    feedback.className = 'quiz-feedback';
    card.appendChild(feedback);

    list.appendChild(card);
  });

  const score = document.createElement('div');
  score.className = 'quiz-score';
  score.innerHTML = '<strong>Score:</strong> <span id="quiz-score">—</span>';

  container.append(header, list, score);

  container.querySelector('#check-quiz').addEventListener('click', () => checkQuizAnswers(quiz));
  container.querySelector('#reset-quiz').addEventListener('click', () => resetQuiz(container));
}

function checkQuizAnswers(quiz) {
  let correct = 0;
  quiz.questions.forEach((question) => {
    const card = document.querySelector(`[data-question-id="${question.id}"]`);
    const feedback = card.querySelector('.quiz-feedback');
    feedback.innerHTML = '';
    let isCorrect = false;

    if (question.type === 'MCQ') {
      const selected = card.querySelector('input[type="radio"]:checked');
      const selectedIndex = selected ? Number(selected.value) : -1;
      isCorrect = selectedIndex === question.answerIndex;
      feedback.innerHTML = `
        <p>${isCorrect ? '✅ Correct!' : '❌ Not quite.'}</p>
        <p><strong>Answer:</strong> ${question.choices[question.answerIndex]}</p>
        <p class="muted">${question.explanation}</p>
      `;
    } else {
      const input = card.querySelector('.quiz-input');
      const response = input.value.trim().toLowerCase();
      const keywordMatches = question.answerKeywords.filter((word) => response.includes(word)).length;
      isCorrect = response.length > 0 && keywordMatches >= 1;
      feedback.innerHTML = `
        <p>${isCorrect ? '✅ Solid answer!' : '❌ Needs more detail.'}</p>
        <p><strong>Sample answer:</strong> ${question.answerText}</p>
        <p class="muted">${question.explanation}</p>
      `;
    }

    if (isCorrect) correct += 1;
    card.classList.toggle('correct', isCorrect);
    card.classList.toggle('incorrect', !isCorrect);
  });

  const scoreEl = document.getElementById('quiz-score');
  scoreEl.textContent = `${correct} / ${quiz.questions.length}`;
}

function resetQuiz(container) {
  container.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.checked = false;
  });
  container.querySelectorAll('.quiz-input').forEach((input) => {
    input.value = '';
  });
  container.querySelectorAll('.quiz-feedback').forEach((el) => {
    el.innerHTML = '';
  });
  container.querySelectorAll('.quiz-card').forEach((card) => {
    card.classList.remove('correct', 'incorrect');
  });
  const scoreEl = document.getElementById('quiz-score');
  if (scoreEl) scoreEl.textContent = '—';
}

function renderFlashcards(container, cards) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'flashcard-header';
  header.innerHTML = `
    <div>
      <h4>Flashcards</h4>
      <p class="muted">Tap the card to flip. Track what you already know.</p>
    </div>
    <div class="flashcard-progress">
      <span id="flashcard-count">1/${cards.length}</span>
      <span id="flashcard-known">0 known</span>
    </div>
  `;

  const shell = document.createElement('div');
  shell.className = 'flashcard-shell';
  const card = document.createElement('div');
  card.className = 'flashcard';
  card.tabIndex = 0;
  card.innerHTML = `
    <div class="flashcard-face flashcard-front"></div>
    <div class="flashcard-face flashcard-back"></div>
  `;
  shell.appendChild(card);

  const actions = document.createElement('div');
  actions.className = 'flashcard-actions';
  actions.innerHTML = `
    <button class="btn btn-subtle" id="flashcard-prev">Prev</button>
    <button class="btn btn-subtle" id="flashcard-shuffle">Shuffle</button>
    <button class="btn btn-subtle" id="flashcard-next">Next</button>
    <button class="btn btn-ghost" id="flashcard-known-toggle">Mark as known</button>
  `;

  container.append(header, shell, actions);

  updateFlashcard(cards, card);
  updateFlashcardMeta(cards);

  card.addEventListener('click', () => card.classList.toggle('is-flipped'));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      card.classList.toggle('is-flipped');
    }
  });

  container.querySelector('#flashcard-prev').addEventListener('click', () => {
    demoState.flashcardIndex = (demoState.flashcardIndex - 1 + cards.length) % cards.length;
    card.classList.remove('is-flipped');
    updateFlashcard(cards, card);
    updateFlashcardMeta(cards);
  });

  container.querySelector('#flashcard-next').addEventListener('click', () => {
    demoState.flashcardIndex = (demoState.flashcardIndex + 1) % cards.length;
    card.classList.remove('is-flipped');
    updateFlashcard(cards, card);
    updateFlashcardMeta(cards);
  });

  container.querySelector('#flashcard-shuffle').addEventListener('click', () => {
    demoState.flashcardIndex = Math.floor(Math.random() * cards.length);
    card.classList.remove('is-flipped');
    updateFlashcard(cards, card);
    updateFlashcardMeta(cards);
  });

  container.querySelector('#flashcard-known-toggle').addEventListener('click', () => {
    const current = cards[demoState.flashcardIndex];
    if (!current) return;
    if (demoState.flashcardKnown.has(current.id)) {
      demoState.flashcardKnown.delete(current.id);
    } else {
      demoState.flashcardKnown.add(current.id);
    }
    updateFlashcardMeta(cards);
  });
}

function updateFlashcard(cards, cardEl) {
  const current = cards[demoState.flashcardIndex];
  if (!current) return;
  cardEl.querySelector('.flashcard-front').textContent = current.front;
  cardEl.querySelector('.flashcard-back').textContent = current.back;
}

function updateFlashcardMeta(cards) {
  const count = document.getElementById('flashcard-count');
  const known = document.getElementById('flashcard-known');
  if (count) {
    count.textContent = `${demoState.flashcardIndex + 1}/${cards.length}`;
  }
  if (known) {
    known.textContent = `${demoState.flashcardKnown.size} known`;
  }
  const toggle = document.getElementById('flashcard-known-toggle');
  if (toggle && cards[demoState.flashcardIndex]) {
    toggle.textContent = demoState.flashcardKnown.has(cards[demoState.flashcardIndex].id)
      ? 'Marked as known ✓'
      : 'Mark as known';
  }
}

function renderSummary(container, summary) {
  container.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'summary-header';
  header.innerHTML = `
    <h4>1-page Summary</h4>
    <p class="muted">Open each section to review the key points.</p>
  `;

  const list = document.createElement('div');
  list.className = 'summary-list';

  summary.sections.forEach((section, index) => {
    const details = document.createElement('details');
    details.className = 'summary-section';
    if (index === 0) details.open = true;

    const summaryEl = document.createElement('summary');
    summaryEl.textContent = section.title;
    details.appendChild(summaryEl);

    const ul = document.createElement('ul');
    section.bullets.forEach((bullet) => {
      const li = document.createElement('li');
      li.textContent = bullet;
      ul.appendChild(li);
    });
    details.appendChild(ul);
    list.appendChild(details);
  });

  container.append(header, list);
}

function renderPlan(container, plan, packId) {
  container.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'plan-header';
  header.innerHTML = `
    <h4>7-day Study Plan</h4>
    <p class="muted">Check off tasks as you complete them. Progress saves automatically.</p>
  `;

  const progressWrap = document.createElement('div');
  progressWrap.className = 'plan-progress';
  progressWrap.innerHTML = `
    <div class="progress-bar"><span id="plan-progress-bar"></span></div>
    <p class="muted" id="plan-progress-text">0% complete</p>
  `;

  const grid = document.createElement('div');
  grid.className = 'plan-grid';

  const stored = getPlanProgress(packId);

  plan.days.forEach((day) => {
    const card = document.createElement('div');
    card.className = 'plan-card';

    const header = document.createElement('div');
    header.className = 'plan-card-header';
    header.innerHTML = `<div><h5>${day.title}</h5><p class="muted">${day.timeEstimate}</p></div><span>Day ${day.day}</span>`;

    const list = document.createElement('div');
    list.className = 'plan-task-list';

    day.tasks.forEach((task) => {
      const label = document.createElement('label');
      label.className = 'plan-task';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.taskId = `${day.day}-${task.id}`;
      input.checked = Boolean(stored[input.dataset.taskId]);
      const span = document.createElement('span');
      span.textContent = `${task.text} (${task.minutes} min)`;
      label.append(input, span);
      list.appendChild(label);
    });

    card.append(header, list);
    grid.appendChild(card);
  });

  container.append(header, progressWrap, grid);
  updatePlanProgress(container, packId);

  container.querySelectorAll('.plan-task input').forEach((input) => {
    input.addEventListener('change', () => {
      const progress = getPlanProgress(packId);
      progress[input.dataset.taskId] = input.checked;
      localStorage.setItem(`plan-progress-${packId}`, JSON.stringify(progress));
      updatePlanProgress(container, packId);
    });
  });
}

function updatePlanProgress(container, packId) {
  const progress = getPlanProgress(packId);
  const tasks = container.querySelectorAll('.plan-task input');
  const completed = Array.from(tasks).filter((input) => input.checked).length;
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const bar = container.querySelector('#plan-progress-bar');
  const text = container.querySelector('#plan-progress-text');
  if (bar) bar.style.width = `${percent}%`;
  if (text) text.textContent = `${percent}% complete`;
}

function getPlanProgress(packId) {
  return JSON.parse(localStorage.getItem(`plan-progress-${packId}`) || '{}');
}

function showSkeleton() {
  panels.forEach((panel) => {
    panel.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton short"></div>';
  });
}

function resetOutputs() {
  demoState.currentPack = null;
  panels.forEach((panel) => {
    panel.innerHTML = '<p class="muted">Generate a study pack to see results here.</p>';
  });
  $('#timestamp').textContent = 'Generated from your notes • —';
  updateShareCard();
}

function updateShareCard() {
  const subject = $('#subject').value;
  const difficulty = $('#difficulty').value;
  $('#share-meta').textContent = `${subject} • ${difficulty} • ${demoState.questionCount} Questions`;
  $('#readiness-score').textContent = `${demoState.currentPack?.readiness || 72}%`;
  const keywordContainer = $('#share-keywords');
  keywordContainer.innerHTML = '';
  const keywords = demoState.currentPack?.keywords || [];
  keywords.slice(0, 3).forEach((word) => {
    const span = document.createElement('span');
    span.textContent = capitalize(word);
    keywordContainer.appendChild(span);
  });
}

function getCopyContent() {
  if (!demoState.currentPack) return '';
  if (demoState.currentTab === 'quiz') {
    return formatQuizText(demoState.currentPack.quiz);
  }
  if (demoState.currentTab === 'flashcards') {
    return demoState.currentPack.flashcards
      .map((card, index) => `${index + 1}. ${card.front} — ${card.back}`)
      .join('\n');
  }
  if (demoState.currentTab === 'summary') {
    return formatSummaryMarkdown(demoState.currentPack.summary);
  }
  return formatPlanMarkdown(demoState.currentPack.plan);
}

function formatQuizText(quiz) {
  const lines = ['Practice Quiz', ''];
  quiz.questions.forEach((question, index) => {
    lines.push(`${index + 1}. ${question.prompt}`);
    lines.push(`   ${question.context}`);
    if (question.choices) {
      question.choices.forEach((choice, idx) => {
        lines.push(`   ${String.fromCharCode(65 + idx)}. ${choice}`);
      });
    }
    lines.push('');
  });
  lines.push('Answer Key');
  quiz.questions.forEach((question, index) => {
    const answer = question.type === 'MCQ'
      ? question.choices[question.answerIndex]
      : question.answerText;
    lines.push(`${index + 1}. ${answer}`);
  });
  return lines.join('\n');
}

function formatSummaryMarkdown(summary) {
  return summary.sections
    .map((section) => `## ${section.title}\n${section.bullets.map((b) => `- ${b}`).join('\n')}`)
    .join('\n\n');
}

function formatPlanMarkdown(plan) {
  return plan.days
    .map((day) => {
      const tasks = day.tasks.map((task) => `- [ ] ${task.text} (${task.minutes} min)`).join('\n');
      return `### ${day.title} (${day.timeEstimate})\n${tasks}`;
    })
    .join('\n\n');
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportQuizToHTML(subject, quiz, meta) {
  const htmlQuestions = quiz.questions
    .map((q, index) => {
      const choices = q.choices
        ? `<ul>${q.choices.map((c) => `<li>${c}</li>`).join('')}</ul>`
        : '';
      const answer = q.type === 'MCQ' ? q.choices[q.answerIndex] : q.answerText;
      return `<h3>Q${index + 1}. ${q.prompt}</h3><p>${q.context}</p>${choices}<p><strong>Answer:</strong> ${answer}</p><p><em>${q.explanation}</em></p>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${subject} Quiz</title></head>
<body style="font-family: Arial, sans-serif; padding: 24px;">
<h1>${subject} Practice Quiz</h1>
<p>${meta.timestamp}</p>
${htmlQuestions}
</body>
</html>`;
  downloadText(`quiz-${subject}.html`, html);
}

function exportFlashcardsToCSV(subject, cards, dateLabel) {
  const rows = cards.map((card) => `"${card.front}","${card.back}"`);
  const csv = ['Front,Back', ...rows].join('\n');
  downloadText(`flashcards-${subject}-${dateLabel}.csv`, csv);
}

function downloadShareCard() {
  const card = document.getElementById('share-card');
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    fallbackShareCard();
    return;
  }

  ctx.fillStyle = '#12141b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#7c5cff';
  ctx.fillRect(80, 120, canvas.width - 160, canvas.height - 240);

  ctx.fillStyle = '#0f1117';
  ctx.fillRect(110, 160, canvas.width - 220, canvas.height - 320);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px Inter, Arial';
  ctx.fillText('Study Pack Generated', 150, 260);

  ctx.font = '32px Inter, Arial';
  ctx.fillStyle = '#cbd5f5';
  ctx.fillText(document.getElementById('share-meta').textContent, 150, 330);

  ctx.fillStyle = '#1c2230';
  ctx.fillRect(150, 380, canvas.width - 300, 180);
  ctx.fillStyle = '#ffffff';
  ctx.font = '28px Inter, Arial';
  ctx.fillText('Estimated readiness', 180, 440);
  ctx.font = 'bold 72px Inter, Arial';
  ctx.fillText(document.getElementById('readiness-score').textContent, 180, 520);

  ctx.font = 'bold 32px Inter, Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Top keywords', 150, 620);
  const keywords = Array.from(document.getElementById('share-keywords').children).map(
    (el) => el.textContent
  );
  ctx.font = '28px Inter, Arial';
  keywords.forEach((keyword, index) => {
    ctx.fillStyle = '#23283a';
    ctx.fillRect(150, 670 + index * 70, 360, 50);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(keyword, 170, 705 + index * 70);
  });

  ctx.fillStyle = '#a8b1c6';
  ctx.font = '24px Inter, Arial';
  ctx.fillText('Made with notetoquiz.com', 150, canvas.height - 180);

  canvas.toBlob((blob) => {
    if (!blob) {
      fallbackShareCard();
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'notetoquiz-share-card.png';
    link.click();
    URL.revokeObjectURL(url);
  });
}

function fallbackShareCard() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Share Card</title></head>
<body style="font-family: Arial, sans-serif; padding: 24px; background:#0f1117; color:#fff;">
<div style="max-width:400px; border-radius:20px; padding:20px; background:#151922;">
<h2>Study Pack Generated</h2>
<p>${document.getElementById('share-meta').textContent}</p>
<p>Estimated readiness: ${document.getElementById('readiness-score').textContent}</p>
<p>Top keywords: ${Array.from(document.getElementById('share-keywords').children).map((el) => el.textContent).join(', ')}</p>
<p style="color:#a8b1c6;">Made with notetoquiz.com</p>
</div>
<p style="margin-top:12px;">Tip: Take a screenshot for sharing.</p>
</body>
</html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank');
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function capitalize(word) {
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : '';
}

function summarizeSentence(sentence) {
  if (!sentence) return '';
  const cleaned = cleanBullet(sentence).replace(/\s+/g, ' ').trim();
  return cleaned.length > 120 ? `${cleaned.slice(0, 117)}...` : cleaned;
}

function extractKeywords(sentence) {
  return sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((token) => token.length >= 3)
    .filter((token) => !stopwords.has(token))
    .slice(0, 5);
}

function pickKeySentences(sentences, keywords, count) {
  const keySentences = [];
  keywords.forEach((keyword) => {
    sentences.forEach((sentence) => {
      if (sentence.toLowerCase().includes(keyword) && keySentences.length < count) {
        keySentences.push(sentence);
      }
    });
  });
  return keySentences.length ? keySentences : sentences;
}

function findKeywordInSentence(sentence, keywords) {
  const lower = sentence.toLowerCase();
  return keywords.find((keyword) => lower.includes(keyword));
}

function buildKeywordOption(keyword, sentences) {
  const match = sentences.find((sentence) => sentence.toLowerCase().includes(keyword));
  if (match) {
    return summarizeSentence(match);
  }
  const fallback = sentences.find(Boolean) || `The notes link ${keyword} to core outcomes.`;
  return `${capitalize(keyword)} connects to ${summarizeSentence(fallback)}`;
}

function buildDistractors(sentences, correctSentence, keywords, keyword, seed) {
  const rand = mulberry32(seed);
  const distractors = [];
  const candidates = sentences
    .filter((sentence) => sentence && sentence !== correctSentence)
    .map((sentence) => summarizeSentence(sentence))
    .filter(Boolean);

  candidates.forEach((candidate) => {
    if (distractors.length >= 3) return;
    if (!candidate.toLowerCase().includes(keyword.toLowerCase())) {
      distractors.push(candidate);
    }
  });

  while (distractors.length < 3) {
    const alt = keywords[Math.floor(rand() * keywords.length)] || 'another concept';
    if (alt === keyword) continue;
    const option = buildKeywordOption(alt, sentences);
    distractors.push(option);
  }

  return seededShuffle(distractors, seed).slice(0, 3);
}

function cleanBullet(sentence) {
  return sentence.replace(/^[\-•]+/g, '').replace(/\\n/g, ' ').trim();
}

function shuffleArray(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function seededShuffle(items, seed) {
  const array = [...items];
  const rand = mulberry32(seed);
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function mulberry32(seed) {
  let t = seed;
  return function () {
    t += 0x6d2b79f5;
    let result = Math.imul(t ^ (t >>> 15), 1 | t);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function createPackId(normalized, subject, difficulty, count) {
  const base = `${normalized}-${subject}-${difficulty}-${count}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash << 5) - hash + base.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function storePack(pack) {
  localStorage.setItem('lastPack', JSON.stringify(pack));
}

function loadStoredPack() {
  try {
    const stored = localStorage.getItem('lastPack');
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function init() {
  resetOutputs();
  updateShareCard();
  notesInput.dispatchEvent(new Event('input'));
  const storedPack = loadStoredPack();
  if (storedPack) {
    demoState.currentPack = storedPack;
    demoState.questionCount = storedPack.meta.questionCount || demoState.questionCount;
    if (storedPack.meta.subject) {
      $('#subject').value = storedPack.meta.subject;
    }
    if (storedPack.meta.difficulty) {
      $('#difficulty').value = storedPack.meta.difficulty;
    }
    $$('.pill').forEach((pill) => {
      pill.classList.toggle('active', Number(pill.dataset.count) === demoState.questionCount);
    });
    updateOutput();
  }
}

init();
