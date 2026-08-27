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
  /**
   * Estimated share of the exam this topic carries, from the TECHMED
   * Blueprint's per-topic yield badges (e.g. "HIGH YIELD · ~4-5 of 40").
   * A directional guide only, not an official JAMB figure. Absent where
   * the Blueprint doesn't (yet) cover this topic in that detail -- never
   * guessed to fill a gap.
   */
  examWeight?: { min: number; max: number; tier: 'foundational' | 'low' | 'medium' | 'high' };
  /**
   * Titles of other topics in the same subject this one depends on, from
   * the Blueprint's "Before You Start" guidance -- only the dependencies
   * stated as required, not topics noted as merely "helps." Absent/empty
   * means this is a valid starting point (or one of several) within its
   * stage, matching the Blueprint's own "Nothing -- this is a good place
   * to start" framing.
   */
  prerequisites?: string[];
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
          { title: 'Separation of Mixtures & Purification', examWeight: { min: 2, max: 3, tier: 'medium' } },
          { title: 'Chemical Combination', examWeight: { min: 4, max: 5, tier: 'high' } },
          {
            title: 'Kinetic Theory & Gas Laws',
            examWeight: { min: 3, max: 4, tier: 'medium' },
            prerequisites: ['Chemical Combination'],
          },
          { title: 'Atomic Structure & Bonding', examWeight: { min: 6, max: 7, tier: 'high' } },
        ],
      },
      {
        name: '02 — Quantitative Core',
        order: 2,
        topics: [
          {
            title: 'Air',
            examWeight: { min: 1, max: 2, tier: 'foundational' },
            prerequisites: ['Separation of Mixtures & Purification', 'Atomic Structure & Bonding'],
          },
          { title: 'Water', examWeight: { min: 2, max: 3, tier: 'medium' } },
          {
            title: 'Solubility',
            examWeight: { min: 2, max: 3, tier: 'medium' },
            prerequisites: ['Water', 'Chemical Combination'],
          },
          {
            title: 'Environmental Pollution',
            examWeight: { min: 1, max: 2, tier: 'foundational' },
            prerequisites: ['Air', 'Water'],
          },
          {
            title: 'Acids, Bases & Salts',
            examWeight: { min: 4, max: 5, tier: 'high' },
            prerequisites: ['Chemical Combination', 'Atomic Structure & Bonding'],
          },
        ],
      },
      {
        name: '03 — Reactions & Energy',
        order: 3,
        topics: [
          {
            title: 'Oxidation & Reduction',
            examWeight: { min: 3, max: 4, tier: 'medium' },
            prerequisites: ['Atomic Structure & Bonding'],
          },
          {
            title: 'Electrolysis',
            examWeight: { min: 3, max: 4, tier: 'medium' },
            prerequisites: ['Oxidation & Reduction'],
          },
          {
            title: 'Energy Changes',
            examWeight: { min: 2, max: 3, tier: 'medium' },
            prerequisites: ['Chemical Combination'],
          },
          { title: 'Rates of Chemical Reaction', examWeight: { min: 3, max: 4, tier: 'medium' } },
          {
            title: 'Chemical Equilibrium',
            examWeight: { min: 2, max: 3, tier: 'medium' },
            prerequisites: ['Rates of Chemical Reaction', 'Acids, Bases & Salts'],
          },
        ],
      },
      {
        name: '04 — Applied Inorganic',
        order: 4,
        topics: [
          {
            title: 'Non-metals & Their Compounds',
            examWeight: { min: 5, max: 6, tier: 'high' },
            prerequisites: ['Oxidation & Reduction', 'Electrolysis', 'Kinetic Theory & Gas Laws'],
          },
          {
            title: 'Metals & Their Compounds',
            examWeight: { min: 5, max: 6, tier: 'high' },
            prerequisites: ['Non-metals & Their Compounds', 'Oxidation & Reduction', 'Electrolysis'],
          },
        ],
      },
      {
        name: '05 — Organic & Industry',
        order: 5,
        topics: [
          {
            title: 'Organic Compounds',
            examWeight: { min: 8, max: 9, tier: 'high' },
            prerequisites: ['Atomic Structure & Bonding', 'Chemical Combination'],
          },
          {
            title: 'Chemistry & Industry',
            examWeight: { min: 1, max: 2, tier: 'foundational' },
            prerequisites: ['Organic Compounds', 'Metals & Their Compounds'],
          },
        ],
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
      {
        name: '01 — Foundations',
        order: 1,
        topics: [
          { title: 'Measurements & Units', examWeight: { min: 2, max: 3, tier: 'foundational' } },
          { title: 'Scalars & Vectors', examWeight: { min: 3, max: 4, tier: 'high' } },
        ],
      },
      {
        name: '02 — Mechanics',
        order: 2,
        topics: [
          { title: 'Motion', examWeight: { min: 4, max: 5, tier: 'high' }, prerequisites: ['Scalars & Vectors'] },
          { title: 'Gravitational Field', examWeight: { min: 2, max: 3, tier: 'medium' }, prerequisites: ['Motion'] },
          {
            title: 'Equilibrium of Forces',
            examWeight: { min: 3, max: 4, tier: 'high' },
            prerequisites: ['Scalars & Vectors', 'Motion'],
          },
          {
            title: 'Work, Energy & Power',
            examWeight: { min: 4, max: 5, tier: 'high' },
            prerequisites: ['Motion', 'Equilibrium of Forces'],
          },
          {
            title: 'Friction',
            examWeight: { min: 2, max: 3, tier: 'medium' },
            prerequisites: ['Equilibrium of Forces', 'Work, Energy & Power'],
          },
          {
            title: 'Simple Machines',
            examWeight: { min: 2, max: 3, tier: 'medium' },
            prerequisites: ['Work, Energy & Power', 'Friction'],
          },
          {
            title: 'Elasticity',
            examWeight: { min: 2, max: 3, tier: 'medium' },
            prerequisites: ['Work, Energy & Power'],
          },
        ],
      },
      // Fluids: the source Blueprint's per-topic yield/prerequisite detail
      // for this stage was never written (confirmed absent from the
      // underlying document, not just unread) -- topics kept, extra
      // fields left off rather than guessed.
      { name: '03 — Fluids', order: 3, topics: [{ title: 'Pressure' }, { title: 'Liquids at Rest' }] },
      // Heat & Thermal Physics: same gap as Fluids above.
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
          { title: 'Waves', examWeight: { min: 3, max: 4, tier: 'high' }, prerequisites: ['Motion'] },
          { title: 'Propagation of Sound', examWeight: { min: 2, max: 3, tier: 'medium' }, prerequisites: ['Waves'] },
          {
            title: 'Characteristics of Sound',
            examWeight: { min: 2, max: 3, tier: 'medium' },
            prerequisites: ['Propagation of Sound'],
          },
          { title: 'Light Energy', examWeight: { min: 2, max: 3, tier: 'medium' }, prerequisites: ['Waves'] },
          { title: 'Reflection', examWeight: { min: 3, max: 4, tier: 'high' }, prerequisites: ['Light Energy'] },
          { title: 'Refraction', examWeight: { min: 4, max: 5, tier: 'high' }, prerequisites: ['Reflection'] },
          {
            title: 'Optical Instruments',
            examWeight: { min: 2, max: 3, tier: 'medium' },
            prerequisites: ['Reflection', 'Refraction'],
          },
          {
            title: 'Dispersion & Electromagnetic Spectrum',
            examWeight: { min: 2, max: 3, tier: 'medium' },
            prerequisites: ['Refraction'],
          },
        ],
      },
      {
        name: '06 — Electricity',
        order: 6,
        topics: [
          { title: 'Electrostatics', examWeight: { min: 3, max: 4, tier: 'high' } },
          { title: 'Capacitors', examWeight: { min: 2, max: 3, tier: 'medium' }, prerequisites: ['Electrostatics'] },
          { title: 'Electric Cells', examWeight: { min: 2, max: 3, tier: 'medium' }, prerequisites: ['Electrostatics'] },
          {
            title: 'Current Electricity',
            examWeight: { min: 4, max: 5, tier: 'high' },
            prerequisites: ['Electric Cells', 'Electrostatics'],
          },
          {
            title: 'Electrical Energy & Power',
            examWeight: { min: 2, max: 3, tier: 'medium' },
            prerequisites: ['Current Electricity'],
          },
        ],
      },
      // Magnetism & Electromagnetism: same documentation gap as Fluids
      // and Heat & Thermal Physics above.
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
      {
        name: '08 — Modern Physics',
        order: 8,
        topics: [
          { title: 'Electronics', examWeight: { min: 2, max: 3, tier: 'medium' }, prerequisites: ['Current Electricity'] },
          { title: 'Atomic & Nuclear Physics', examWeight: { min: 3, max: 4, tier: 'high' }, prerequisites: ['Electronics'] },
        ],
      },
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
          { title: 'Living Organisms', examWeight: { min: 1, max: 2, tier: 'medium' } },
          { title: 'Evolution Among Taxonomic Groups', examWeight: { min: 2, max: 3, tier: 'high' } },
          // No yield badge for this topic in the source Blueprint -- left
          // off rather than estimated.
          { title: 'Variety of Organisms', prerequisites: ['Evolution Among Taxonomic Groups'] },
          {
            title: 'Internal Structure of Flowering Plants & Mammals',
            examWeight: { min: 1, max: 2, tier: 'medium' },
            prerequisites: ['Living Organisms'],
          },
        ],
      },
      {
        name: '02 — Form & Function I: Sustaining Life',
        order: 2,
        topics: [
          {
            title: 'Nutrition',
            examWeight: { min: 3, max: 4, tier: 'high' },
            prerequisites: ['Internal Structure of Flowering Plants & Mammals'],
          },
          { title: 'Transport', examWeight: { min: 1, max: 2, tier: 'medium' }, prerequisites: ['Nutrition'] },
          { title: 'Respiration', examWeight: { min: 1, max: 2, tier: 'medium' }, prerequisites: ['Transport'] },
          {
            title: 'Excretion',
            examWeight: { min: 1, max: 2, tier: 'medium' },
            prerequisites: ['Respiration', 'Transport'],
          },
        ],
      },
      {
        name: '03 — Form & Function II: Continuing Life',
        order: 3,
        topics: [
          {
            title: 'Support & Movement',
            examWeight: { min: 1, max: 2, tier: 'medium' },
            prerequisites: ['Respiration'],
          },
          { title: 'Reproduction', examWeight: { min: 2, max: 3, tier: 'medium' } },
          { title: 'Growth', examWeight: { min: 1, max: 2, tier: 'foundational' }, prerequisites: ['Reproduction'] },
          {
            title: 'Coordination & Control',
            examWeight: { min: 2, max: 3, tier: 'medium' },
            prerequisites: ['Growth', 'Reproduction', 'Support & Movement'],
          },
        ],
      },
      {
        name: '04 — Ecology',
        order: 4,
        topics: [
          { title: 'Factors Affecting Distribution', examWeight: { min: 1, max: 2, tier: 'medium' } },
          {
            title: 'Symbiotic Interactions & Energy Flow',
            examWeight: { min: 1, max: 2, tier: 'medium' },
            prerequisites: ['Factors Affecting Distribution'],
          },
          {
            title: 'Natural Habitats',
            examWeight: { min: 1, max: 2, tier: 'foundational' },
            prerequisites: ['Symbiotic Interactions & Energy Flow'],
          },
          {
            title: 'Local Nigerian Biomes',
            examWeight: { min: 1, max: 2, tier: 'medium' },
            prerequisites: ['Natural Habitats'],
          },
          {
            title: 'Ecology of Populations',
            examWeight: { min: 2, max: 3, tier: 'high' },
            prerequisites: ['Local Nigerian Biomes', 'Symbiotic Interactions & Energy Flow'],
          },
          { title: 'Soil', examWeight: { min: 1, max: 2, tier: 'medium' } },
          { title: 'Humans & Environment', examWeight: { min: 3, max: 4, tier: 'high' }, prerequisites: ['Soil'] },
        ],
      },
      {
        name: '05 — Heredity, Variation & Evolution',
        order: 5,
        topics: [
          {
            title: 'Variation in Population',
            examWeight: { min: 2, max: 3, tier: 'medium' },
            prerequisites: ['Evolution Among Taxonomic Groups'],
          },
          { title: 'Heredity', examWeight: { min: 2, max: 4, tier: 'high' }, prerequisites: ['Variation in Population'] },
          {
            title: 'Theories & Evidence of Evolution',
            examWeight: { min: 1, max: 2, tier: 'medium' },
            prerequisites: ['Heredity', 'Variation in Population'],
          },
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
          { title: 'Number Bases', examWeight: { min: 2, max: 3, tier: 'medium' } },
          { title: 'Fractions, Decimals, Approximations & Percentages', examWeight: { min: 4, max: 5, tier: 'high' } },
          {
            title: 'Indices, Logarithms & Surds',
            examWeight: { min: 5, max: 6, tier: 'high' },
            prerequisites: ['Number Bases', 'Fractions, Decimals, Approximations & Percentages'],
          },
          { title: 'Sets', examWeight: { min: 3, max: 4, tier: 'medium' } },
        ],
      },
      {
        name: '02 — Algebra & Functions',
        order: 2,
        topics: [
          {
            title: 'Polynomials',
            examWeight: { min: 5, max: 6, tier: 'high' },
            prerequisites: ['Indices, Logarithms & Surds'],
          },
          { title: 'Variation', examWeight: { min: 2, max: 3, tier: 'medium' } },
          { title: 'Inequalities', examWeight: { min: 2, max: 3, tier: 'medium' }, prerequisites: ['Polynomials'] },
          {
            title: 'Progression',
            examWeight: { min: 3, max: 4, tier: 'medium' },
            prerequisites: ['Indices, Logarithms & Surds'],
          },
          { title: 'Binary Operations', examWeight: { min: 1, max: 2, tier: 'low' }, prerequisites: ['Sets'] },
          {
            title: 'Matrices & Determinants',
            examWeight: { min: 3, max: 4, tier: 'medium' },
            prerequisites: ['Binary Operations'],
          },
        ],
      },
      {
        name: '03 — Geometry, Trigonometry & Spatial Reasoning',
        order: 3,
        topics: [
          { title: 'Euclidean Geometry', examWeight: { min: 4, max: 5, tier: 'high' } },
          {
            title: 'Mensuration',
            examWeight: { min: 5, max: 6, tier: 'high' },
            prerequisites: ['Euclidean Geometry'],
          },
          { title: 'Loci', examWeight: { min: 1, max: 2, tier: 'low' }, prerequisites: ['Euclidean Geometry'] },
          {
            title: 'Coordinate Geometry',
            examWeight: { min: 3, max: 4, tier: 'medium' },
            prerequisites: ['Polynomials', 'Euclidean Geometry'],
          },
          {
            title: 'Trigonometry',
            examWeight: { min: 5, max: 6, tier: 'high' },
            prerequisites: ['Euclidean Geometry'],
          },
        ],
      },
      {
        name: '04 — Calculus & Mathematical Modelling',
        order: 4,
        topics: [
          {
            title: 'Differentiation',
            examWeight: { min: 4, max: 5, tier: 'high' },
            prerequisites: ['Indices, Logarithms & Surds', 'Coordinate Geometry', 'Trigonometry'],
          },
          {
            title: 'Application of Differentiation',
            examWeight: { min: 2, max: 3, tier: 'medium' },
            prerequisites: ['Differentiation'],
          },
          { title: 'Integration', examWeight: { min: 3, max: 4, tier: 'medium' }, prerequisites: ['Differentiation'] },
        ],
      },
      {
        name: '05 — Statistics & Probability',
        order: 5,
        topics: [
          { title: 'Representation of Data', examWeight: { min: 2, max: 3, tier: 'medium' } },
          {
            title: 'Measures of Location',
            examWeight: { min: 4, max: 5, tier: 'high' },
            prerequisites: ['Representation of Data', 'Fractions, Decimals, Approximations & Percentages'],
          },
          {
            title: 'Measures of Dispersion',
            examWeight: { min: 2, max: 3, tier: 'medium' },
            prerequisites: ['Measures of Location'],
          },
          {
            title: 'Permutation & Combination',
            examWeight: { min: 3, max: 4, tier: 'medium' },
            prerequisites: ['Sets'],
          },
          {
            title: 'Probability',
            examWeight: { min: 4, max: 5, tier: 'high' },
            prerequisites: ['Sets', 'Permutation & Combination'],
          },
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

// The draft exclusion matters: without it, an editor's unpublished draft
// (e.g. saved before a field existed, or mid-edit) can be returned
// alongside — or instead of, depending on sort order — the real published
// document, since drafts share the same _type. Only ever read what's live.
const SUBJECT_QUERY = `*[_type == "subject" && !(_id in path("drafts.**"))] | order(order asc) {
  name,
  "slug": slug.current,
  description,
  order,
  topicCount,
  keyDependencies,
  relatedResourceSlug,
  stages[] { name, order, topics[] { title, slug, examWeight, prerequisites } },
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
const SYLLABUS_TOPIC_QUERY = `*[_type == "syllabusTopic" && !(_id in path("drafts.**"))] {
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
