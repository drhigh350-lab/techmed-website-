// web/src/lib/dashboard-data.ts
// Official TECHMED UTME 2027 Cohort Curriculum, Timetable, and Classroom Data.
// Transcribed authoritatively from official JAMB syllabus and schedule specifications.

export interface SubjectTopic {
  title: string;
  details: string;
}

export interface WeekCurriculum {
  weekNumber: number;
  dates: string;
  theme: string;
  physics: SubjectTopic[];
  chemistry: SubjectTopic[];
  english: SubjectTopic[];
  biology: SubjectTopic[];
  mathematics: SubjectTopic[];
  assessment: {
    title: string;
    date: string;
    type: 'drill' | 'mock';
    details: string;
    questions?: number;
    duration?: string;
    scope?: string;
  };
}

export interface TimetableSlot {
  day: string;
  sessionA: {
    time: string;
    subjects: string;
    notes?: string;
  };
  breakTime: {
    time: string;
    label: string;
  };
  sessionB: {
    time: string;
    subjects: string;
    notes?: string;
  };
}

export interface ClassroomLink {
  id: string;
  subject: string;
  platform: 'Telegram' | 'WhatsApp';
  url: string;
  description: string;
  isCommunity?: boolean;
  requiresEnrolment?: boolean;
}

export const PROGRAMME_META = {
  title: 'UTME 2027 Paid Classes',
  officialDates: '30 November 2026 – UTME Examination Date',
  intensiveLectureDates: '30 November 2026 – 21 February 2027 (12 Weeks Core)',
  dailyHours: '4 Hours Daily (Two 2-Hour Live Sessions, Monday to Saturday)',
  breakDuration: '10-Minute Break between sessions',
  monthlyFeeNgn: 7000,
  supportPhone: '07044255045',
  supportEmail: 'admissions@techmedng.com',
};

export const CLASSROOM_LINKS: ClassroomLink[] = [
  {
    id: 'biology',
    subject: 'Biology Classroom',
    platform: 'Telegram',
    url: 'https://t.me/+-MMNZixSVJM3ZjRk',
    description: 'Live interactive lectures, diagrams, genetics walkthroughs, and pre-class notes.',
    requiresEnrolment: true,
  },
  {
    id: 'chemistry',
    subject: 'Chemistry Classroom',
    platform: 'Telegram',
    url: 'https://t.me/+B6xm1bGauWgyZDJk',
    description: 'Stoichiometry, organic chemistry, reaction mechanisms, and calculation chains.',
    requiresEnrolment: true,
  },
  {
    id: 'physics',
    subject: 'Physics Classroom',
    platform: 'Telegram',
    url: 'https://t.me/+Uhvk2wlI-LQ3MWJk',
    description: 'Formula derivations, mechanics, electromagnetism, and calculation speed drills.',
    requiresEnrolment: true,
  },
  {
    id: 'english',
    subject: 'English Language Classroom',
    platform: 'Telegram',
    url: 'https://t.me/+WAhmsDP-4rM4OWVk',
    description: 'Lexis, grammatical structure, The Lekki Headmaster, and comprehension tactics.',
    requiresEnrolment: true,
  },
  {
    id: 'mathematics',
    subject: 'Mathematics Classroom',
    platform: 'Telegram',
    url: 'https://t.me/+H5AcDzEEd49kMTJk',
    description: 'Calculus, algebra, mensuration, coordinate geometry, and JAMB problem-solving.',
    requiresEnrolment: true,
  },
  {
    id: 'brainstorming-group',
    subject: 'Brainstorming Group',
    platform: 'WhatsApp',
    url: 'https://chat.whatsapp.com/HKR7lb7mRoA5wivQLjUhUc?s=cl&p=a&mlu=4&ilr=4&iam=2',
    description: 'Direct candidate collaboration, daily questions, and study accountability group.',
    requiresEnrolment: true,
    isCommunity: false,
  },
  {
    id: 'paid-class-official',
    subject: 'Paid Class Official Group',
    platform: 'WhatsApp',
    url: 'https://chat.whatsapp.com/FbCsdrxF7KE3E1q2ckwKOW?s=cl&p=a&mlu=4&ilr=4&iam=2',
    description: 'Official announcements, timetable changes, class reminders, and admission updates for paid students.',
    requiresEnrolment: true,
    isCommunity: false,
  },
  {
    id: 'free-intensive-community',
    subject: 'Free Intensive Classes, Quizzes & Strategies',
    platform: 'WhatsApp',
    url: 'https://chat.whatsapp.com/LicHJ6aIHNV6x34CrbpviV?s=cl&p=a&mlu=4&ilr=4&iam=2',
    description: 'Free intensive classes, practice quizzes, and admission strategy breakdowns open to every candidate.',
    isCommunity: true,
    requiresEnrolment: false,
  },
  {
    id: 'whatsapp-channel',
    subject: 'TECHMED Official WhatsApp Channel',
    platform: 'WhatsApp',
    url: 'https://whatsapp.com/channel/0029Vb8nzXH545v4f8EF103D',
    backupUrl: 'https://whatsapp.com/channel/0029Vb4wUuS6buMI3U1t8u1s',
    description: 'Public announcements, daily tips, syllabus alerts, and admission guidance for all candidates.',
    isCommunity: true,
    requiresEnrolment: false,
  },
];

