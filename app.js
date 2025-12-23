const demoState = {
  questionCount: 10,
  currentTab: 'quiz',
  outputs: {
    quiz: '',
    flashcards: '',
    summary: '',
    plan: ''
  },
  keywords: [],
  readiness: 72
};

const stopwords = new Set([
  'the', 'and', 'a', 'an', 'to', 'of', 'in', 'for', 'on', 'with', 'is', 'are', 'was',
  'were', 'be', 'as', 'by', 'that', 'this', 'it', 'from', 'or', 'at', 'into', 'over',
  'after', 'before', 'about', 'their', 'them', 'they', 'we', 'you', 'your', 'our',
  'not', 'no', 'yes', 'if', 'than', 'then', 'but', 'so', 'such', 'can'
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
    const parsed = parseInput(text);
    demoState.keywords = parsed.keywords.slice(0, 8);
    demoState.readiness = computeReadinessScore(parsed);

    demoState.outputs.quiz = generateQuiz(parsed);
    demoState.outputs.flashcards = generateFlashcards(parsed);
    demoState.outputs.summary = generateSummary(parsed);
    demoState.outputs.plan = generateStudyPlan(parsed);

    updateOutput();
    progressStep.textContent = 'Done! Your study pack is ready.';
    generateBtn.disabled = false;
  }, 1700);
});

const tabs = $$('.tab');
const panels = $$('.tab-panel');

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
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});

$('#copy-output')?.addEventListener('click', () => {
  const content = demoState.outputs[demoState.currentTab];
  copyToClipboard(content);
});

