// What the assistant knows. It is built from the same files as the site, so it never says anything
// the site doesn't. Add facts here (or in the content files) and the assistant picks them up.
import { getCollection } from 'astro:content';
import { site, resumes, interests } from './site';
import { certifications, courseCount } from './certifications';

export const facts = `
Name: ${site.fullName} (goes by Shadin). Based in ${site.place}, India. Email: ${site.email}. LinkedIn: ${site.links.linkedin}. GitHub: ${site.links.github}.

Current role: Growth Manager Trainee at Hancod (since June 2026): owns user acquisition and conversion for a live service website, shapes product priorities from market and customer insight, and turns business goals into build-ready requirements.
Before that: Business Analyst Intern at Hancod (March to May 2026): wrote FSDs, HFDs and FRDs for 12+ product modules, led end-to-end testing from test scenarios to defect closure, translated UI/UX designs into functional specs, ran requirement walkthroughs.

Looking for: product manager, business analyst and project manager roles in fintech, AI and technology. Open to Bengaluru and other cities, hybrid, remote or on-site.

Education: MBA in Financial Technology, Pondicherry University (2024 to 2026). BCA, Punjab Technical University, Chandigarh Group of Colleges (2020 to 2023).
Certifications (state each one's platform exactly; only those marked Coursera are on Coursera; he has 3 Coursera programme certificates and ${courseCount} Coursera course certificates, plus 2 Anthropic Academy course certificates):
${certifications.map((c) => `- ${c.name} (issued by ${c.issuer}, platform: ${c.platform}${c.date ? `, completed ${c.date}` : ''}): ${c.about}${c.url ? ` Verify: ${c.url}` : ''}${c.courses ? ` Courses completed: ${c.courses.map((k) => `${k.name} (${k.date})`).join(', ')}.` : ''}`).join('\n')}
Activities: speaker liaison at TEDx Pondicherry University 2025 (for G. Karthikeyan, founder of Sristi); student coordinator for BANQUEST 2024.
Skills: requirement gathering and documentation (BRD, FRD, FSD, HFD), user stories and acceptance criteria, UAT and defect triage, Agile/Scrum, roadmap prioritisation, funnels and metrics, SQL, Power BI, Tableau, Python (Pandas), REST APIs, PostgreSQL/MySQL, RAG pipelines, AI agent workflows, MCP tool orchestration.
Interests: ${interests.map((i) => `${i.name} (${i.note})`).join('; ')}.
Résumés (PDF downloads on ${site.url}/resume/): ${resumes.map((r) => `${r.label} (${r.note.toLowerCase()})`).join('; ')}.

FinChat, his main project: a seven-agent AI platform he built alone (Node.js, PostgreSQL, routing across several AI providers). Agents: Plato (runs the team and writes the morning brief), Aurelius (markets and watchlist), Rasha (careers and jobs), Nova (research), Sentinel (checks every action before it runs), Memory (keeps what the team learned). Scheduled missions run daily and send results to Telegram. It started as a blockchain platform with tokenomics; the AI part was what people cared about, so it became AI agents, with the blockchain kept only as an audit trail. Bring-your-own-key, so AI cost scales per user; without your own key the free tier is 25 calls on the shared key. Live at https://finchat-sg.onrender.com/finchat_login.html.
FinChat results, with their exact scope: for about a week, scheduled missions were recorded as successful while some briefs were error messages, because the old code trusted the text an agent returned. He shipped fixes in one day (18 August); delivery now checks how each run actually ended, as recorded in the database. All agent runs went from 29% successful in the 7 days before to 100% over the next 4.5 days (91 runs), and errors plus budget overruns fell from 183 to 0. Plato's mission failure rate fell from 73% to 0% after he added a paid provider (measured separately). On one benchmark run, tokens fell 37% after he found 86% went to re-reading the prompt. Do not claim these numbers mean "every run" or "still 100%".
Wallet risk study: a classifier for high-risk crypto wallets on a synthetic, imbalanced dataset (Python, scikit-learn). It scored 78% accuracy but caught none of the high-risk wallets, so the study reports recall and ROC-AUC instead. Code: https://github.com/shan2025/crypto-wallet-risk-prediction
Falcon 9 landing prediction (IBM Applied Data Science capstone): predicts whether a SpaceX Falcon 9 first stage lands. Data from the SpaceX API, cleaning, SQL (SQLite) analysis, EDA with Matplotlib and Seaborn, a Folium map of launch sites, a Plotly Dash dashboard (choose a launch site and payload range to see success rates), and four tuned classifiers. Logistic regression, SVM and KNN each got 83.3% test accuracy; the decision tree had the best cross-validation score (88.9%) but only 66.7% on the test set. Code: https://github.com/shan2025/spacex-falcon9-landing-prediction
Mock Interview System (BCA course project): a web platform for students to practise for placements with frequently asked technical and HR questions inspired by major tech companies; built with PHP, Java, HTML and CSS, with Python scripts. Planned next: an AI interviewer with feedback, a performance dashboard and adaptive difficulty. Code: https://github.com/shan2025/mock-interview-system

Unprompters (his current project, in progress, not yet launched): a marketplace for work made by people — code, websites, writing, poetry, art, photography, design, music and ideas — where every listing carries an honest AI score, for example "3% AI, likely 2–13%, Human-made". The score is built to be hard to game: creators disclose where AI helped at four stages (idea, making, editing, extras) and the score never drops below what they admit; an automatic scan can only raise it; process proof (drafts, edit history) narrows the range; and people, not machines, settle disputes. Describe it only as an ongoing project he is building. Do not share any code, repository or GitHub link for it, and do not give a website link (it is not public yet). If asked where to see it, say it is still in development and he can tell them more at ${site.email}.

For FinChat, only ever share the live link (https://finchat-sg.onrender.com/finchat_login.html). Never share or mention a FinChat code repository or GitHub link.

Substack: he writes on Substack under the publication "Labyrinth of Dreams" (profile: https://substack.com/@shadin12), essays on the things we make and why they matter. His first Substack post, published 28 October 2026, is "In a World That Moves Faster, the Art of Making Slowly?" — about what his obsession with handcrafted wooden chessboards taught him about craftsmanship and the value of human-made work in the age of AI. If someone asks to read it, share the link.
`.trim();

export async function knowledge() {
  const posts = await getCollection('writing', ({ data }) => !data.draft);
  const writing = posts
    .map((p) => {
      // for each post give its title, the page on this site, and (when it was first published elsewhere) that source and link
      const where = p.data.source
        ? ` First published on ${p.data.source}${p.data.sourceUrl ? ` — ${p.data.sourceUrl}` : ''}.`
        : '';
      return `"${p.data.title}" (${site.url}/writing/${p.id}/): ${p.data.excerpt}${where}`;
    })
    .join('\n');
  return `${facts}\n\nWriting on the site (share the link if someone wants to read a piece):\n${writing}`;
}
