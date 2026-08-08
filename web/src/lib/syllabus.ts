// JAMB/UTME syllabus hub data model.
//
// Source: the TECHMED UTME 2027 SEO Resource Architecture brief — subject
// names, TECHMED's own stage groupings, every topic title, Use of
// English's real exam-structure table and required text ("The Lekki
// Headmaster") are all reproduced verbatim from that brief. Nothing here
// is invented. Per-topic deep content (why it matters, common traps,
// historical yield estimates) was NOT supplied beyond a single dependency
// note for Chemistry, so individual topic pages are not built yet — see
// getSyllabusTopics() below, which is intentionally content-less until
// real guidance exists per topic.
//
// Same fetchSanity + fallback pattern as resources.ts: once `subject`
// documents are published in Sanity, they take over automatically.
import { fetchSanity } from './sanity';

export interface SubjectTopicOutline {
  title: string;
  /** Set only once this topic has its own syllabusTopic document to link to. */
  slug?: string;
}

export interface SubjectStage {
  name: string;
  order: number;
  topics: SubjectTopicOutline[];
}

export interface ExamSection {
  section: string;
  area: string;
  questions: number;
}

export interface Subject {
  name: string;
  slug: string;
  description: string;
  order: number;
  /** Official JAMB topic count, where the subject is organized by numbered topics. */
  topicCount?: number;
  /** Only filled in where TECHMED has actually documented this — not guessed per subject. */
  keyDependencies?: string;
  stages: SubjectStage[];
  /** Use of English only: JAMB's published section/question breakdown. */
  examStructure?: ExamSection[];
  /** Use of English only. */
  requiredText?: string;
  /** Slug of a matching product in the resource catalogue, if one exists. */
  relatedResourceSlug?: string;
  /** Roadmap preview image asset URL, once uploaded in Sanity. Absent until then — the page shows a placeholder instead. */
  previewImage?: string;
  /** Guide document (PDF) asset URL, once uploaded in Sanity. Absent until the real document is ready. */
  guideFileUrl?: string;
}

