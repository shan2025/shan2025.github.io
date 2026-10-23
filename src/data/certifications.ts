// Certifications shown in the "Certifications" tab, on the résumé page, and known to the AI assistant.
// To add one, copy a block. `url` is the certificate's verification link (on Coursera: open the certificate
// and copy its "Share" link); leave it out if you don't have one.

export type Certification = {
  name: string;
  issuer: string;
  platform: string;
  year?: string;
  about: string;
  url?: string;
};

export const certifications: Certification[] = [
  {
    name: 'IBM Data Science Professional Certificate',
    issuer: 'IBM',
    platform: 'Coursera',
    about: 'Machine learning pipelines, data analysis and dashboards in Python and SQL, ending in the Falcon 9 landing-prediction capstone.',
  },
  {
    name: 'RAG for Generative AI Applications Specialization',
    issuer: 'IBM',
    platform: 'Coursera',
    about: 'Retrieval-augmented generation systems with LangChain, FAISS and vector databases.',
  },
  {
    name: 'Python for Data Science, AI & Development',
    issuer: 'IBM',
    platform: 'Coursera',
    year: '2025',
    about: 'Python fundamentals for data work: data structures, Pandas, NumPy, APIs and web scraping.',
  },
  {
    name: 'Introduction to Model Context Protocol',
    issuer: 'Anthropic',
    platform: 'Anthropic',
    about: 'Tool orchestration for multi-step AI workflows with the Model Context Protocol.',
  },
];
