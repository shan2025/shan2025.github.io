// Everything about you that appears in more than one place lives here.
// Edit a value once and every page picks it up.

export const site = {
  name: 'Shadin A',
  fullName: 'Muhammed Shadin A',
  url: 'https://shadin.xyz',
  role: 'Growth Manager Trainee at Hancod',
  place: 'Malappuram, Kerala',
  email: 'shadin2266@gmail.com',
  description:
    'Shadin A writes the spec, ships the product, then checks whether it actually worked. Growth and product at Hancod, builder of FinChat.',
  links: {
    linkedin: 'https://www.linkedin.com/in/shadin-a-4a2102249',
    github: 'https://github.com/shan2025',
    // [Placeholder] Replace with your Substack address when you have one.
    substack: '',
  },
};

// The three résumés in public/resume/. Each one is tuned for a different kind of role.
export const resumes = [
  { label: 'Product', note: 'For product manager roles', href: '/resume/shadin-resume-product.pdf' },
  { label: 'AI and business analysis', note: 'For AI product and analyst roles', href: '/resume/shadin-resume-ai-ba.pdf' },
  { label: 'Business analysis', note: 'For business analyst and project roles', href: '/resume/shadin-resume-ba.pdf' },
];

// [Placeholder] The fields you care about. Each one becomes a node on the map of ideas.
// `name` is the short label on the map; `phrase` is how it reads mid-sentence; `note` shows when someone clicks it.
export const interests = [
  { id: 'fintech', name: 'Fintech', phrase: 'fintech', note: 'Where my MBA and most of my side projects meet: money, risk and the products around them.' },
  { id: 'agents', name: 'AI agents', phrase: 'AI agents', note: 'Teams of models that plan, use tools and report back on their own. FinChat runs seven.' },
  { id: 'evals', name: 'Evals', phrase: 'how to evaluate them', note: 'Deciding what “worked” means before you build, then checking the real result, not the report.' },
  { id: 'growth', name: 'Growth', phrase: 'growth and conversion', note: 'My day job at Hancod: who arrives, who stays, and what makes them act.' },
  { id: 'product', name: 'Product', phrase: 'product management', note: 'Turning a messy goal into a spec engineers can build, then measuring what shipped.' },
];
