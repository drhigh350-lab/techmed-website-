// TECHMED In-App Study Reader Content Engine
// Authoritative high-yield study materials, formula banks, and recall guides
// for UTME 2027 candidates and Nigerian university admission aspirants.

export interface ReaderSection {
  id: string;
  heading: string;
  subheading?: string;
  content: string; // Structured markdown-style / HTML content
  keyTakeaway?: string;
  formulaBox?: {
    formula: string;
    terms: { symbol: string; meaning: string }[];
    notes?: string;
  };
  examinerTrap?: {
    trap: string;
    fix: string;
  };
  workedExample?: {
    problem: string;
    stepByStep: string[];
    answer: string;
  };
}

export interface ReaderChapter {
  id: string;
  number: number;
  title: string;
  estimatedMinutes: number;
  isPreview: boolean; // First chapter / sample is free to preview
  sections: ReaderSection[];
}

export interface ReaderManual {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  subject: 'Chemistry' | 'Biology' | 'Physics' | 'Admission' | 'General';
  edition: string;
  author: string;
  totalChapters: number;
  estimatedTotalMinutes: number;
  targetExam: string;
  chapters: ReaderChapter[];
}

export const MANUALS: Record<string, ReaderManual> = {
  'chemistry-booster': {
    id: 'chemistry-booster',
    slug: 'chemistry-booster-system',
    title: 'Chemistry Booster System',
    subtitle: 'The Mole Concept Cure, Electrochemistry & High-Yield Formula Bank',
    subject: 'Chemistry',
    edition: '2027 Master Edition',
    author: 'TECHMED Academic Faculty',
    totalChapters: 5,
    estimatedTotalMinutes: 65,
    targetExam: 'UTME 2027 & Post-UTME Screening',
    chapters: [
      {
        id: 'ch1-mole-concept',
        number: 1,
        title: 'Chapter 1: The Mole Concept Cure & Stoichiometry',
        estimatedMinutes: 15,
        isPreview: true, // Free sample chapter for all students
        sections: [
          {
            id: 'mole-core-definition',
            heading: '1.1 The Fundamental Mole Formula Triangle',
            content: `The mole is the standard SI unit for amount of substance. In UTME Chemistry, over 30% of physical chemistry calculation questions depend directly on converting between mass, gas volume, particle count, and molar concentration.

Remember: One mole contains exactly Avogadro's number of particles:
N_A = 6.022 × 10²³ particles/mol.`,
            keyTakeaway: 'Always convert given values into moles first before setting up any stoichiometric ratio.',
            formulaBox: {
              formula: 'n = m / M = N / N_A = V / V_m = C × V_(dm³)',
              terms: [
                { symbol: 'n', meaning: 'Amount of substance in moles (mol)' },
                { symbol: 'm', meaning: 'Mass in grams (g)' },
                { symbol: 'M', meaning: 'Molar mass in g/mol' },
                { symbol: 'N', meaning: 'Number of discrete particles (atoms, molecules, ions)' },
                { symbol: 'N_A', meaning: "Avogadro's constant (6.022 × 10²³ mol⁻¹)" },
                { symbol: 'V', meaning: 'Volume of gas in dm³' },
                { symbol: 'V_m', meaning: 'Molar volume of ideal gas at S.T.P. (22.4 dm³/mol or 22,400 cm³/mol)' },
                { symbol: 'C', meaning: 'Molarity / Concentration in mol/dm³' },
              ],
              notes: 'At room temperature and pressure (R.T.P.), V_m = 24.0 dm³/mol.',
            },
            examinerTrap: {
              trap: 'Using 22.4 dm³ when the question specifies room conditions (25°C, 1 atm).',
              fix: 'Check the temperature! S.T.P. is 0°C (273 K) → use 22.4 dm³. R.T.P. is 25°C (298 K) → use 24.0 dm³.',
            },
            workedExample: {
              problem: 'Calculate the volume occupied at S.T.P. by 4.4 g of carbon(IV) oxide (CO₂). [C = 12, O = 16]',
              stepByStep: [
                'Step 1: Calculate the molar mass of CO₂: M = 12 + 2(16) = 44 g/mol.',
                'Step 2: Determine moles of CO₂: n = m / M = 4.4 g / 44 g/mol = 0.10 mol.',
                'Step 3: Convert moles to volume at S.T.P.: V = n × 22.4 dm³ = 0.10 × 22.4 = 2.24 dm³ (or 2,240 cm³).',
              ],
              answer: '2.24 dm³ at S.T.P.',
            },
          },
          {
            id: 'limiting-reagents',
            heading: '1.2 Limiting Reagents & Percentage Yield',
            content: `A limiting reagent is the reactant that is entirely consumed first in a chemical reaction, thereby dictating the maximum theoretical yield of products.

To determine the limiting reactant:
1. Calculate the available moles of each reactant.
2. Divide each molar amount by its stoichiometric coefficient in the balanced equation.
3. The smallest resulting number identifies the limiting reagent.`,
            keyTakeaway: 'Never calculate product yield using the reactant in excess; always base all stoichiometric steps on the limiting reactant.',
            examinerTrap: {
              trap: 'Assuming the reactant with fewer grams is always the limiting reagent.',
              fix: 'Grams do not react — moles react! You must convert to moles and divide by the reaction coefficient.',
            },
            workedExample: {
              problem: '4.0 g of Hydrogen gas reacts with 32.0 g of Oxygen gas to produce water: 2H₂ + O₂ → 2H₂O. Which reactant is limiting and what is the theoretical mass of water formed? [H = 1, O = 16]',
              stepByStep: [
                'Step 1: Calculate moles: n(H₂) = 4.0 / 2 = 2.0 mol. n(O₂) = 32.0 / 32 = 1.0 mol.',
                'Step 2: Compare with equation coefficients: For H₂: 2.0 mol / 2 = 1.0. For O₂: 1.0 mol / 1 = 1.0.',
                'Step 3: Both reactants are in exact stoichiometric proportions! Neither is in excess.',
                'Step 4: Moles of H₂O formed = 2.0 mol. Mass of H₂O = 2.0 mol × 18 g/mol = 36.0 g.',
              ],
              answer: 'Stoichiometric mixture (no limiting reactant in excess); 36.0 g of H₂O formed.',
            },
          },
        ],
      },
      {
        id: 'ch2-electrochemistry',
        number: 2,
        title: 'Chapter 2: Electrochemistry & Faraday’s Laws',
        estimatedMinutes: 14,
        isPreview: false,
        sections: [
          {
            id: 'faradays-laws',
            heading: '2.1 Quantitative Electrolysis (Faraday’s 1st & 2nd Laws)',
            content: `Faraday’s First Law states that the mass of substance deposited or liberated at an electrode is directly proportional to the quantity of electricity (Q) passed through the electrolyte.

Faraday’s Second Law states that when the same quantity of electricity is passed through different electrolytes, the masses of ions deposited are inversely proportional to their chemical valency (proportional to their chemical equivalents M / z).`,
            formulaBox: {
              formula: 'm = (M · I · t) / (z · F)',
              terms: [
                { symbol: 'm', meaning: 'Mass deposited in grams (g)' },
                { symbol: 'M', meaning: 'Molar mass of element (g/mol)' },
                { symbol: 'I', meaning: 'Electric current in Amperes (A)' },
                { symbol: 't', meaning: 'Time in seconds (s)' },
                { symbol: 'z', meaning: 'Number of electrons transferred per ion (valency/charge)' },
                { symbol: 'F', meaning: 'Faraday constant = 96,500 Coulombs/mol e⁻' },
              ],
              notes: 'Always ensure time (t) is converted to SECONDS before multiplying by current (I).',
            },
            examinerTrap: {
              trap: 'Forgetting to square or account for diatomic gas liberation (e.g. O₂ requires 4 Faradays per mole; Cl₂ requires 2 Faradays).',
              fix: '4OH⁻ → 2H₂O + O₂ + 4e⁻. Therefore, 1 mole of O₂ (22.4 dm³ at STP) requires 4 Faradays (4 × 96,500 C).',
            },
            workedExample: {
              problem: 'A steady current of 5.0 A is passed through copper(II) tetraoxosulphate(VI) solution for 32 minutes 10 seconds. Calculate the mass of copper deposited at the cathode. [Cu = 63.5, 1 F = 96,500 C]',
              stepByStep: [
                'Step 1: Convert time to seconds: t = (32 × 60) + 10 = 1,920 + 10 = 1,930 seconds.',
                'Step 2: Calculate total charge Q: Q = I × t = 5.0 A × 1,930 s = 9,650 Coulombs.',
                'Step 3: Cu²⁺ + 2e⁻ → Cu. z = 2 electrons per mole of Cu deposited.',
                'Step 4: Mass = (M × Q) / (z × F) = (63.5 × 9,650) / (2 × 96,500) = (63.5 × 1) / (20) = 3.175 g.',
              ],
              answer: '3.175 g of copper deposited.',
            },
          },
        ],
      },
      {
        id: 'ch3-equilibrium',
        number: 3,
        title: 'Chapter 3: Chemical Equilibrium & Le Chatelier’s Principle',
        estimatedMinutes: 12,
        isPreview: false,
        sections: [
          {
            id: 'le-chatelier',
            heading: '3.1 Le Chatelier’s Rules for UTME',
            content: `Le Chatelier's Principle states that when a system in dynamic equilibrium is subjected to a disturbance in concentration, temperature, or pressure, the system shifts in a direction that opposes that change.

Key Rules:
1. Temperature:
   - For an ENDOTHERMIC reaction (ΔH > 0): Increasing temperature shifts equilibrium forward (favoring products); Kc INCREASES.
   - For an EXOTHERMIC reaction (ΔH < 0): Increasing temperature shifts equilibrium backward (favoring reactants); Kc DECREASES.
2. Pressure (Gas systems only):
   - Increasing total pressure shifts equilibrium to the side with FEWER gas moles.
   - If moles of gaseous reactants equal moles of gaseous products (Δn_g = 0), pressure changes have NO effect on position.
3. Catalysts:
   - Catalysts speed up both forward and backward rates EQUALLY.
   - A catalyst NEVER changes equilibrium position and NEVER alters the numerical value of Kc.`,
            keyTakeaway: 'Only temperature can change the numerical equilibrium constant Kc. Concentration and pressure changes do not change Kc.',
            examinerTrap: {
              trap: 'Selecting catalyst as a factor that increases the percentage yield of products in Haber process.',
              fix: 'A catalyst only helps reach equilibrium faster; it does not shift the equilibrium position or increase product yield.',
            },
          },
        ],
      },
      {
        id: 'ch4-organic-roadmap',
        number: 4,
        title: 'Chapter 4: Organic Chemistry Reaction Pathways',
        estimatedMinutes: 12,
        isPreview: false,
        sections: [
          {
            id: 'organic-tests',
            heading: '4.1 Distinguishing Chemical Tests for Functional Groups',
            content: `UTME regularly presents pairs of organic compounds and asks how to distinguish between them in the laboratory.

1. Alkanes vs Alkenes/Alkynes (Test for unsaturation):
   - Bromine water test: Alkenes decolorize reddish-brown bromine water rapidly in the dark.
   - Alkaline KMnO₄ (Baeyer's reagent): Alkenes decolorize purple KMnO₄, forming a brown precipitate of MnO₂.

2. Terminal vs Non-terminal Alkynes:
   - Ammoniacal Silver Trioxonitrate(V) [Ag(NH₃)₂⁺]: Terminal alkynes (e.g. ethyne, but-1-yne) give a white/yellowish precipitate of silver dicarbide. Non-terminal alkynes (but-2-yne) give NO reaction.
   - Ammoniacal Copper(I) Chloride: Terminal alkynes produce a reddish-brown precipitate of copper(I) dicarbide.

3. Alkanols (Primary, Secondary, Tertiary):
   - Lucas Test (Conc. HCl + anhydrous ZnCl₂):
     - Tertiary alcohols: immediate turbidity / cloudiness.
     - Secondary alcohols: turbidity appears within 5 to 10 minutes.
     - Primary alcohols: no turbidity at room temperature; requires heating.`,
            keyTakeaway: 'Always check whether an alkyne has the triple bond at position 1 (terminal) or inside the chain.',
          },
        ],
      },
      {
        id: 'ch5-formula-bank',
        number: 5,
        title: 'Chapter 5: The Master Chemistry Formula Bank',
        estimatedMinutes: 12,
        isPreview: false,
        sections: [
          {
            id: 'chem-formulas',
            heading: '5.1 Fast-Recall Formulas & Conversions',
            content: `• Ideal Gas Equation: P·V = n·R·T (where R = 8.314 J·mol⁻¹·K⁻¹ or 0.0821 atm·dm³·mol⁻¹·K⁻¹)
• Graham’s Law of Diffusion: Rate₁ / Rate₂ = √(M₂ / M₁) = √(d₂ / d₁) = t₂ / t₁
• pH and pOH Relations:
  - pH = -log₁₀[H⁺]
  - pOH = -log₁₀[OH⁻]
  - pH + pOH = 14 at 25°C
  - [H⁺] × [OH⁻] = K_w = 1.0 × 10⁻¹⁴ mol²·dm⁻⁶
• Boiling Point & Freezing Point:
  - ΔT_b = K_b · m
  - ΔT_f = K_f · m
• Radioactive Decay Half-Life:
  - N = N₀ × (1/2)^(t / t_½)
  - Decay constant λ = 0.693 / t_½`,
            keyTakeaway: 'Memorize Graham’s law ratio inversion: heavier molecules diffuse slower, so Rate is inversely proportional to square root of density/molar mass.',
          },
        ],
      },
    ],
  },

  'biology-booster': {
    id: 'biology-booster',
    slug: 'biology-booster-system',
    title: 'Biology Booster System',
    subtitle: 'High-Yield Recall Tables, Common Examiner Traps & Genetics Keys',
    subject: 'Biology',
    edition: '2027 Master Edition',
    author: 'TECHMED Biology Team',
    totalChapters: 5,
    estimatedTotalMinutes: 55,
    targetExam: 'UTME 2027 & Post-UTME Screening',
    chapters: [
      {
        id: 'bio-ch1-cell-transport',
        number: 1,
        title: 'Chapter 1: Cell Physiology, Transport & Enzyme Kinetics',
        estimatedMinutes: 12,
        isPreview: true, // Preview chapter
        sections: [
          {
            id: 'bio-organelles',
            heading: '1.1 Organelle Functions & Diagnostic Characteristics',
            content: `In UTME Biology, cellular structure questions test understanding of metabolic division of labor.

Key Organelle Profiles:
• Mitochondrion: Site of cellular respiration (Krebs cycle in matrix, oxidative phosphorylation on inner folded cristae). Contains its own circular 70S DNA and ribosomes (endosymbiotic theory).
• Ribosome: Protein synthesis. Free ribosomes produce cytoplasmic proteins; rough ER-bound ribosomes synthesize export/secretory proteins and membrane proteins.
• Lysosome: Contains hydrolytic enzymes (acid hydrolases at pH 4.5–5.0) for intracellular digestion, autophagy, and programmed autolysis.
• Golgi Apparatus: Modifies, sorts, packages, and glycosylates proteins received from the rough endoplasmic reticulum.`,
            keyTakeaway: 'Mitochondria and chloroplasts are semi-autonomous organelles possessing their own DNA and reproducing by binary fission.',
            examinerTrap: {
              trap: 'Confusing cell wall function in plant cells: calling it selectively permeable.',
              fix: 'The plant cell wall is freely permeable to water and dissolved solutes; the plasma membrane (tonoplast / cell membrane) is selectively/differentially permeable.',
            },
          },
          {
            id: 'bio-transport',
            heading: '1.2 Osmosis, Plasmolysis & Turgidity',
            content: `• Hypotonic Solution (Low solute concentration, high water potential):
  - Animal cell (erythrocyte): Water enters rapidly → cell swells and bursts (haemolysis).
  - Plant cell: Water enters vacuole → protoplast expands against cell wall creating turgor pressure (cell becomes turgid; wall pressure prevents bursting).

• Hypertonic Solution (High solute concentration, low water potential):
  - Animal cell: Water leaves cell → cell shrinks with notched margins (crenation).
  - Plant cell: Water leaves vacuole → protoplast shrinks away from rigid cell wall (plasmolysis).

• Isotonic Solution: No net movement of water. Protoplast is flaccid.`,
            keyTakeaway: 'Turgidity provides crucial mechanical support in non-woody, herbaceous plant stems and maintains open stomatal pores.',
          },
        ],
      },
      {
        id: 'bio-ch2-genetics',
        number: 2,
        title: 'Chapter 2: Genetics, Inheritance & Genetic Disorders',
        estimatedMinutes: 12,
        isPreview: false,
        sections: [
          {
            id: 'bio-mendel-crosses',
            heading: '2.1 Mendelian Ratios & ABO Blood Inheritance',
            content: `• Monohybrid cross of two heterozygotes (Aa × Aa):
  - Genotypic ratio: 1 AA : 2 Aa : 1 aa (1:2:1)
  - Phenotypic ratio: 3 Dominant : 1 Recessive (3:1)
• Dihybrid cross of two double heterozygotes (AaBb × AaBb):
  - Phenotypic ratio: 9 : 3 : 3 : 1
• Test Cross (Backcross): Crossing an individual showing dominant phenotype with a homozygous recessive (aa).
  - If all offspring show dominant trait → parent is AA.
  - If 1 dominant : 1 recessive (1:1 ratio) → parent is Aa.

• ABO Blood System Multiple Alleles:
  - Three alleles: I^A, I^B, and I^O.
  - I^A and I^B are codominant with respect to each other; both are dominant over I^O.
  - Blood group AB (I^A I^B) exhibits codominance. Group O is homozygous recessive (I^O I^O).`,
            keyTakeaway: 'A parent with blood group AB can never have a biological child with blood group O, regardless of the partner’s blood group.',
          },
        ],
      },
      {
        id: 'bio-ch3-ecology',
        number: 3,
        title: 'Chapter 3: Ecology, Trophic Pyramids & Nutrient Cycles',
        estimatedMinutes: 10,
        isPreview: false,
        sections: [
          {
            id: 'bio-nitrogen-cycle',
            heading: '3.1 The 4 High-Yield Bacterial Players in the Nitrogen Cycle',
            content: `Nitrogen cannot be utilized directly by green plants as atmospheric N₂ gas; it must be fixed into nitrates (NO₃⁻).

1. Nitrogen-Fixing Bacteria:
   - Symbiotic: Rhizobium leguminosarum in root nodules of leguminous plants.
   - Free-living aerobic: Azotobacter.
   - Free-living anaerobic: Clostridium.
2. Nitrifying Bacteria (Chemosynthetic autotrophs):
   - Nitrosomonas / Nitrococcus: oxidizes ammonia (NH₃) to nitrites (NO₂⁻).
   - Nitrobacter: oxidizes nitrites (NO₂⁻) to nitrates (NO₃⁻).
3. Putrefying / Decomposing Bacteria: break down dead organic proteins into ammonium compounds.
4. Denitrifying Bacteria (Pseudomonas denitrificans, Thiobacillus): converts nitrates back into atmospheric nitrogen gas (N₂), reducing soil fertility.`,
            keyTakeaway: 'Waterlogged, poorly aerated soils promote denitrification because denitrifying bacteria thrive under anaerobic conditions.',
          },
        ],
      },
      {
        id: 'bio-ch4-physiology',
        number: 4,
        title: 'Chapter 4: Human Physiology Quick-Recall Tables',
        estimatedMinutes: 11,
        isPreview: false,
        sections: [
          {
            id: 'bio-hormones',
            heading: '4.1 Endocrine Glands, Secretions & Deficiency Syndromes',
            content: `• Pituitary Gland (Hypophysis):
  - Somatotropin (Growth Hormone): oversecretion in childhood → Gigantism; in adulthood → Acromegaly. Undersecretion in childhood → Pituitary Dwarfism.
  - Antidiuretic Hormone (ADH / Vasopressin): produced in hypothalamus, stored in posterior pituitary. Promotes water reabsorption in distal convoluted tubule and collecting duct. Deficiency leads to Diabetes Insipidus (polyuria with sugar-free urine).
• Thyroid Gland:
  - Thyroxine: regulates basal metabolic rate. Deficiency in infancy → Cretinism (mental retardation + stunted growth). In adults → Myxedema and Endemic Goitre (due to iodine deficiency).
• Pancreas (Islets of Langerhans):
  - Beta cells: Insulin (converts excess glucose to glycogen in liver; deficiency → Diabetes Mellitus).
  - Alpha cells: Glucagon (stimulates glycogenolysis during fasting).`,
            keyTakeaway: 'Diabetes insipidus is caused by lack of ADH (water balance problem, sugar-free urine), whereas Diabetes mellitus is caused by insulin deficiency (elevated glucose in blood and urine).',
          },
        ],
      },
      {
        id: 'bio-ch5-traps',
        number: 5,
        title: 'Chapter 5: Examiner Traps & High-Frequency Patterns',
        estimatedMinutes: 10,
        isPreview: false,
        sections: [
          {
            id: 'bio-examiner-traps',
            heading: '5.1 Frequent Examiner Traps in Past 5 Years',
            content: `1. Epigeal vs Hypogeal Germination:
   - Epigeal: elongation of hypocotyl pushes cotyledons above ground (e.g., cowpea, castor oil, bean).
   - Hypogeal: elongation of epicotyl keeps cotyledons below ground (e.g., maize, sorghum, broad bean).
2. Xylem vs Phloem Transport:
   - Xylem transports water and dissolved mineral salts unidirectionally (upwards from roots to leaves) via transpiration pull, root pressure, and capillary action. Xylem vessels are non-living at maturity.
   - Phloem translocates manufactured food (sucrose, amino acids) bidirectionally from source (leaves) to sink (fruits, roots, growing shoots). Sieve tubes are living cells accompanied by companion cells.
3. Arteries vs Veins:
   - Pulmonary artery carries DEOXYGENATED blood from right ventricle to lungs.
   - Pulmonary vein carries OXYGENATED blood from lungs to left atrium.`,
            keyTakeaway: 'The pulmonary artery is the only artery carrying deoxygenated blood; the pulmonary vein is the only vein carrying oxygenated blood in adult circulation.',
          },
        ],
      },
    ],
  },

  'physics-booster': {
    id: 'physics-booster',
    slug: 'physics-booster-system',
    title: 'Physics Booster System',
    subtitle: 'The Ultimate Formula Bank, Examiner Traps & Speed Problem-Solving',
    subject: 'Physics',
    edition: '2027 Master Edition',
    author: 'TECHMED Physics Faculty',
    totalChapters: 5,
    estimatedTotalMinutes: 60,
    targetExam: 'UTME 2027 & Post-UTME Screening',
    chapters: [
      {
        id: 'phys-ch1-mechanics',
        number: 1,
        title: 'Chapter 1: Kinematics, Projectile Motion & Dynamics',
        estimatedMinutes: 15,
        isPreview: true, // Preview chapter
        sections: [
          {
            id: 'phys-motion-eq',
            heading: '1.1 Linear Motion & Projectile Master Equations',
            content: `Linear motion under constant acceleration forms the bedrock of Newtonian mechanics.

Equations of Motion:
1. v = u + at
2. s = ut + ½ at²
3. v² = u² + 2as
4. s = [(u + v) / 2] × t`,
            formulaBox: {
              formula: 'T = (2u·sinθ)/g | H_max = (u²·sin²θ)/(2g) | R = (u²·sin2θ)/g',
              terms: [
                { symbol: 'u', meaning: 'Initial launch velocity (m/s)' },
                { symbol: 'θ', meaning: 'Angle of projection with horizontal' },
                { symbol: 'g', meaning: 'Acceleration due to gravity (9.8 or 10 m/s²)' },
                { symbol: 'T', meaning: 'Total time of flight' },
                { symbol: 'H_max', meaning: 'Maximum vertical height reached' },
                { symbol: 'R', meaning: 'Horizontal range' },
              ],
              notes: 'Maximum horizontal range is achieved when launch angle θ = 45°, where sin(2θ) = sin(90°) = 1.',
            },
            examinerTrap: {
              trap: 'Forgetting that horizontal velocity remains constant throughout projectile flight (u_x = u·cosθ, a_x = 0).',
              fix: 'Only the vertical velocity changes due to gravity (v_y = u·sinθ - gt). At maximum height, v_y = 0, but v_x is STILL u·cosθ!',
            },
            workedExample: {
              problem: 'A ball is projected with a speed of 40 m/s at an angle of 30° to the horizontal. Calculate the maximum height reached and the horizontal range. [g = 10 m/s²]',
              stepByStep: [
                'Step 1: Calculate sin(30°) = 0.5. sin²(30°) = 0.25. sin(2 × 30°) = sin(60°) = √3 / 2 ≈ 0.866.',
                'Step 2: H_max = (u² · sin²θ) / (2g) = (40² × 0.25) / (2 × 10) = (1600 × 0.25) / 20 = 400 / 20 = 20 meters.',
                'Step 3: Range R = (u² · sin2θ) / g = (1600 × 0.866) / 10 = 160 × 0.866 = 138.56 meters.',
              ],
              answer: 'Maximum height = 20 m; Horizontal range = 138.6 m.',
            },
          },
        ],
      },
      {
        id: 'phys-ch2-waves-optics',
        number: 2,
        title: 'Chapter 2: Waves, Resonance & Geometric Optics',
        estimatedMinutes: 12,
        isPreview: false,
        sections: [
          {
            id: 'phys-sound-resonance',
            heading: '2.1 Acoustic Resonance in Organ Pipes',
            content: `• Closed Pipe (Closed at one end, open at one end):
  - Fundamental frequency (1st harmonic): L = λ / 4 → f₁ = v / (4L)
  - 1st overtone (3rd harmonic): L = 3λ / 4 → f₃ = 3v / (4L) = 3f₁
  - 2nd overtone (5th harmonic): L = 5λ / 4 → f₅ = 5v / (4L) = 5f₁
  - KEY RULE: Closed pipes produce ONLY ODD harmonics (1, 3, 5, 7...).

• Open Pipe (Open at both ends):
  - Fundamental frequency (1st harmonic): L = λ / 2 → f₁ = v / (2L)
  - 1st overtone (2nd harmonic): L = λ → f₂ = 2v / (2L) = 2f₁
  - KEY RULE: Open pipes produce ALL harmonics (1, 2, 3, 4...). Because of this richer harmonic content, open pipes sound more musical than closed pipes.`,
            keyTakeaway: 'An open pipe of length L has a fundamental frequency twice that of a closed pipe of the same length (f_open = 2 × f_closed).',
          },
        ],
      },
      {
        id: 'phys-ch3-electricity',
        number: 3,
        title: 'Chapter 3: Electric Circuits, Magnetism & Induction',
        estimatedMinutes: 12,
        isPreview: false,
        sections: [
          {
            id: 'phys-circuits',
            heading: '3.1 Emf, Internal Resistance & Galvanometer Conversions',
            content: `• Internal Resistance:
  E = I(R + r) = V + Ir
  Where E = total electromotive force, V = terminal potential difference, I = current, R = external load, r = internal resistance.
  Lost volts = I · r.

• Converting Galvanometer to Ammeter:
  - Connect a low resistance (SHUNT, S) in PARALLEL with the galvanometer coil.
  - S = (I_g · R_g) / (I - I_g)

• Converting Galvanometer to Voltmeter:
  - Connect a high resistance (MULTIPLIER, M) in SERIES with the galvanometer coil.
  - M = (V / I_g) - R_g`,
            keyTakeaway: 'Remember: Ammeter = Shunt in Parallel; Voltmeter = Multiplier in Series.',
          },
        ],
      },
      {
        id: 'phys-ch4-thermodynamics',
        number: 4,
        title: 'Chapter 4: Thermal Physics & Gas Laws',
        estimatedMinutes: 10,
        isPreview: false,
        sections: [
          {
            id: 'phys-heat-capacity',
            heading: '4.1 Specific Heat vs Latent Heat Problems',
            content: `• Sensible heat change (Temperature varies):
  Q = m · c · Δθ (where c is specific heat capacity in J·kg⁻¹·K⁻¹)
• Latent heat phase change (Temperature remains CONSTANT):
  Q = m · L (where L is specific latent heat of fusion or vaporization)
• Method of Mixtures:
  Heat lost by hot body = Heat gained by cold body + calorimeter.
  m₁ · c₁ · (θ₁ - θ_final) = m₂ · c₂ · (θ_final - θ₂) + m_cal · c_cal · (θ_final - θ₂)`,
            examinerTrap: {
              trap: 'Forgetting the latent heat step when converting ice at 0°C to water at 50°C.',
              fix: 'Ice at 0°C must FIRST absorb latent heat of fusion (Q₁ = m·L_f) to become water at 0°C, then absorb sensible heat (Q₂ = m·c·Δθ) to reach 50°C. Total Q = Q₁ + Q₂.',
            },
          },
        ],
      },
      {
        id: 'phys-ch5-formula-bank',
        number: 5,
        title: 'Chapter 5: The Comprehensive Physics Formula Bank',
        estimatedMinutes: 11,
        isPreview: false,
        sections: [
          {
            id: 'phys-all-formulas',
            heading: '5.1 20 Essential Physics Calculation Formulas',
            content: `1. Work, Energy & Power: W = F·s·cosθ; KE = ½mv²; PE = mgh; Power = W/t = F·v
2. Gravitational Force: F = G(m₁m₂)/r²; g = GM/R²
3. Escape Velocity: v_esc = √(2gR) ≈ 11.2 km/s on Earth
4. Hooke’s Law: F = k·e; Elastic PE = ½ke² = ½Fe
5. Simple Pendulum Period: T = 2π√(L/g)
6. Wave Velocity: v = f·λ = λ/T
7. Mirror / Lens Formula: 1/f = 1/u + 1/v (Real-is-positive convention)
8. Refractive Index: n = sin(i) / sin(r) = Real depth / Apparent depth = c / v
9. Critical Angle: sin(c) = 1/n
10. Capacitors in Parallel: C = C₁ + C₂ + C₃
11. Capacitors in Series: 1/C = 1/C₁ + 1/C₂ + 1/C₃
12. Energy in Capacitor: E = ½CV² = ½QV = ½Q²/C
13. Magnetic Force on Current Wire: F = B·I·L·sinθ
14. Transformer Equation: V_s / V_p = N_s / N_p = I_p / I_s (assuming 100% efficiency)
15. Photoelectric Equation: E = hf = W₀ + KE_max = hf₀ + ½mv_max²
16. De Broglie Wavelength: λ = h / (m·v)
17. Mass-Energy Equivalence: E = Δm · c²`,
            keyTakeaway: 'Notice the inverse symmetry: Resistors in series add directly, but capacitors in series add reciprocally.',
          },
        ],
      },
    ],
  },

  'admission-intelligence-guide-2026': {
    id: 'admission-intelligence-guide-2026',
    slug: 'techmed-admission-intelligence-guide-2026',
    title: 'TECHMED Admission Intelligence Guide 2026',
    subtitle: 'The Strategic Nigerian University Admission Blueprint & Cut-Off Engine',
    subject: 'Admission',
    edition: '2026/2027 Official Edition',
    author: 'TECHMED Admission Strategists',
    totalChapters: 4,
    estimatedTotalMinutes: 40,
    targetExam: 'JAMB CAPS, Merit Lists & Post-UTME Screening',
    chapters: [
      {
        id: 'adm-ch1-caps',
        number: 1,
        title: 'Chapter 1: The Anatomy of JAMB CAPS & Quota Distribution',
        estimatedMinutes: 10,
        isPreview: true, // Preview chapter (Free resource)
        sections: [
          {
            id: 'adm-caps-overview',
            heading: '1.1 How JAMB Central Admission Processing System Actually Works',
            content: `The Nigerian university admission system is governed entirely by the JAMB Central Admission Processing System (CAPS). No university can legally admit any candidate outside of CAPS.

Key Features of CAPS:
• Admission Status Tracking: Recommended → Approved by JAMB → Accepted by Candidate.
• The Marketplace: Universities with unfilled quotas search for qualified candidates who met their cutoff but were not admitted by their first-choice institutions.
• Transfer List: If your aggregate score is insufficient for your initial competitive course (e.g., Medicine), the institution proposes a transfer to an allied programme (e.g., Anatomy, Physiology). You MUST accept this transfer on CAPS before admission can be finalized!`,
            keyTakeaway: 'Always monitor your CAPS profile via desktop mode on mobile. An admission offer not accepted within the announced window can be revoked.',
          },
          {
            id: 'adm-quotas',
            heading: '1.2 The Federal Quota Allocation Formula',
            content: `Federal Universities in Nigeria admit students based on three statutory quotas:
1. 45% National Merit: Open to all candidates across the 36 states and FCT based strictly on highest aggregate scores.
2. 35% Catchment Area (Locality): Reserved for candidates originating from the designated geopolitical or geographical zone of the institution.
3. 20% Educationally Less Developed States (ELDS): Reserved for candidates from specified states designated as educationally disadvantaged.`,
            keyTakeaway: 'Catchment cut-offs are consistently lower than general merit cut-offs, providing a critical tactical edge for candidates applying within their home catchment.',
          },
        ],
      },
      {
        id: 'adm-ch2-aggregates',
        number: 2,
        title: 'Chapter 2: Master Formulas for Calculating University Aggregate Scores',
        estimatedMinutes: 10,
        isPreview: true,
        sections: [
          {
            id: 'adm-aggregates-calc',
            heading: '2.1 Aggregate Calculation Formulas Across Major Universities',
            content: `Different universities use distinct mathematical systems to evaluate applicants.

1. UNILAG (University of Lagos): 100% Total Scale
   • UTME Score: Divided by 8 (Maximum = 50 marks)
   • Post-UTME Score: 30 marks
   • O'Level (5 core subjects): Maximum = 20 marks
     - A1 = 4.0 marks
     - B2 = 3.6 marks
     - B3 = 3.2 marks
     - C4 = 2.8 marks
     - C5 = 2.4 marks
     - C6 = 2.0 marks
   • Total Aggregate = (UTME / 8) + Post-UTME + O'Level Score.

2. UI (University of Ibadan): 100% Total Scale
   • UTME Score: Divided by 8 (Maximum = 50 marks)
   • Post-UTME Screening: Divided by 2 (Maximum = 50 marks)
   • Total Aggregate = (UTME / 8) + (Post-UTME / 2).

3. OAU (Obafemi Awolowo University): 100% Scale
   • UTME: 50%
   • Post-UTME: 40%
   • O'Level: 10%`,
            keyTakeaway: 'For UNILAG and OAU, weak O’Level results (e.g., C6s instead of A1s) can cost you 8 to 10 marks on your aggregate — equivalent to 80 points in JAMB!',
          },
        ],
      },
      {
        id: 'adm-ch3-contingency',
        number: 3,
        title: 'Chapter 3: Strategic Contingency & Course-Switching Playbook',
        estimatedMinutes: 10,
        isPreview: true,
        sections: [
          {
            id: 'adm-switching',
            heading: '3.1 When and How to Switch Course Before CAPS Closes',
            content: `When your aggregate falls 3 to 5 points below the departmental merit cutoff for high-demand programs (Medicine, Law, Nursing, Computer Science):
1. Immediately review the cutoffs for allied courses in the same faculty.
2. Ensure your UTME subject combination satisfies the new programme’s O’Level and JAMB brochure requirement.
3. Apply for Change of Course at an accredited JAMB CBT centre before the university uploads its supplemental list.`,
            keyTakeaway: 'Never wait until admission lists are completely published before exploring strategic switches. First-tier supplementary lists fill up in days.',
          },
        ],
      },
      {
        id: 'adm-ch4-checklists',
        number: 4,
        title: 'Chapter 4: Pre-Screening Document & Verification Checklist',
        estimatedMinutes: 10,
        isPreview: true,
        sections: [
          {
            id: 'adm-checklist',
            heading: '4.1 Required Documents for Physical & Online Clearance',
            content: `• Original JAMB Result Slip (with passport photograph)
• Original JAMB Admission Letter (Institution & Candidate copies)
• WAEC / NECO / NABTEB Statement of Results or Original Certificate
• Local Government Identification Certificate / State of Origin
• Birth Certificate or Statutory Declaration of Age
• Testimonial from Secondary School attended
• Post-UTME Screening Registration Slip & Payment Receipt
• 12 to 16 recent passport photographs with red/white background as specified`,
            keyTakeaway: 'Check that your name is spelled identically across your NIN, JAMB profile, WAEC certificate, and birth certificate. Discrepancies cause painful clearance delays.',
          },
        ],
      },
    ],
  },
};

export function getReaderManual(resourceIdOrSlug: string): ReaderManual | null {
  // Direct ID match
  if (MANUALS[resourceIdOrSlug]) return MANUALS[resourceIdOrSlug];

  // Slug match
  for (const manual of Object.values(MANUALS)) {
    if (manual.slug === resourceIdOrSlug || manual.id === resourceIdOrSlug) {
      return manual;
    }
  }

  // Fallback map
  const aliasMap: Record<string, string> = {
    'chemistry-booster-system': 'chemistry-booster',
    'biology-booster-system': 'biology-booster',
    'physics-booster-system': 'physics-booster',
    'techmed-admission-intelligence-guide-2026': 'admission-intelligence-guide-2026',
    'admission-guide': 'admission-intelligence-guide-2026',
  };

  const aliased = aliasMap[resourceIdOrSlug];
  if (aliased && MANUALS[aliased]) {
    return MANUALS[aliased];
  }

  return null;
}