export const TIMETABLE_SCHEDULE: TimetableSlot[] = [
  {
    day: 'Monday',
    sessionA: {
      time: '7:00 PM – 9:00 PM',
      subjects: 'Biology / Mathematics',
      notes: 'Parallel streams run concurrently; candidates attend their registered subject (Biology or Mathematics).',
    },
    breakTime: {
      time: '9:00 PM – 9:10 PM',
      label: '10-Minute Break',
    },
    sessionB: {
      time: '9:10 PM – 11:10 PM',
      subjects: 'Chemistry',
    },
  },
  {
    day: 'Tuesday',
    sessionA: {
      time: '7:00 PM – 9:00 PM',
      subjects: 'English Language',
    },
    breakTime: {
      time: '9:00 PM – 9:10 PM',
      label: '10-Minute Break',
    },
    sessionB: {
      time: '9:10 PM – 11:10 PM',
      subjects: 'Physics',
    },
  },
  {
    day: 'Wednesday',
    sessionA: {
      time: '7:00 PM – 9:00 PM',
      subjects: 'Mathematics / Biology',
      notes: 'Parallel streams run concurrently; candidates attend their registered subject (Mathematics or Biology).',
    },
    breakTime: {
      time: '9:00 PM – 9:10 PM',
      label: '10-Minute Break',
    },
    sessionB: {
      time: '9:10 PM – 11:10 PM',
      subjects: 'Chemistry',
    },
  },
  {
    day: 'Thursday',
    sessionA: {
      time: '7:00 PM – 9:00 PM',
      subjects: 'English Language',
    },
    breakTime: {
      time: '9:00 PM – 9:10 PM',
      label: '10-Minute Break',
    },
    sessionB: {
      time: '9:10 PM – 11:10 PM',
      subjects: 'Physics',
    },
  },
  {
    day: 'Friday',
    sessionA: {
      time: '7:00 PM – 9:00 PM',
      subjects: 'Chemistry',
    },
    breakTime: {
      time: '9:00 PM – 9:10 PM',
      label: '10-Minute Break',
    },
    sessionB: {
      time: '9:10 PM – 11:10 PM',
      subjects: 'Biology / Mathematics',
      notes: 'Parallel streams run concurrently; candidates attend their registered subject (Biology or Mathematics).',
    },
  },
  {
    day: 'Saturday',
    sessionA: {
      time: '7:00 PM – 9:00 PM',
      subjects: 'English Language',
    },
    breakTime: {
      time: '9:00 PM – 9:10 PM',
      label: '10-Minute Break',
    },
    sessionB: {
      time: '9:10 PM – 11:10 PM',
      subjects: 'Physics',
    },
  },
];

export const TIMETABLE_SUNDAY_NOTE = {
  day: 'Sunday',
  activity: 'Weekly CBT Drills & 3 Monthly JAMB-Standard Mock Examinations',
  time: 'Self-Paced / Scheduled Window on Kairo CBT',
  description:
    'Sundays feature timed CBT Drills to reinforce high-yield topics. The fourth Sunday of each programme month is reserved for a full 180-question, 2-hour JAMB-standard mock (Mock 1: 27 December 2026 · Mock 2: 24 January 2027 · Mock 3: 28 February 2027), preparing students directly towards their UTME examination date.',
};

export interface MockExamSchedule {
  mockNumber: number;
  title: string;
  date: string;
  description: string;
  rule: string;
}

export const THREE_MONTHLY_MOCKS: MockExamSchedule[] = [
  {
    mockNumber: 1,
    title: 'First Monthly JAMB-Standard Mock',
    date: 'Sunday, 27 December 2026',
    description: '180 questions in 2 hours across all 4 subjects evaluating Month 1 retention.',
    rule: '4th Sunday of December 2026',
  },
  {
    mockNumber: 2,
    title: 'Second Monthly JAMB-Standard Mock',
    date: 'Sunday, 24 January 2027',
    description: '180 questions in 2 hours assessing cumulative retention across two months of high-dependency topics.',
    rule: '4th Sunday of January 2027',
  },
  {
    mockNumber: 3,
    title: 'Third Monthly JAMB-Standard Mock',
    date: 'Sunday, 28 February 2027',
    description: 'Full-scope JAMB exam simulation under timed exam conditions as candidates advance towards UTME.',
    rule: '4th Sunday of February 2027',
  },
];