$('#export-output')?.addEventListener('click', () => {
  const content = demoState.outputs[demoState.currentTab];
  const subject = $('#subject').value;
  const dateLabel = new Date().toLocaleDateString();

  if (demoState.currentTab === 'quiz') {
    exportQuizToHTML(subject, content);
  } else if (demoState.currentTab === 'flashcards') {
    exportFlashcardsToCSV(subject, content);
  } else if (demoState.currentTab === 'summary') {
    downloadText(`summary-${subject}-${dateLabel}.md`, content);
  } else {
    downloadText(`study-plan-${subject}-${dateLabel}.md`, content);
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

function parseInput(text) {
  const sentences = text
    .replace(/\n+/g, '. ')
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((token) => token && !stopwords.has(token));

  const freq = tokens.reduce((acc, token) => {
    acc[token] = (acc[token] || 0) + 1;
    return acc;
  }, {});

  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 12);

  return { tokens, keywords, sentences };
}

function generateQuiz({ keywords, sentences }) {
  const count = demoState.questionCount;
  const mcqCount = Math.max(3, Math.round(count * 0.6));
  const shortCount = count - mcqCount;
  const questions = [];

  for (let i = 0; i < mcqCount; i++) {
    const term = keywords[i % keywords.length] || 'concept';
    const sentence = sentences[i % sentences.length] || `Explain the role of ${term}.`;
    const choices = [
      `A key idea linked to ${term}`,
      `An unrelated detail about ${term}`,
      `A misconception involving ${term}`,
      `A direct definition of ${term}`
    ];
    questions.push({
      type: 'MCQ',
      prompt: `Which option best describes ${term}?`,
      context: sentence,
      choices,
      answer: 'D'
    });
  }

  for (let i = 0; i < shortCount; i++) {
    const term = keywords[(i + 3) % keywords.length] || 'topic';
    questions.push({
      type: 'Short Answer',
      prompt: `In 2-3 sentences, explain why ${term} mattered in this topic.`,
      answer: `It influenced the topic by shaping outcomes related to ${term}.`
    });
  }

  questions.push({
    type: 'Concept Check',
    prompt: `Trick question: What would change first if ${keywords[0] || 'the main idea'} disappeared?`,
    answer: 'The foundational process or system would shift, causing downstream changes.'
  });
  questions.push({
    type: 'Concept Check',
    prompt: `Trick question: Which detail looks important but is actually an effect, not a cause?`,
    answer: 'Look for the outcome or consequence mentioned later in your notes.'
  });

  return formatQuiz(questions);
}

function formatQuiz(questions) {
  const lines = ['Practice Quiz', ''];
  questions.forEach((q, index) => {
    lines.push(`${index + 1}. [${q.type}] ${q.prompt}`);
    if (q.context) {
      lines.push(`   Context: ${q.context}`);
    }
    if (q.choices) {
      q.choices.forEach((choice, idx) => {
        lines.push(`   ${String.fromCharCode(65 + idx)}. ${choice}`);
      });
    }
    lines.push('');
  });

  lines.push('Answer Key');
  questions.forEach((q, index) => {
    lines.push(`${index + 1}. ${q.answer}`);
  });

  return lines.join('\n');
}

function generateFlashcards({ keywords, sentences }) {
  const cards = [];
  for (let i = 0; i < 10; i++) {
    const term = keywords[i % keywords.length] || `Term ${i + 1}`;
    const sentence = sentences[i % sentences.length] || `Definition of ${term}.`;
    cards.push({
      term: capitalize(term),
      definition: sentence
    });
  }

  return cards
    .map((card, index) => `${index + 1}. ${card.term} — ${card.definition}`)
    .join('\n');
}

function generateSummary({ keywords, sentences }) {
  const headings = [
    `Core Ideas: ${capitalize(keywords[0] || 'Overview')}`,
    `Key Drivers: ${capitalize(keywords[1] || 'Processes')}`,
    `Outcomes: ${capitalize(keywords[2] || 'Impacts')}`
  ];

  const bullets = sentences.slice(0, 12).map((sentence) => `- ${sentence}`);

  const grouped = headings.map((heading, index) => {
    const slice = bullets.slice(index * 3, index * 3 + 4);
    return `${heading}\n${slice.join('\n')}`;
  });

  return grouped.join('\n\n');
}

function generateStudyPlan({ keywords }) {
  const topic = capitalize(keywords[0] || 'this unit');
  const plan = [
    `7-Day Study Plan for ${topic}`,
    ''
  ];

  const tasks = [
    'Review summary and highlight key terms',
    'Answer 5 quiz questions and check mistakes',
    'Drill flashcards (10 minutes)',
    'Rewrite tricky concepts in your own words',
    'Take a full practice quiz',
    'Teach a friend or record a 2-minute recap',
    'Final review + quick self-test'
  ];

  tasks.forEach((task, index) => {
    const time = 25 + index * 5;
    plan.push(`Day ${index + 1}: ${task} (${time} min)`);
  });

  plan.push('\nSpacing tip: Revisit top keywords every other day.');

  return plan.join('\n');
}

function computeReadinessScore({ tokens, keywords }) {
  const lengthScore = Math.min(60, tokens.length / 4);
  const diversityScore = Math.min(40, keywords.length * 3);
  return Math.round(50 + (lengthScore + diversityScore) / 2);
}

function updateOutput() {
  $('#tab-quiz').innerHTML = formatAsHtml(demoState.outputs.quiz);
  $('#tab-flashcards').innerHTML = formatAsHtml(demoState.outputs.flashcards);
  $('#tab-summary').innerHTML = formatAsHtml(demoState.outputs.summary);
  $('#tab-plan').innerHTML = formatAsHtml(demoState.outputs.plan);
  $('#timestamp').textContent = `Generated from your notes • ${new Date().toLocaleString()}`;
  updateShareCard();
}

function showSkeleton() {
  panels.forEach((panel) => {
    panel.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton short"></div>';
  });
}

function resetOutputs() {
  demoState.outputs = { quiz: '', flashcards: '', summary: '', plan: '' };
  panels.forEach((panel) => {
    panel.innerHTML = '<p class="muted">Generate a study pack to see results here.</p>';
  });
  $('#timestamp').textContent = 'Generated from your notes • —';
}

function formatAsHtml(text) {
  if (!text) {
    return '<p class="muted">Generate a study pack to see results here.</p>';
  }
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('- ')) {
        return `<li>${line.replace('- ', '')}</li>`;
      }
      if (/^\d+\./.test(line)) {
        return `<p><strong>${line}</strong></p>`;
      }
      if (line.endsWith(':')) {
        return `<h4>${line}</h4>`;
      }
      return `<p>${line}</p>`;
    })
    .join('');
}

function updateShareCard() {
  const subject = $('#subject').value;
  const difficulty = $('#difficulty').value;
  $('#share-meta').textContent = `${subject} • ${difficulty} • ${demoState.questionCount} Questions`;
  $('#readiness-score').textContent = `${demoState.readiness}%`;
  const keywordContainer = $('#share-keywords');
  keywordContainer.innerHTML = '';
  demoState.keywords.slice(0, 3).forEach((word) => {
    const span = document.createElement('span');
    span.textContent = capitalize(word);
    keywordContainer.appendChild(span);
  });
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

function exportQuizToHTML(subject, content) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${subject} Quiz</title></head>
<body style="font-family: Arial, sans-serif; padding: 24px;">
<pre style="white-space: pre-wrap;">${content}</pre>
</body>
</html>`;
  downloadText(`quiz-${subject}.html`, html);
}

function exportFlashcardsToCSV(subject, content) {
  const rows = content.split('\n').filter(Boolean).map((line) => {
    const parts = line.split('—');
    return `"${parts[0]?.replace(/\d+\.\s/, '').trim()}","${parts[1]?.trim() || ''}"`;
  });
  const csv = ['Term,Definition', ...rows].join('\n');
  downloadText(`flashcards-${subject}.csv`, csv);
}

function downloadShareCard() {
  const card = document.getElementById('share-card');
  const rect = card.getBoundingClientRect();
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

function init() {
  resetOutputs();
  updateShareCard();
  notesInput.dispatchEvent(new Event('input'));
}

init();
