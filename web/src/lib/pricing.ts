// TECHMED UTME 2027 Pricing & Packages Data
// Sourced directly from TECHMED UTME 2027 Programme Specifications

export interface PricingPlan {
  id: 'core' | 'mastery' | 'ultimate';
  name: string;
  badge?: string;
  isPopular?: boolean;
  isBestValue?: boolean;
  positioning: string;
  prices: {
    mainAmount: string;
    mainPeriod: string;
    secondaryOption?: string;
    earlyBird?: {
      amount: string;
      condition: string;
    };
    coverageNote?: string;
  };
  features: string[];
  note?: string;
  ctaLabel: string;
  whatsappMessage: string;
}

export interface CompactQuestion {
  question: string;
  answer: string;
}

export const PROGRAMME_DETAILS = {
  heading: 'Choose your preparation plan.',
  supportingText: 'One structured programme. Three ways to prepare for UTME 2027.',
  startDate: '30 November 2026',
  earlyBirdDate: '15 November 2026',
  supportPhone: '2347044255045',
  supportDisplayPhone: '0704 425 5045',
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'core',
    name: 'TECHMED Core',
    positioning: 'Structured teaching and consistent practice.',
    prices: {
      mainAmount: '₦18,000',
      mainPeriod: 'for three months upfront',
      secondaryOption: '₦7,000 / month',
      earlyBird: {
        amount: '₦15,000',
        condition: 'for three months upfront when payment is completed before 15 November 2026',
      },
    },
    features: [
      'Intensive live classes in English, Biology, Chemistry, Physics and Mathematics.',
      'Four hours of live teaching daily, Monday to Saturday.',
      'Structured 12-week curriculum with study notes.',
      'Explanatory teaching, worked examples and JAMB-style question application.',
      'Kairo CBT practice.',
      'Weekly CBT drills, except on scheduled monthly mock days.',
      'Three scheduled JAMB-standard mock examinations: 180 questions in two hours per mock.',
      'Strategy sessions, cumulative revision and extension reviews.',
      'Tutor access for questions and clarification.',
      '20% discount on eligible TECHMED e-books while actively enrolled.',
    ],
    ctaLabel: 'Choose Core',
    whatsappMessage: "Hello TECHMED, I'm interested in enrolling in TECHMED Core for UTME 2027. Please guide me through the enrolment process.",
  },
  {
    id: 'mastery',
    name: 'TECHMED Mastery',
    badge: 'MOST POPULAR',
    isPopular: true,
    positioning: 'The complete core programme plus a wider collection of study resources.',
    prices: {
      mainAmount: '₦25,000',
      mainPeriod: 'for three months',
      earlyBird: {
        amount: '₦20,000',
        condition: 'when payment is completed before 15 November 2026',
      },
    },
    features: [
      'Everything included in TECHMED Core.',
      'Secrets to Mental Math.',
      'Physics Formula Workbook.',
      'Chemistry Formula Workbook.',
      'Mathematics Formula Workbook.',
      'The Mole Concept Cure.',
      'Organic Chemistry Mastery Manual.',
      'Metals & Their Compounds Manual.',
      'Non-metals & Their Compounds Manual.',
      'Genetics & Ecology Mastery Manual.',
      'English Lexis, Structure & Oral Guide.',
      'Physics Mechanics & Electricity Manual.',
    ],
    note: 'All included Mastery resources will be provided on or before 30 November 2026. No separate purchase is required for resources included in this package.',
    ctaLabel: 'Choose Mastery',
    whatsappMessage: "Hello TECHMED, I'm interested in enrolling in TECHMED Mastery for UTME 2027. Please guide me through the enrolment process.",
  },
  {
    id: 'ultimate',
    name: 'TECHMED Ultimate',
    badge: 'BEST VALUE',
    isBestValue: true,
    positioning: 'The broader preparation package, with additional intensive practice and final revision support.',
    prices: {
      mainAmount: '₦40,000',
      mainPeriod: 'one-time payment',
      coverageNote: 'Programme coverage through UTME 2027',
    },
    features: [
      'Everything included in TECHMED Mastery.',
      'Organic Chemistry Bootcamp 1.0.',
      'The Mole Concept Cure Bootcamp 2.0.',
      'Operation 100 Intensive CBT Bootcamp.',
      'Chemistry revision package.',
      'Biology revision package.',
      'Physics revision package.',
      'Final revision classes scheduled for March/April 2027.',
      'Founder mentorship for 20 eligible students whose places are explicitly confirmed.',
    ],
    note: "Included Mastery and Ultimate resources will be provided on or before 30 November 2026. Later revision activities and bootcamps will follow their announced delivery schedules. Founder mentorship is limited and not automatically included for every Ultimate enrolment unless the student's place has been confirmed.",
    ctaLabel: 'Choose Ultimate',
    whatsappMessage: "Hello TECHMED, I'm interested in enrolling in TECHMED Ultimate for UTME 2027. Please guide me through the enrolment process and confirm mentorship availability.",
  },
];