export const TWELVE_WEEK_CURRICULUM: WeekCurriculum[] = [
  // WEEK 1
  {
    weekNumber: 1,
    dates: 'Nov 30 – Dec 6',
    theme: 'Foundations & Toolkits',
    physics: [
      {
        title: 'Measurements & Units',
        details: 'SI units, dimensions, measuring instruments, significant figures and percentage errors.',
      },
      {
        title: 'Scalars & Vectors',
        details: 'Resultant vectors, vector resolution, vector addition and relative velocity.',
      },
      {
        title: 'Introduction to Motion',
        details: 'Types of motion, position, speed, velocity and acceleration.',
      },
    ],
    chemistry: [
      {
        title: 'Separation of Mixtures & Purification',
        details: 'Filtration, crystallisation, distillation, chromatography, sublimation and criteria for purity.',
      },
      {
        title: 'Chemical Combination',
        details: 'Conservation of matter, definite and multiple proportions, chemical formulae, equations and introduction to stoichiometry.',
      },
    ],
    english: [
      {
        title: 'Passage Understanding & Main Ideas',
        details: 'Description, narration, exposition, argumentation, topic sentences, figurative expressions and idioms.',
      },
      {
        title: 'Premodifiers & Nouns',
        details: 'Articles, determiners, types of nouns, plural forms and invariable singular nouns.',
      },
    ],
    biology: [
      {
        title: 'Living Organisms',
        details: 'Characteristics of life, cell structure, organelle functions, plant and animal cells, levels of organisation.',
      },
      {
        title: 'Classification of Living Organisms',
        details: 'Major groups from Monera to Mammalia and distinguishing characteristics.',
      },
    ],
    mathematics: [
      {
        title: 'Number Bases',
        details: 'Operations in bases 2–10 and conversion between bases, including fractions.',
      },
      {
        title: 'Fractions, Decimals, Approximations & Percentages',
        details: 'Significant figures, percentage errors, simple interest, profit and loss, ratio, proportion, shares and VAT.',
      },
    ],
    assessment: {
      title: 'Weekly CBT Drill 1',
      date: 'Sunday, 6 December',
      type: 'drill',
      details: 'Foundational concepts and speed calibration in all subjects.',
    },
  },

  // WEEK 2
  {
    weekNumber: 2,
    dates: 'Dec 7 – 13',
    theme: 'Foundations & High-Dependency Core',
    physics: [
      {
        title: 'Linear Motion',
        details: 'Equations of uniformly accelerated motion, motion graphs, instantaneous velocity, acceleration and free fall.',
      },
      {
        title: 'Projectile Motion',
        details: 'Horizontal and vertical components, time of flight, maximum height and range.',
      },
      {
        title: 'Circular Motion & SHM',
        details: 'Angular velocity, centripetal force, period, frequency, amplitude and resonance.',
      },
      {
        title: "Newton's Laws, Momentum & Collisions",
        details: 'Inertia, impulse, momentum, force–time graphs and conservation of linear momentum.',
      },
    ],
    chemistry: [
      {
        title: 'Chemical Combination & Mole Concept',
        details: 'Stoichiometry, Avogadro\'s number, molar mass, reacting masses, gas-volume relationships and chemical equations.',
      },
      {
        title: 'Kinetic Theory & Gas Laws',
        details: 'Boyle\'s law, Charles\'s law, pressure law, ideal gas equation and gas calculations.',
      },
    ],
    english: [
      {
        title: 'Pronouns',
        details: 'Types, personal and reflexive pronouns, case rules and correct usage.',
      },
      {
        title: 'Implied Meaning & Inference',
        details: 'Unstated information, contextual interpretation and evidence-based conclusions.',
      },
    ],
    biology: [
      {
        title: 'Variety of Organisms & Adaptation',
        details: 'Classification, diversity, structural and behavioural adaptations.',
      },
      {
        title: 'Internal Structure of Flowering Plants & Mammals',
        details: 'Plant and animal tissues, supporting tissues and internal organisation.',
      },
    ],
    mathematics: [
      {
        title: 'Indices, Logarithms & Surds',
        details: 'Laws of indices, logarithms, change of base, standard form, simplification and rationalisation of surds.',
      },
      {
        title: 'Sets & Venn Diagrams',
        details: 'Subsets, complements, set operations, cardinality and Venn diagrams involving up to three sets.',
      },
    ],
    assessment: {
      title: 'Weekly CBT Drill 2',
      date: 'Sunday, 13 December',
      type: 'drill',
      details: 'High-dependency kinematics, mole concepts, and set theory under timed pressure.',
    },
  },

  // WEEK 3
  {
    weekNumber: 3,
    dates: 'Dec 14 – 20',
    theme: 'Core Systems & Algebraic Mechanics',
    physics: [
      {
        title: 'Work, Energy & Power',
        details: 'Work done, kinetic and potential energy, conservation of energy and power.',
      },
      {
        title: 'Friction',
        details: 'Limiting friction, coefficient of friction and friction on inclined planes.',
      },
      {
        title: 'Connected Bodies & Pulley Systems',
        details: 'Tension, acceleration and force analysis.',
      },
    ],
    chemistry: [
      {
        title: 'Atomic Structure & Bonding',
        details: 'Protons, neutrons, electrons, isotopes, electronic configuration, periodicity, ionic and covalent bonding, metallic bonding and molecular shapes.',
      },
    ],
    english: [
      {
        title: 'Verbs & Tense',
        details: 'Regular and irregular verbs, finite and non-finite verbs, transitive and intransitive verbs, stative verbs and perfect tenses.',
      },
      {
        title: "Writer's Attitude, Mood & Opinion",
        details: 'Tone, purpose, viewpoint and language clues.',
      },
    ],
    biology: [
      {
        title: 'Plant & Animal Nutrition',
        details: 'Modes of nutrition, photosynthesis, mineral requirements, food classes and balanced diets.',
      },
      {
        title: 'Digestion & Nutrition Experiments',
        details: 'Digestive systems, enzymes, digestion, absorption and food tests.',
      },
    ],
    mathematics: [
      {
        title: 'Polynomials',
        details: 'Factor and remainder theorems, factorisation, roots, simultaneous equations and polynomial graphs.',
      },
      {
        title: 'Variation',
        details: 'Direct, inverse, joint and partial variation; percentage increase and decrease.',
      },
    ],
    assessment: {
      title: 'Weekly CBT Drill 3',
      date: 'Sunday, 20 December',
      type: 'drill',
      details: 'Work-energy calculations, atomic bonding, nutrition, and polynomial factorisation.',
    },
  },

  // WEEK 4
  {
    weekNumber: 4,
    dates: 'Dec 21 – 27',
    theme: 'Quantitative Dynamics & Biological Systems',
    physics: [
      {
        title: 'Equilibrium of Forces',
        details: 'Resultant forces, coplanar forces and resolution of forces.',
      },
      {
        title: 'Moments & Couples',
        details: 'Principle of moments, equilibrium, centre of gravity and stability.',
      },
      {
        title: 'Gravitational Field',
        details: 'Universal gravitation, orbital motion, escape velocity and weightlessness.',
      },
      {
        title: 'Fluids & Surface Properties',
        details: 'Surface tension, capillarity, elasticity, upthrust, Archimedes\' principle, flotation and relative density.',
      },
    ],
    chemistry: [
      {
        title: 'Energy Changes',
        details: 'Exothermic and endothermic reactions, enthalpy changes, Hess\'s law and Born–Haber cycles.',
      },
      {
        title: 'Introduction to Solubility',
        details: 'Saturated solutions, factors affecting solubility and solubility curves.',
      },
    ],
    english: [
      {
        title: 'Concord',
        details: 'Subject–verb agreement and common grammatical errors.',
      },
      {
        title: 'Passage-Based Application',
        details: 'JAMB-style concord questions and correction of errors.',
      },
    ],
    biology: [
      {
        title: 'Transport Systems',
        details: 'Blood, circulation, blood vessels, transport, respiration, excretion, support and movement, reproduction, coordination, ecology, genetics and evolution.',
      },
      {
        title: 'Respiratory System',
        details: 'Respiratory organs, gaseous exchange and the relationship between transport and respiration.',
      },
    ],
    mathematics: [
      {
        title: 'Binary Operations',
        details: 'Closure, commutativity, associativity, identity and inverse elements.',
      },
      {
        title: 'Matrices & Determinants',
        details: 'Matrix operations up to 3 x 3, determinants and inverses of 2 x 2 matrices.',
      },
    ],
    assessment: {
      title: 'First Monthly JAMB-Standard Mock',
      date: 'Sunday, 27 December',
      type: 'mock',
      questions: 180,
      duration: '2 Hours',
      scope: 'Weeks 1–4 Cumulative',
      details: 'Full exam simulation covering 4 UTME subjects to measure Month 1 retention.',
    },
  },

  // WEEK 5
  {
    weekNumber: 5,
    dates: 'Dec 28 – Jan 3',
    theme: 'Mechanics, Chemical Kinetics & Geometry',
    physics: [
      {
        title: 'Simple Machines',
        details: 'Mechanical advantage, velocity ratio, efficiency, ideal and real machines, pulleys.',
      },
      {
        title: 'Pressure in Solids & Liquids',
        details: "Pressure calculations, atmospheric pressure, Pascal's principle, manometers, Hare's apparatus and siphons.",
      },
      {
        title: 'Viscosity & Fluid Motion',
        details: "Viscous forces, terminal velocity and Stokes' law.",
      },
    ],
    chemistry: [
      {
        title: 'Solubility & Solubility Curves',
        details: 'Solubility calculations, saturated solutions, crystallisation and curve interpretation.',
      },
      {
        title: 'Chemical Kinetics',
        details: 'Rates of reaction, collision theory, activation energy and factors affecting reaction rates.',
      },
    ],
    english: [
      {
        title: 'Adjectives & Adverbs',
        details: 'Types, comparison, adjective order, adverbial functions and correct usage.',
      },
      {
        title: 'Vocabulary in Context',
        details: 'Synonyms, antonyms, contextual meaning and appropriate word choice.',
      },
    ],
    biology: [
      {
        title: 'Respiration',
        details: 'Aerobic and anaerobic respiration, respiratory surfaces, gaseous exchange and energy release.',
      },
      {
        title: 'Movement in Organisms',
        details: 'Movement in plants and animals, support and energy requirements.',
      },
    ],
    mathematics: [
      {
        title: 'Euclidean Geometry',
        details: 'Angles, lines, triangles, polygons, circle theorems, construction and loci.',
      },
      {
        title: 'Coordinate Geometry',
        details: 'Coordinates, plotting points and straight-line relationships.',
      },
    ],
    assessment: {
      title: 'Weekly CBT Drill 5',
      date: 'Sunday, 3 January',
      type: 'drill',
      details: 'Machines, kinetics rate laws, Euclidean theorems, and respiration pathways.',
    },
  },

  // WEEK 6
  {
    weekNumber: 6,
    dates: 'Jan 4 – 10',
    theme: 'Thermal Physics, Equilibrium & Mensuration',
    physics: [
      {
        title: 'Kinetic Theory & Gas Laws',
        details: 'Molecular interpretation of matter, gas pressure, temperature and gas laws.',
      },
      {
        title: 'Temperature & Thermal Expansion',
        details: 'Temperature scales, thermometers, calibration, conversion and expansion.',
      },
      {
        title: 'Heat Transfer',
        details: 'Conduction, convection, radiation, land and sea breezes, thermal conductivity and thermos flasks.',
      },
      {
        title: 'Heat Calculations & Humidity',
        details: 'Heat capacity, specific heat capacity, latent heat, change of state, vapour pressure, humidity and hygrometry.',
      },
    ],
    chemistry: [
      {
        title: 'Reversible Reactions & Chemical Equilibrium',
        details: "Dynamic equilibrium and Le Chatelier's principle.",
      },
      {
        title: 'Acids, Bases & Salts',
        details: 'Indicators, neutralisation, salt preparation, pH, pOH, acid–base titrations and buffer solutions.',
      },
    ],
    english: [
      {
        title: 'Prepositions & Conjunctions',
        details: 'Uses of in, on, by and at, prepositional phrases, conjunctions, conditional statements and participles.',
      },
      {
        title: 'Sentence Interpretation',
        details: 'Sentence meaning, expressions and equivalent meanings.',
      },
    ],
    biology: [
      {
        title: 'Supporting Tissues in Plants & Animals',
        details: 'Plant support, skeletal systems, supporting tissues, exoskeletons and endoskeletons.',
      },
      {
        title: 'Excretion & Osmoregulation',
        details: 'Excretory organs, waste products, excretion in plants and animals and internal balance.',
      },
    ],
    mathematics: [
      {
        title: 'Mensuration',
        details: 'Perimeters, areas, circles, sectors, surface areas, volumes, composite shapes and frustums.',
      },
      {
        title: 'Mensuration Applications',
        details: 'Formula selection and multistep measurement problems.',
      },
    ],
    assessment: {
      title: 'Weekly CBT Drill 6',
      date: 'Sunday, 10 January',
      type: 'drill',
      details: 'Thermal calculations, Le Chatelier shifts, acid-base pH, and frustum geometry.',
    },
  },

  // WEEK 7
  {
    weekNumber: 7,
    dates: 'Jan 11 – 17',
    theme: 'Waves, Electrochemistry & Reproduction',
    physics: [
      {
        title: 'Wave Motion',
        details: 'Types of waves, wave properties, wave speed, frequency, wavelength, period and progressive waves.',
      },
      {
        title: 'Light Waves & Reflection',
        details: 'Laws of reflection, plane and curved mirrors, image formation and rotation of mirrors.',
      },
    ],
    chemistry: [
      {
        title: 'Salt Hydrolysis & Acid–Base Applications',
        details: 'Acidic, basic and neutral salts, titrations, buffers, solubility and solubility product (Ksp).',
      },
      {
        title: 'Oxidation & Reduction',
        details: 'Oxidation numbers, oxidising and reducing agents, redox equations and balancing redox reactions.',
      },
    ],
    english: [
      {
        title: 'Sentence Interpretation, Idioms & Structure',
        details: 'Idioms, proverbs, phrasal verbs, sentence patterns and the subjunctive.',
      },
      {
        title: 'Logical Reasoning & Cloze Passage',
        details: 'Contextual vocabulary, grammatical coherence and appropriate word selection.',
      },
    ],
    biology: [
      {
        title: 'Asexual Reproduction',
        details: 'Forms of asexual reproduction and examples.',
      },
      {
        title: 'Sexual Reproduction',
        details: 'Reproduction in flowering plants and mammals, reproductive structures and fertilisation.',
      },
      {
        title: 'Growth & Germination',
        details: 'Conditions for germination and factors affecting growth.',
      },
    ],
    mathematics: [
      {
        title: 'Permutation & Combination',
        details: 'Counting principles, arrangements, selections and factorial notation.',
      },
      {
        title: 'Counting Applications',
        details: 'Problems involving when order matters and when it does not.',
      },
    ],
    assessment: {
      title: 'Weekly CBT Drill 7',
      date: 'Sunday, 17 January',
      type: 'drill',
      details: 'Wave optics, redox equation balancing, reproduction mechanisms, and combinatorics.',
    },
  },

  // WEEK 8
  {
    weekNumber: 8,
    dates: 'Jan 18 – 24',
    theme: 'Optics, Electrolysis & Coordination',
    physics: [
      {
        title: 'Refraction',
        details: 'Refractive index, apparent depth, critical angle and total internal reflection.',
      },
      {
        title: 'Lenses & Optical Instruments',
        details: 'Convex and concave lenses, image formation, lens formulae, magnification and power of lenses.',
      },
      {
        title: 'Dispersion & Electromagnetic Spectrum',
        details: 'Dispersion of light, colours and electromagnetic waves.',
      },
      {
        title: 'Sound',
        details: 'Echoes, reverberation, Doppler effect, beats, strings, sonometers and open and closed pipes.',
      },
      {
        title: 'Magnetism & Electromagnetic Applications',
        details: "Magnetic flux, flux density, Earth's magnetic field, coils, solenoids, Fleming's left-hand rule, DC motors and electromagnets.",
      },
    ],
    chemistry: [
      {
        title: 'Electrochemical Cells',
        details: 'Electrodes, electrolytes, standard electrode potential and cell potential.',
      },
      {
        title: 'Electrolysis',
        details: "Products at electrodes, preferential discharge and Faraday's laws.",
      },
      {
        title: 'Redox Applications',
        details: 'Balancing redox equations and electron-transfer processes.',
      },
    ],
    english: [
      {
        title: 'Apostrophe & Question Tags',
        details: 'Possession, contractions, apostrophe rules and question-tag formation.',
      },
      {
        title: 'Spoken English',
        details: 'Vowels, diphthongs, consonant sounds, rhymes, homophones, stress and intonation.',
      },
    ],
    biology: [
      {
        title: 'Nervous System',
        details: 'Neurons, nerve impulses, reflex actions, sense organs and the nervous system in humans.',
      },
      {
        title: 'Endocrine System',
        details: 'Endocrine glands, hormones, functions and effects of hormonal imbalance.',
      },
    ],
    mathematics: [
      {
        title: 'Inequalities',
        details: 'Linear inequalities, graphical solutions and quadratic inequalities with integral roots.',
      },
      {
        title: 'Trigonometry',
        details: 'Trigonometric ratios, identities, angles, bearings and applications.',
      },
    ],
    assessment: {
      title: 'Second Monthly JAMB-Standard Mock',
      date: 'Sunday, 24 January',
      type: 'mock',
      questions: 180,
      duration: '2 Hours',
      scope: 'Weeks 1–8 Cumulative',
      details: 'High-stake diagnostic mock assessing retention across two full months of syllabus material.',
    },
  },

  // WEEK 9
  {
    weekNumber: 9,
    dates: 'Jan 25 – 31',
    theme: 'Electromagnetism, Environmental Chemistry & Ecology',
    physics: [
      {
        title: 'Electromagnetic Induction',
        details: "Faraday's and Lenz's laws, induced e.m.f., generators, electrical measuring instruments, transformers, eddy currents and inductance.",
      },
      {
        title: 'Semiconductors & Electronics',
        details: 'P-type and N-type semiconductors, diodes, rectification and transistors.',
      },
      {
        title: 'Electrostatics & AC Circuits',
        details: "Coulomb's law, electric fields and potential, capacitors and simple alternating-current circuits.",
      },
    ],
    chemistry: [
      {
        title: 'Water',
        details: 'Composition, purification, hardness, removal of hardness and water treatment.',
      },
      {
        title: 'Air & Environmental Pollution',
        details: 'Composition of air, pollutants, sources, effects and environmental control.',
      },
    ],
    english: [
      {
        title: 'Spelling & Common Errors',
        details: 'Frequently confused words, correct spelling, vocabulary accuracy and common English errors.',
      },
      {
        title: 'The Lekki Headmaster',
        details: 'Comprehension, plot, characters, themes, interpretation and prescribed-text questions.',
      },
    ],
    biology: [
      {
        title: 'Ecology',
        details: 'Distribution of organisms, habitats, ecological factors, symbiosis, population dynamics and organism–environment relationships.',
      },
      {
        title: 'Ecological Applications',
        details: 'Food chains, food webs, environmental relationships and human impact.',
      },
    ],
    mathematics: [
      {
        title: 'Statistics',
        details: 'Data presentation, tables, charts, measures of location and measures of dispersion.',
      },
      {
        title: 'Statistical Interpretation',
        details: 'Reading and analysing data using appropriate statistical methods.',
      },
    ],
    assessment: {
      title: 'Weekly CBT Drill 9',
      date: 'Sunday, 31 January',
      type: 'drill',
      details: 'Timed assessment reinforcing ecology, electromagnetism, and environmental chemistry under exam pressure.',
    },
  },

  // WEEK 10
  {
    weekNumber: 10,
    dates: 'Feb 1 – 7',
    theme: 'Electricity, Industrial Chemistry & Genetics',
    physics: [
      {
        title: 'Current Electricity I',
        details: 'Circuits, resistance, series and parallel connections, electric power and energy.',
      },
      {
        title: 'Current Electricity II',
        details: "Conduction through liquids and gases, electrolysis and Faraday's laws.",
      },
      {
        title: 'LASER',
        details: 'Basic principles, properties and applications.',
      },
      {
        title: 'Electrical Measurements & Calculations',
        details: "Shunts, multipliers, Wheatstone bridge, metre bridge, potentiometer, Kirchhoff's laws, resistivity and cost of electrical energy.",
      },
    ],
    chemistry: [
      {
        title: 'Industrial Chemistry',
        details: 'Industrial processes and production of fine and heavy chemicals.',
      },
      {
        title: 'Non-Metals & Their Compounds',
        details: 'Hydrogen, halogens, oxygen, sulphur, nitrogen and carbon; preparation, properties, uses and important compounds.',
      },
    ],
    english: [
      {
        title: 'Register',
        details: 'Vocabulary associated with medicine, law, engineering, insurance, commerce, stock exchange, banking and journalism.',
      },
      {
        title: 'Advanced Vocabulary & Context',
        details: 'Word choice appropriate to meaning, setting and purpose.',
      },
    ],
    biology: [
      {
        title: 'Humans & Their Environment',
        details: 'Human effects on the environment, pollution, conservation and environmental management.',
      },
      {
        title: 'Variation in Population',
        details: 'Continuous and discontinuous variation, sources and significance of variation.',
      },
      {
        title: 'Principles of Inheritance',
        details: 'Heredity, genetic information and transmission of traits.',
      },
    ],
    mathematics: [
      {
        title: 'Coordinate Geometry',
        details: 'Straight-line equations, gradients, parallel and perpendicular lines.',
      },
      {
        title: 'Circle Geometry',
        details: 'Equations and properties of circles.',
      },
      {
        title: 'Probability',
        details: 'Sample spaces, events and probability calculations.',
      },
    ],
    assessment: {
      title: 'Weekly CBT Drill 10',
      date: 'Sunday, 7 February',
      type: 'drill',
      details: 'Kirchhoff circuits, non-metal reactions, genetics monohybrid ratios, and probability trees.',
    },
  },

  // WEEK 11
  {
    weekNumber: 11,
    dates: 'Feb 8 – 14',
    theme: 'High-Yield Capstones & Applied Sciences',
    physics: [
      {
        title: 'Models of the Atom',
        details: 'Atomic structure and development of atomic models.',
      },
      {
        title: 'Radioactivity',
        details: 'Half-life, decay constant, alpha, beta and gamma radiation.',
      },
      {
        title: 'Nuclear Physics',
        details: "Fission, fusion, mass defect, binding energy and Einstein's equation, E = mc².",
      },
      {
        title: 'Modern Physics I',
        details: 'Energy quantisation, energy levels, spectra and X-rays.',
      },
    ],
    chemistry: [
      {
        title: 'Metals & Their Compounds',
        details: 'Alkali metals, alkaline earth metals, transition metals, reactivity, extraction, properties and uses.',
      },
      {
        title: 'Qualitative & Quantitative Analysis',
        details: 'Identification of ions, characteristic chemical tests, observations and experimental deductions.',
      },
    ],
    english: [
      {
        title: 'Comprehension Mastery',
        details: 'Mood and tone, types of statements, figures of speech and answering comprehension questions.',
      },
      {
        title: 'Lexis & Structure Revision',
        details: 'Synonyms, antonyms, sentence completion, contextual vocabulary, grammar and sentence interpretation.',
      },
      {
        title: 'Prescribed Reading Text',
        details: 'Consolidation of The Lekki Headmaster and its examinable content.',
      },
    ],
    biology: [
      {
        title: 'Genetics & Sex Determination',
        details: 'Mendelian inheritance, genetic crosses, sex determination, sex-linked inheritance and genetic probability.',
      },
      {
        title: 'Evolution',
        details: 'Theories and evidence of evolution, evolutionary trends and variation.',
      },
    ],
    mathematics: [
      {
        title: 'Differentiation',
        details: 'Basic derivatives, differentiation rules, rates of change, maxima and minima.',
      },
      {
        title: 'Integration',
        details: 'Basic integrals, integration methods within the syllabus and applications to areas.',
      },
      {
        title: 'Calculus Applications',
        details: 'Applying differentiation and integration to mathematical problems.',
      },
    ],
    assessment: {
      title: 'Weekly CBT Drill 11',
      date: 'Sunday, 14 February',
      type: 'drill',
      details: 'Radioactivity decay equations, qualitative analysis ions, dihybrid crosses, and calculus.',
    },
  },

  // WEEK 12
  {
    weekNumber: 12,
    dates: 'Feb 15 – 21',
    theme: 'Comprehensive Synthesis & Exam Readiness',
    physics: [
      {
        title: 'Modern Physics II',
        details: 'Thermionic emission, photoelectric emission, Einstein\'s equation, wave–particle duality, uncertainty principle and electron diffraction.',
      },
      {
        title: 'Comprehensive Revision',
        details: 'Measurements, vectors, mechanics, heat, waves, optics, electricity, magnetism and modern physics.',
      },
      {
        title: 'Final Exam Application',
        details: 'Calculation chains, formula selection, units, graphs, interpretation and timed practice.',
      },
    ],
    chemistry: [
      {
        title: 'Organic Chemistry',
        details: 'Hydrocarbons, homologous series, functional groups, IUPAC nomenclature and isomerism.',
      },
      {
        title: 'Organic Compounds',
        details: 'Alkanes, alkenes, alkynes, alkanols, carboxylic acids, esters and polymers; properties, reactions and uses.',
      },
      {
        title: 'Organic Chemistry Applications',
        details: 'Functional-group transformations and common organic reactions.',
      },
      {
        title: 'Final Chemistry Revision',
        details: 'Mole calculations, bonding, equilibrium, acids and bases, redox, electrolysis, inorganic chemistry and organic chemistry.',
      },
    ],
    english: [
      {
        title: 'Final JAMB Use of English Revision',
        details: 'Comprehension, cloze passages, The Lekki Headmaster, sentence interpretation, synonyms, antonyms, sentence completion and oral forms.',
      },
      {
        title: 'Exam Strategy',
        details: 'Time management, question interpretation, elimination of distractors and accuracy under timed conditions.',
      },
    ],
    biology: [
      {
        title: 'Final Biology Revision',
        details: 'Cell structure, classification, nutrition, transport, respiration, excretion, support and movement, reproduction, coordination, ecology, genetics and evolution.',
      },
      {
        title: 'Diagram & Discrimination Practice',
        details: 'Biological structures, processes, functions and organism groups.',
      },
      {
        title: 'Final Exam Application',
        details: 'Diagram interpretation, experimental reasoning and timed JAMB-style questions.',
      },
    ],
    mathematics: [
      {
        title: 'Statistics & Probability Revision',
        details: 'Data representation, measures of location and dispersion, counting principles and probability.',
      },
      {
        title: 'Full Syllabus Consolidation',
        details: 'Number and numeration, algebra, geometry, trigonometry, calculus, statistics and probability.',
      },
      {
        title: 'Final Exam Application',
        details: 'Formula selection, multistep calculations, time management and common-error prevention.',
      },
    ],
    assessment: {
      title: 'Weekly CBT Drill 12',
      date: 'Sunday, 21 February',
      type: 'drill',
      details: 'Full syllabus consolidation drill covering core calculation and diagram questions across all subjects.',
    },
  },
];

