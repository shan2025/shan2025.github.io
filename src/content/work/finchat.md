---
name: FinChat
kind: Solo product, live
order: 1
ran: A seven-agent AI platform that runs scheduled missions every day and sends the results to Telegram. Node.js, PostgreSQL, routing across several AI providers, and bring-your-own-key so AI cost scales per user.
worked: I shipped the fixes in a day. Runs went from 29% successful the week before to 100% over the next 4.5 days, 91 runs in all, and errors and budget overruns fell from 183 to none. Plato’s mission failure rate fell from 73% to 0% after I added a paid provider. On a benchmark run, tokens fell 37% once I found 86% of them went to re-reading the prompt.
link: https://finchat-sg.onrender.com/finchat_login.html
linkLabel: Open FinChat
stack: [Node.js, PostgreSQL, Groq, Gemini, DeepSeek, Telegram]
---

## Why it exists

FinChat started as a blockchain platform. Version 1 had tokenomics, smart governance and an AI system watching every conversation, all anchored on the chain. It looked great on a whiteboard, but the part people actually cared about was the AI, the piece I had built on the side. So I followed that signal:

- The token economy became **AI budgets** that keep costs predictable.
- The AI monitor became **a team of specialist agents**, each with one job.
- The blockchain stayed, but only as a **tamper-proof audit trail**.

## The team

Seven agents, each with its own role, model, risk level and personality:

- **Plato**, Chief AI Officer: runs the team and writes the morning brief.
- **Aurelius**: finance and startups.
- **Atlas**: looks after your portfolio.
- **Rasha**: career strategy and new openings.
- **Nova**: research at the frontier of science and technology.
- **Hopper**: diagnoses the system when another agent fails.
- **Feynman**: explains things and tutors.

Missions run on a schedule every day and the results arrive on Telegram. Each agent keeps an audit log, so you can see what it ran and when.

## How it keeps costs down

You bring your own AI key, so the cost of AI scales with each user instead of landing on me. New users get 25 calls on a shared key to try it first. Each agent can be pinned to a model: a larger one that reasons harder but bills more tokens, or a smaller one for chattier agents. Left on the default, an agent whose daily quota runs out falls through to another provider instead of stopping.

On one benchmark run I found that 86% of the tokens went to re-reading the prompt. Fixing that cut tokens by 37%.

## The bug that taught me the most

For about a week, scheduled missions were recorded as successful while some of the briefs they sent were error messages. The old code trusted whatever text an agent handed back. When I checked what was actually delivered, Plato's missions were failing 73% of the time.

The fix, shipped in one day, makes delivery check how each run actually ended, as recorded in the database. Runs went from 29% successful in the week before to 100% over the next four and a half days (91 runs), and errors and budget overruns fell from 183 to none. Plato's failure rate went to 0% once I added a paid provider.

Building AI is getting easier. Knowing whether it actually worked is the hard part. I wrote about it in [Status is not the outcome](/writing/ran-is-not-worked/) and [From blockchain to AI agents](/writing/from-blockchain-to-ai-agents/).