export const COMPACT_QUESTIONS: CompactQuestion[] = [
  {
    question: 'When do classes begin?',
    answer: 'Classes begin on 30 November 2026.',
  },
  {
    question: 'How long does the core teaching programme run?',
    answer:
      'The core teaching programme runs for 12 weeks: 30 November 2026 to 21 February 2027. Live classes take place on Telegram using texts, voice notes and images, covering four hours daily from Monday to Saturday.',
  },
  {
    question: 'When are Mastery and Ultimate resources delivered?',
    answer:
      'All included Mastery and Ultimate resources will be provided to enrolled students on or before 30 November 2026. Later revision activities, bootcamps and final revision classes included in Ultimate will follow their announced delivery schedules leading into UTME 2027.',
  },
  {
    question: 'How does monthly Core renewal work?',
    answer:
      'Monthly Core enrolments (₦7,000 per month) require renewal each month to maintain active access to daily Telegram classes, tutor clarification and Kairo CBT practice.',
  },
  {
    question: 'How can a parent or student ask a question?',
    answer:
      'You can message our admissions desk directly on WhatsApp at 07044255045. We are glad to answer questions, confirm subject combinations, or guide you through enrolment.',
  },
];

export interface BonusValueItem {
  benefit: string;
  standaloneValue: string;
}

export const WHY_ULTIMATE_DATA = {
  eyebrow: 'WHY ULTIMATE?',
  headline: '₦40,000 for all this? Yes. Everything in one package.',
  supportingCopy: "Let's put it this way: you pay just ₦15,000 more than standard-price Mastery—and unlock a whole lot more.",
  tableIntro: "Here's what comes on top of everything included in Mastery:",
  bonusItems: [
    { benefit: 'Organic Chemistry Bootcamp 1.0', standaloneValue: '₦3,000' },
    { benefit: 'The Mole Concept Cure Bootcamp 2.0', standaloneValue: '₦3,000' },
    { benefit: 'Operation 100 Intensive CBT Bootcamp', standaloneValue: '₦3,000' },
    { benefit: 'Four subject revision packages', standaloneValue: '₦20,000' },
    { benefit: 'Final revision classes', standaloneValue: '₦7,000' },
  ] as BonusValueItem[],
  totalValue: '₦36,000',
  valueQualification:
    "And that's before counting your Mastery resources, regular classes, and the additional guidance available through our founder mentorship opportunity.",
  benefitsHeadline: "You're not just paying for classes. You're investing in a complete preparation package.",
  preparationBenefits: [
    'Learn through structured live classes across your subjects.',
    'Practise with Kairo CBT and intensive examination preparation.',
    'Strengthen weak areas with specialist bootcamps and subject revision packages.',
    'Prepare for the final stretch with dedicated revision classes.',
    'Get a chance at closer guidance through one of just 20 founder mentorship places, available to eligible students whose places are confirmed.',
  ],
  offerHeadline: 'Ultimate: ₦40,000 once. Through UTME 2027.',
  offerSupporting: 'No monthly class renewals. No separate payment for the listed included bonuses.',
  offerClosing: 'If you want the most comprehensive TECHMED preparation package, this is the one to consider.',
  ctaLabel: 'CHOOSE ULTIMATE',
  whatsappMessage: "Hello TECHMED, I'm interested in the Ultimate plan for UTME 2027. Please share the enrolment details.",
};

