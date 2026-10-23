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
  const EMAIL = 'shadin2266@gmail.com';
  let history = [];
  let busy = false;

  // ---- built-in answers, used when the AI can't be reached ----
  const NOTES = [
    { keys: ['finchat', 'agent', 'plato', 'telegram', 'brief'], text: 'FinChat is a seven-agent AI platform Shadin built on his own: Plato runs the team and writes the morning brief, with agents for markets, careers, research, safety checks and memory. Results go to Telegram. After a one-day fix in August, runs went from 29% successful the week before to 100% over the next 4.5 days. Try it at https://finchat-6.onrender.com.' },
    { keys: ['hancod', 'job', 'work now', 'current', 'role', 'growth', 'company'], text: 'Shadin is a Growth Manager Trainee at Hancod (since June 2026), owning acquisition and conversion for a live service website. Before that he was a Business Analyst intern there, writing specs for 12+ product modules and running testing through to defect closure.' },
    { keys: ['hire', 'hiring', 'open to', 'available', 'roles', 'looking', 'opportunit', 'contact', 'email', 'reach'], text: `He's open to product manager, business analyst and project manager roles in fintech, AI and technology. The best way to reach him is ${EMAIL}, and his résumés are at /resume/.` },
    { keys: ['resume', 'résumé', 'cv'], text: 'There are three versions of his résumé, for product, AI and business analysis, and business analyst roles. Download them at /resume/.' },
    { keys: ['mba', 'study', 'education', 'degree', 'university', 'college', 'bca'], text: 'He has an MBA in Financial Technology from Pondicherry University (2024 to 2026) and a BCA from Punjab Technical University (2020 to 2023).' },
    { keys: ['skill', 'tool', 'sql', 'python', 'power bi', 'know'], text: 'His core skills: requirements and specs (BRD, FRD, FSD, HFD), user stories and acceptance criteria, UAT and defect triage, Agile delivery, funnels and metrics, SQL, Power BI, Tableau, Python, and AI systems like RAG pipelines and agent workflows.' },
    { keys: ['wallet', 'crypto', 'risk', 'model', 'machine learning'], text: 'His wallet risk study built a classifier for high-risk crypto wallets. It scored 78% accuracy but caught none of the high-risk wallets, so he reported recall and ROC-AUC instead: a good example of "it ran" not meaning "it worked".' },
    { keys: ['write', 'writing', 'blog', 'post', 'substack', 'article'], text: 'He writes about building in public, mostly what he learned from FinChat. Start with "Status is not the outcome" at /writing/.' },
    { keys: ['where', 'location', 'based', 'live', 'kerala'], text: 'Shadin is based in Malappuram, Kerala, India, and is open to Bengaluru and other cities, hybrid, remote or on-site.' },
    { keys: ['tedx', 'banquest', 'event'], text: 'He was speaker liaison at TEDx Pondicherry University 2025 and student coordinator for BANQUEST 2024.' },
    { keys: ['who', 'about', 'yourself', 'shadin', 'hello', 'hi'], text: 'Shadin works in product and growth at Hancod and builds AI products on the side, most of all FinChat. His habit: decide what "worked" means before building, then check the real result, not the report.' },
  ];
  const offline = (q) => {
    const s = q.toLowerCase();
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
  const format = (text) => text.trim().split(/\n{2,}/).map((block) => {
    const lines = block.split('\n');
    if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*•]\s+/, ''))}</li>`).join('')}</ul>`;
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('');

  const bubble = (who, html) => {
    const el = document.createElement('div');
    el.className = `msg msg--${who}`;
    el.innerHTML = html;
    log.append(el);
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
    bubble('user', format(q));
    history.push({ role: 'user', content: q });
    input.value = '';
    grow();
    const bot = bubble('bot', '<span class="typing" aria-label="Thinking"><span></span><span></span><span></span></span>');
    let answer;
    try {
      answer = await askAI(bot);
    } catch (err) {
      answer = offline(q);
      const note = String(err.message) === 'rate-limited'
        ? 'That was a lot of questions in a short time, so this answer comes from the site’s notes.'
        : 'Answered from the site’s notes while the AI is unavailable.';
      bot.innerHTML = `${format(answer)}<span class="msg__note">${note}</span>`;
    }
    history.push({ role: 'assistant', content: answer });
    history = history.slice(-12);
    busy = false;
    ready();
    input.focus();
  };

  form.addEventListener('submit', (e) => { e.preventDefault(); submit(input.value); });
  input.addEventListener('input', () => { grow(); ready(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(input.value); }
  });
  document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => submit(c.textContent)));
  fresh.addEventListener('click', () => {
    if (busy) return;
    history = [];
    log.replaceChildren();
    log.hidden = true;
    ask.classList.remove('is-chatting');
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
