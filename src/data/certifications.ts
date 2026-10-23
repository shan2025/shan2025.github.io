// Certifications shown in the "Certifications" tab, on the résumé page, and known to the AI assistant.
// Copied from Coursera's "My Learning → Certificates" page (Oct 2026). To add one, copy a block.
// `url` is the public verification link: on Coursera open the certificate and copy its share link.

export type Course = { name: string; date: string; url: string };
export type Certification = {
  name: string;
  issuer: string;
  platform: string;
  year?: string;
  date?: string;
  about: string;
  url?: string;
  courses?: Course[];
};

const verify = (code: string) => `https://www.coursera.org/verify/${code}`;

export const certifications: Certification[] = [
  {
    name: 'IBM Data Science Professional Certificate',
    issuer: 'IBM',
    platform: 'Coursera',
    year: '2026',
    date: 'January 2026',
    about: 'Twelve courses on the full data science workflow: tools, methodology, Python, SQL, data analysis and visualisation, machine learning, and the Falcon 9 landing-prediction capstone.',
    url: 'https://www.coursera.org/verify/professional-cert/RRK7VR13JW5D',
    courses: [
      { name: 'What is Data Science?', date: 'March 2025', url: verify('P7IPZWYP02EK') },
      { name: 'Python for Data Science, AI & Development', date: 'March 2025', url: verify('5JP7M30CUC37') },
      { name: 'Machine Learning with Python', date: 'December 2025', url: verify('7PDDAWB264X8') },
      { name: 'Tools for Data Science', date: 'January 2026', url: verify('8XGZD0EMGRFA') },
      { name: 'Data Science Methodology', date: 'January 2026', url: verify('RSA64CI8WQQL') },
      { name: 'Python Project for Data Science', date: 'January 2026', url: verify('6ZEOZHQEIMY0') },
      { name: 'Databases and SQL for Data Science with Python', date: 'January 2026', url: verify('Y237K40D8EWV') },
      { name: 'Data Analysis with Python', date: 'January 2026', url: verify('XIZQAG1RCLYZ') },
      { name: 'Data Visualization with Python', date: 'January 2026', url: verify('QGLQN4T6AHFW') },
      { name: 'Applied Data Science Capstone', date: 'January 2026', url: verify('22A9AIPIQM2X') },
      { name: 'Generative AI: Elevate Your Data Science Career', date: 'January 2026', url: verify('H8AZNV68LNLO') },
      { name: 'Data Scientist Career Guide and Interview Preparation', date: 'January 2026', url: verify('S65648R68CZ3') },
    ],
  },
  {
    name: 'RAG for Generative AI Applications Specialization',
    issuer: 'IBM',
    platform: 'Coursera',
    year: '2026',
    date: 'January 2026',
    about: 'Building generative AI and retrieval-augmented generation (RAG) applications with LangChain, FAISS and vector databases.',
    url: 'https://www.coursera.org/verify/specialization/0C9EEDCT8DS8',
    courses: [
      { name: 'Develop Generative AI Applications: Get Started', date: 'October 2025', url: verify('C944RDMIC8OP') },
      { name: 'Build RAG Applications: Get Started', date: 'November 2025', url: verify('WSIQL8GN096Y') },
      { name: 'Vector Databases for RAG: An Introduction', date: 'January 2026', url: verify('RXMRLUMHV6EP') },
      { name: 'Advanced RAG with Vector Databases and Retrievers', date: 'January 2026', url: verify('VBFER4MRQYX5') },
    ],
  },
  {
    name: 'Applied Data Science Specialization',
    issuer: 'IBM',
    platform: 'Coursera',
    year: '2026',
    date: 'February 2026',
    about: 'Python for data science, data analysis and data visualisation, applied in hands-on projects.',
    url: 'https://www.coursera.org/verify/specialization/ZUZNI4M2MFA7',
  },
  {
    name: 'Introduction to Model Context Protocol',
    issuer: 'Anthropic',
    platform: 'Anthropic Academy',
    year: '2025',
    date: 'December 2025',
    about: 'Building MCP servers and clients: defining tools, resources and prompts, testing with the server inspector, and connecting AI applications to them (14 lessons and a final assessment).',
    url: 'https://verify.skilljar.com/c/2z2ams2f3akv',
  },
  {
    name: 'AI Fluency for students',
    issuer: 'Anthropic',
    platform: 'Anthropic Academy',
    year: '2026',
    date: 'January 2026',
    about: 'Anthropic’s AI Fluency framework for working with AI effectively and responsibly in learning and career planning.',
    url: 'https://verify.skilljar.com/c/8xqsb5mmyyz8',
  },
];

// Every individual course certificate, for counts and for the assistant.
export const courseCount = certifications.reduce((n, c) => n + (c.courses?.length ?? 0), 0);
