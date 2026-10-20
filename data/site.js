// Everything personal about the site lives in this file.
// Edit the values below and the whole site updates.

export const site = {
  name: "Shan",
  initials: "S",
  role: "Software Developer · AI & Data",
  tagline: "I build AI-powered products and turn messy data into clear decisions.",
  about: [
    "I'm a developer who enjoys working where software meets data: building chat assistants on top of large language models, training models that predict real-world outcomes, and shipping apps people actually use.",
    "Lately I've been focused on retrieval-augmented AI for personal finance, machine learning for risk scoring, and tools that help people prepare for interviews.",
  ],
  location: "",
  email: "", // e.g. "hello@yourdomain.com" — shown in the Contact section when set
  links: {
    github: "https://github.com/shan2025",
    linkedin: "", // e.g. "https://www.linkedin.com/in/your-handle"
    twitter: "",
  },
  resumeUrl: "", // e.g. "/resume.pdf" after adding the file to /public

  skills: [
    { group: "Languages", items: ["Python", "JavaScript", "TypeScript", "Dart", "SQL"] },
    { group: "AI & Data", items: ["LLMs & RAG", "scikit-learn", "pandas", "NumPy", "Data visualization"] },
    { group: "Web & Mobile", items: ["React", "Next.js", "Flutter", "Node.js", "REST APIs"] },
    { group: "Tools", items: ["Git & GitHub", "Supabase", "PostgreSQL", "Jupyter", "Vercel"] },
  ],

  projects: [
    {
      name: "Finchat",
      description:
        "An AI chat assistant for personal finance. Answers questions grounded in the user's own data with retrieval-augmented generation, and includes a planning module for financial goals.",
      tags: ["AI", "RAG", "LLM", "Chat"],
      repo: "https://github.com/shan2025/Finchat",
      live: "",
      color: "#ff4fd8",
      featured: true,
    },
    {
      name: "Crypto Wallet Risk Prediction",
      description:
        "A machine learning pipeline that scores crypto wallets for risk based on their on-chain transaction behaviour.",
      tags: ["Machine Learning", "Python", "Blockchain"],
      repo: "https://github.com/shan2025/crypto-wallet-risk-prediction",
      live: "",
      color: "#22d3ee",
    },
    {
      name: "SpaceX Falcon 9 Landing Prediction",
      description:
        "Predicts whether a Falcon 9 first stage will land successfully, from data collection and EDA through to comparing classification models.",
      tags: ["Data Science", "Python", "Classification"],
      repo: "https://github.com/shan2025/spacex-falcon9-landing-prediction",
      live: "",
      color: "#fb923c",
    },
    {
      name: "Mock Interview System",
      description:
        "A practice platform that runs mock interviews and gives feedback, so candidates can rehearse before the real thing.",
      tags: ["AI", "Web App"],
      repo: "https://github.com/shan2025/mock-interview-system",
      live: "",
      color: "#a3e635",
    },
  ],
};