export interface SyllabusTopic {
  title: string;
  slug: string;
  subjectSlug: string;
  officialScope?: string;
  whyThisMatters?: string;
  beforeYouStart?: string;
  thisTopicUnlocks?: string;
  commonTraps?: string[];
  historicalAnalysis?: string;
  /** Includes the related topic's own subject slug — needed to build its /jamb-syllabus/<subject>/<topic> link, since a related topic isn't necessarily in the same subject. */
  relatedTopics?: { title: string; slug: string; subjectSlug: string }[];
  relatedResourceSlugs?: string[];
  practiceUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export const FALLBACK_SUBJECTS: Subject[] = [
  {
    name: 'Chemistry',
    slug: 'chemistry',
    description:
      "The official JAMB Chemistry syllabus covers 18 topics. TECHMED's Chemistry Blueprint reorganizes them into five conceptual stages so preparation follows a clear dependency order rather than the syllabus's original sequence.",
    order: 1,
    topicCount: 18,
    keyDependencies:
      'Chemical Combination (the Mole Concept) and Atomic Structure & Bonding are identified as major dependency points — most later Chemistry topics build on them.',
    relatedResourceSlug: 'chemistry-booster-system',
    stages: [
      {
        name: '01 — Foundations',
        order: 1,
        topics: [
          { title: 'Separation of Mixtures & Purification' },
          { title: 'Chemical Combination' },
          { title: 'Kinetic Theory & Gas Laws' },
          { title: 'Atomic Structure & Bonding' },
        ],
      },
      {
        name: '02 — Quantitative Core',
        order: 2,
        topics: [
          { title: 'Air' },
          { title: 'Water' },
          { title: 'Solubility' },
          { title: 'Environmental Pollution' },
          { title: 'Acids, Bases & Salts' },
        ],
      },
      {
        name: '03 — Reactions & Energy',
        order: 3,
        topics: [
          { title: 'Oxidation & Reduction' },
          { title: 'Electrolysis' },
          { title: 'Energy Changes' },
          { title: 'Rates of Chemical Reaction' },
          { title: 'Chemical Equilibrium' },
        ],
      },
      {
        name: '04 — Applied Inorganic',
        order: 4,
        topics: [{ title: 'Non-metals & Their Compounds' }, { title: 'Metals & Their Compounds' }],
      },
      {
        name: '05 — Organic & Industry',
        order: 5,
        topics: [{ title: 'Organic Compounds' }, { title: 'Chemistry & Industry' }],
      },
    ],
  },
  {
    name: 'Physics',
    slug: 'physics',
    description:
      "The official JAMB Physics syllabus contains 38 numbered topics, from Measurements & Units through to Atomic & Nuclear Physics, emphasizing conceptual interpretation and quantitative problem-solving. TECHMED reorganizes them into eight stages.",
    order: 2,
    topicCount: 38,
    relatedResourceSlug: 'physics-booster-system',
    stages: [
      { name: '01 — Foundations', order: 1, topics: [{ title: 'Measurements & Units' }, { title: 'Scalars & Vectors' }] },
      {
        name: '02 — Mechanics',
        order: 2,
        topics: [
          { title: 'Motion' },
          { title: 'Gravitational Field' },
          { title: 'Equilibrium of Forces' },
          { title: 'Work, Energy & Power' },
          { title: 'Friction' },
          { title: 'Simple Machines' },
          { title: 'Elasticity' },
        ],
      },
      { name: '03 — Fluids', order: 3, topics: [{ title: 'Pressure' }, { title: 'Liquids at Rest' }] },
      {
        name: '04 — Heat & Thermal Physics',
        order: 4,
        topics: [
          { title: 'Temperature' },
          { title: 'Thermal Expansion' },
          { title: 'Gas Laws' },
          { title: 'Quantity of Heat' },
          { title: 'Change of State' },
          { title: 'Vapours' },
          { title: 'Structure of Matter & Kinetic Theory' },
          { title: 'Heat Transfer' },
        ],
      },
      {
        name: '05 — Waves, Sound & Light',
        order: 5,
        topics: [
          { title: 'Waves' },
          { title: 'Propagation of Sound' },
          { title: 'Characteristics of Sound' },
          { title: 'Light Energy' },
          { title: 'Reflection' },
          { title: 'Refraction' },
          { title: 'Optical Instruments' },
          { title: 'Dispersion & Electromagnetic Spectrum' },
        ],
      },
      {
        name: '06 — Electricity',
        order: 6,
        topics: [
          { title: 'Electrostatics' },
          { title: 'Capacitors' },
          { title: 'Electric Cells' },
          { title: 'Current Electricity' },
          { title: 'Electrical Energy & Power' },
        ],
      },
      {
        name: '07 — Magnetism & Electromagnetism',
        order: 7,
        topics: [
          { title: 'Magnets & Magnetic Fields' },
          { title: 'Force on Current-Carrying Conductors' },
          { title: 'Electromagnetic Induction' },
          { title: 'A.C. Circuits' },
        ],
      },
      { name: '08 — Modern Physics', order: 8, topics: [{ title: 'Electronics' }, { title: 'Atomic & Nuclear Physics' }] },
    ],
  },
  {
    name: 'Biology',
    slug: 'biology',
    description:
      "The official JAMB Biology syllabus is organized around the diversity, interdependence and unity of life; continuity through inheritance and evolution; and the application of Biology to living things, society, health and the environment. TECHMED reorganizes it into five stages.",
    order: 3,
    topicCount: 22,
    relatedResourceSlug: 'biology-booster-system',
    stages: [
      {
        name: '01 — Foundations of Life',
        order: 1,
        topics: [
          { title: 'Living Organisms' },
          { title: 'Evolution Among Taxonomic Groups' },
          { title: 'Variety of Organisms' },
          { title: 'Internal Structure of Flowering Plants & Mammals' },
        ],
      },
      {
        name: '02 — Form & Function I: Sustaining Life',
        order: 2,
        topics: [{ title: 'Nutrition' }, { title: 'Transport' }, { title: 'Respiration' }, { title: 'Excretion' }],
      },
      {
        name: '03 — Form & Function II: Continuing Life',
        order: 3,
        topics: [
          { title: 'Support & Movement' },
          { title: 'Reproduction' },
          { title: 'Growth' },
          { title: 'Coordination & Control' },
        ],
      },
      {
        name: '04 — Ecology',
        order: 4,
        topics: [
          { title: 'Factors Affecting Distribution' },
          { title: 'Symbiotic Interactions & Energy Flow' },
          { title: 'Natural Habitats' },
          { title: 'Local Nigerian Biomes' },
          { title: 'Ecology of Populations' },
          { title: 'Soil' },
          { title: 'Humans & Environment' },
        ],
      },
      {
        name: '05 — Heredity, Variation & Evolution',
        order: 5,
        topics: [
          { title: 'Variation in Population' },
          { title: 'Heredity' },
          { title: 'Theories & Evidence of Evolution' },
        ],
      },
    ],
  },
  {
    name: 'Mathematics',
    slug: 'mathematics',
    description:
      "TECHMED reorganizes the 23 official JAMB Mathematics topics by conceptual dependency rather than JAMB's original sectional arrangement.",
    order: 4,
    topicCount: 23,
    stages: [
      {
        name: '01 — Foundations & Number Sense',
        order: 1,
        topics: [
          { title: 'Number Bases' },
          { title: 'Fractions, Decimals, Approximations & Percentages' },
          { title: 'Indices, Logarithms & Surds' },
          { title: 'Sets' },
        ],
      },
      {
        name: '02 — Algebra & Functions',
        order: 2,
        topics: [
          { title: 'Polynomials' },
          { title: 'Variation' },
          { title: 'Inequalities' },
          { title: 'Progression' },
          { title: 'Binary Operations' },
          { title: 'Matrices & Determinants' },
        ],
      },
      {
        name: '03 — Geometry, Trigonometry & Spatial Reasoning',
        order: 3,
        topics: [
          { title: 'Euclidean Geometry' },
          { title: 'Mensuration' },
          { title: 'Loci' },
          { title: 'Coordinate Geometry' },
          { title: 'Trigonometry' },
        ],
      },
      {
        name: '04 — Calculus & Mathematical Modelling',
        order: 4,
        topics: [{ title: 'Differentiation' }, { title: 'Application of Differentiation' }, { title: 'Integration' }],
      },
      {
        name: '05 — Statistics & Probability',
        order: 5,
        topics: [
          { title: 'Representation of Data' },
          { title: 'Measures of Location' },
          { title: 'Measures of Dispersion' },
          { title: 'Permutation & Combination' },
          { title: 'Probability' },
        ],
      },
    ],
  },
  {
    name: 'Use of English',
    slug: 'use-of-english',
    description:
      "JAMB's Use of English exam is primarily a language-skills progression rather than a conventional chapter-based subject, examined across Comprehension/Summary, Lexis & Structure and Oral Forms. TECHMED's skill roadmap breaks this into five stages.",
    order: 5,
    requiredText: 'The Lekki Headmaster',
    examStructure: [
      { section: 'A', area: 'Comprehension Passage', questions: 5 },
      { section: 'A', area: 'Cloze Passage', questions: 10 },
      { section: 'A', area: 'Reading Text — The Lekki Headmaster', questions: 10 },
      { section: 'B', area: 'Sentence Interpretation', questions: 5 },
      { section: 'B', area: 'Antonyms', questions: 5 },
      { section: 'B', area: 'Synonyms', questions: 5 },
      { section: 'B', area: 'Sentence Completion', questions: 10 },
      { section: 'C', area: 'Oral Forms', questions: 10 },
    ],
    stages: [
      {
        name: '01 — Reading & Understanding',
        order: 1,
        topics: [
          { title: 'Comprehension' },
          { title: 'Summary' },
          { title: 'Main Ideas' },
          { title: 'Implied Meaning' },
          { title: "Writer's Attitude" },
          { title: 'Inference' },
          { title: 'Logical Reasoning' },
        ],
      },
      {
        name: '02 — Vocabulary & Meaning',
        order: 2,
        topics: [
          { title: 'Synonyms' },
          { title: 'Antonyms' },
          { title: 'Homonyms' },
          { title: 'Idioms' },
          { title: 'Figurative Meaning' },
          { title: 'Contextual Meaning' },
          { title: 'Lexical Relationships' },
        ],
      },
      {
        name: '03 — Grammar & Sentence Mastery',
        order: 3,
        topics: [
          { title: 'Word Classes' },
          { title: 'Sentence Patterns' },
          { title: 'Clauses' },
          { title: 'Concord' },
          { title: 'Tense' },
          { title: 'Aspect' },
          { title: 'Mood' },
          { title: 'Agreement' },
          { title: 'Question Tags' },
          { title: 'Punctuation' },
          { title: 'Spelling' },
          { title: 'Sentence Completion' },
          { title: 'Sentence Interpretation' },
        ],
      },
      {
        name: '04 — Spoken English',
        order: 4,
        topics: [
          { title: 'Vowels' },
          { title: 'Diphthongs' },
          { title: 'Consonants' },
          { title: 'Consonant Clusters' },
          { title: 'Homophones' },
          { title: 'Stress' },
          { title: 'Intonation' },
        ],
      },
      {
        name: '05 — Exam Application',
        order: 5,
        topics: [
          { title: 'Required Reading Text' },
          { title: 'Examination Structure' },
          { title: 'Question Distribution' },
          { title: 'Section Strategy' },
        ],
      },
    ],
  },
];

const SUBJECT_QUERY = `*[_type == "subject"] | order(order asc) {
  name,
  "slug": slug.current,
  description,
  order,
  topicCount,
  keyDependencies,
  relatedResourceSlug,
  stages[] { name, order, topics[] { title, slug } },
  examStructure[] { section, area, questions },
  requiredText,
  "previewImage": previewImage.asset->url,
  "guideFileUrl": guideFile.asset->url
}`;

export async function getSubjects(): Promise<Subject[]> {
  return fetchSanity<Subject[]>(SUBJECT_QUERY, FALLBACK_SUBJECTS);
}

export async function getSubjectBySlug(slug: string): Promise<Subject | undefined> {
  const subjects = await getSubjects();
  return subjects.find((subject) => subject.slug === slug);
}

// No fallback on purpose — no real per-topic deep-dive content has been
// supplied yet (beyond Chemistry's single dependency note, already
// captured on the subject itself). An empty result here means the
// /jamb-syllabus/[subject]/[topic] route builds zero pages, which is the
// correct behaviour until genuine content exists per topic.
const SYLLABUS_TOPIC_QUERY = `*[_type == "syllabusTopic"] {
  title,
  "slug": slug.current,
  "subjectSlug": subject->slug.current,
  officialScope,
  whyThisMatters,
  beforeYouStart,
  thisTopicUnlocks,
  commonTraps,
  historicalAnalysis,
  relatedTopics[]-> { title, "slug": slug.current, "subjectSlug": subject->slug.current },
  "relatedResourceSlugs": relatedResources[]->slug.current,
  practiceUrl,
  metaTitle,
  metaDescription
}`;

export async function getSyllabusTopics(): Promise<SyllabusTopic[]> {
  return fetchSanity<SyllabusTopic[]>(SYLLABUS_TOPIC_QUERY, []);
}

export async function getSyllabusTopic(subjectSlug: string, topicSlug: string): Promise<SyllabusTopic | undefined> {
  const topics = await getSyllabusTopics();
  return topics.find((topic) => topic.subjectSlug === subjectSlug && topic.slug === topicSlug);
}