export const ONBOARDING_FIRST_STEPS = [
  {
    stepNumber: 1,
    title: 'Verify Your 4 UTME Subjects & Profile',
    desc: 'Configure your target university, desired course, and 3 elective science/commercial subjects alongside English.',
    actionUrl: '/account/onboarding',
    actionLabel: 'Complete Profile',
    icon: 'profile',
  },
  {
    stepNumber: 2,
    title: 'Join Your Subject Telegram Classrooms',
    desc: 'Access the dedicated Telegram classrooms for Biology, Chemistry, Physics, English, and Mathematics.',
    actionUrl: '#classroomSection',
    actionLabel: 'View Classrooms',
    icon: 'telegram',
  },
  {
    stepNumber: 3,
    title: 'Master the Official Class Timetable',
    desc: 'Classes run Monday to Saturday from 7:00 PM to 11:10 PM with a 10-minute break between Session A and B.',
    actionUrl: '#timetableSection',
    actionLabel: 'Check Timetable',
    icon: 'calendar',
  },
  {
    stepNumber: 4,
    title: 'Study the 12-Week Intensive Curriculum',
    desc: 'Review the high-yield topic breakdown for all 5 subjects and mark upcoming Sunday drills and monthly mocks.',
    actionUrl: '#curriculumSection',
    actionLabel: 'Browse Curriculum',
    icon: 'book',
  },
  {
    stepNumber: 5,
    title: 'Practice with Kairo CBT Speed Drills',
    desc: 'Train with timed JAMB questions on Kairo Basic to build speed, accuracy, and eliminate silly exam errors.',
    actionUrl: '/tools',
    actionLabel: 'Launch Kairo CBT',
    icon: 'cbt',
  },
];
