// The "Ask anything about Shadin" box. Sends the conversation to /api/chat and shows the answer as it
// streams in. If the AI isn't available (no key yet, free quota used up, offline), it answers from the
// short built-in notes below, so a visitor always gets something true back.

(() => {
  const form = document.getElementById('ask-form');
  if (!form) return;
  const ask = form.closest('.ask');
  const input = document.getElementById('ask-input');
  const send = document.getElementById('ask-send');
  const log = document.getElementById('chat');
  const mic = document.getElementById('ask-mic');
  const fresh = document.getElementById('ask-new');
  const chipsEl = document.getElementById('ask-chips');
  const starterChips = chipsEl ? chipsEl.innerHTML : ''; // the opening suggestions, to restore on a new chat
  const EMAIL = 'shadin2266@gmail.com';
  let history = [];
  let busy = false;
  const asked = new Set(); // questions already asked, so follow-ups don't repeat them

  // ---- follow-up suggestions: after each answer, a few relevant next questions about Shadin ----
  // Matched against what was just asked and answered (same idea as the offline notes), with a general
  // pool to top up. Clicking one asks it.
  const FOLLOWUPS = [
    { keys: ['unprompter', 'unprompted', 'marketplace', 'human-made', 'human made', 'ai score', 'honest', 'working on', 'current project'], qs: ['How does its AI score work?', 'What problem does Unprompters solve?', 'When will it launch?'] },
    { keys: ['finchat', 'agent', 'plato', 'telegram', 'brief'], qs: ['What went wrong with FinChat?', 'What were FinChat’s results?', 'How is FinChat built?', 'Is FinChat live?'] },
    { keys: ['hancod', 'current', 'role now', 'growth', 'company', 'intern'], qs: ['What did he do at Hancod?', 'Is he open to new roles?', 'What are his main skills?'] },
    { keys: ['hire', 'hiring', 'open to', 'available', 'roles', 'looking', 'opportunit', 'contact', 'reach'], qs: ['What roles is he looking for?', 'Where is he based?', 'Can I see his résumé?', 'How do I contact him?'] },
    { keys: ['resume', 'résumé', 'cv'], qs: ['Is he open to new roles?', 'What has Shadin built?', 'How do I contact him?'] },
    { keys: ['certif', 'coursera', 'course', 'certificate', 'credential'], qs: ['What are his data skills?', 'Tell me about his IBM certificates', 'What has he built with AI?'] },
    { keys: ['mba', 'study', 'education', 'degree', 'university', 'college', 'bca'], qs: ['What’s his work experience?', 'What has Shadin built?', 'Is he open to new roles?'] },
    { keys: ['skill', 'tool', 'sql', 'python', 'power bi'], qs: ['What projects show these skills?', 'Tell me about FinChat', 'What are his certifications?'] },
    { keys: ['wallet', 'crypto', 'risk', 'machine learning'], qs: ['Tell me about his other projects', 'What did he build for IBM?', 'Tell me about FinChat'] },
    { keys: ['spacex', 'falcon', 'rocket', 'landing', 'capstone', 'ibm', 'dashboard'], qs: ['What other data projects has he built?', 'Tell me about the wallet risk study', 'What are his data skills?'] },
    { keys: ['interview', 'mock', 'placement', 'php', 'java', 'student'], qs: ['What else has he built?', 'Tell me about FinChat', 'What did he study?'] },
    { keys: ['project', 'projects', 'built', 'portfolio'], qs: ['What is Unprompters?', 'Tell me about FinChat', 'What’s the wallet risk study?'] },
    { keys: ['write', 'writing', 'blog', 'post', 'substack', 'article', 'chess', 'labyrinth'], qs: ['What’s his Substack about?', 'Where can I read his first post?', 'What else does he write about?'] },
    { keys: ['where', 'location', 'based', 'live', 'kerala', 'relocat'], qs: ['Is he open to relocating?', 'What roles is he looking for?', 'How do I contact him?'] },
    { keys: ['tedx', 'banquest', 'event'], qs: ['What has Shadin built?', 'What’s his work experience?'] },
    { keys: ['who', 'about', 'yourself', 'shadin'], qs: ['What has Shadin built?', 'Tell me about FinChat', 'Is he open to new roles?', 'What does he do at Hancod?'] },
  ];
  const GENERAL = ['What is he building now?', 'Tell me about FinChat', 'Is he open to new roles?', 'What are his main skills?', 'What has he written?', 'How do I reach him?'];
  const norm = (q) => q.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  const pickFollowups = (q, answer) => {
    const s = `${q} ${answer}`.toLowerCase();
    // the topics this exchange touched, best match first
    const scored = FOLLOWUPS
      .map((f) => ({ f, hits: f.keys.filter((k) => s.includes(k)).length }))
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits);
    const out = [];
    const add = (q2) => { if (out.length < 3 && !asked.has(norm(q2)) && !out.some((o) => norm(o) === norm(q2))) out.push(q2); };
    for (const { f } of scored) for (const q2 of f.qs) add(q2);
    for (const q2 of GENERAL) add(q2); // top up so there are always a few
    return out;
  };
  const renderChips = (list, follow) => {
    if (!chipsEl) return;
    chipsEl.innerHTML = list.map((q) => `<li><button type="button" class="chip">${q.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}</button></li>`).join('');
    chipsEl.classList.toggle('is-follow', !!follow);
  };

  // ---- built-in answers, used when the AI can't be reached ----
  const NOTES = [
    { keys: ['unprompter', 'unprompted', 'marketplace', 'human-made', 'human made', 'ai score', 'honest', 'current project', 'working on', 'building now', 'upcoming', 'next project'], text: 'His current project is Unprompters, still in development: a marketplace for work made by people — code, writing, art, music, design and ideas — where every listing shows an honest AI score like "3% AI, likely 2–13%, Human-made". Creators disclose where AI helped, an automatic scan can only raise that score, process proof narrows the range, and people settle disputes. It\'s not public yet; Shadin can tell you more at shadin2266@gmail.com.' },
    { keys: ['finchat', 'agent', 'plato', 'telegram', 'brief'], text: 'FinChat is a seven-agent AI platform Shadin built on his own: Plato runs the team and writes the morning brief, with agents for markets, careers, research, safety checks and memory. Results go to Telegram. After a one-day fix in August, runs went from 29% successful the week before to 100% over the next 4.5 days. Try it at https://finchat-sg.onrender.com/finchat_login.html.' },
    { keys: ['hancod', 'job', 'work now', 'current', 'role', 'growth', 'company'], text: 'Shadin is a Growth Manager Trainee at Hancod (since June 2026), owning acquisition and conversion for a live service website. Before that he was a Business Analyst intern there, writing specs for 12+ product modules and running testing through to defect closure.' },
    { keys: ['hire', 'hiring', 'open to', 'available', 'roles', 'looking', 'opportunit', 'contact', 'email', 'reach'], text: `He's open to product manager, business analyst and project manager roles in fintech, AI and technology. The best way to reach him is ${EMAIL}, and his résumés are at /resume/.` },
    { keys: ['resume', 'résumé', 'cv'], text: 'There are three versions of his résumé, for product, AI and business analysis, and business analyst roles. Download them at /resume/.' },
    { keys: ['certif', 'coursera', 'course', 'certificate', 'credential'], text: 'On Coursera he holds three IBM programme certificates: the IBM Data Science Professional Certificate (12 courses), the RAG for Generative AI Applications Specialization (4 courses) and the Applied Data Science Specialization, 16 course certificates in all. On Anthropic Academy he completed Introduction to Model Context Protocol and AI Fluency for students. Each one has a verification link on the site.' },
    { keys: ['mba', 'study', 'education', 'degree', 'university', 'college', 'bca'], text: 'He has an MBA in Financial Technology from Pondicherry University (2024 to 2026) and a BCA from Punjab Technical University (2020 to 2023).' },
    { keys: ['skill', 'tool', 'sql', 'python', 'power bi', 'know'], text: 'His core skills: requirements and specs (BRD, FRD, FSD, HFD), user stories and acceptance criteria, UAT and defect triage, Agile delivery, funnels and metrics, SQL, Power BI, Tableau, Python, and AI systems like RAG pipelines and agent workflows.' },
    { keys: ['wallet', 'crypto', 'risk', 'model', 'machine learning'], text: 'His wallet risk study built a classifier for high-risk crypto wallets. It scored 78% accuracy but caught none of the high-risk wallets, so he reported recall and ROC-AUC instead: a good example of "it ran" not meaning "it worked".' },
    { keys: ['spacex', 'falcon', 'rocket', 'landing', 'capstone', 'ibm', 'dashboard'], text: 'For his IBM Data Science capstone, Shadin predicted whether SpaceX Falcon 9 first stages land: API data, SQL analysis, a Folium map, a Plotly Dash dashboard and four classifiers. Logistic regression, SVM and KNN reached 83.3% test accuracy; the decision tree looked best in validation (88.9%) but fell to 66.7% on the test set. Code: https://github.com/shan2025/spacex-falcon9-landing-prediction' },
    { keys: ['interview', 'mock', 'placement', 'php', 'java', 'student'], text: 'His Mock Interview System is a BCA course project: a web platform where students practise technical and HR interview questions inspired by major tech companies, built with PHP, Java, HTML and CSS. Code: https://github.com/shan2025/mock-interview-system' },
    { keys: ['project', 'projects', 'built', 'portfolio'], text: 'His projects: Unprompters (his current build — a marketplace for human-made work with an honest AI score on every listing), FinChat (a seven-agent AI platform, live at https://finchat-sg.onrender.com/finchat_login.html), a crypto wallet risk study, a Falcon 9 landing prediction capstone for IBM, and a mock interview system for students.' },
    { keys: ['write', 'writing', 'blog', 'post', 'substack', 'article', 'chess', 'labyrinth'], text: 'He writes on Substack under "Labyrinth of Dreams" (https://substack.com/@shadin12) and on the site at /writing/. His first Substack post, "In a World That Moves Faster, the Art of Making Slowly?", is about what handcrafted wooden chessboards taught him about the value of human-made work in the age of AI: read it at https://substack.com/@shadin12/p-222472961. He also writes about building in public, mostly lessons from FinChat.' },
    { keys: ['where', 'location', 'based', 'live', 'kerala'], text: 'Shadin is based in Malappuram, Kerala, India, and is open to Bengaluru and other cities, hybrid, remote or on-site.' },
    { keys: ['tedx', 'banquest', 'event'], text: 'He was speaker liaison at TEDx Pondicherry University 2025 and student coordinator for BANQUEST 2024.' },
    { keys: ['who', 'about', 'yourself', 'shadin', 'hello', 'hi'], text: 'Shadin works in product and growth at Hancod and builds AI products on the side, most of all FinChat. His habit: decide what "worked" means before building, then check the real result, not the report.' },
  ];
  const offline = (q) => {
    const s = q.toLowerCase();
    if (/^\s*(hi|hii+|hello|hey|yo|hola|good (morning|afternoon|evening))\b/.test(s) && s.length < 30) {
      return 'Hi! I’m the assistant on Shadin’s site. Ask me about his work, FinChat, his other projects, or the roles he’s looking for.';
    }
    if (/how are you|how r u|what'?s up|how('?s| is) it going/.test(s)) {
      return 'Doing well, thanks for asking! I’m here to help with anything about Shadin: his projects, his experience, or how to reach him.';
    }
    if (/^\s*(thanks|thank you|thx|ty|cool|great|nice|ok(ay)?)\b/.test(s) && s.length < 30) {
      return 'Happy to help! If you’d like to talk to Shadin directly, he’s at shadin2266@gmail.com.';
    }
    let best = null, score = 0;
    for (const n of NOTES) {
      const hits = n.keys.filter((k) => s.includes(k)).length;
      if (hits > score) { best = n; score = hits; }
    }
    return best ? best.text : `I don't have an answer to that one. Shadin can tell you himself at ${EMAIL}.`;
  };

  // ---- rendering: plain text in, safe HTML out (paragraphs, simple lists, bold, links) ----
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(https?:\/\/[^\s<)]+[^\s<).,])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(\/(?:resume|writing|work)\/[\w-/]*)/g, '$1<a href="$2">$2</a>')
    .replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g, '<a href="mailto:$1">$1</a>');
  // Paragraphs and bullet lists; a lead line followed by bullets ("He's also built:\n- …") becomes both.
  const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;
  const format = (text) => text.trim().split(/\n{2,}/).map((block) => {
    const out = [];
    let para = [], items = [];
    const flush = () => {
      if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`);
      if (items.length) out.push(`<ul>${items.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>`);
      para = []; items = [];
    };
    for (const line of block.split('\n')) {
      if (BULLET.test(line)) { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } items.push(line.replace(BULLET, '')); }
      else { if (items.length) flush(); para.push(line); }
    }
    flush();
    return out.join('');
  }).join('');

  // Only the latest exchanges stay on screen; older ones fade away at the top to keep the chat short.
  // The assistant still remembers them (they stay in `history`).
  const KEEP = 4;
  const fadeOld = () => {
    const live = [...log.querySelectorAll('.msg:not(.is-leaving)')];
    for (const el of live.slice(0, Math.max(0, live.length - KEEP))) {
      el.classList.add('is-leaving');
      const gone = () => el.remove();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) gone();
      else el.addEventListener('animationend', gone, { once: true });
    }
    // once the newest question has its answer, the exchange before it dims, so the eye goes to the latest
    const kept = live.slice(-KEEP), lastAsk = kept.map((el) => el.classList.contains('msg--user')).lastIndexOf(true);
    kept.forEach((el, i) => el.classList.toggle('is-older', i < lastAsk && kept.at(-1).classList.contains('msg--bot')));
  };
  const bubble = (who, html) => {
    const el = document.createElement('div');
    el.className = `msg msg--${who}`;
    el.innerHTML = html;
    log.append(el);
    fadeOld();
    log.scrollTop = log.scrollHeight;
    return el;
  };

  const grow = () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 220)}px`;
    input.style.overflowY = input.scrollHeight > 220 ? 'auto' : 'hidden';
  };
  const ready = () => { send.disabled = busy || !input.value.trim(); };

  const askAI = async (bot) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });
    if (!res.ok || !res.body || !(res.headers.get('content-type') || '').startsWith('text/plain')) {
      const why = await res.json().catch(() => ({}));
      throw new Error(why.error || `http-${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      bot.innerHTML = format(text);
      log.scrollTop = log.scrollHeight;
    }
    if (!text.trim()) throw new Error('empty');
    return text;
  };

  const submit = async (q) => {
    q = q.trim();
    if (!q || busy) return;
    busy = true;
    ready();
    ask.classList.add('is-chatting');
    log.hidden = false;
    renderChips([], false); // tuck the suggestions away while this one is being answered
    asked.add(norm(q));
    bubble('user', format(q));
    window.dispatchEvent(new CustomEvent('brain:fire', { detail: q }));
    history.push({ role: 'user', content: q });
    input.value = '';
    grow();
    const bot = bubble('bot', '<span class="typing" aria-label="Thinking"><span></span><span></span><span></span></span>');
    form.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    let answer;
    try {
      answer = await askAI(bot);
    } catch (first) {
      // one quiet retry: a cold server or a brief provider hiccup usually clears on the second try
      console.warn('[chat] first attempt failed:', first.message);
      try {
        if (String(first.message) === 'rate-limited' || String(first.message) === 'not-configured') throw first;
        await new Promise((r) => setTimeout(r, 700));
        answer = await askAI(bot);
      } catch (err) {
        console.warn('[chat] using built-in notes:', err.message);
        answer = offline(q);
        const note = String(err.message) === 'rate-limited'
          ? 'That was a lot of questions in a short time, so this answer comes from the site’s notes.'
          : 'Answered from the site’s notes because the AI didn’t respond.';
        bot.innerHTML = `${format(answer)}<span class="msg__note">${note}</span>`;
      }
    }
    log.scrollTop = log.scrollHeight;
    window.dispatchEvent(new CustomEvent('brain:fire', { detail: answer }));
    history.push({ role: 'assistant', content: answer });
    history = history.slice(-12);
    busy = false;
    ready();
    // offer a few relevant next questions
    const next = pickFollowups(q, answer);
    if (next.length) renderChips(next, true);
    input.focus();
  };

  form.addEventListener('submit', (e) => { e.preventDefault(); submit(input.value); });
  input.addEventListener('input', () => { grow(); ready(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(input.value); }
  });
  // one delegated handler, so it keeps working as the chips are replaced with follow-ups
  if (chipsEl) chipsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip && !busy) submit(chip.textContent);
  });
  fresh.addEventListener('click', () => {
    if (busy) return;
    history = [];
    asked.clear();
    log.replaceChildren();
    log.hidden = true;
    ask.classList.remove('is-chatting');
    renderChips([], false);
    if (chipsEl) chipsEl.innerHTML = starterChips; // bring back the opening suggestions
    input.value = '';
    grow();
    ready();
    input.focus();
  });
  grow();
  ready();

  // ---- speak instead of typing, where the browser supports it ----
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (Speech) {
    mic.hidden = false;
    let rec = null;
    mic.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new Speech();
      rec.lang = 'en-IN';
      rec.interimResults = true;
      rec.onresult = (e) => {
        input.value = [...e.results].map((r) => r[0].transcript).join('');
        grow();
        ready();
      };
      rec.onend = () => { rec = null; mic.classList.remove('is-on'); if (input.value.trim()) submit(input.value); };
      rec.onerror = () => { rec = null; mic.classList.remove('is-on'); };
      mic.classList.add('is-on');
      rec.start();
    });
  }
})();
