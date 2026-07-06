//TECHMED.NGv8.0—Admission Predictor Engine
//Corrected Formulas ·Real Aggregate Calculations ·Verified Cutoffs
//Built by Tutor TechMed —Think Smart.Perform Elite.

/*============================================================
UNIVERSITY DATA PROFILES —VERIFIED 2025/2026
============================================================*/

const universityProfiles = {

//===FEDERAL UNIVERSITIES (POST UTME)===

//UNILAG: JAMB/8(50%)+Post UTME (30%)+O'Level (20%)=100
//O'Level: A1=4.0,B2=3.6,B3=3.2,C4=2.8,C5=2.4,C6=2.0(5subjects,max 20)
//Post UTME out of 30
"UNILAG": {
name: "University of Lagos",
formula: "JAMB/8+Post UTME (out of 30)+O'Level (out of 20)",
formulaType: "unilag",
postUtmeMax: 30,
minJamb: 200,
minPostUtmePass: 15,
selectivity: 1.45,
volatility: 1.30,
stateSchool: false,
oneSittingRequired: ["medicine and surgery","pharmacy","nursing","dentistry","law"],
olevelMax: 20
},

//UI: JAMB/8(50%)+Post UTME/2(50%)=100
"UI": {
name: "University of Ibadan",
formula: "JAMB/8+Post UTME/2",
formulaType: "standard",
postUtmeMax: 100,
minJamb: 200,
minPostUtmePass: 50,
selectivity: 1.50,
volatility: 1.35,
stateSchool: false,
oneSittingRequired: ["medicine and surgery","pharmacy","nursing","dentistry","law"],
olevelMax: 0
},

//OAU: JAMB/8(50%)+Post UTME (40%)+O'Level avg (10%)=100
//Post UTME out of 40(NOT 100!)
//O'Level: A1=10,B2=9,B3=8,C4=7,C5=6,C6=5(5subjects), averaged over 5 subjects → max 10
"OAU": {
name: "Obafemi Awolowo University",
formula: "JAMB/8+Post UTME (out of 40)+O'Level (out of 10)",
formulaType: "oau",
postUtmeMax: 40,
minJamb: 200,
minPostUtmePass: 20,
selectivity: 1.40,
volatility: 1.20,
stateSchool: false,
oneSittingRequired: ["medicine and surgery","pharmacy","nursing","dentistry"],
olevelMax: 10
},

//UNILORIN: JAMB/8(50%)+(Post UTME/100)*30(30%)+O'Level (20%)=100
//O'Level: A1=4.0,B2=3.6,B3=3.2,C4=2.8,C5=2.4,C6=2.0(5subjects,max 20)
"UNILORIN": {
name: "University of Ilorin",
formula: "JAMB/8+(Post UTME/100)*30+O'Level (out of 20)",
formulaType: "unilorin",
postUtmeMax: 100,
minJamb: 180,
minPostUtmePass: 50,
selectivity: 1.35,
volatility: 1.15,
stateSchool: false,
oneSittingRequired: ["medicine and surgery","pharmacy","nursing"],
olevelMax: 20
},

//UNN: Screening —JAMB (90%)+O'Level (10%)=400scale
//O'Level: A1=90,B2=80,B3=70,C4=60,C5=50,C6=40(4core subjects)
//One sitting bonus: +40points
//O'Level scaled: (sum +bonus)*0.1
//JAMB: score *0.9
"UNN": {
name: "University of Nigeria",
formula: "JAMB (90%)+O'Level (10%)",
formulaType: "unn",
postUtmeMax: 0,
minJamb: 160,
selectivity: 1.35,
volatility: 1.20,
stateSchool: false,
oneSittingRequired: ["medicine and surgery","pharmacy","nursing"],
olevelMax: 10
},

//UNIBEN: JAMB/8(50%)+Post UTME/2(50%)=100
"UNIBEN": {
name: "University of Benin",
formula: "JAMB/8+Post UTME/2",
formulaType: "standard",
postUtmeMax: 100,
minJamb: 200,
minPostUtmePass: 50,
selectivity: 1.30,
volatility: 1.15,
stateSchool: false,
oneSittingRequired: ["medicine and surgery","pharmacy"],
olevelMax: 0
},

//UNIZIK: Screening —UTME (70%)+O'Level (30%)=100
//Evaluates 4subjects matching UTME combination
//O'Level: A1=90,B2=80,B3=70,C4=60,C5=55,C6=50(4subjects,max 360)
//Single sitting: +10bonus | Two sittings: no bonus
//Aggregate =(UTME × 0.7)+((O'Level +Bonus)× 0.3)
"UNIZIK": {
name: "Nnamdi Azikiwe University",
formula: "JAMB (70%)+O'Level (30%) | Screening Only",
formulaType: "unizik",
postUtmeMax: 0,
minJamb: 160,
selectivity: 1.25,
volatility: 1.10,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 30
},

//ABU 2026 CONFIRMED: Post UTME CBT written exam (Doc 4)
//Formula: (JAMB + PostUTME_score) / 2 — both scores out of 400, result out of 400
//Converted to %: aggregate = (JAMB + PostUTME) / 2, shown as /400
//70-question CBT: 25 English + 15 each of 3 subjects
"ABU": {
name: "Ahmadu Bello University",
formula: "(JAMB + Post UTME Score) ÷ 2",
formulaType: "abu",
postUtmeMax: 400,
minJamb: 180,
minPostUtmePass: 50,
selectivity: 1.20,
volatility: 1.10,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 0
},

//FUTA 2026 CONFIRMED: Online Screening — 75:25 (Doc 4)
//JAMB (75%): (JAMB/400)*75 | O'Level (25%): avg of 5 subjects (A1=80,B2=72,B3=67,C4=62,C5=57,C6=52) /5 *25
"FUTA": {
name: "Federal University of Technology, Akure",
formula: "JAMB (75%)+O'Level avg (25%) | Screening Only",
formulaType: "futa",
postUtmeMax: 0,
minJamb: 180,
selectivity: 1.30,
volatility: 1.15,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 25
},

//FUTMINNA: JAMB/8(50%)+Screening Assessment (max 5pts)
//A_FUTMINNA = JAMB/8 + P_Screening (max 5)
"FUTMINNA": {
name: "Federal University of Technology, Minna",
formula: "JAMB/8 + Screening Score (out of 5)",
formulaType: "futminna",
postUtmeMax: 5,
minJamb: 150,
minPostUtmePass: 0,
selectivity: 1.25,
volatility: 1.10,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 0
},

//FUTO 2026 CONFIRMED: Screening only — no exam (Doc 4)
//Aggregate = (JAMB × 0.15) + (sum of 4 O'Level subjects × 0.1)
//4 core subjects (matching UTME combo)
//One sitting: A1=100,B2=90,B3=80,C4=70,C5=60,C6=50
//Two sittings: A1=95,B2=85,B3=75,C4=65,C5=55,C6=45 (no bonus)
"FUTO": {
name: "Federal University of Technology, Owerri",
formula: "JAMB×0.15 + O'Level×0.1 (4 subjects) | Screening Only",
formulaType: "futo",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.20,
volatility: 1.10,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 40
},

//FUOYE: Screening —JAMB (60%)+O'Level (30%)+Sitting Bonus (10%)=100
//O'Level: A1=6,B2=5,B3=4,C4=3,C5=2,C6=1
//One sitting: +10, Two sittings: +6
"FUOYE": {
name: "Federal University, Oye-Ekiti",
formula: "JAMB (60%)+O'Level (30%)+Sitting Bonus (10%)",
formulaType: "fuoye",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.10,
volatility: 1.05,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 30
},

//UNIPORT: JAMB/8(50%)+Post UTME/2(50%)=100
"UNIPORT": {
name: "University of Port Harcourt",
formula: "JAMB/8+Post UTME/2",
formulaType: "standard",
postUtmeMax: 100,
minJamb: 150,
minPostUtmePass: 50,
selectivity: 1.25,
volatility: 1.15,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 0
},

//UNICAL: JAMB/8(50%)+Post UTME/2(50%)=100
"UNICAL": {
name: "University of Calabar",
formula: "JAMB/8+Post UTME/2",
formulaType: "standard",
postUtmeMax: 100,
minJamb: 150,
minPostUtmePass: 50,
selectivity: 1.15,
volatility: 1.10,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 0
},

//UNIJOS: Online Screening —JAMB (60%)+O'Level (40%)=100
//O'Level: A1=10,B2=9,B3=8,C4=7,C5=6,C6=5(5subjects,max 50,scaled to 40)
"UNIJOS": {
name: "University of Jos",
formula: "JAMB (60%)+O'Level (40%)",
formulaType: "unijos",
postUtmeMax: 0,
minJamb: 170,
selectivity: 1.20,
volatility: 1.10,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 40
},

//BUK: JAMB/8(50%)+Post UTME/2(50%)=100
"BUK": {
name: "Bayero University Kano",
formula: "JAMB/8+Post UTME/2",
formulaType: "standard",
postUtmeMax: 100,
minJamb: 160,
minPostUtmePass: 50,
selectivity: 1.20,
volatility: 1.10,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 0
},

//FUNAAB 2026 CONFIRMED: Online screening ONLY — no CBT exam written
//Source: admission.funaab.edu.ng/2026 (Doc 2)
//Formula: JAMB (60%)+O'Level (30%)+Sitting Bonus (10%)=100
//Same model as FUOYE: A1=6,B2=5,B3=4,C4=3,C5=2,C6=1 | One sitting=10pts, Two sittings=6pts
"FUNAAB": {
name: "Federal University of Agriculture, Abeokuta",
formula: "JAMB (60%)+O'Level (30%)+Sitting Bonus (10%)",
formulaType: "fuoye",
postUtmeMax: 0,
minJamb: 160,
selectivity: 1.15,
volatility: 1.05,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 30
},

//UNIABUJA 2026 CONFIRMED: Online screening only — no exam (Doc 2)
//Formula: JAMB(60%)+O'Level(30%)+Sitting Bonus(10%)
"UNIABUJA": {
name: "University of Abuja",
formula: "JAMB (60%)+O'Level (30%)+Sitting Bonus (10%)",
formulaType: "fuoye",
postUtmeMax: 0,
minJamb: 180,
selectivity: 1.20,
volatility: 1.10,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 30
},

//FUD 2026: Online screening — JAMB/8 (50%) + O'Level screening points (50%) (Doc 4)
//Uses standard 50:50 LASU-style: JAMB/8 + O'Level sum (A1=10…C6=5, 5 subjects, max 50)
"FUD": {
name: "Federal University Dutse",
formula: "JAMB÷8 (max 50)+O'Level (max 50) | Screening Only",
formulaType: "lasu",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.05,
volatility: 1.05,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 50
},

//FUL 2026: Screening — alternates by session, defaulting to screening (Doc 2)
//Formula: JAMB(60%)+O'Level(30%)+Sitting Bonus(10%)
"FUL": {
name: "Federal University Lokoja",
formula: "JAMB (60%)+O'Level (30%)+Sitting Bonus (10%)",
formulaType: "fuoye",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.05,
volatility: 1.05,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 30
},

//FUK 2026 CONFIRMED: Screening only — no exam (Doc 2)
//Formula: JAMB(60%)+O'Level(30%)+Sitting Bonus(10%)
"FUK": {
name: "Federal University Kashere",
formula: "JAMB (60%)+O'Level (30%)+Sitting Bonus (10%)",
formulaType: "fuoye",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.05,
volatility: 1.05,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 30
},

//FUWUKARI 2026 CONFIRMED: Screening 50:50 — JAMB/8 + O'Level (A1=10…C6=5, 5 subjects) (Doc 4)
"FUWUKARI": {
name: "Federal University Wukari",
formula: "JAMB÷8 (max 50)+O'Level (max 50, A1=10…C6=5) | Screening Only",
formulaType: "lasu",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.05,
volatility: 1.05,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 50
},

//UNIMAID 2026 CONFIRMED: Online screening only — no exam (Doc 2)
//Formula: JAMB(60%)+O'Level(30%)+Sitting Bonus(10%)
"UNIMAID": {
name: "University of Maiduguri",
formula: "JAMB (60%)+O'Level (30%)+Sitting Bonus (10%)",
formulaType: "fuoye",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.10,
volatility: 1.05,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 30
},

//FED_LAFIA 2026: Screening — JAMB/8(50%) + O'Level(30%) + Sitting/grades(20%) (Doc 4)
//A1=6,B2=5,B3=4,C4=3 for all; prorated to 30%; sitting weight to 20%
//Using fuoye-style as closest model (JAMB 60%+O'Level 30%+Sitting 10%) — minor variance noted
"FED_LAFIA": {
name: "Federal University of Lafia",
formula: "JAMB÷8 (50%)+O'Level (30%)+Sitting (20%) | Screening Only",
formulaType: "fuoye",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.05,
volatility: 1.05,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 30
},

//FED_DUTSINMA 2026 CONFIRMED: Screening 60:40 — (JAMB/400)*60 + O'Level/2.5 (Doc 4)
//O'Level points on EKSU-style scale (A1=8,B2=7,B3=6,C4=5,C5=4,C6=3), max 40
"FED_DUTSINMA": {
name: "Federal University Dutsin-Ma",
formula: "JAMB (60%)+O'Level (40%) | Screening Only",
formulaType: "eksu",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.05,
volatility: 1.05,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 40
},

//===STATE UNIVERSITIES (SCREENING —NO POST UTME EXAM)===

//LASU 2026/2027 CONFIRMED: 50:50 Screening
//Formula: JAMB/8 (max 50) + O'Level sum (A1=10,B2=9,B3=8,C4=7,C5=6,C6=5 — 5 subjects, max 50)
//Total max = 100 | minJamb: 195 | No Post UTME exam written
//Source: LASU Official Portal + Doc [3]
"LASU": {
name: "Lagos State University",
formula: "JAMB÷8 (max 50)+O'Level (max 50, A1=10…C6=5)",
formulaType: "lasu",
postUtmeMax: 0,
minJamb: 195,
selectivity: 1.30,
volatility: 1.15,
stateSchool: true,
oneSittingRequired: ["medicine and surgery","pharmacy","nursing","dentistry"],
olevelMax: 50
},

//OOU: Post-UTME —JAMB/8(50%)+Post UTME/2(50%)=100
//Physical on-campus CBT exam at University ICT Centre, Main Campus, Ago-Iwoye
//Minimum final aggregate threshold: 40%
"OOU": {
name: "Olabisi Onabanjo University",
formula: "JAMB/8+Post UTME/2",
formulaType: "standard",
postUtmeMax: 100,
minJamb: 160,
minPostUtmePass: 50,
selectivity: 1.10,
volatility: 1.05,
stateSchool: true,
oneSittingRequired: null,
olevelMax: 0
},

//EKSU: Screening —JAMB (60%)+O'Level (40%)=100
//O'Level: A1=8,B2=7,B3=6,C4=5,C5=4,C6=3(5subjects,max 40)
//Aggregate =(JAMB/400)*60+(O'Level/40)*40=(JAMB/400)*60+O'Level
"EKSU": {
name: "Ekiti State University",
formula: "JAMB (60%)+O'Level (40%)",
formulaType: "eksu",
postUtmeMax: 0,
minJamb: 160,
selectivity: 1.10,
volatility: 1.05,
stateSchool: true,
oneSittingRequired: null,
olevelMax: 40
},

//DELSU: Screening —JAMB (70%)+O'Level (30%)=100
//O'Level: A1=6,B2=5,B3=4,C4=3,C5=3,C6=3(5subjects,max 30)
//Aggregate =(JAMB/400)*70+(O'Level/30)*30=(JAMB/400)*70+O'Level
"DELSU": {
name: "Delta State University",
formula: "JAMB (70%)+O'Level (30%)",
formulaType: "delsu",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.10,
volatility: 1.05,
stateSchool: true,
oneSittingRequired: null,
olevelMax: 30
},

//AAU 2026 CONFIRMED: Screening — JAMB/8 + O'Level (A1=10,B2=9,B3=8,C4=7,C5=6,C6=5) (Doc 4)
//Aggregate = JAMB/8 + sum of 5 O'Level grades (max 50) — effectively same as LASU 50:50
"AAU": {
name: "Ambrose Alli University",
formula: "JAMB÷8 + O'Level (A1=10…C6=5, 5 subjects) | Screening Only",
formulaType: "lasu",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.05,
volatility: 1.05,
stateSchool: true,
oneSittingRequired: null,
olevelMax: 50
},

//UNIOSUN 2026 CONFIRMED: Screening 60:40 (Doc 4)
//(JAMB*60)/400 + O'Level sum (A1=8,B2=7,B3=6,C4=5,C5=4,C6=3 — 5 subjects, max 40)
"UNIOSUN": {
name: "Osun State University",
formula: "JAMB (60%)+O'Level (40%, A1=8…C6=3) | Screening Only",
formulaType: "eksu",
postUtmeMax: 0,
minJamb: 160,
selectivity: 1.05,
volatility: 1.05,
stateSchool: true,
oneSittingRequired: null,
olevelMax: 40
},

//UNIMED: JAMB/8(50%)+Post UTME/2(50%)=100
//Specialises in health sciences
"UNIMED": {
name: "University of Medical Sciences, Ondo",
formula: "JAMB/8+Post UTME/2",
formulaType: "standard",
postUtmeMax: 100,
minJamb: 200,
minPostUtmePass: 50,
selectivity: 1.35,
volatility: 1.20,
stateSchool: false,
oneSittingRequired: ["medicine and surgery","pharmacy","nursing","dentistry"],
olevelMax: 0
},

//COOU 2026 CONFIRMED: Online screening only — no written exam (Doc 4)
//JAMB cutoff primary; O'Level graded A1=6,B2=5,B3=4,C4=3,C5=2,C6=1 (5 subjects, max 30)
//Using fuoye formula type: JAMB(60%)+O'Level(30%)+Sitting(10%)
"COOU": {
name: "Chukwuemeka Odumegwu Ojukwu University",
formula: "JAMB (60%)+O'Level (30%)+Sitting Bonus (10%) | Screening Only",
formulaType: "fuoye",
postUtmeMax: 0,
minJamb: 160,
selectivity: 1.10,
volatility: 1.05,
stateSchool: true,
oneSittingRequired: null,
olevelMax: 30
},

//BSU 2026 CONFIRMED: Screening — JAMB/8(50%) + O'Level(50%) + Sitting bonus (Doc 4)
//O'Level: A1=6, B2=B3=4, C4=C5=C6=3 (5 subjects) + single sitting=10pts, double=2pts
//Aggregate = JAMB/8 + O'Level sum + sitting bonus (no max cap on sitting bonus)
"BSU": {
name: "Benue State University",
formula: "JAMB÷8 + O'Level (A1=6,B2/B3=4,C4-C6=3) + Sitting Bonus | Screening Only",
formulaType: "bsu",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.05,
volatility: 1.05,
stateSchool: true,
oneSittingRequired: null,
olevelMax: 20
},
//===ADDITIONAL UNIVERSITIES===

//ABSU: Online screening — JAMB/8(50%) + O'Level (A1=6,B2=5,B3=4,C4=3,C5=2,C6=1, max 30)(50%)
//No physical exam. minJamb: 150/160
"ABSU": {
name: "Abia State University",
formula: "JAMB÷8 (max 50)+O'Level (A1=6…C6=1, max 30) | Screening Only",
formulaType: "absu",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.05,
volatility: 1.05,
stateSchool: true,
oneSittingRequired: null,
olevelMax: 30
},

//FUMMSA: Online screening — (JAMB/400)*50 + (O'Level pts/30)*50
//A1=6,B2=5,B3=4,C4=3,C5=2,C6=1 (5 subjects). minJamb: 200 (medical)
"FUMMSA": {
name: "Federal University of Medicine & Medical Sciences, Abeokuta",
formula: "(JAMB/400)×50 + (O'Level/30)×50 | Screening Only",
formulaType: "fummsa",
postUtmeMax: 0,
minJamb: 200,
selectivity: 1.35,
volatility: 1.20,
stateSchool: false,
oneSittingRequired: ["medicine and surgery","pharmacy","nursing","dentistry","anatomy","physiology","medical biochemistry","pharmacology"],
olevelMax: 50
},

//BMU: Online screening — JAMB (70-75%) + O'Level (25-30%). Use 70:30.
//(JAMB/400)*70 + O'Level sum (A1=6,B2=5,B3=4,C4=3,C5=2,C6=1, max 30). Sitting bonus applies.
"BMU": {
name: "Bayelsa Medical University",
formula: "JAMB (70%)+O'Level (30%, A1=6…C6=1)+Sitting Bonus | Screening Only",
formulaType: "fuoye",
postUtmeMax: 0,
minJamb: 200,
selectivity: 1.35,
volatility: 1.20,
stateSchool: false,
oneSittingRequired: ["medicine and surgery","pharmacy","nursing","dentistry","medical laboratory science","physiotherapy","radiography"],
olevelMax: 30
},

//EBSU: Online screening — JAMB/8(50%) + O'Level pts/2(50%)
//O'Level best 5 relevant subjects (standard grading), divided by 2
"EBSU": {
name: "Ebonyi State University",
formula: "JAMB÷8 (50%) + O'Level÷2 (50%) | Screening Only",
formulaType: "ebsu",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.05,
volatility: 1.05,
stateSchool: true,
oneSittingRequired: null,
olevelMax: 15
},

//FUHSI: Online screening — (JAMB/400)*80 + (O'Level pts/30)*20
//A1=6,B2=5,B3=4,C4=3,C5=2,C6=1 (5 subjects). minJamb: 200 (health sciences)
"FUHSI": {
name: "Federal University of Health Sciences, Ila-Orangun",
formula: "(JAMB/400)×80 + (O'Level/30)×20 | Screening Only",
formulaType: "fuhsi",
postUtmeMax: 0,
minJamb: 200,
selectivity: 1.30,
volatility: 1.15,
stateSchool: false,
oneSittingRequired: ["medicine and surgery","pharmacy","nursing","dentistry","medical laboratory science"],
olevelMax: 20
},

//UNIUYO: Online screening — JAMB/8(50%) + O'Level (A1=10,B2=9,B3=8,C4=7,C5=6,C6=5, sum/50*50)(50%)
//Effectively JAMB/8 + O'Level sum (max 50). Same as LASU formula.
"UNIUYO": {
name: "University of Uyo",
formula: "JAMB÷8 (max 50)+O'Level (A1=10…C6=5, max 50) | Screening Only",
formulaType: "lasu",
postUtmeMax: 0,
minJamb: 160,
selectivity: 1.15,
volatility: 1.10,
stateSchool: false,
oneSittingRequired: null,
olevelMax: 50
},

//ESUT: Online screening — JAMB (70%) + O'Level (30%)
//(JAMB/400)*70 + (O'Level sum + 40 bonus if 1 sitting) * 0.3/total_raw
//O'Level: A1=90,B2=80,B3=70,C4=60,C5=55,C6=50 (5 subjects, max 450 + 40 bonus)
//Use formulaType "esut" 
"ESUT": {
name: "Enugu State University of Science and Technology",
formula: "JAMB (70%)+O'Level (30%, A1=90…C6=50)+Sitting Bonus | Screening Only",
formulaType: "esut",
postUtmeMax: 0,
minJamb: 150,
selectivity: 1.10,
volatility: 1.05,
stateSchool: true,
oneSittingRequired: null,
olevelMax: 30
}

};

/*============================================================
COURSE CUTOFFS —VERIFIED DEPARTMENTAL BENCHMARKS
Based on recent admission cycles (2024/2025-2025/2026)
============================================================*/

const courseCutoffs = {
"medicine and surgery": {
base: 75,
uniAdjust: {
"UNILAG": 85.025,"UI": 78.875,"OAU": 80.3,"UNILORIN": 76,"UNN": 77,
"UNIBEN": 77,"LASU": 78,"UNIPORT": 75,"UNICAL": 72,"ABU": 74,"UNIMED": 76
}
},
"pharmacy": {
base: 68,
uniAdjust: {
"UNILAG": 72,"UI": 69.125,"OAU": 70,"UNILORIN": 69,"UNN": 70,
"LASU": 71,"UNIBEN": 68,"UNIPORT": 67,"UNIMED": 70
}
},
"nursing": {
base: 65,
uniAdjust: {
"UNILAG": 79.8,"UI": 71.375,"OAU": 68,"UNILORIN": 66,"LASU": 68,
"UNN": 67,"UNIBEN": 65,"UNIPORT": 64,"UNIMED": 70
}
},
"dentistry": {
base: 70,
uniAdjust: {
"UNILAG": 76.65,"UI": 68.625,"OAU": 72,"LASU": 70,"UNIMED": 72
}
},
"law": {
base: 65,
uniAdjust: {
"UNILAG": 70.875,"UI": 70.875,"OAU": 68,"UNN": 66,"LASU": 67,
"UNIBEN": 65,"UNIPORT": 64,"UNICAL": 62,"COOU": 63,"BSU": 60,"UNIOSUN": 61
}
},
"computer science": {
base: 60,
uniAdjust: {
"UNILAG": 83.425,"UI": 63.5,"OAU": 63,"UNILORIN": 61,"FUTA": 62,
"FUTMINNA": 65,"UNN": 62,"UNIBEN": 61,"UNIPORT": 60,"COOU": 58,"BSU": 56,"UNIOSUN": 57
}
},
"computer engineering": {
base: 62,
uniAdjust: {
"UNILAG": 66,"UI": 68,"OAU": 64,"FUTA": 65,"FUTMINNA": 63,
"UNN": 63,"UNIBEN": 62,"UNIPORT": 61
}
},
"electrical engineering": {
base: 60,
uniAdjust: {
"UNILAG": 64,"UI": 66,"OAU": 62,"FUTA": 63,"FUTMINNA": 61,
"UNN": 61,"UNIBEN": 60,"UNIPORT": 59
}
},
"mechanical engineering": {
base: 60,
uniAdjust: {
"UNILAG": 64,"UI": 70.5,"OAU": 62,"FUTA": 63,"FUTMINNA": 61,
"UNN": 61,"UNIBEN": 60,"UNIPORT": 59
}
},
"civil engineering": {
base: 58,
uniAdjust: {
"UNILAG": 62,"UI": 64,"OAU": 60,"FUTA": 61,"FUTMINNA": 58,
"UNN": 58,"UNIBEN": 57,"UNIPORT": 56
}
},
"mass communication": {
base: 55,
uniAdjust: {
"UNILAG": 60,"UI": 62,"OAU": 58,"UNN": 56,"LASU": 55,
"UNIBEN": 54,"UNIPORT": 53,"COOU": 52,"BSU": 50,"UNIOSUN": 51
}
},
"accounting": {
base: 55,
uniAdjust: {
"UNILAG": 75.7,"UI": 68.5,"OAU": 58,"LASU": 56,"UNN": 55,
"UNIBEN": 54,"UNIPORT": 53,"COOU": 52,"BSU": 50,"UNIOSUN": 51
}
},
"economics": {
base: 55,
uniAdjust: {
"UNILAG": 58,"UI": 58.125,"OAU": 56,"UNN": 54,"LASU": 55,
"UNIBEN": 53,"UNIPORT": 52,"COOU": 51,"BSU": 49,"UNIOSUN": 50
}
},
"business administration": {
base: 52,
uniAdjust: {
"UNILAG": 56,"UI": 58,"LASU": 54,"UNN": 52,"UNIBEN": 51,
"UNIPORT": 50,"COOU": 49,"BSU": 47,"UNIOSUN": 48
}
},
"english": {
base: 50,
uniAdjust: {
"UNILAG": 68.175,"UI": 57.75,"OAU": 53,"UNN": 51,"LASU": 50,
"UNIBEN": 49,"UNIPORT": 48,"COOU": 47,"BSU": 45,"UNIOSUN": 46
}
},
"sociology": {
base: 50,
uniAdjust: {
"UNILAG": 54,"UI": 56,"UNN": 51,"LASU": 50,"UNIBEN": 49,"COOU": 48,"BSU": 46,"UNIOSUN": 47
}
},
"psychology": {
base: 52,
uniAdjust: {
"UNILAG": 56,"UI": 58,"UNN": 53,"LASU": 52,"UNIBEN": 51,"COOU": 50,"BSU": 48,"UNIOSUN": 49
}
},
"microbiology": {
base: 55,
uniAdjust: {
"UNILAG": 58,"UI": 60,"OAU": 56,"UNN": 55,"LASU": 54,
"UNIBEN": 53,"UNIPORT": 52,"COOU": 51,"BSU": 49,"UNIOSUN": 50
}
},
"biochemistry": {
base: 55,
uniAdjust: {
"UNILAG": 58,"UI": 60,"OAU": 56,"UNN": 55,"LASU": 54,
"UNIBEN": 53,"UNIPORT": 52,"COOU": 51,"BSU": 49,"UNIOSUN": 50
}
},
"agriculture": {
base: 45,
uniAdjust: {
"FUNAAB": 50,"UNILORIN": 48,"FUTA": 47,"FUTMINNA": 46,"UNN": 45,"UNIBEN": 44,"UI": 50
}
},
"education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47,"UNIBEN": 46,"COOU": 45,"BSU": 43,"UNIOSUN": 44
}
},
"veterinary medicine": {
base: 55,
uniAdjust: {
"UNN": 58,"UNIBEN": 56,"FUNAAB": 57,"UI": 55
}
},
"food science": {
base: 48,
uniAdjust: {
"UNILORIN": 50,"FUTA": 49,"FUNAAB": 51,"UNN": 48
}
},
"biological sciences": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"OAU": 50,"UNN": 49,"LASU": 48,"COOU": 47,"BSU": 45,"UNIOSUN": 46
}
},
"chemistry": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"OAU": 50,"UNN": 49,"FUTA": 48,"COOU": 47,"BSU": 45,"UNIOSUN": 46
}
},
"physics": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"OAU": 50,"UNN": 49,"FUTA": 48,"COOU": 47,"BSU": 45,"UNIOSUN": 46
}
},
"mathematics": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"OAU": 50,"UNN": 49,"FUTA": 48,"COOU": 47,"BSU": 45,"UNIOSUN": 46
}
},
"statistics": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 52,"UNN": 48,"FUTA": 46,"COOU": 45,"BSU": 43,"UNIOSUN": 44
}
},
"architecture": {
base: 55,
uniAdjust: {
"UNILAG": 60,"FUTA": 58,"FUTMINNA": 56,"UNN": 54
}
},
"estate management": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 50,"FUTA": 48,"UNN": 47
}
},
"quantity surveying": {
base: 48,
uniAdjust: {
"UNILAG": 52,"FUTA": 50,"FUTMINNA": 48,"UNN": 47
}
},
"urban and regional planning": {
base: 45,
uniAdjust: {
"UNILAG": 50,"FUTA": 48,"FUTMINNA": 46,"UNN": 45
}
},
"building": {
base: 45,
uniAdjust: {
"UNILAG": 50,"FUTA": 48,"FUTMINNA": 46,"UNN": 45
}
},
"geology": {
base: 50,
uniAdjust: {
"UNILAG": 54,"UI": 56,"OAU": 52,"UNN": 51,"FUTA": 50
}
},
"geography": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"OAU": 50,"UNN": 49,"FUTA": 48
}
},
"political science": {
base: 50,
uniAdjust: {
"UNILAG": 54,"UI": 56,"OAU": 52,"UNN": 51,"LASU": 50,"COOU": 48,"BSU": 46,"UNIOSUN": 47
}
},
"public administration": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"OAU": 50,"UNN": 49,"LASU": 48,"COOU": 47,"BSU": 45,"UNIOSUN": 46
}
},
"history and international studies": {
base: 50,
uniAdjust: {
"UNILAG": 54,"UI": 56,"OAU": 52,"UNN": 51,"LASU": 50,"COOU": 48,"BSU": 46,"UNIOSUN": 47
}
},
"philosophy": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"OAU": 50,"UNN": 49,"LASU": 48,"COOU": 47,"BSU": 45,"UNIOSUN": 46
}
},
"religious studies": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 52,"OAU": 48,"UNN": 47,"LASU": 46,"COOU": 45,"BSU": 43,"UNIOSUN": 44
}
},
"theatre arts": {
base: 50,
uniAdjust: {
"UNILAG": 54,"UI": 56,"OAU": 52,"UNN": 51,"LASU": 50,"COOU": 48,"BSU": 46,"UNIOSUN": 47
}
},
"music": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 52,"OAU": 48,"UNN": 47,"LASU": 46,"COOU": 45,"BSU": 43,"UNIOSUN": 44
}
},
"fine and applied arts": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"OAU": 50,"UNN": 49,"LASU": 48,"COOU": 47,"BSU": 45,"UNIOSUN": 46
}
},
"library and information science": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 52,"UNN": 48,"LASU": 47,"COOU": 46,"BSU": 44,"UNIOSUN": 45
}
},
"medical laboratory science": {
base: 65,
uniAdjust: {
"UNILAG": 74.375,"UI": 65,"OAU": 68,"UNN": 67,"UNIBEN": 65,"UNIMED": 70
}
},
"radiography": {
base: 60,
uniAdjust: {
"UNILAG": 77.375,"UI": 67,"OAU": 63,"UNN": 62,"UNIBEN": 60,"UNIMED": 65
}
},
"physiotherapy": {
base: 62,
uniAdjust: {
"UNILAG": 74.725,"UI": 65.125,"OAU": 65,"UNN": 64,"UNIBEN": 62,"UNIMED": 68
}
},
"anatomy": {
base: 55,
uniAdjust: {
"UNILAG": 72.4,"UI": 55.75,"OAU": 58,"UNN": 57,"UNIBEN": 55,"UNIMED": 58
}
},
"physiology": {
base: 55,
uniAdjust: {
"UNILAG": 72.875,"UI": 55.75,"OAU": 58,"UNN": 57,"UNIBEN": 55,"UNIMED": 58
}
},
"pharmacology": {
base: 58,
uniAdjust: {
"UNILAG": 73.125,"UI": 65,"OAU": 61,"UNN": 60,"UNIBEN": 58
}
},
"medical biochemistry": {
base: 58,
uniAdjust: {
"UNILAG": 73.125,"UI": 65,"OAU": 61,"UNN": 60,"UNIBEN": 58
}
},
"nursing science": {
base: 65,
uniAdjust: {
"UNILAG": 79.8,"UI": 71.375,"OAU": 68,"UNN": 67,"UNIBEN": 65,"LASU": 68,"UNIMED": 70
}
},
"mechatronics engineering": {
base: 58,
uniAdjust: {
"FUTA": 62,"FUTMINNA": 60,"UNN": 58,"UNIBEN": 57
}
},
"petroleum engineering": {
base: 60,
uniAdjust: {
"UNILAG": 64,"FUTA": 62,"FUTMINNA": 60,"UNN": 59,"UNIPORT": 61
}
},
"chemical engineering": {
base: 58,
uniAdjust: {
"UNILAG": 62,"FUTA": 60,"FUTMINNA": 58,"UNN": 57,"UNIPORT": 56
}
},
"materials and metallurgical engineering": {
base: 55,
uniAdjust: {
"FUTA": 58,"FUTMINNA": 56,"UNN": 55,"UNIBEN": 54
}
},
"agricultural engineering": {
base: 50,
uniAdjust: {
"FUTA": 54,"FUTMINNA": 52,"UNN": 50,"FUNAAB": 51
}
},
"food engineering": {
base: 50,
uniAdjust: {
"FUTA": 54,"FUTMINNA": 52,"UNN": 50,"FUNAAB": 51
}
},
"water resources engineering": {
base: 50,
uniAdjust: {
"FUTA": 54,"FUTMINNA": 52,"UNN": 50
}
},
"marine engineering": {
base: 55,
uniAdjust: {
"FUTA": 59,"UNN": 55,"UNIPORT": 57
}
},
"aeronautic engineering": {
base: 58,
uniAdjust: {
"FUTA": 62,"FUTMINNA": 60,"UNN": 58
}
},
"biotechnology": {
base: 50,
uniAdjust: {
"UNILAG": 54,"UI": 56,"OAU": 52,"UNN": 51,"FUTA": 50
}
},
"forensic science": {
base: 50,
uniAdjust: {
"UNILAG": 54,"UI": 56,"OAU": 52,"UNN": 51,"FUTA": 50
}
},
"industrial chemistry": {
base: 50,
uniAdjust: {
"UNILAG": 54,"UI": 56,"OAU": 52,"UNN": 51,"FUTA": 50
}
},
"industrial mathematics": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"OAU": 50,"UNN": 49,"FUTA": 48
}
},
"industrial physics": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"OAU": 50,"UNN": 49,"FUTA": 48
}
},
"science laboratory technology": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"OAU": 50,"UNN": 49,"FUTA": 48
}
},
"surveying and geoinformatics": {
base: 48,
uniAdjust: {
"UNILAG": 52,"FUTA": 50,"FUTMINNA": 48,"UNN": 47
}
},
"actuarial science": {
base: 55,
uniAdjust: {
"UNILAG": 60,"UI": 62,"UNN": 55,"LASU": 54,"COOU": 53,"BSU": 51,"UNIOSUN": 52
}
},
"banking and finance": {
base: 52,
uniAdjust: {
"UNILAG": 56,"UI": 58,"UNN": 52,"LASU": 53,"UNIBEN": 51,"COOU": 50,"BSU": 48,"UNIOSUN": 49
}
},
"insurance": {
base: 50,
uniAdjust: {
"UNILAG": 54,"UI": 56,"UNN": 50,"LASU": 51,"UNIBEN": 49,"COOU": 48,"BSU": 46,"UNIOSUN": 47
}
},
"marketing": {
base: 50,
uniAdjust: {
"UNILAG": 54,"UI": 56,"UNN": 50,"LASU": 51,"UNIBEN": 49,"COOU": 48,"BSU": 46,"UNIOSUN": 47
}
},
"industrial relations and personnel management": {
base: 50,
uniAdjust: {
"UNILAG": 54,"UI": 56,"UNN": 50,"LASU": 51,"UNIBEN": 49,"COOU": 48,"BSU": 46,"UNIOSUN": 47
}
},
"business education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 52,"UNN": 48,"LASU": 47
}
},
"adult education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"guidance and counselling": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"special education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"early childhood education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"primary education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"physical and health education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"health education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"human kinetics": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47,"COOU": 46,"BSU": 44,"UNIOSUN": 45
}
},
"computer education": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"UNN": 49,"LASU": 48,"COOU": 47,"BSU": 45,"UNIOSUN": 46
}
},
"educational technology": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"UNN": 49,"LASU": 48,"COOU": 47,"BSU": 45,"UNIOSUN": 46
}
},
"library and information science education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 52,"UNN": 48,"LASU": 47,"COOU": 46,"BSU": 44,"UNIOSUN": 45
}
},
"social studies education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"economics education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"geography education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"history education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"religious studies education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"english education": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"UNN": 49,"LASU": 48,"COOU": 47,"BSU": 45,"UNIOSUN": 46
}
},
"french education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"igbo education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"yoruba education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"hausa education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"music education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"fine arts education": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 50,"UNN": 48,"LASU": 47
}
},
"creative arts": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"UNN": 49,"LASU": 48,"COOU": 47,"BSU": 45,"UNIOSUN": 46
}
},
"visual arts": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"UNN": 49,"LASU": 48,"COOU": 47,"BSU": 45,"UNIOSUN": 46
}
},
"fisheries": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UNN": 48,"LASU": 47,"FUNAAB": 46,"COOU": 45,"BSU": 43,"UNIOSUN": 44
}
},
"forestry": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UNN": 48,"LASU": 47,"FUNAAB": 46,"COOU": 45,"BSU": 43,"UNIOSUN": 44
}
},
"wildlife management": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UNN": 48,"LASU": 47,"FUNAAB": 46,"COOU": 45,"BSU": 43,"UNIOSUN": 44
}
},
"aquaculture": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UNN": 48,"LASU": 47,"FUNAAB": 46,"COOU": 45,"BSU": 43,"UNIOSUN": 44
}
},
"animal science": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UNN": 48,"LASU": 47,"FUNAAB": 46,"COOU": 45,"BSU": 43,"UNIOSUN": 44
}
},
"crop science": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UNN": 48,"LASU": 47,"FUNAAB": 46,"COOU": 45,"BSU": 43,"UNIOSUN": 44
}
},
"soil science": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UNN": 48,"LASU": 47,"FUNAAB": 46,"COOU": 45,"BSU": 43,"UNIOSUN": 44
}
},
"agricultural economics": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UNN": 48,"LASU": 47,"FUNAAB": 46,"COOU": 45,"BSU": 43,"UNIOSUN": 44
}
},
"agricultural extension": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UNN": 48,"LASU": 47,"FUNAAB": 46,"COOU": 45,"BSU": 43,"UNIOSUN": 44
}
},
"home science": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UNN": 48,"LASU": 47,"FUNAAB": 46,"COOU": 45,"BSU": 43,"UNIOSUN": 44
}
},
"nutrition and dietetics": {
base: 55,
uniAdjust: {
"UNILAG": 60,"UI": 62,"OAU": 58,"UNN": 57,"UNIBEN": 55,"UNIMED": 60
}
},
"public health": {
base: 55,
uniAdjust: {
"UNILAG": 60,"UI": 62,"OAU": 58,"UNN": 57,"UNIBEN": 55,"UNIMED": 60
}
},
"environmental health science": {
base: 50,
uniAdjust: {
"UNILAG": 54,"UI": 56,"OAU": 52,"UNN": 51,"UNIBEN": 50,"UNIMED": 53
}
},
"health information management": {
base: 48,
uniAdjust: {
"UNILAG": 52,"UI": 54,"OAU": 50,"UNN": 49,"UNIBEN": 48,"UNIMED": 51
}
},
"medical rehabilitation": {
base: 58,
uniAdjust: {
"UNILAG": 63,"UI": 65,"OAU": 61,"UNN": 60,"UNIBEN": 58
}
},
"prosthetics and orthotics": {
base: 50,
uniAdjust: {
"UNILAG": 54,"UI": 56,"OAU": 52,"UNN": 51,"UNIBEN": 50
}
},
"optometry": {
base: 62,
uniAdjust: {
"UNILAG": 67,"UI": 69,"OAU": 65,"UNN": 64,"UNIBEN": 62,"UNIMED": 66
}
},
"dentistry and dental surgery": {
base: 70,
uniAdjust: {
"UNILAG": 76.65,"UI": 68.625,"OAU": 72,"LASU": 70,"UNIMED": 72
}
},
"pharmacy and pharmacology": {
base: 68,
uniAdjust: {
"UNILAG": 72,"UI": 69.125,"OAU": 70,"UNILORIN": 69,"UNN": 70,"LASU": 71,"UNIMED": 70
}
},
"entrepreneurship": {
base: 45,
uniAdjust: {
"UNILAG": 50,"UI": 52,"OAU": 48,"UNN": 47,"LASU": 46,"UNIBEN": 45,"COOU": 44,"BSU": 42,"UNIOSUN": 43
}
}
};

const courseTiers = {
elite: ["medicine and surgery","pharmacy","pharmacy and pharmacology","nursing","nursing science","dentistry","dentistry and dental surgery"],
premium: ["law","computer science","computer engineering","electrical engineering",
"mechanical engineering","civil engineering",
"mechatronics engineering","petroleum engineering","chemical engineering",
"aeronautic engineering","marine engineering",
"medical laboratory science","radiography","physiotherapy","optometry","medical rehabilitation",
"anatomy","physiology","pharmacology","medical biochemistry","veterinary medicine","materials and metallurgical engineering"],
standard: ["mass communication","accounting","economics","business administration",
"english","sociology","psychology",
"microbiology","biochemistry","biotechnology","forensic science",
"industrial chemistry","industrial mathematics","industrial physics","science laboratory technology",
"political science","public administration","history and international studies",
"philosophy","theatre arts",
"geology","geography","architecture","estate management","quantity surveying",
"surveying and geoinformatics","urban and regional planning","building",
"banking and finance","insurance","marketing",
"industrial relations and personnel management","actuarial science",
"nutrition and dietetics","public health","environmental health science","health information management",
"prosthetics and orthotics","food science","agricultural engineering","food engineering","water resources engineering"],
accessible: ["agriculture","education","biological sciences","chemistry","physics",
"mathematics","statistics",
"fisheries","forestry","wildlife management","aquaculture","animal science","crop science","soil science",
"agricultural economics","agricultural extension","home science","entrepreneurship",
"business education","adult education",
"guidance and counselling","special education","early childhood education","primary education",
"physical and health education","health education","human kinetics","computer education",
"educational technology","library and information science education","social studies education",
"economics education","geography education","history education","religious studies education",
"english education","french education","igbo education","yoruba education","hausa education",
"music education","fine arts education","creative arts","visual arts","music","fine and applied arts",
"library and information science","religious studies"]
};

/*============================================================
O'LEVEL GRADE MAPPINGS BY UNIVERSITY FORMULA TYPE
============================================================*/

const olevelMappings = {
//UNILAG: 5subjects, max 20 (A1=4.0,B2=3.6,B3=3.2,C4=2.8,C5=2.4,C6=2.0)
"unilag": {
"A1": 4.0,"B2": 3.6,"B3": 3.2,"C4": 2.8,"C5": 2.4,"C6": 2.0,"D7": 0,"E8": 0,"F9": 0
},
//OAU: 5subjects, max 10 — average of 5 grades (A1=10,B2=9,B3=8,C4=7,C5=6,C6=5,others=0), divided by 5
"oau": {
"A1": 10,"B2": 9,"B3": 8,"C4": 7,"C5": 6,"C6": 5,"D7": 0,"E8": 0,"F9": 0
},
//UNILORIN: 5subjects, max 20 (A1=4.0,B2=3.6,B3=3.2,C4=2.8,C5=2.4,C6=2.0)
"unilorin": {
"A1": 4.0,"B2": 3.6,"B3": 3.2,"C4": 2.8,"C5": 2.4,"C6": 2.0,"D7": 0,"E8": 0,"F9": 0
},
//LASU/UNIOSUN: 5subjects, max 50 (A1=10,B2=9,B3=8,C4=7,C5=6,C6=5) [2026 CONFIRMED 50:50]
//JAMB/8 (max 50) + sum of 5 O'Level grades (max 50) = 100
"lasu": {
"A1": 10,"B2": 9,"B3": 8,"C4": 7,"C5": 6,"C6": 5,"D7": 0,"E8": 0,"F9": 0
},
//OOU: 5subjects, max 30 (A1=6,B2=5,B3=4,C4=3,C5=2,C6=1)
"oou": {
"A1": 6,"B2": 5,"B3": 4,"C4": 3,"C5": 2,"C6": 1,"D7": 0,"E8": 0,"F9": 0
},
//EKSU: 5subjects, max 40 (A1=8,B2=7,B3=6,C4=5,C5=4,C6=3)
"eksu": {
"A1": 8,"B2": 7,"B3": 6,"C4": 5,"C5": 4,"C6": 3,"D7": 0,"E8": 0,"F9": 0
},
//DELSU: 5subjects, max 30 (A1=6,B2=5,B3=4,C4=3,C5=3,C6=3)
"delsu": {
"A1": 6,"B2": 5,"B3": 4,"C4": 3,"C5": 3,"C6": 3,"D7": 0,"E8": 0,"F9": 0
},
//AAU now uses "lasu" formulaType (JAMB/8 + O'Level A1=10…C6=5). "aau" key kept for legacy.
"aau": {
"A1": 10,"B2": 9,"B3": 8,"C4": 7,"C5": 6,"C6": 5,"D7": 0,"E8": 0,"F9": 0
},
//FUOYE: 5subjects, max 30 (A1=6,B2=5,B3=4,C4=3,C5=2,C6=1)
"fuoye": {
"A1": 6,"B2": 5,"B3": 4,"C4": 3,"C5": 2,"C6": 1,"D7": 0,"E8": 0,"F9": 0
},
//UNN: 4core subjects, max 360raw +40bonus =400, scaled to 10%
//A1=90,B2=80,B3=70,C4=60,C5=50,C6=40
"unn": {
"A1": 90,"B2": 80,"B3": 70,"C4": 60,"C5": 50,"C6": 40,"D7": 0,"E8": 0,"F9": 0
},
//UNIJOS: 5subjects, max 50raw →scaled to 40 (A1=10,B2=9,B3=8,C4=7,C5=6,C6=5)
"unijos": {
"A1": 10,"B2": 9,"B3": 8,"C4": 7,"C5": 6,"C6": 5,"D7": 0,"E8": 0,"F9": 0
},
//FUTO: 4core subjects, max 380 (A1=95,B2=85,B3=75,C4=65,C5=55,C6=45)
//Single sitting bonus: +5per grade
"futo": {
"A1": 95,"B2": 85,"B3": 75,"C4": 65,"C5": 55,"C6": 45,"D7": 0,"E8": 0,"F9": 0
},
//FUTO single sitting bonus mapping (A1=100,B2=90,B3=80,C4=70,C5=60,C6=50)
"futo_single": {
"A1": 100,"B2": 90,"B3": 80,"C4": 70,"C5": 60,"C6": 50,"D7": 0,"E8": 0,"F9": 0
},
//UNIZIK: 5subjects, max 30 (A1=6,B2=5,B3=4,C4=3,C5=2,C6=1) [CONFIRMED — Doc 3]
//JAMB (70%): (JAMB/400)*70 | O'Level (30%): sum of 5 grades (max 30)
"unizik": {
"A1": 6,"B2": 5,"B3": 4,"C4": 3,"C5": 2,"C6": 1,"D7": 0,"E8": 0,"F9": 0
},
//FUTMINNA: 5core subjects, A1=6,B2-B3=4,C4-C6=3 (max 30)
"futminna": {
"A1": 6,"B2": 4,"B3": 4,"C4": 3,"C5": 3,"C6": 3,"D7": 0,"E8": 0,"F9": 0
},
//FUNAAB: 5core subjects (English,Math,Physics,Chemistry,Biology)
//A1=6,B2=5,B3=4,C4=3,C5=2,C6=1 (max 30, scaled by 2/3)
"funaab": {
"A1": 6,"B2": 5,"B3": 4,"C4": 3,"C5": 2,"C6": 1,"D7": 0,"E8": 0,"F9": 0
},
//Generic 10-point (for standard formula unis that don't use O'Level in aggregate)
"standard10": {
"A1": 10,"B2": 9,"B3": 8,"C4": 7,"C5": 6,"C6": 5,"D7": 0,"E8": 0,"F9": 0
},
//FUTA: 5subjects, max 400raw (A1=80,B2=72,B3=67,C4=62,C5=57,C6=52)
//Sum/5 = avg out of 80, then *25% = max 25 pts in aggregate
"futa": {
"A1": 80,"B2": 72,"B3": 67,"C4": 62,"C5": 57,"C6": 52,"D7": 0,"E8": 0,"F9": 0
},
//BSU: 5subjects (A1=6,B2=B3=4,C4=C5=C6=3)
//One sitting=10pts bonus, two sittings=2pts bonus
"bsu": {
"A1": 6,"B2": 4,"B3": 4,"C4": 3,"C5": 3,"C6": 3,"D7": 0,"E8": 0,"F9": 0
},
//ABSU: 5subjects, max 30 (A1=6,B2=5,B3=4,C4=3,C5=2,C6=1)
"absu": {
"A1": 6,"B2": 5,"B3": 4,"C4": 3,"C5": 2,"C6": 1,"D7": 0,"E8": 0,"F9": 0
},
//FUMMSA: 5subjects, max 30 (A1=6,B2=5,B3=4,C4=3,C5=2,C6=1) — scaled to 50 in calc
"fummsa": {
"A1": 6,"B2": 5,"B3": 4,"C4": 3,"C5": 2,"C6": 1,"D7": 0,"E8": 0,"F9": 0
},
//EBSU: 5subjects, max 30 raw (then divided by 2 in aggregate calc = max 15)
"ebsu": {
"A1": 6,"B2": 5,"B3": 4,"C4": 3,"C5": 2,"C6": 1,"D7": 0,"E8": 0,"F9": 0
},
//FUHSI: 5subjects, max 30 raw (A1=6,B2=5,B3=4,C4=3,C5=2,C6=1) — scaled to 20 in calc
"fuhsi": {
"A1": 6,"B2": 5,"B3": 4,"C4": 3,"C5": 2,"C6": 1,"D7": 0,"E8": 0,"F9": 0
},
//ESUT: 5subjects, max 450raw (A1=90,B2=80,B3=70,C4=60,C5=55,C6=50) + 40 sitting bonus
"esut": {
"A1": 90,"B2": 80,"B3": 70,"C4": 60,"C5": 55,"C6": 50,"D7": 0,"E8": 0,"F9": 0
},
//ESUT single-sitting (same as esut — bonus handled in calc logic)
"esut_single": {
"A1": 90,"B2": 80,"B3": 70,"C4": 60,"C5": 55,"C6": 50,"D7": 0,"E8": 0,"F9": 0
}
};

/*============================================================
DYNAMIC O'LEVEL SUBJECT LABEL ENGINE
============================================================*/

const universitySubjectConfig = {
  "UNN":  { count: 4, note: "UNN uses <strong>4 core subjects</strong> relevant to your course. One sitting bonus: +40pts." },
  // UNIZIK uses 5 subjects — no special config needed (defaults to 5)
  "FUTO": { count: 4, note: "FUTO evaluates <strong>4 core subjects</strong> corresponding to your UTME combination (JAMB×0.15 + O'Level×0.1)." }
  // All other universities default to 5 subjects
};

function updateSubjectLabels(uni) {
  const profile = universityProfiles[uni];

  const lblGe = document.getElementById('lbl_ge');
  const lblGm = document.getElementById('lbl_gm');
  const lblG3 = document.getElementById('lbl_g3');
  const lblG4 = document.getElementById('lbl_g4');
  const lblG5 = document.getElementById('lbl_g5');
  const g5    = document.getElementById('g5');
  const olevelHint = document.getElementById('olevelHint');
  const labelRow = document.getElementById('olevelLabelRow');

  // Reset defaults
  if (lblGe) lblGe.textContent = "English";
  if (lblGm) lblGm.textContent = "Maths";
  if (lblG3) lblG3.textContent = "Subject 3";
  if (lblG4) lblG4.textContent = "Subject 4";
  if (lblG5) { lblG5.textContent = "Subject 5"; lblG5.style.visibility = 'visible'; }
  if (g5) g5.style.display = '';
  if (labelRow) labelRow.style.gridTemplateColumns = 'repeat(5, 1fr)';

  if (!profile) return;

  const config = universitySubjectConfig[uni];
  const isFourSubjectUni = config && config.count === 4;

  if (isFourSubjectUni) {
    // Hide 5th subject
    if (lblG5) lblG5.style.visibility = 'hidden';
    if (g5) g5.style.display = 'none';
    if (labelRow) labelRow.style.gridTemplateColumns = 'repeat(4, 1fr)';
    if (olevelHint) olevelHint.innerHTML = config.note;
  } else {
    if (olevelHint) {
      if (profile.olevelMax > 0) {
        olevelHint.innerHTML = `O'Level grades <strong>directly affect</strong> your aggregate at ${profile.name} — choose carefully.`;
      } else {
        olevelHint.innerHTML = `O'Level grades are <strong>required for admission</strong> but do <strong>not</strong> affect this university's aggregate formula.`;
      }
    }
  }
}

/*============================================================
CORE UTILITY FUNCTIONS
============================================================*/

function initScrollReveal() {
const observer = new IntersectionObserver((entries) => {
entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('active'); } });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-scale').forEach(el => observer.observe(el));
}

function toggleMenu() {
const menu = document.getElementById('mobileMenu');
const overlay = document.getElementById('mobileOverlay');
const btn = document.getElementById('hamburgerBtn');
if (!menu || !overlay || !btn) { console.warn('Mobile menu elements not found'); return; }
if (menu.classList.contains('open')) {
menu.classList.remove('open'); overlay.classList.remove('open');
btn.classList.remove('active'); document.body.style.overflow = '';
} else {
menu.classList.add('open'); overlay.classList.add('open'); btn.classList.add('active'); document.body.style.overflow = 'hidden';
}
}

function closeMenu() {
const menu = document.getElementById('mobileMenu');
const overlay = document.getElementById('mobileOverlay');
const btn = document.getElementById('hamburgerBtn');
if (!menu || !overlay || !btn) return;
menu.classList.remove('open'); overlay.classList.remove('open'); btn.classList.remove('active'); document.body.style.overflow = '';
}

function getCourseTier(course) {
const c = course.toLowerCase().trim();
//Exact match first to avoid partial string misclassification
if (courseTiers.elite.includes(c)) return "elite";
if (courseTiers.premium.includes(c)) return "premium";
if (courseTiers.standard.includes(c)) return "standard";
if (courseTiers.accessible.includes(c)) return "accessible";
//Fallback: check if starts with any tier keyword
if (courseTiers.elite.some(k => c.startsWith(k))) return "elite";
if (courseTiers.premium.some(k => c.startsWith(k))) return "premium";
if (courseTiers.standard.some(k => c.startsWith(k))) return "standard";
if (courseTiers.accessible.some(k => c.startsWith(k))) return "accessible";
return "accessible";
}

function getCourseCutoff(course, uni) {
const c = course.toLowerCase().trim();
let cutoff = courseCutoffs[c] || { base: 55, uniAdjust: {} };
return cutoff.uniAdjust[uni] || cutoff.base;
}

/**
* FIXED: olevelScore now sorts inputted grades descending and grabs ONLY the best N subjects
* to avoid inflation if the user fills more than the maximum permitted fields.
*/
function olevelScore(grades, formulaType, maxSubjects = 5) {
const map = olevelMappings[formulaType] || olevelMappings["standard10"];

//Filter and map valid grades to their respective point values
const gradePoints = grades
.filter(g => g && map[g] !== undefined)
.map(g => ({ grade: g, score: map[g] }));

//Sort descending to ensure we prioritize the highest scoring grades
gradePoints.sort((a, b) => b.score - a.score);

//Take only the top N allowed subjects
const topGrades = gradePoints.slice(0, maxSubjects);

let score = 0;
topGrades.forEach(g => { score += g.score; });

return { score: score, count: topGrades.length };
}

function hasFailingGrade(grades) { return grades.some(g => g === "D7" || g === "E8" || g === "F9"); }

function hasF9(grades) { return grades.some(g => g === "F9"); }

/*============================================================
AGGREGATE CALCULATION —CORRECTED FORMULAS
============================================================*/
function calcAggregate(jamb, putme, grades, uni) {
const profile = universityProfiles[uni];
const j = parseFloat(jamb) || 0;
const p = parseFloat(putme) || 0;
let aggregate = 0;
//Use sits value from safe global namespace fallback
const currentSits = typeof window.sits !== 'undefined' ? window.sits : 1;

//Determine standard subject requirement scale (4 for UNN/UNIZIK/FUTO, 5 for others)
let maxSubjects = 5;
if (["unn", "futo"].includes(profile.formulaType)) {
maxSubjects = 4;
}

let olevelResult = olevelScore(grades, profile.formulaType, maxSubjects);
let olevelRaw = olevelResult.score;

if (profile.formulaType === "unilag") {
//UNILAG: JAMB/8(50)+Post UTME (30)+O'Level (20)
aggregate = (j / 8) + p + olevelRaw;
} else if (profile.formulaType === "oau") {
//OAU: JAMB/8(50)+Post UTME (40)+O'Level avg (10)
//O'Level: sum of 5 grades (each 0-10) / 5 = max 10
const olevelAvg = olevelResult.count > 0 ? (olevelRaw / olevelResult.count) : 0;
aggregate = (j / 8) + p + olevelAvg;
} else if (profile.formulaType === "unilorin") {
//UNILORIN: JAMB/8(50)+(PostUTME/100)*30(30)+O'Level (20)
const putmeConverted = p > 0 ? (p / 100) * 30 : 0;
aggregate = (j / 8) + putmeConverted + olevelRaw;
} else if (profile.formulaType === "lasu") {
//LASU/UNIOSUN 2026 CONFIRMED 50:50: JAMB/8 (max 50) + O'Level sum (max 50)
//Grade scale: A1=10,B2=9,B3=8,C4=7,C5=6,C6=5 (5 subjects) — no sitting penalty
aggregate = (j / 8) + olevelRaw;
} else if (profile.formulaType === "oou") {
//OOU: JAMB (70%)+O'Level (30%)
const jambPct = (j / 400) * 70;
aggregate = jambPct + olevelRaw;
} else if (profile.formulaType === "eksu") {
//EKSU: JAMB (60%)+O'Level (40%)
const jambPct = (j / 400) * 60;
aggregate = jambPct + olevelRaw;
} else if (profile.formulaType === "delsu") {
//DELSU: JAMB (70%) + O'Level (30%)
const jambPct = (j / 400) * 70;
aggregate = jambPct + olevelRaw;
} else if (profile.formulaType === "futa") {
//FUTA 2026: (JAMB/400)*75 + avg(5 O'Level pts)/5 * 25
const jambPct = (j / 400) * 75;
const olevelAvgFuta = olevelResult.count > 0 ? olevelRaw / olevelResult.count : 0;
const olevelPct = (olevelAvgFuta / 80) * 25;
aggregate = jambPct + olevelPct;
} else if (profile.formulaType === "abu") {
//ABU: (JAMB + PostUTME_score) / 2 — both raw scores out of 400
//postUtmeMax is 400, p is the raw post-utme score out of 100 (CBT)
//ABU CBT is marked out of 100, then treated as raw — convert to /400 scale: p*4
const abuPostRaw = p * 4;
aggregate = (j + abuPostRaw) / 2;
} else if (profile.formulaType === "bsu") {
//BSU: JAMB/8 + O'Level sum (A1=6,B2/B3=4,C4-C6=3) + sitting bonus
const sittingBonus = currentSits === 1 ? 10 : 2;
aggregate = (j / 8) + olevelRaw + sittingBonus;
} else if (profile.formulaType === "absu") {
//ABSU: JAMB/8 (max 50) + O'Level sum (A1=6...C6=1, max 30) — 50:30 raw
aggregate = (j / 8) + olevelRaw;
} else if (profile.formulaType === "fummsa") {
//FUMMSA: (JAMB/400)*50 + (O'Level sum/30)*50
const jambPct = (j / 400) * 50;
const olevelPct = (olevelRaw / 30) * 50;
aggregate = jambPct + olevelPct;
} else if (profile.formulaType === "ebsu") {
//EBSU: JAMB/8 + O'Level sum/2
aggregate = (j / 8) + (olevelRaw / 2);
} else if (profile.formulaType === "fuhsi") {
//FUHSI: (JAMB/400)*80 + (O'Level sum/30)*20
const jambPct = (j / 400) * 80;
const olevelPct = (olevelRaw / 30) * 20;
aggregate = jambPct + olevelPct;
} else if (profile.formulaType === "esut") {
//ESUT: (JAMB/400)*70 + scaled O'Level 30%
//O'Level: A1=90,B2=80,B3=70,C4=60,C5=55,C6=50 (5 subjects, max 450)
//One sitting: +40 bonus to raw O'Level score
const jambPct = (j / 400) * 70;
const sittingBonus = currentSits === 1 ? 40 : 0;
const rawWithBonus = olevelRaw + sittingBonus;
const maxRaw = 450 + (currentSits === 1 ? 40 : 0);
const olevelPct = (rawWithBonus / maxRaw) * 30;
aggregate = jambPct + olevelPct;
} else if (profile.formulaType === "aau") {
//AAU now uses lasu formulaType — this branch is legacy dead code
const jambPct = (j / 400) * 70;
aggregate = jambPct + olevelRaw;
} else if (profile.formulaType === "fuoye") {
//FUOYE: JAMB (60%)+O'Level (30%)+Sitting Bonus (10%)
const jambPct = (j / 400) * 60;
const sittingBonus = currentSits === 1 ? 10 : 6;
aggregate = jambPct + olevelRaw + sittingBonus;
} else if (profile.formulaType === "unn") {
//UNN: JAMB (90%)+O'Level (10%)=400scale
const jambPts = j * 0.9;
const sittingBonus = currentSits === 1 ? 40 : 0;
const olevelScaled = (olevelRaw + sittingBonus) * 0.1;
aggregate = jambPts + olevelScaled;
} else if (profile.formulaType === "unijos") {
//UNIJOS: JAMB (60%)+O'Level (40%)
const jambPct = (j / 400) * 60;
const olevelPct = (olevelRaw / 50) * 40;
aggregate = jambPct + olevelPct;
} else if (profile.formulaType === "futo") {
//FUTO: Screening —UTME (60%)+O'Level (40%)
const jambPct = (j / 400) * 60;
const olevelMap = currentSits === 1 ? olevelMappings["futo_single"] : olevelMappings["futo"];
let olevelBonus = 0;
const validGrades = grades.filter(g => g && olevelMap[g] !== undefined);
validGrades.sort((a, b) => olevelMap[b] - olevelMap[a]);
const topFutoGrades = validGrades.slice(0, 4);
topFutoGrades.forEach(g => { olevelBonus += olevelMap[g]; });

const olevelPct = olevelBonus * 0.1;
aggregate = jambPct + olevelPct;
} else if (profile.formulaType === "unizik") {
//UNIZIK 2026 CONFIRMED: Screening only, no exam
//(JAMB/400)*70 + sum of 5 O'Level grade points (max 30)
const jambPct = (j / 400) * 70;
aggregate = jambPct + olevelRaw;
} else if (profile.formulaType === "futminna") {
//FUTMINNA: JAMB/8(50)+Screening Score (max 5)
const jambPts = j / 8;
const screenPts = p > 0 ? p : 0;
aggregate = jambPts + screenPts;
} else if (profile.formulaType === "funaab") {
//FUNAAB: Composite —JAMB (50%)+O'Level (20%)+Post UTME (30%)
let olevelDeduction = currentSits === 2 ? 1 : 0;
const olevelScaled = Math.max(0, (olevelRaw - olevelDeduction) * (2 / 3));
const jambPts = j / 8;
const putmePts = p > 0 ? p * 0.3 : 0;
aggregate = jambPts + olevelScaled + putmePts;
} else {
//Standard: JAMB/8(50)+Post UTME/2(50)
const jambPts = j / 8;
const putmePts = p > 0 ? p / 2 : 0;
aggregate = jambPts + putmePts;
}

return aggregate;
}

function competitionPressure(course, uni) {
const profile = universityProfiles[uni];
const tier = getCourseTier(course);
let pressure = 1.0;
pressure += (profile.selectivity - 1.0);
if (tier === "elite") pressure += 0.25;
else if (tier === "premium") pressure += 0.15;
else if (tier === "standard") pressure += 0.08;
if (uni === "LASU" && tier === "elite") pressure += 0.05;
if (uni === "UNILAG" && tier === "elite") pressure += 0.12;
if (uni === "UI" && tier === "elite") pressure += 0.12;
if (uni === "OAU" && tier === "elite") pressure += 0.08;
if (uni === "LASU") pressure += 0.03;
return pressure;
}

function screeningRisk(grades, sits, course, uni) {
let risk = 0;
const profile = universityProfiles[uni];
const tier = getCourseTier(course);
if (hasF9(grades)) risk += 25;
else if (hasFailingGrade(grades)) risk += 15;
if (sits === 2 && tier === "elite") risk += 20;
if (sits === 2 && profile.oneSittingRequired) {
const c = course.toLowerCase().trim();
if (profile.oneSittingRequired.includes(c)) risk += 25;
}
return Math.min(risk, 60);
}

/*============================================================
CHANCE CALCULATION V4—JAMB PROXIMITY MODEL
============================================================*/
function getPostUtmeProbability(jamb, requiredPutme, postUtmeMax, cutoff) {
const jambPts = jamb / 8;
const jambCoverage = jambPts / cutoff;
const reqPct = requiredPutme / postUtmeMax;
let base;
if (jambCoverage >= 1.0) {
base = 72;
} else if (jambCoverage >= 0.85) {
base = 58;
} else if (jambCoverage >= 0.70) {
base = 48;
} else if (jambCoverage >= 0.55) {
base = 38;
} else if (jambCoverage >= 0.40) {
base = 28;
} else {
base = 18;
}

if (reqPct <= 0) {
base += 8;
} else if (reqPct <= 0.50) {
base += 5;
} else if (reqPct <= 0.65) {
base += 2;
} else if (reqPct <= 0.75) {
base += 0;
} else if (reqPct <= 0.85) {
base -= 5;
} else if (reqPct <= 0.92) {
base -= 12;
} else if (reqPct <= 0.97) {
base -= 20;
} else {
base -= 28;
}

if (jamb >= 320) base += 4;
else if (jamb >= 300) base += 2;
else if (jamb >= 280) base += 1;
else if (jamb < 200) base -= 5;

return Math.max(15, Math.min(base, 85));
}

function calcChanceV2(jamb, putme, grades, sits, course, uni, indigene) {
const profile = universityProfiles[uni];
const j = parseFloat(jamb) || 0;
let p = parseFloat(putme) || 0;

//Ensure window-level sits namespace is synchronized
window.sits = sits;

//HARD INELIGIBILITY: JAMB below minimum
if (j < profile.minJamb) {
return {
chance: 0,
aggregate: "0.0",
cutoff: getCourseCutoff(course, uni),
pressure: "0.00",
risk: 0,
tier: getCourseTier(course),
formula: profile.formula,
uniName: profile.name,
jamb: j,
type: profile.formulaType,
postUtmeMax: profile.postUtmeMax,
olevelScore: "0.0",
olevelMax: profile.olevelMax,
jambContribution: (j / 8).toFixed(1),
profile: profile,
putmeUsed: p,
ineligible: true,
ineligibleReason: `Your JAMB score of ${j} is below ${profile.name}'s minimum of ${profile.minJamb}. You cannot apply to this university.`,
cushion: 0,
headroom: 0,
requiredPutme: 0
};
}

//HARD INELIGIBILITY: F9 in O'Level
if (hasF9(grades)) {
return {
chance: 0,
aggregate: "0.0",
cutoff: getCourseCutoff(course, uni),
pressure: "0.00",
risk: 0,
tier: getCourseTier(course),
formula: profile.formula,
uniName: profile.name,
jamb: j,
type: profile.formulaType,
postUtmeMax: profile.postUtmeMax,
olevelScore: "0.0",
olevelMax: profile.olevelMax,
jambContribution: (j / 8).toFixed(1),
profile: profile,
putmeUsed: p,
ineligible: true,
ineligibleReason: `F9 grade detected in your O'Level results. JAMB CAPS disqualifies candidates with F9 grades in any required subject for admission at most Nigerian universities, including ${profile.name}.`,
cushion: 0,
headroom: 0,
requiredPutme: 0
};
}

const cutoff = getCourseCutoff(course, uni);

//Determine standard subject requirement scale (4 for UNN/UNIZIK/FUTO, 5 for others)
let maxSubjects = 5;
if (["unn", "futo"].includes(profile.formulaType)) {
maxSubjects = 4;
}

const olevelResultPre = olevelScore(grades, profile.formulaType, maxSubjects);
const olevelPtsPre = olevelResultPre.score;
let maxPossibleAggregate = 0;
let requiredPutmePre = 0;

if (profile.formulaType === "unilag") {
maxPossibleAggregate = (j / 8) + profile.postUtmeMax + olevelPtsPre;
requiredPutmePre = Math.max(0, cutoff - (j / 8) - olevelPtsPre);
} else if (profile.formulaType === "futa") {
const olevelAvgFutaMax = olevelResultPre.count > 0 ? olevelPtsPre / olevelResultPre.count : 0;
maxPossibleAggregate = ((j / 400) * 75) + ((olevelAvgFutaMax / 80) * 25);
} else if (profile.formulaType === "bsu") {
maxPossibleAggregate = (j / 8) + 20 + (currentSits === 1 ? 10 : 2);
} else if (profile.formulaType === "absu") {
maxPossibleAggregate = (j / 8) + 30;
} else if (profile.formulaType === "fummsa") {
maxPossibleAggregate = ((j / 400) * 50) + 50;
} else if (profile.formulaType === "ebsu") {
maxPossibleAggregate = (j / 8) + 15;
} else if (profile.formulaType === "fuhsi") {
maxPossibleAggregate = ((j / 400) * 80) + 20;
} else if (profile.formulaType === "esut") {
maxPossibleAggregate = ((j / 400) * 70) + 30;
} else if (profile.formulaType === "oau") {
const olevelAvgPre = olevelResultPre.count > 0 ? olevelPtsPre / olevelResultPre.count : 0;
maxPossibleAggregate = (j / 8) + profile.postUtmeMax + olevelAvgPre;
requiredPutmePre = Math.max(0, cutoff - (j / 8) - olevelAvgPre);
} else if (profile.formulaType === "unilorin") {
maxPossibleAggregate = (j / 8) + 30 + olevelPtsPre;
requiredPutmePre = Math.max(0, ((cutoff - (j / 8) - olevelPtsPre) / 30) * 100);
} else if (profile.formulaType === "standard") {
maxPossibleAggregate = (j / 8) + (profile.postUtmeMax / 2);
requiredPutmePre = Math.max(0, (cutoff - (j / 8)) * 2);
} else if (profile.formulaType === "funaab") {
const maxOlevel = (olevelPtsPre - (sits === 2 ? 1 : 0)) * (2 / 3);
maxPossibleAggregate = (j / 8) + maxOlevel + (profile.postUtmeMax * 0.3);
requiredPutmePre = Math.max(0, (cutoff - (j / 8) - maxOlevel) / 0.3);
} else {
//Screening universities —no Post UTME, aggregate is fixed
maxPossibleAggregate = calcAggregate(jamb, 0, grades, uni);
requiredPutmePre = 0;
}

if (maxPossibleAggregate < cutoff && profile.postUtmeMax > 0) {
return {
chance: 0,
aggregate: "0.0",
cutoff: cutoff,
pressure: "0.00",
risk: 0,
tier: getCourseTier(course),
formula: profile.formula,
uniName: profile.name,
jamb: j,
type: profile.formulaType,
postUtmeMax: profile.postUtmeMax,
olevelScore: olevelPtsPre.toFixed(1),
olevelMax: profile.olevelMax,
jambContribution: (j / 8).toFixed(1),
profile: profile,
putmeUsed: p,
ineligible: true,
ineligibleReason: `Even with a perfect Post UTME score (${profile.postUtmeMax}/${profile.postUtmeMax}), your maximum possible aggregate is ${maxPossibleAggregate.toFixed(1)}—below the ${cutoff} cutoff for ${course} at ${profile.name}. You are mathematically ineligible for this course. Consider a less competitive course or a different university.`,
cushion: 0,
headroom: 0,
requiredPutme: Math.ceil(requiredPutmePre)
};
}

const aggregate = calcAggregate(jamb, p, grades, uni);
const pressure = competitionPressure(course, uni);
const risk = screeningRisk(grades, sits, course, uni);
const tier = getCourseTier(course);
const olevelPts = olevelPtsPre; //Re-use already computed sorted & sliced points

//===CUSHION: How far above/below cutoff ===
const gap = aggregate - cutoff;

//===HEADROOM & REQUIRED POST UTME ===
let headroom = 0;
let requiredPutme = 0;
let belowMinPass = false;

if (profile.formulaType === "unilag") {
const maxPossible = (j / 8) + 30 + olevelPts;
headroom = maxPossible - aggregate;
requiredPutme = Math.max(0, cutoff - (j / 8) - olevelPts);
} else if (profile.formulaType === "oau") {
const olevelAvg = (olevelResultPre && olevelResultPre.count > 0) ? olevelPts / olevelResultPre.count : olevelPts / 5;
const maxPossible = (j / 8) + 40 + olevelAvg;
headroom = maxPossible - aggregate;
requiredPutme = Math.max(0, cutoff - (j / 8) - olevelAvg);
} else if (profile.formulaType === "futminna") {
const maxPossible = (j / 8) + 5;
headroom = maxPossible - aggregate;
requiredPutme = Math.max(0, cutoff - (j / 8));
} else if (profile.formulaType === "futa") {
const maxPossibleFuta = ((j / 400) * 75) + 25;
headroom = maxPossibleFuta - aggregate;
} else if (profile.formulaType === "bsu") {
const sittingB = currentSits === 1 ? 10 : 2;
const maxPossibleBsu = (j / 8) + 20 + sittingB;
headroom = maxPossibleBsu - aggregate;
} else if (profile.formulaType === "abu") {
const maxPossibleAbu = (j + 400) / 2;
headroom = maxPossibleAbu - aggregate;
requiredPutme = Math.max(0, (cutoff * 2) - j);
} else if (profile.formulaType === "unilorin") {
const maxPossible = (j / 8) + 30 + olevelPts;
headroom = maxPossible - aggregate;
requiredPutme = Math.max(0, ((cutoff - (j / 8) - olevelPts) / 30) * 100);
} else if (profile.formulaType === "standard") {
const maxPossible = (j / 8) + 50;
headroom = maxPossible - aggregate;
requiredPutme = Math.max(0, (cutoff - (j / 8)) * 2);
} else if (profile.formulaType === "funaab") {
const maxPossible = (j / 8) + (olevelPts * (2 / 3)) + (profile.postUtmeMax * 0.3);
headroom = maxPossible - aggregate;
requiredPutme = Math.max(0, (cutoff - (j / 8) - (olevelPts * (2 / 3))) / 0.3);
} else {
headroom = 100 - aggregate;
requiredPutme = 0;
}

//===MINIMUM POST UTME PASS WARNING ===
if (profile.minPostUtmePass > 0 && requiredPutme > 0 && requiredPutme < profile.minPostUtmePass) {
belowMinPass = true;
}

//===CHANCE CALCULATION ===
let chance;

if (p > 0) {
//Post UTME ENTERED —use actual aggregate vs cutoff
if (gap >= 0) {
chance = 50 + gap * 4;
} else {
chance = 50 + gap * 5;
}
} else if (profile.postUtmeMax > 0) {
//Post UTME NOT entered —use JAMB-proximity model
chance = getPostUtmeProbability(j, requiredPutme, profile.postUtmeMax, cutoff);
} else {
//Screening university —use aggregate gap directly
if (gap >= 0) {
chance = 50 + gap * 4;
} else {
chance = 50 + gap * 5;
}
}

//===O'LEVEL QUALITY MODIFIER ===
const avgGrade = (olevelResultPre && olevelResultPre.count > 0) ? olevelPts / olevelResultPre.count : olevelPts / 5;
let olevelModifier = 0;
if (avgGrade >= 9) olevelModifier = 5; //mostly A1-B2
else if (avgGrade >= 7) olevelModifier = 3; //B3-C4
else if (avgGrade >= 5) olevelModifier = 0; //C5-C6
else olevelModifier = -6; //failing grades

//===COMPETITION PRESSURE (scaled)===
const pressurePenalty = (pressure - 1.0) * 8;

//===VOLATILITY (only affects borderline)===
let volatilityPenalty = 0;
if (chance < 60) {
volatilityPenalty = (profile.volatility - 1.0) * 4;
}

//===SCREENING RISK ===
const riskPenalty = risk * 0.4;

//===COURSE TIER PENALTIES ===
let tierPenalty = 0;
if (tier === "elite") {
if (j < 240) tierPenalty = 10;
else if (j < 260) tierPenalty = 7;
else if (j < 280) tierPenalty = 4;
else if (j < 300) tierPenalty = 2;
} else if (tier === "premium") {
if (j < 220) tierPenalty = 6;
else if (j < 250) tierPenalty = 3;
} else if (tier === "standard") {
if (j < 180) tierPenalty = 3;
}

//===INDIGENE BONUS ===
let indigeneBonus = 0;
if (profile.stateSchool && indigene) indigeneBonus = 5;

//===SITTING BONUS ===
let sittingBonus = 0;
if (sits === 1) sittingBonus = 2;

//===APPLY ALL MODIFIERS ===
chance += olevelModifier;
chance -= pressurePenalty;
chance -= volatilityPenalty;
chance -= riskPenalty;
chance -= tierPenalty;
chance += indigeneBonus;
chance += sittingBonus;

//Clamp
chance = Math.max(5, Math.min(chance, 95));

return {
chance: Math.round(chance),
aggregate: aggregate.toFixed(1),
cutoff: cutoff,
pressure: pressure.toFixed(2),
risk: risk,
tier: tier,
formula: profile.formula,
uniName: profile.name,
jamb: j,
type: profile.formulaType,
postUtmeMax: profile.postUtmeMax,
olevelScore: olevelPts.toFixed(1),
olevelMax: profile.olevelMax,
jambContribution: (j / 8).toFixed(1),
profile: profile,
putmeUsed: p,
ineligible: false,
belowMinPass: belowMinPass,
minPostUtmePass: profile.minPostUtmePass || 0,
cushion: gap.toFixed(1),
headroom: headroom.toFixed(1),
requiredPutme: Math.ceil(requiredPutme)
};
}

function getPosition(jamb, cutoff, putme, grades, uni, course) {
const profile = universityProfiles[uni];
const j = parseFloat(jamb) || 0;
const p = parseFloat(putme) || 0;

if (j < profile.minJamb) {
return {
label: "Ineligible",
class: "below",
desc: `Your JAMB score of ${j} is below ${profile.name}'s minimum of ${profile.minJamb}. You cannot apply to this university.`
};
}

const jambPts = j / 8;

//Screening Universities
if (["lasu", "eksu", "delsu", "fuoye", "unn", "unijos", "futo", "unizik", "futa", "bsu", "absu", "fummsa", "ebsu", "fuhsi", "esut"].includes(profile.formulaType)) {
const agg = calcAggregate(jamb, 0, grades, uni);
const gap = agg - cutoff;
if (gap >= 8) return { label: "Safe Zone", class: "elite", desc: `Your screening aggregate of ${agg.toFixed(1)} clears the cutoff by ${gap.toFixed(1)} points. Strong position.` };
if (gap >= 3) return { label: "Above Cutoff", class: "strong", desc: `Your screening aggregate of ${agg.toFixed(1)} is ${gap.toFixed(1)} points above cutoff. Competitive.` };
if (gap >= -3) return { label: "Borderline", class: "competitive", desc: `Your screening aggregate of ${agg.toFixed(1)} is very close to the cutoff. Your O'Level grades are critical.` };
if (gap >= -10) return { label: "Below Cutoff", class: "borderline", desc: `Your screening aggregate of ${agg.toFixed(1)} is ${Math.abs(gap).toFixed(1)} points below cutoff. You need better O'Level grades.` };
return { label: "Very Unlikely", class: "below", desc: `Your screening aggregate of ${agg.toFixed(1)} is far below the cutoff of ${cutoff}. Consider a different course or university.` };
}

//Post UTME Universities
let neededPutme = 0;
let maxPutme = profile.postUtmeMax || 100;
let maxSubjects = 5;
const olevelResult = olevelScore(grades, profile.formulaType, maxSubjects);
const olevelPts = olevelResult.score;

if (profile.formulaType === "unilag") {
neededPutme = Math.max(0, cutoff - jambPts - olevelPts);
} else if (profile.formulaType === "oau") {
neededPutme = Math.max(0, cutoff - jambPts - olevelPts);
} else if (profile.formulaType === "unilorin") {
neededPutme = Math.max(0, ((cutoff - jambPts - olevelPts) / 30) * 100);
} else {
neededPutme = Math.max(0, (cutoff - jambPts) * 2);
}

if (p > 0) {
const agg = calcAggregate(jamb, p, grades, uni);
const gap = agg - cutoff;
if (gap >= 8) return { label: "Safe Zone", class: "elite", desc: `Your aggregate of ${agg.toFixed(1)} clears the cutoff by ${gap.toFixed(1)} points. Strong admission position.` };
if (gap >= 3) return { label: "Above Cutoff", class: "strong", desc: `Your aggregate of ${agg.toFixed(1)} is ${gap.toFixed(1)} points above cutoff. Competitive but not guaranteed.` };
if (gap >= -3) return { label: "Borderline", class: "competitive", desc: `Your aggregate of ${agg.toFixed(1)} is within 3 points of cutoff. This is a coin flip —every point matters.` };
if (gap >= -10) return { label: "Below Cutoff", class: "borderline", desc: `Your aggregate of ${agg.toFixed(1)} is ${Math.abs(gap).toFixed(1)} points below cutoff. Very difficult without improvements.` };
return { label: "Very Unlikely", class: "below", desc: `Your aggregate of ${agg.toFixed(1)} is far below the cutoff of ${cutoff}. Consider a different course or university.` };
}

if (neededPutme <= 0) return { label: "Safe Zone", class: "elite", desc: `Your JAMB and O'Level already exceed the cutoff. Any Post UTME score secures your position.` };
if (neededPutme <= maxPutme * 0.4) return { label: "Good Standing", class: "strong", desc: `You need ${neededPutme}/${maxPutme} in Post UTME to hit the minimum cutoff. Very achievable —stay focused.` };
if (neededPutme <= maxPutme * 0.6) return { label: "Workable", class: "competitive", desc: `You need ${neededPutme}/${maxPutme} in Post UTME to hit cutoff. Moderate target —solid preparation required.` };
if (neededPutme <= maxPutme * 0.75) return { label: "Challenging", class: "competitive", desc: `You need ${neededPutme}/${maxPutme} in Post UTME to hit cutoff. High target —intensive preparation is essential.` };
if (neededPutme <= maxPutme * 0.9) return { label: "Difficult", class: "borderline", desc: `You need ${neededPutme}/${maxPutme} in Post UTME to hit cutoff. Only top performers reach this score. Consider alternatives.` };
return { label: "Very Unlikely", class: "below", desc: `You need ${neededPutme}/${maxPutme} in Post UTME to hit cutoff. This is extremely rare. Strongly consider a different course or university.` };
}

/*============================================================
TARGET SCORES —CORRECTED FOR ALL FORMULA TYPES
============================================================*/
function getTargetScores(cutoff, jamb, putmeUsed, grades, uni, course) {
const profile = universityProfiles[uni];
const j = parseFloat(jamb) || 0;
const p = parseFloat(putmeUsed) || 0;
const jambPts = j / 8;
let targets = [];
const safeAgg = cutoff * 1.05;
let maxSubjects = ["unn", "futo"].includes(profile.formulaType) ? 4 : 5; // FUTO=4 subjects, all others=5
const olevelResult = olevelScore(grades, profile.formulaType, maxSubjects);
const olevelPts = olevelResult.score;

//Screening Universities
if (["lasu", "eksu", "delsu", "fuoye", "unn", "unijos", "futo", "unizik", "futa", "bsu", "absu", "fummsa", "ebsu", "fuhsi", "esut"].includes(profile.formulaType)) {
const agg = calcAggregate(jamb, 0, grades, uni);
targets.push(`Your Current Screening Score: ${agg.toFixed(1)}/100`);
targets.push(`Departmental Cutoff: ${cutoff} | Safe Target: ${safeAgg}+`);

if (profile.formulaType === "lasu") {
//LASU 2026 CONFIRMED 50:50
targets.push(`JAMB Contribution: <strong>${(j/8).toFixed(1)}/50</strong> (JAMB ÷ 8) | O'Level Contribution: <strong>${olevelPts.toFixed(1)}/50</strong>`);
targets.push(`O'Level Grade Scale: A1=10, B2=9, B3=8, C4=7, C5=6, C6=5 (5 subjects, max 50)`);
} else if (profile.formulaType === "oou") {
const jambPct = (j / 400) * 70;
targets.push(`JAMB Contribution: <strong>${jambPct.toFixed(1)}/70</strong> | O'Level Contribution: <strong>${olevelPts}/30</strong>`);
targets.push(`O'Level Raw Score: ${olevelPts}/30 (A1=6, B2=5, B3=4, C4=3, C5=2, C6=1)`);
} else if (profile.formulaType === "eksu") {
const jambPct = (j / 400) * 60;
targets.push(`JAMB Contribution: <strong>${jambPct.toFixed(1)}/60</strong> | O'Level Contribution: <strong>${olevelPts}/40</strong>`);
targets.push(`O'Level Raw Score: ${olevelPts}/40 (A1=8, B2=7, B3=6, C4=5, C5=4, C6=3)`);
} else if (profile.formulaType === "unn") {
const jambPts = j * 0.9;
const sittingBonus = (typeof window.sits !== 'undefined' ? window.sits : 1) === 1 ? 40 : 0;
const olevelScaled = (olevelPts + sittingBonus) * 0.1;
targets.push(`JAMB Contribution: <strong>${jambPts.toFixed(1)}/360</strong> (90% of JAMB)`);
targets.push(`O'Level Contribution: <strong>${olevelScaled.toFixed(1)}/40</strong> (10%—4 core subjects)`);
targets.push(`O'Level Raw Score: ${olevelPts} + Sitting Bonus: ${sittingBonus} = ${olevelPts + sittingBonus} (scaled × 0.1)`);
targets.push(`O'Level Grade Points: A1=90, B2=80, B3=70, C4=60, C5=50, C6=40`);
} else if (profile.formulaType === "delsu") {
const jambPct = (j / 400) * 70;
targets.push(`JAMB Contribution: <strong>${jambPct.toFixed(1)}/70</strong> | O'Level Contribution: <strong>${olevelPts}/30</strong>`);
targets.push(`O'Level Raw Score: ${olevelPts}/30 (A1=6, B2=5, B3=4, C4=3, C5=3, C6=3)`);
} else if (profile.formulaType === "aau") {
const jambPct = (j / 400) * 70;
targets.push(`JAMB Contribution: <strong>${jambPct.toFixed(1)}/70</strong> | O'Level Contribution: <strong>${olevelPts}/30</strong>`);
targets.push(`O'Level Raw Score: ${olevelPts}/30 (A1=6, B2=5, B3=5, C4=3, C5=2, C6=1)`);
} else if (profile.formulaType === "fuoye") {
const jambPct = (j / 400) * 60;
const sittingBonus = (typeof window.sits !== 'undefined' ? window.sits : 1) === 1 ? 10 : 6;
targets.push(`JAMB Contribution: <strong>${jambPct.toFixed(1)}/60</strong> | O'Level: <strong>${olevelPts}/30</strong> | Sitting Bonus: <strong>${sittingBonus}/10</strong>`);
targets.push(`O'Level Raw Score: ${olevelPts}/30 (A1=6, B2=5, B3=4, C4=3, C5=2, C6=1)`);
} else if (profile.formulaType === "futa") {
const jambPctFuta = (j / 400) * 75;
const olevelAvgFutaT = olevelPts / 5;
const olevelPctFuta = (olevelAvgFutaT / 80) * 25;
targets.push(`JAMB Contribution: <strong>${jambPctFuta.toFixed(1)}/75</strong> | O'Level Contribution: <strong>${olevelPctFuta.toFixed(1)}/25</strong>`);
targets.push(`O'Level Grade Points (avg of 5, then ×25/80): A1=80, B2=72, B3=67, C4=62, C5=57, C6=52`);
} else if (profile.formulaType === "abu") {
const abuPostRawT = (typeof window.putme !== 'undefined' ? window.putme : 0) * 4;
const abuAgg = (j + abuPostRawT) / 2;
targets.push(`ABU Aggregate: (JAMB ${j} + Post UTME ${abuPostRawT}/400) ÷ 2 = <strong>${abuAgg.toFixed(0)}/400</strong>`);
targets.push(`Post UTME: 70-question CBT (25 English + 15 each of 3 JAMB subjects). Score out of 100, treated as raw.`);
} else if (profile.formulaType === "bsu") {
const sittingBonusT = (typeof window.sits !== 'undefined' ? window.sits : 1) === 1 ? 10 : 2;
targets.push(`JAMB Contribution: <strong>${(j/8).toFixed(1)}/50</strong> | O'Level: <strong>${olevelPts}/20</strong> | Sitting Bonus: <strong>${sittingBonusT}</strong>`);
targets.push(`O'Level Grade Points (5 subjects): A1=6, B2=4, B3=4, C4=3, C5=3, C6=3`);
targets.push(`Single sitting adds 10pts; combined sittings add 2pts`);
} else if (profile.formulaType === "absu") {
targets.push(`JAMB Contribution: <strong>${(j/8).toFixed(1)}/50</strong> | O'Level: <strong>${olevelPts}/30</strong>`);
targets.push(`O'Level Grade Points: A1=6, B2=5, B3=4, C4=3, C5=2, C6=1 (5 subjects, max 30)`);
} else if (profile.formulaType === "fummsa") {
const jF = ((j/400)*50).toFixed(1); const oF = ((olevelPts/30)*50).toFixed(1);
targets.push(`JAMB Contribution: <strong>${jF}/50</strong> | O'Level Contribution: <strong>${oF}/50</strong>`);
targets.push(`O'Level Grade Points: A1=6, B2=5, B3=4, C4=3, C5=2, C6=1 (5 subjects, max 30 → scaled to 50)`);
} else if (profile.formulaType === "ebsu") {
targets.push(`JAMB Contribution: <strong>${(j/8).toFixed(1)}/50</strong> | O'Level Contribution: <strong>${(olevelPts/2).toFixed(1)}/15</strong>`);
targets.push(`O'Level Grade Points (5 subjects, sum÷2): A1=6, B2=5, B3=4, C4=3, C5=2, C6=1`);
} else if (profile.formulaType === "fuhsi") {
const jFH = ((j/400)*80).toFixed(1); const oFH = ((olevelPts/30)*20).toFixed(1);
targets.push(`JAMB Contribution: <strong>${jFH}/80</strong> | O'Level Contribution: <strong>${oFH}/20</strong>`);
targets.push(`O'Level Grade Points: A1=6, B2=5, B3=4, C4=3, C5=2, C6=1 (5 subjects, max 30 → scaled to 20)`);
} else if (profile.formulaType === "esut") {
const jE = ((j/400)*70).toFixed(1); const sits = typeof window.sits !== 'undefined' ? window.sits : 1;
const bonus = sits === 1 ? 40 : 0;
targets.push(`JAMB Contribution: <strong>${jE}/70</strong> | O'Level Contribution: up to <strong>30</strong> | Sitting Bonus: <strong>${bonus}</strong>`);
targets.push(`O'Level Grade Points: A1=90, B2=80, B3=70, C4=60, C5=55, C6=50 (5 subjects)`);
targets.push(`One sitting adds 40 raw bonus points to your O'Level total`);
}

if (j < 250) targets.push(`With JAMB ${j}, you need excellent O'Level grades (A1-B3) to compensate`);
if (j < profile.minJamb) targets.push(`Your JAMB (${j}) is below ${profile.name}'s minimum of ${profile.minJamb}`);
return targets;
}

//Post UTME Universities (Blank state vs Filled state)
if (p === 0) {
targets.push(`⚠ Enter your Post UTME score to see your full aggregate`);
targets.push(`Target aggregate: ${safeAgg}+ to be on the safe side`);

if (profile.formulaType === "unilag") {
const neededPutme = Math.max(0, cutoff - jambPts - olevelPts);
const safePutme = Math.max(0, safeAgg - jambPts - olevelPts);
targets.push(`O'Level contributes ${olevelPts.toFixed(1)}/20 to your UNILAG aggregate`);
targets.push(`O'Level Raw Score: ${olevelPts}/20 (A1=4.0, B2=3.6, B3=3.2, C4=2.8, C5=2.4, C6=2.0)`);
if (neededPutme <= profile.postUtmeMax) targets.push(`You need ${Math.ceil(neededPutme)}/${profile.postUtmeMax} in Post UTME to hit cutoff`);
if (safePutme <= profile.postUtmeMax) targets.push(`For a safe position, aim for ${Math.ceil(safePutme)}/${profile.postUtmeMax} in Post UTME`);
} else if (profile.formulaType === "oau") {
const olevelAvg = olevelResult && olevelResult.count > 0 ? olevelPts / olevelResult.count : olevelPts / 5;
const neededPutme = Math.max(0, cutoff - jambPts - olevelAvg);
const safePutme = Math.max(0, safeAgg - jambPts - olevelAvg);
targets.push(`O'Level contributes avg ${olevelAvg.toFixed(1)}/10 to your OAU aggregate`);
targets.push(`O'Level Grade Points (averaged over 5 subjects): A1=10, B2=9, B3=8, C4=7, C5=6, C6=5`);
if (neededPutme <= profile.postUtmeMax) targets.push(`You need ${Math.ceil(neededPutme)}/${profile.postUtmeMax} in OAU Post UTME to hit cutoff`);
if (safePutme <= profile.postUtmeMax) targets.push(`For a safe position, aim for ${Math.ceil(safePutme)}/${profile.postUtmeMax} in OAU Post UTME`);
} else if (profile.formulaType === "unilorin") {
const neededPutme = Math.max(0, ((cutoff - jambPts - olevelPts) / 30) * 100);
const safePutme = Math.max(0, ((safeAgg - jambPts - olevelPts) / 30) * 100);
targets.push(`O'Level contributes ${olevelPts.toFixed(1)}/20 to your UNILORIN aggregate`);
targets.push(`O'Level Raw Score: ${olevelPts}/20 (A1=4.0, B2=3.6, B3=3.2, C4=2.8, C5=2.4, C6=2.0)`);
if (neededPutme <= 100) targets.push(`You need ${Math.ceil(neededPutme)}/100 in UNILORIN Post UTME to hit cutoff`);
if (safePutme <= 100) targets.push(`For a safe position, aim for ${Math.ceil(safePutme)}/100 in UNILORIN Post UTME`);
} else {
const neededPutme = Math.max(0, (cutoff - jambPts) * 2);
const safePutme = Math.max(0, (safeAgg - jambPts) * 2);
if (neededPutme <= profile.postUtmeMax) targets.push(`You need ${Math.ceil(neededPutme)}/${profile.postUtmeMax} in Post UTME to hit cutoff`);
if (safePutme <= profile.postUtmeMax) targets.push(`For a safe position, aim for ${Math.ceil(safePutme)}/${profile.postUtmeMax} in Post UTME`);
}

if (j < 250) targets.push(`Consider improving your JAMB score —250+ is strongly recommended for this course`);
if (j < profile.minJamb) targets.push(`Your JAMB score (${j}) is below ${profile.name}'s minimum of ${profile.minJamb}`);
return targets;
}

//Post UTME entered
targets.push(`Target aggregate: ${safeAgg}+ to be on the safe side`);

if (profile.formulaType === "unilag") {
const neededPutme = Math.max(0, cutoff - jambPts - olevelPts);
const safePutme = Math.max(0, safeAgg - jambPts - olevelPts);
targets.push(`O'Level contributes ${olevelPts.toFixed(1)}/20 to your UNILAG aggregate`);
targets.push(`O'Level Raw Score: ${olevelPts}/20 (A1=4.0, B2=3.6, B3=3.2, C4=2.8, C5=2.4, C6=2.0)`);
if (neededPutme <= profile.postUtmeMax) targets.push(`Minimum Post UTME needed: ${Math.ceil(neededPutme)}/${profile.postUtmeMax} to hit cutoff`);
if (safePutme <= profile.postUtmeMax) targets.push(`Safe Post UTME target: ${Math.ceil(safePutme)}/${profile.postUtmeMax} for strong position`);
if (p > 0) {
const gap = neededPutme - p;
if (gap > 0) targets.push(`You are ${Math.ceil(gap)} points below the required Post UTME score`);
else targets.push(`Your Post UTME score (${p}) meets the requirement`);
}
} else if (profile.formulaType === "oau") {
const olevelAvg2 = olevelPts > 0 ? olevelPts / 5 : 0;
const neededPutme = Math.max(0, cutoff - jambPts - olevelAvg2);
const safePutme = Math.max(0, safeAgg - jambPts - olevelAvg2);
targets.push(`O'Level contributes avg ${olevelAvg2.toFixed(1)}/10 to your OAU aggregate (sum/5)`);
targets.push(`O'Level Grade Points (averaged over 5): A1=10, B2=9, B3=8, C4=7, C5=6, C6=5`);
if (neededPutme <= profile.postUtmeMax) targets.push(`Minimum OAU Post UTME: ${Math.ceil(neededPutme)}/${profile.postUtmeMax} to hit cutoff`);
if (safePutme <= profile.postUtmeMax) targets.push(`Safe OAU Post UTME: ${Math.ceil(safePutme)}/${profile.postUtmeMax} for strong position`);
} else if (profile.formulaType === "unilorin") {
const neededPutme = Math.max(0, ((cutoff - jambPts - olevelPts) / 30) * 100);
const safePutme = Math.max(0, ((safeAgg - jambPts - olevelPts) / 30) * 100);
targets.push(`O'Level contributes ${olevelPts.toFixed(1)}/20 to your UNILORIN aggregate`);
targets.push(`O'Level Raw Score: ${olevelPts}/20 (A1=4.0, B2=3.6, B3=3.2, C4=2.8, C5=2.4, C6=2.0)`);
if (neededPutme <= 100) targets.push(`Minimum UNILORIN Post UTME: ${Math.ceil(neededPutme)}/100 to hit cutoff`);
if (safePutme <= 100) targets.push(`Safe UNILORIN Post UTME: ${Math.ceil(safePutme)}/100 for strong position`);
} else {
const neededPutme = Math.max(0, (cutoff - jambPts) * 2);
const safePutme = Math.max(0, (safeAgg - jambPts) * 2);
if (neededPutme <= profile.postUtmeMax) targets.push(`Minimum Post UTME needed: ${Math.ceil(neededPutme)}/${profile.postUtmeMax} to hit cutoff`);
if (safePutme <= profile.postUtmeMax) targets.push(`Safe Post UTME target: ${Math.ceil(safePutme)}/${profile.postUtmeMax} for strong position`);
if (p > 0) {
const gap = neededPutme - p;
if (gap > 0) targets.push(`You are ${Math.ceil(gap)} points below the required Post UTME score`);
else targets.push(`Your Post UTME score (${p}) meets the requirement`);
}
}

if (j < 250) targets.push(`Consider improving your JAMB score —250+ is strongly recommended for this course`);
if (j < profile.minJamb) targets.push(`Your JAMB score (${j}) is below ${profile.name}'s minimum of ${profile.minJamb}`);

return targets;
}

/*============================================================
ENHANCED ANALYSIS GENERATOR
============================================================*/
function generateAnalysis(result, course, uni, jamb, sits, grades) {
const pos = getPosition(jamb, result.cutoff, result.putmeUsed || 0, grades, uni, course);
const tier = result.tier;
const profile = universityProfiles[uni];
const j = parseFloat(jamb) || 0;
let analysis = `POSITION: ${pos.label}\n\n`;
analysis += `Your aggregate of ${result.aggregate} is being evaluated against ${result.uniName}'s ${course} cutoff (~${result.cutoff}).\n`;

if (result.cushion !== undefined) {
const cushionNum = parseFloat(result.cushion);
if (cushionNum > 0) {
analysis += `You are ${cushionNum.toFixed(1)} points ABOVE the cutoff —this is your cushion.\n`;
} else if (cushionNum < 0) {
analysis += `You are ${Math.abs(cushionNum).toFixed(1)} points BELOW the cutoff.\n`;
} else {
analysis += `You are exactly at the cutoff line.\n`;
}
}

if (result.headroom !== undefined && parseFloat(result.headroom) > 0) {
analysis += `Headroom: ${parseFloat(result.headroom).toFixed(1)} points of improvement possible.\n`;
}

analysis += `\n`;

if (result.chance >= 80) {
analysis += `ELITE COMPETITIVE CLUSTER\n`;
analysis += `You are in the top competitive tier for this course. Most admitted candidates at ${result.uniName} fall within this range.\n\n`;
analysis += `RECOMMENDATIONS:\n`;
analysis += `• Maintain your current preparation momentum\n`;
analysis += `• Focus on Post UTME speed and accuracy (if applicable)\n`;
analysis += `• Ensure your O'Level results are uploaded on JAMB CAPS\n`;
analysis += `• Keep backup options ready —elite courses are unpredictable\n`;
if (["lasu", "eksu", "delsu", "fuoye", "unn", "unijos", "futo", "unizik", "futa", "bsu", "absu", "fummsa", "ebsu", "fuhsi", "esut"].includes(profile.formulaType)) {
analysis += `• For screening universities, verify that your O'Level is properly uploaded on JAMB CAPS\n`;
}
} else if (result.chance >= 65) {
analysis += `STRONG POSITION\n`;
analysis += `You are above the typical competitive range. Your admission outlook is positive but not automatic at ${result.uniName}.\n\n`;
analysis += `RECOMMENDATIONS:\n`;
analysis += `• Push for an even stronger performance in screening/Post UTME\n`;
analysis += `• Verify all O'Level requirements are met and uploaded to CAPS\n`;
analysis += `• Stay updated with ${result.uniName}'s official announcements\n`;
analysis += `• Consider a less competitive backup course at the same university\n`;
analysis += `• Apply for Post UTME /screening immediately once forms open\n`;
} else if (result.chance >= 50) {
analysis += `COMPETITIVE RANGE\n`;
analysis += `You are within the competitive range. Admission is possible but depends on the overall applicant pool strength this cycle.\n\n`;
analysis += `RECOMMENDATIONS:\n`;
analysis += `• Aggressively prepare for Post UTME /screening —this is your decisive factor\n`;
analysis += `• Consider less competitive alternative courses\n`;
analysis += `• Ensure your O'Level upload is perfect on CAPS\n`;
analysis += `• Explore state university alternatives with lower cutoffs\n`;
analysis += `• Join the TechMed WhatsApp channel for real-time updates\n`;
analysis += `• Do NOT miss your institution's Post UTME registration window\n`;
} else if (result.chance >= 35) {
analysis += `BORDERLINE POSITION\n`;
analysis += `You are near the competitive borderline. A small improvement could shift your position significantly.\n\n`;
analysis += `RECOMMENDATIONS:\n`;
analysis += `• Maximize Post UTME /screening preparation —every point matters\n`;
analysis += `• Consider changing to a less competitive course IMMEDIATELY\n`;
analysis += `• Explore alternative universities with lower cutoffs:\n`;
analysis += `Federal: FUD, FUL, FUK, FUWUKARI, FED-LAFIA, FED-DUTSINMA\n`;
analysis += `State: EKSU, DELSU, AAU, OOU\n`;
analysis += `• If JAMB score is below 200, consider rewriting JAMB\n`;
analysis += `• Build a strong backup plan with polytechnic or college of education options\n`;
} else {
analysis += `BELOW COMPETITIVE RANGE\n`;
analysis += `Your current profile is below the realistic competitive range for ${course} at ${result.uniName}.\n\n`;
analysis += `RECOMMENDATIONS:\n`;
analysis += `• Consider a change of course to a less competitive option immediately\n`;
analysis += `• Explore federal universities with lower cutoffs:\n`;
analysis += `FED-LAFIA, FED-DUTSINMA, FUK, FUWUKARI, FUD, FUL\n`;
analysis += `• State universities like EKSU, DELSU, AAU may offer better chances\n`;
analysis += `• Prepare to rewrite JAMB if necessary\n`;
analysis += `• Consider IJMB/JUPEB Direct Entry for 200-level admission without JAMB\n`;
analysis += `• Polytechnics accept lower JAMB scores —explore ND programmes\n`;
}

if (result.risk > 0) {
analysis += `\nSCREENING RISK DETECTED:\n`;
if (hasF9(grades)) analysis += `• F9 grade detected —major screening risk at ALL universities\n`;
else if (hasFailingGrade(grades)) analysis += `• D7/E8 grade detected —screening penalty applies\n`;
if (sits === 2 && tier === "elite") analysis += `• Two sittings for elite course —most federal universities reject this\n`;
if (sits === 2 && profile.oneSittingRequired) {
const c = course.toLowerCase().trim();
if (profile.oneSittingRequired.includes(c)) analysis += `• ${result.uniName} requires ONE sitting for ${course}\n`;
}
}

return analysis;
}

function getClusterData(course, uni) {
const cutoff = getCourseCutoff(course, uni);
const tier = getCourseTier(course);
const profile = universityProfiles[uni];
let widths = { elite: 18, strong: 22, competitive: 32, borderline: 18, below: 10 };
if (tier === "elite") {
widths = { elite: 5, strong: 10, competitive: 20, borderline: 30, below: 35 };
} else if (tier === "premium") {
widths = { elite: 10, strong: 15, competitive: 25, borderline: 30, below: 20 };
} else if (tier === "standard") {
widths = { elite: 20, strong: 25, competitive: 30, borderline: 15, below: 10 };
} else {
widths = { elite: 35, strong: 30, competitive: 20, borderline: 10, below: 5 };
}
if (profile.selectivity >= 1.40) {
widths.elite = Math.max(3, widths.elite - 3);
widths.strong = Math.max(5, widths.strong - 3);
widths.below = Math.min(50, widths.below + 6);
}
return {
elite: { min: (cutoff * 1.08).toFixed(1), max: (cutoff * 1.20).toFixed(1), width: widths.elite },
strong: { min: (cutoff * 1.02).toFixed(1), max: (cutoff * 1.08).toFixed(1), width: widths.strong },
competitive: { min: (cutoff * 0.95).toFixed(1), max: (cutoff * 1.02).toFixed(1), width: widths.competitive },
borderline: { min: (cutoff * 0.88).toFixed(1), max: (cutoff * 0.95).toFixed(1), width: widths.borderline },
below: { min: "0", max: (cutoff * 0.88).toFixed(1), width: widths.below }
};
}


/*============================================================
UNIVERSITY → COURSE AVAILABILITY MAP
Courses NOT listed for a university are hidden from the dropdown.
If a university has no entry here, all courses are shown.
============================================================*/
const uniCourseMap = {
"UNILAG": [
  "medicine and surgery","pharmacy","nursing","dentistry","medical laboratory science",
  "radiography","physiotherapy","optometry","anatomy","physiology","pharmacology",
  "medical biochemistry","nursing science","dentistry and dental surgery","pharmacy and pharmacology",
  "nutrition and dietetics","public health","environmental health science","health information management",
  "prosthetics and orthotics","law","computer science","computer engineering","electrical engineering",
  "mechanical engineering","civil engineering","mechatronics engineering","petroleum engineering",
  "chemical engineering","mass communication","accounting","economics","business administration",
  "english","sociology","psychology","microbiology","biochemistry","political science",
  "public administration","history and international studies","philosophy","theatre arts","music",
  "fine and applied arts","creative arts","visual arts","library and information science",
  "actuarial science","banking and finance","insurance","marketing",
  "industrial relations and personnel management","actuarial science","education",
  "biological sciences","chemistry","physics","mathematics","statistics","human kinetics",
  "adult education","guidance and counselling","educational technology","botany","zoology",
  "marine biology","geology","geography","architecture","estate management","quantity surveying",
  "surveying and geoinformatics","urban and regional planning","building","food science",
  "agricultural engineering","water resources engineering","biotechnology","entrepreneurship"
],
"UI": [
  "medicine and surgery","pharmacy","nursing","dentistry","medical laboratory science",
  "physiotherapy","optometry","anatomy","physiology","pharmacology","medical biochemistry",
  "nursing science","dentistry and dental surgery","pharmacy and pharmacology",
  "nutrition and dietetics","public health","environmental health science","health information management",
  "veterinary medicine","law","computer science","electrical engineering","mechanical engineering",
  "civil engineering","chemical engineering","mass communication","accounting","economics",
  "business administration","english","sociology","psychology","microbiology","biochemistry",
  "political science","public administration","history and international studies","philosophy",
  "theatre arts","music","fine and applied arts","library and information science","actuarial science",
  "banking and finance","insurance","marketing","industrial relations and personnel management",
  "education","biological sciences","chemistry","physics","mathematics","statistics",
  "geology","geography","architecture","estate management","quantity surveying",
  "surveying and geoinformatics","urban and regional planning","building","food science",
  "agriculture","animal science","crop science","agricultural economics","biotechnology",
  "biochemistry","linguistics","arabic","religious studies","entrepreneurship"
],
"OAU": [
  "medicine and surgery","pharmacy","nursing","dentistry","medical laboratory science",
  "radiography","physiotherapy","optometry","anatomy","physiology","pharmacology",
  "medical biochemistry","nursing science","dentistry and dental surgery","pharmacy and pharmacology",
  "nutrition and dietetics","environmental health science","health information management",
  "veterinary medicine","law","computer science","computer engineering","electrical engineering",
  "mechanical engineering","civil engineering","chemical engineering","accounting","economics",
  "business administration","english","sociology","microbiology","biochemistry","political science",
  "public administration","history and international studies","philosophy","theatre arts","music",
  "fine and applied arts","library and information science","banking and finance","insurance",
  "marketing","industrial relations and personnel management","education",
  "biological sciences","chemistry","physics","mathematics","statistics","geology","geography",
  "architecture","estate management","quantity surveying","surveying and geoinformatics",
  "urban and regional planning","building","food science","agriculture","animal science",
  "crop science","agricultural economics","aquaculture","forestry","biotechnology"
],
"UNILORIN": [
  "medicine and surgery","pharmacy","nursing","medical laboratory science","physiotherapy",
  "anatomy","physiology","pharmacology","medical biochemistry","veterinary medicine",
  "law","computer science","electrical engineering","mechanical engineering","civil engineering",
  "chemical engineering","accounting","economics","business administration","english","sociology",
  "microbiology","biochemistry","political science","history and international studies",
  "education","biological sciences","chemistry","physics","mathematics","statistics",
  "agriculture","animal science","crop science","food science","biotechnology"
],
"UNN": [
  "medicine and surgery","pharmacy","nursing","dentistry","medical laboratory science",
  "radiography","physiotherapy","optometry","anatomy","physiology","pharmacology",
  "medical biochemistry","nursing science","nutrition and dietetics","public health",
  "health information management","veterinary medicine","law","computer science",
  "computer engineering","electrical engineering","mechanical engineering","civil engineering",
  "mechatronics engineering","chemical engineering","mass communication","accounting",
  "economics","business administration","english","sociology","psychology","microbiology",
  "biochemistry","political science","public administration","history and international studies",
  "philosophy","library and information science","banking and finance","insurance",
  "marketing","actuarial science","education","biological sciences","chemistry","physics",
  "mathematics","statistics","geology","geography","architecture","estate management",
  "quantity surveying","food science","agriculture","animal science","crop science",
  "agricultural economics","biotechnology","forensic science"
],
"UNIBEN": [
  "medicine and surgery","pharmacy","nursing","dentistry","medical laboratory science",
  "radiography","physiotherapy","anatomy","physiology","pharmacology","medical biochemistry",
  "nursing science","nutrition and dietetics","environmental health science",
  "health information management","veterinary medicine","law","computer science",
  "computer engineering","electrical engineering","mechanical engineering","civil engineering",
  "chemical engineering","mass communication","accounting","economics",
  "business administration","english","sociology","psychology","microbiology","biochemistry",
  "political science","public administration","history and international studies","theatre arts",
  "fine and applied arts","library and information science","banking and finance","insurance",
  "marketing","education","biological sciences","chemistry","physics","mathematics",
  "statistics","geology","geography","architecture","estate management","quantity surveying",
  "urban and regional planning","building","food science","agriculture","animal science",
  "crop science","biotechnology"
],
"LASU": [
  "medicine and surgery","pharmacy","nursing","dentistry","medical laboratory science",
  "radiography","physiotherapy","anatomy","physiology","nursing science",
  "nursing science","dentistry and dental surgery","pharmacy and pharmacology",
  "law","computer science","computer engineering","electrical engineering",
  "mechanical engineering","civil engineering","chemical engineering","mass communication",
  "accounting","economics","business administration","english","sociology","psychology",
  "microbiology","biochemistry","political science","public administration",
  "history and international studies","philosophy","theatre arts","music","fine and applied arts",
  "library and information science","banking and finance","insurance","marketing",
  "industrial relations and personnel management","actuarial science","education",
  "biological sciences","chemistry","physics","mathematics","statistics","geology","geography",
  "architecture","estate management","quantity surveying","building","food science",
  "agriculture","entrepreneurship"
],
"ABU": [
  "medicine and surgery","pharmacy","nursing","dentistry","medical laboratory science",
  "physiotherapy","anatomy","physiology","pharmacology","veterinary medicine",
  "law","computer science","computer engineering","electrical engineering",
  "mechanical engineering","civil engineering","chemical engineering",
  "mass communication","accounting","economics","business administration","english",
  "sociology","microbiology","biochemistry","political science","public administration",
  "history and international studies","education","biological sciences","chemistry",
  "physics","mathematics","statistics","geology","geography","architecture",
  "quantity surveying","food science","agriculture","animal science","crop science",
  "agricultural economics","biotechnology"
],
"FUTA": [
  "computer science","computer engineering","electrical engineering","mechanical engineering",
  "civil engineering","mechatronics engineering","chemical engineering",
  "materials and metallurgical engineering","agricultural engineering","food engineering",
  "water resources engineering","architecture","quantity surveying","estate management",
  "surveying and geoinformatics","urban and regional planning","building",
  "microbiology","biochemistry","industrial chemistry","industrial mathematics",
  "industrial physics","science laboratory technology","biology","chemistry","physics",
  "mathematics","statistics","geology","food science","nutrition and dietetics",
  "biotechnology","environmental biology"
],
"FUTMINNA": [
  "computer science","computer engineering","electrical engineering","mechanical engineering",
  "civil engineering","chemical engineering","materials and metallurgical engineering",
  "agricultural engineering","food engineering","water resources engineering",
  "microbiology","biochemistry","industrial chemistry","industrial mathematics",
  "industrial physics","science laboratory technology","chemistry","physics",
  "mathematics","statistics","geology","food science","biotechnology",
  "accounting","economics","business administration","banking and finance",
  "entrepreneurship"
],
"UNIPORT": [
  "medicine and surgery","pharmacy","nursing","medical laboratory science",
  "radiography","physiotherapy","anatomy","physiology","pharmacology",
  "veterinary medicine","law","computer science","computer engineering",
  "electrical engineering","mechanical engineering","civil engineering",
  "chemical engineering","petroleum engineering","marine engineering",
  "mass communication","accounting","economics","business administration",
  "english","sociology","microbiology","biochemistry","political science",
  "history and international studies","education","biological sciences","chemistry",
  "physics","mathematics","statistics","geology","geography","architecture",
  "estate management","quantity surveying","food science","agriculture","biotechnology",
  "fisheries","aquaculture"
],
"UNICAL": [
  "medicine and surgery","nursing","pharmacy","law","computer science",
  "electrical engineering","mechanical engineering","civil engineering",
  "mass communication","accounting","economics","business administration",
  "english","sociology","microbiology","biochemistry","history and international studies",
  "education","biological sciences","chemistry","physics","mathematics",
  "statistics","geology","geography","agriculture","animal science","crop science",
  "fisheries","forestry","food science"
],
"UNIZIK": [
  "medicine and surgery","pharmacy","nursing","medical laboratory science",
  "physiotherapy","anatomy","physiology","law","computer science","computer engineering",
  "electrical engineering","mechanical engineering","civil engineering","chemical engineering",
  "mass communication","accounting","economics","business administration","english",
  "sociology","psychology","microbiology","biochemistry","political science",
  "public administration","history and international studies","theatre arts",
  "fine and applied arts","banking and finance","insurance","marketing",
  "education","biological sciences","chemistry","physics","mathematics","statistics",
  "architecture","quantity surveying","building","food science","agriculture",
  "biotechnology","entrepreneurship"
],
"OOU": [
  "medicine and surgery","pharmacy","nursing","law","computer science",
  "computer engineering","electrical engineering","mechanical engineering",
  "civil engineering","mass communication","accounting","economics",
  "business administration","english","sociology","microbiology","biochemistry",
  "political science","education","biological sciences","chemistry","physics",
  "mathematics","statistics","agriculture","food science","biotechnology"
],
"FUTO": [
  "computer science","computer engineering","electrical engineering","mechanical engineering",
  "civil engineering","chemical engineering","materials and metallurgical engineering",
  "agricultural engineering","food engineering","water resources engineering",
  "microbiology","biochemistry","industrial chemistry","industrial mathematics",
  "industrial physics","science laboratory technology","chemistry","physics",
  "mathematics","statistics","food science","biotechnology","geology",
  "environmental technology"
],
"UNIMED": [
  "medicine and surgery","pharmacy","nursing","dentistry","medical laboratory science",
  "radiography","physiotherapy","optometry","anatomy","physiology","pharmacology",
  "medical biochemistry","nursing science","dentistry and dental surgery",
  "pharmacy and pharmacology","nutrition and dietetics","public health",
  "environmental health science","health information management","prosthetics and orthotics",
  "medical rehabilitation"
],
"COOU": [
  "medicine and surgery","nursing","law","computer science","electrical engineering",
  "mechanical engineering","civil engineering","mass communication","accounting",
  "economics","business administration","english","sociology","microbiology",
  "biochemistry","political science","history and international studies","education",
  "biological sciences","chemistry","physics","mathematics","statistics",
  "agriculture","food science","entrepreneurship"
],
"BSU": [
  "medicine and surgery","nursing","law","computer science","electrical engineering",
  "mechanical engineering","civil engineering","mass communication","accounting",
  "economics","business administration","english","sociology","psychology",
  "microbiology","biochemistry","political science","public administration",
  "history and international studies","education","biological sciences","chemistry",
  "physics","mathematics","statistics","agriculture","food science","entrepreneurship"
],
"UNIOSUN": [
  "medicine and surgery","nursing","law","computer science","accounting","economics",
  "business administration","english","sociology","microbiology","biochemistry",
  "political science","public administration","education","biological sciences",
  "chemistry","physics","mathematics","statistics","agriculture","food science"
],
"AAU": [
  "medicine and surgery","pharmacy","nursing","medical laboratory science",
  "law","computer science","electrical engineering","mechanical engineering",
  "civil engineering","mass communication","accounting","economics",
  "business administration","english","sociology","microbiology","biochemistry",
  "political science","history and international studies","education",
  "biological sciences","chemistry","physics","mathematics","statistics",
  "agriculture","food science","biotechnology"
],
"EKSU": [
  "law","computer science","electrical engineering","mechanical engineering",
  "civil engineering","mass communication","accounting","economics",
  "business administration","english","sociology","microbiology","biochemistry",
  "political science","public administration","history and international studies",
  "philosophy","theatre arts","music","fine and applied arts","education",
  "biological sciences","chemistry","physics","mathematics","statistics",
  "agriculture","food science","nursing"
],
"DELSU": [
  "medicine and surgery","nursing","pharmacy","law","computer science",
  "electrical engineering","mechanical engineering","civil engineering",
  "chemical engineering","mass communication","accounting","economics",
  "business administration","english","sociology","microbiology","biochemistry",
  "political science","history and international studies","education",
  "biological sciences","chemistry","physics","mathematics","statistics",
  "agriculture","geology","geography","architecture","quantity surveying"
],
"ABSU": [
  "medicine and surgery","nursing","pharmacy","law","computer science",
  "electrical engineering","mechanical engineering","civil engineering",
  "mass communication","accounting","economics","business administration",
  "english","sociology","microbiology","biochemistry","political science",
  "public administration","history and international studies","education",
  "biological sciences","chemistry","physics","mathematics","statistics",
  "agriculture","food science","biotechnology","entrepreneurship"
],
"FUMMSA": [
  "medicine and surgery","pharmacy","nursing","dentistry","medical laboratory science",
  "radiography","physiotherapy","anatomy","physiology","pharmacology",
  "medical biochemistry","nursing science","dentistry and dental surgery",
  "pharmacy and pharmacology","nutrition and dietetics","public health",
  "environmental health science","health information management"
],
"BMU": [
  "medicine and surgery","pharmacy","nursing","dentistry","medical laboratory science",
  "radiography","physiotherapy","anatomy","physiology","pharmacology",
  "medical biochemistry","nursing science","nutrition and dietetics","public health"
],
"EBSU": [
  "medicine and surgery","nursing","pharmacy","law","computer science",
  "electrical engineering","mechanical engineering","civil engineering",
  "mass communication","accounting","economics","business administration",
  "english","sociology","microbiology","biochemistry","political science",
  "history and international studies","education","biological sciences",
  "chemistry","physics","mathematics","statistics","agriculture","food science","entrepreneurship"
],
"FUHSI": [
  "medicine and surgery","pharmacy","nursing","dentistry","medical laboratory science",
  "radiography","physiotherapy","optometry","anatomy","physiology","pharmacology",
  "medical biochemistry","nursing science","nutrition and dietetics","public health",
  "environmental health science","health information management"
],
"UNIUYO": [
  "medicine and surgery","pharmacy","nursing","medical laboratory science",
  "radiography","physiotherapy","anatomy","physiology","pharmacology",
  "veterinary medicine","law","computer science","electrical engineering",
  "mechanical engineering","civil engineering","chemical engineering",
  "mass communication","accounting","economics","business administration",
  "english","sociology","microbiology","biochemistry","political science",
  "public administration","history and international studies","theatre arts",
  "fine and applied arts","banking and finance","education","biological sciences",
  "chemistry","physics","mathematics","statistics","geology","geography",
  "architecture","estate management","food science","agriculture","fisheries",
  "aquaculture","animal science","crop science","forestry","entrepreneurship"
],
"ESUT": [
  "medicine and surgery","nursing","pharmacy","law","computer science",
  "electrical engineering","mechanical engineering","civil engineering",
  "mass communication","accounting","economics","business administration",
  "english","sociology","microbiology","biochemistry","political science",
  "public administration","history and international studies","education",
  "biological sciences","chemistry","physics","mathematics","statistics",
  "architecture","quantity surveying","food science","agriculture","entrepreneurship"
]
};

function filterCoursesByUni(uni) {
const courseSelect = document.getElementById('icourse');
if (!courseSelect) return;
const available = uniCourseMap[uni];
const prevVal = courseSelect.value;
Array.from(courseSelect.options).forEach(opt => {
  if (!opt.value) return; // keep placeholder
  if (!available) {
    opt.style.display = ''; // no filter — show all
  } else {
    const match = available.includes(opt.value.toLowerCase().trim());
    opt.style.display = match ? '' : 'none';
    // Also handle optgroups: show/hide group if all children hidden
  }
});
// Hide empty optgroups
Array.from(courseSelect.querySelectorAll('optgroup')).forEach(grp => {
  const visible = Array.from(grp.querySelectorAll('option')).some(o => o.style.display !== 'none');
  grp.style.display = visible ? '' : 'none';
});
// Reset course selection if current choice is now hidden
if (prevVal && courseSelect.querySelector(`option[value="${prevVal}"]`)?.style.display === 'none') {
  courseSelect.value = '';
}
}
/*============================================================
FORM STATE & PREDICTOR RUNNER
============================================================*/
let sits = 1;
let indigene = false;

//FIXED: Writes variables to both global and window namespaces for cross-compatibility
function setSit(v, el) {
sits = v;
window.sits = v;
el.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
el.classList.add('active');
}

function setIndigene(v, el) {
indigene = v;
window.indigene = v;
el.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
el.classList.add('active');
}

function togglePostUtmeField() {
const uni = document.getElementById('iuni').value;
const putmeWrap = document.getElementById('putmeWrap');
const putmeHint = document.getElementById('putmeHint');
const olevelHint = document.getElementById('olevelHint');
if (!uni || !putmeWrap) return;
const profile = universityProfiles[uni];
if (!profile) return;

const isScreening = profile.postUtmeMax === 0;

if (isScreening) {
  // ── SCREENING UNIVERSITY — hide Post UTME slot entirely ──
  putmeWrap.style.display = 'none';
  document.getElementById('iputme').value = '';
  if (putmeHint) putmeHint.innerHTML =
    `<span style="color:var(--success);font-weight:700;">✓ ${profile.name} uses screening only — no Post UTME exam written. Aggregate calculated directly from JAMB + O'Level.</span>`;

  // O'Level hint per formula type
  const ft = profile.formulaType;
  if (olevelHint) {
    if (ft === 'lasu')    olevelHint.innerHTML = `O'Level contributes <strong>up to 50 points</strong> (A1=10, B2=9, B3=8, C4=7, C5=6, C6=5 — 5 subjects). JAMB÷8 for remaining 50pts.`;
    else if (ft === 'eksu')   olevelHint.innerHTML = `O'Level contributes <strong>up to 40 points</strong> (A1=8, B2=7, B3=6, C4=5, C5=4, C6=3 — 5 subjects). JAMB 60%.`;
    else if (ft === 'delsu')  olevelHint.innerHTML = `O'Level contributes <strong>up to 30 points</strong> (A1=6, B2=5, B3=4, C4=3 — 5 subjects). JAMB 70%.`;
    else if (ft === 'unizik') olevelHint.innerHTML = `O'Level contributes <strong>up to 30 points</strong> (A1=6, B2=5, B3=4, C4=3, C5=2, C6=1 — 5 subjects). JAMB 70%.`;
    else if (ft === 'unn')    olevelHint.innerHTML = `UNN uses <strong>4 core subjects</strong>. A1=90, B2=80, B3=70, C4=60, C5=50, C6=40. One sitting bonus: +40pts. JAMB 90%.`;
    else if (ft === 'unijos') olevelHint.innerHTML = `O'Level contributes <strong>up to 40 points</strong> (A1=10, B2=9, B3=8, C4=7, C5=6, C6=5 — 5 subjects). JAMB 60%.`;
    else if (ft === 'futo')   olevelHint.innerHTML = `FUTO uses <strong>4 core subjects</strong>. A1=100(1-sitting)/95(2-sitting), B2=90/85… JAMB×0.15 + O'Level×0.1.`;
    else if (ft === 'fuoye')  olevelHint.innerHTML = `O'Level contributes <strong>up to 30 points</strong> (A1=6, B2=5, B3=4, C4=3, C5=2, C6=1). Sitting bonus: 1 sitting=10pts, 2 sittings=6pts.`;
    else if (ft === 'futa')   olevelHint.innerHTML = `FUTA: O'Level avg of 5 subjects (A1=80, B2=72, B3=67, C4=62, C5=57, C6=52) ÷ 5 × 25% — contributes <strong>up to 25 points</strong>.`;
    else if (ft === 'bsu')    olevelHint.innerHTML = `BSU O'Level: A1=6, B2/B3=4, C4-C6=3 (5 subjects, max 20pts). Sitting bonus: 1 sitting=+10pts, 2 sittings=+2pts.`;
    else if (ft === 'absu')   olevelHint.innerHTML = `ABSU O'Level: A1=6, B2=5, B3=4, C4=3, C5=2, C6=1 (5 subjects, max 30pts). JAMB÷8 (max 50).`;
    else if (ft === 'fummsa') olevelHint.innerHTML = `FUMMSA O'Level: A1=6, B2=5, B3=4, C4=3, C5=2, C6=1 (5 subjects, max 30 → scaled to 50). JAMB (50%).`;
    else if (ft === 'ebsu')   olevelHint.innerHTML = `EBSU O'Level: A1=6, B2=5, B3=4, C4=3, C5=2, C6=1 (5 subjects, sum÷2 → max 15). JAMB÷8 (max 50).`;
    else if (ft === 'fuhsi')  olevelHint.innerHTML = `FUHSI O'Level: A1=6, B2=5, B3=4, C4=3, C5=2, C6=1 (5 subjects, max 30 → scaled to 20). JAMB 80%.`;
    else if (ft === 'esut')   olevelHint.innerHTML = `ESUT O'Level: A1=90, B2=80, B3=70, C4=60, C5=55, C6=50 (5 subjects). 1 sitting=+40 bonus. JAMB 70%.`;
    else olevelHint.innerHTML = `O'Level grades <strong>directly determine</strong> your aggregate at ${profile.name} — every grade counts.`;
  }

} else {
  // ── POST UTME UNIVERSITY — show slot ──
  putmeWrap.style.display = 'block';
  const ft = profile.formulaType;

  if (ft === 'abu') {
    if (putmeHint) putmeHint.innerHTML = `ABU Post UTME: 70-question CBT (25 English + 15 each of 3 subjects). Enter score out of 100. Aggregate = (JAMB + Post UTME×4) ÷ 2.`;
  } else {
    if (putmeHint) putmeHint.textContent = `Out of ${profile.postUtmeMax} · Enter your actual Post UTME score`;
  }

  if (olevelHint) {
    if (ft === 'unilag')   olevelHint.innerHTML = `O'Level contributes <strong>up to 20 points</strong> to your UNILAG aggregate (A1=4.0, B2=3.6, B3=3.2, C4=2.8, C5=2.4, C6=2.0).`;
    else if (ft === 'oau') olevelHint.innerHTML = `O'Level contributes <strong>up to 10 points</strong> to your OAU aggregate (A1=10, B2=9, B3=8, C4=7, C5=6, C6=5, averaged over 5 subjects ÷ 5).`;
    else if (ft === 'unilorin') olevelHint.innerHTML = `O'Level contributes <strong>up to 20 points</strong> to your UNILORIN aggregate (A1=4.0, B2=3.6, B3=3.2, C4=2.8, C5=2.4, C6=2.0).`;
    else if (ft === 'abu') olevelHint.innerHTML = `ABU does <strong>not</strong> use O'Level in aggregate calculation. O'Level credits are required for eligibility only.`;
    else olevelHint.innerHTML = `O'Level credits are required for eligibility but do <strong>not</strong> affect this university's aggregate score.`;
  }
}
}

function showFieldError(fieldId, message) {
const field = document.getElementById(fieldId);
if (!field) return;
const existing = field.parentElement.querySelector('.field-error');
if (existing) existing.remove();
const error = document.createElement('div');
error.className = 'field-error';
error.style.cssText = 'color:#dc2626;font-size:0.8rem;margin-top:4px;font-weight:500;';
error.textContent = message;
field.parentElement.appendChild(error);
field.style.borderColor = '#dc2626';
field.addEventListener('input', function () {
const err = field.parentElement.querySelector('.field-error');
if (err) err.remove();
field.style.borderColor = '';
}, { once: true });
}

function clearAllErrors() {
document.querySelectorAll('.field-error').forEach(el => el.remove());
document.querySelectorAll('input,select').forEach(el => el.style.borderColor = '');
}

function run() {
const btn = document.getElementById('pbtn');
clearAllErrors();
try {
const nameEl = document.getElementById('iname');
const uniEl = document.getElementById('iuni');
const courseEl = document.getElementById('icourse');
const jambEl = document.getElementById('ijamb');
const putmeEl = document.getElementById('iputme');

if (!nameEl || !uniEl || !courseEl || !jambEl) {
alert('Page elements not found. Please refresh the page.');
return;
}

const name = nameEl.value.trim();
const uni = uniEl.value;
const course = courseEl.value.trim();
const jamb = jambEl.value;
const putme = putmeEl ? putmeEl.value : '';
const grades = [
document.getElementById('ge')?.value || '',
document.getElementById('gm')?.value || '',
document.getElementById('g3')?.value || '',
document.getElementById('g4')?.value || '',
document.getElementById('g5')?.value || '',
document.getElementById('g6')?.value || '',
document.getElementById('g7')?.value || '',
document.getElementById('g8')?.value || '',
document.getElementById('g9')?.value || ''
];

let hasError = false;
if (!uni) { showFieldError('iuni', 'Please select a target university.'); hasError = true; }
if (!course) { showFieldError('icourse', 'Please select a course of study.'); hasError = true; }
if (!name) { showFieldError('iname', 'Please enter your full name.'); hasError = true; }

const jambNum = parseFloat(jamb);
if (!jamb || isNaN(jambNum) || jambNum <= 0 || jambNum > 400) {
showFieldError('ijamb', 'Please enter a valid JAMB score between 1 and 400.');
hasError = true;
}

//Validate Post UTME if entered
const putmeNum = parseFloat(putme);
if (putme && !isNaN(putmeNum)) {
const profile = universityProfiles[uni];
if (profile && profile.postUtmeMax > 0 && putmeNum > profile.postUtmeMax) {
showFieldError('iputme', `Post UTME score cannot exceed ${profile.postUtmeMax} for ${profile.name}.`);
hasError = true;
}
if (putmeNum < 0) {
showFieldError('iputme', 'Post UTME score cannot be negative.');
hasError = true;
}
}

//O'Level completion check safeguard: Warn user if they forgot to select grades
const selectedGradesCount = grades.filter(g => g !== '').length;
const requiredGradesCount = uni && ["unn", "futo"].includes(universityProfiles[uni]?.formulaType) ? 4 : 5;
if (uni && universityProfiles[uni]?.olevelMax > 0 && selectedGradesCount < requiredGradesCount) {
alert(`Please fill in at least ${requiredGradesCount} O'Level subject grades to get an accurate aggregate calculation.`);
hasError = true;
}

if (hasError) return;

if (typeof universityProfiles === 'undefined' || !universityProfiles[uni]) {
alert('University data failed to load. Please refresh and try again.');
return;
}

if (btn) {
btn.disabled = true;
btn.innerHTML = '<span class="spin"></span>Analyzing...';
}

const result = calcChanceV2(jambNum, putme, grades, sits, course, uni, indigene);

if (result.ineligible) {
renderIneligible(result, name, course, jambNum);
if (btn) { btn.disabled = false; btn.innerHTML = 'Predict My Admission Chances'; }
return;
}

const pos = getPosition(jambNum, result.cutoff, putme, grades, uni, course);
const targets = getTargetScores(result.cutoff, jambNum, result.putmeUsed, grades, uni, course);
const analysis = generateAnalysis(result, course, uni, jambNum, sits, grades);
const clusters = getClusterData(course, uni);

if (!courseCutoffs[course.toLowerCase().trim()]) {
targets.unshift(`⚠ "${course}" is not in our recognized course list. Cutoff estimated at 55—results may be less accurate.`);
}

const rs = document.getElementById('rs');
if (!rs) throw new Error('Results container (#rs) not found');
rs.style.display = 'block';
rs.classList.add('show');

const rname = document.getElementById('rname');
const rsub = document.getElementById('rsub');
const rformula = document.getElementById('rformula');
const rposition = document.getElementById('rposition');
const rpositionDesc = document.getElementById('rpositionDesc');
const rchance = document.getElementById('rchance');
const rchanceLabel = document.getElementById('rchanceLabel');
const scJamb = document.getElementById('sc-jamb');
const scAgg = document.getElementById('sc-agg');
const scNeeded = document.getElementById('sc-needed');
const breakdownBox = document.getElementById('breakdownBox');
const targetBox = document.getElementById('targetBox');
const clusterElite = document.getElementById('clusterElite');
const clusterStrong = document.getElementById('clusterStrong');
const clusterComp = document.getElementById('clusterComp');
const clusterBorder = document.getElementById('clusterBorder');
const clusterBelow = document.getElementById('clusterBelow');
const aitext = document.getElementById('aitext');
const ctaBox = document.getElementById('ctaBox');

if (rname) rname.textContent = name;
if (rsub) rsub.textContent = course + ' · ' + result.uniName + ' · Admission Cycle';
if (rformula) rformula.textContent = 'Formula: ' + result.formula + ' | ' + (["lasu", "eksu", "delsu", "fuoye", "unn", "unijos", "futo", "unizik", "futa", "bsu", "absu", "fummsa", "ebsu", "fuhsi", "esut"].includes(result.type) ? 'SCREENING (No Post UTME Exam)' : 'POST UTME REQUIRED');
if (rposition) {
rposition.className = 'position-badge ' + pos.class;
rposition.textContent = pos.label;
}
if (rpositionDesc) rpositionDesc.textContent = pos.desc;
if (rchance) rchance.textContent = result.chance + '%';
if (rchanceLabel) {
if (result.belowMinPass) {
rchanceLabel.innerHTML = 'Admission Chance <span style="color:#b45309;font-weight:700;">(Below Min. Pass)</span>';
} else rchanceLabel.textContent = 'Admission Chance';
}

if (scJamb) scJamb.textContent = jamb;
if (scAgg) {
const aggLabel = scAgg.parentElement?.querySelector('.label');
if (putme || ["lasu", "eksu", "delsu", "fuoye", "unn", "unijos", "futo", "unizik", "futa", "bsu", "absu", "fummsa", "ebsu", "fuhsi", "esut"].includes(result.type)) {
scAgg.textContent = result.aggregate;
if (aggLabel) aggLabel.textContent = 'Your Aggregate';
} else {
scAgg.textContent = '—';
if (aggLabel) aggLabel.textContent = 'Enter Post UTME Score';
}
}
if (scNeeded) scNeeded.textContent = result.cutoff + '+';

//Breakdown Rendering
if (breakdownBox) {
let html = '<h4>Your Aggregate Breakdown</h4>';
html += '<div class="target-line">JAMB Score: <strong>' + jamb + '/400</strong> → JAMB Points: <strong>' + result.jambContribution + '/50</strong></div>';

if (result.type === 'lasu') {
const jambPct = (jambNum / 400) * 60;
const olevelPct = (parseFloat(result.olevelScore) / 50) * 40;
html += `<div class="target-line">JAMB Contribution: <strong>${jambPct.toFixed(1)}/60</strong></div>`;
html += `<div class="target-line">O'Level Contribution: <strong>${olevelPct.toFixed(1)}/40</strong></div>`;
html += `<div class="target-line">O'Level Raw: <strong>${result.olevelScore}/50</strong></div>`;
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '/100</strong></div>';
} else if (result.type === 'oou') {
const jambPct = (jambNum / 400) * 70;
html += `<div class="target-line">JAMB Contribution: <strong>${jambPct.toFixed(1)}/70</strong></div>`;
html += `<div class="target-line">O'Level Contribution: <strong>${result.olevelScore}/30</strong></div>`;
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '/100</strong></div>';
} else if (result.type === 'eksu') {
const jambPct = (jambNum / 400) * 60;
html += `<div class="target-line">JAMB Contribution: <strong>${jambPct.toFixed(1)}/60</strong></div>`;
html += `<div class="target-line">O'Level Contribution: <strong>${result.olevelScore}/40</strong></div>`;
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '/100</strong></div>';
} else if (result.type === 'delsu') {
const jambPct = (jambNum / 400) * 70;
html += `<div class="target-line">JAMB Contribution: <strong>${jambPct.toFixed(1)}/70</strong></div>`;
html += `<div class="target-line">O'Level Contribution: <strong>${result.olevelScore}/30</strong></div>`;
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '/100</strong></div>';
} else if (result.type === 'aau') {
const jambPct = (jambNum / 400) * 60;
const olevelPct = (parseFloat(result.olevelScore) / 50) * 40;
html += `<div class="target-line">JAMB Contribution: <strong>${jambPct.toFixed(1)}/60</strong></div>`;
html += `<div class="target-line">O'Level Contribution: <strong>${olevelPct.toFixed(1)}/40</strong></div>`;
html += `<div class="target-line">O'Level Raw: <strong>${result.olevelScore}/50</strong></div>`;
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '/100</strong></div>';
} else if (result.type === 'unijos') {
const jambPct = (jambNum / 400) * 60;
const olevelPct = (parseFloat(result.olevelScore) / 50) * 40;
html += `<div class="target-line">JAMB Contribution: <strong>${jambPct.toFixed(1)}/60</strong></div>`;
html += `<div class="target-line">O'Level Contribution: <strong>${olevelPct.toFixed(1)}/40</strong></div>`;
html += `<div class="target-line">O'Level Raw: <strong>${result.olevelScore}/50</strong></div>`;
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '/100</strong></div>';
html += `<div class="target-line" style="color:var(--success);font-size:0.85rem;">ℹ UNIJOS uses online screening —no Post UTME exam required</div>`;
} else if (result.type === 'unizik') {
const jambPct = jambNum * 0.7;
const sittingBonus = sits === 1 ? 10 : 0;
const olevelRaw = parseFloat(result.olevelScore);
const olevelPct = (olevelRaw + sittingBonus) * 0.3;
html += `<div class="target-line">UTME Contribution: <strong>${jambPct.toFixed(1)}</strong> (70% of JAMB)</div>`;
html += `<div class="target-line">O'Level Raw: <strong>${olevelRaw}</strong> + Sitting Bonus: <strong>${sittingBonus}</strong></div>`;
html += `<div class="target-line">O'Level Scaled: <strong>${olevelPct.toFixed(1)}</strong> (30%)</div>`;
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '</strong></div>';
html += `<div class="target-line" style="color:var(--success);font-size:0.85rem;">ℹ UNIZIK evaluates 4 subjects matching your UTME combination. One sitting: +10</div>`;
} else if (result.type === 'fuoye') {
const jambPct = (jambNum / 400) * 60;
const sittingBonus = sits === 1 ? 10 : 6;
html += `<div class="target-line">JAMB Contribution: <strong>${jambPct.toFixed(1)}/60</strong></div>`;
html += `<div class="target-line">O'Level Contribution: <strong>${result.olevelScore}/30</strong></div>`;
html += `<div class="target-line">Sitting Bonus: <strong>${sittingBonus}/10</strong></div>`;
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '/100</strong></div>';
} else if (result.type === 'futo') {
const jambPct = jambNum * 0.15;
const olevelMap = sits === 1 ? olevelMappings["futo_single"] : olevelMappings["futo"];
let olevelBonus = 0;
const validGrades = grades.filter(g => g && olevelMap[g] !== undefined);
validGrades.sort((a, b) => olevelMap[b] - olevelMap[a]);
const topFutoGrades = validGrades.slice(0, 4);
topFutoGrades.forEach(g => { olevelBonus += olevelMap[g]; });
const olevelPct = olevelBonus * 0.1;
html += `<div class="target-line">UTME Contribution: <strong>${jambPct.toFixed(1)}</strong> (15% of JAMB)</div>`;
html += `<div class="target-line">O'Level Contribution: <strong>${olevelPct.toFixed(1)}</strong> (10% of bonus points)</div>`;
html += `<div class="target-line">O'Level Raw: <strong>${olevelBonus}</strong> (4 core subjects, ${sits === 1 ? 'single sitting +5/grade' : 'two sittings'})</div>`;
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '</strong></div>';
html += `<div class="target-line" style="color:var(--success);font-size:0.85rem;">ℹ FUTO uses screening —no Post UTME exam required</div>`;
} else if (result.type === 'futminna') {
const utmePoints = jambNum >= 300 ? Math.min(60, 44 + Math.floor((jambNum - 300) / 20)) : (jambNum >= 200 ? 24 + Math.floor((jambNum - 200) / 5) : (jambNum >= 180 ? 20 + Math.floor((jambNum - 180) / 6) : 0));
const sittingBonus = sits === 1 ? 10 : 2;
html += `<div class="target-line">UPASE UTME Points: <strong>${utmePoints}/60</strong> (bracketed scale)</div>`;
html += `<div class="target-line">O'Level Points: <strong>${result.olevelScore}/30</strong> (A1=6, B2-B3=4, C4-C6=3)</div>`;
html += `<div class="target-line">Sitting Bonus: <strong>${sittingBonus}</strong> (Single=+10, Two=+2)</div>`;
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '</strong></div>';
html += `<div class="target-line" style="color:var(--success);font-size:0.85rem;">ℹ FUTMINNA uses UPASE screening —no Post UTME exam required</div>`;
} else if (result.type === 'funaab') {
const jambPts = jambNum / 8;
const olevelDeduction = sits === 2 ? 1 : 0;
const olevelScaled = Math.max(0, (parseFloat(result.olevelScore) - olevelDeduction) * (2 / 3));
const putmePts = result.putmeUsed > 0 ? result.putmeUsed * 0.3 : 0;
html += `<div class="target-line">JAMB Contribution: <strong>${jambPts.toFixed(1)}/50</strong></div>`;
html += `<div class="target-line">O'Level Contribution: <strong>${olevelScaled.toFixed(1)}/20</strong> (scaled by 2/3)</div>`;
html += `<div class="target-line">O'Level Raw: <strong>${result.olevelScore}/30</strong> (A1=6, B2=5, B3=4, C4=3, C5=2, C6=1)</div>`;
if (sits === 2) html += `<div class="target-line">Two Sitting Deduction: <strong>-1</strong> from O'Level</div>`;
html += '<div class="target-line">Post UTME: <strong>' + (result.putmeUsed || 'Not entered') + '/100</strong> → Scaled: <strong>' + (putmePts > 0 ? putmePts.toFixed(1) : 'Not entered') + '/30</strong></div>';
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '/100</strong></div>';
} else if (result.type === 'unn') {
const jambPts = jambNum * 0.9;
const sittingBonus = sits === 1 ? 40 : 0;
const olevelRaw = parseFloat(result.olevelScore);
const olevelScaled = (olevelRaw + sittingBonus) * 0.1;
html += `<div class="target-line">JAMB Contribution: <strong>${jambPts.toFixed(1)}/360</strong> (90% of JAMB)</div>`;
html += `<div class="target-line">O'Level Raw: <strong>${olevelRaw}</strong> + Sitting Bonus: <strong>${sittingBonus}</strong> = <strong>${olevelRaw + sittingBonus}</strong></div>`;
html += `<div class="target-line">O'Level Scaled: <strong>${olevelScaled.toFixed(1)}/40</strong> (10%)</div>`;
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '/400</strong></div>';
html += `<div class="target-line" style="color:var(--warning);font-size:0.85rem;">ℹ UNN uses 4 core subjects relevant to your course. One sitting gets +40 bonus</div>`;
} else if (result.type === 'unilag') {
html += '<div class="target-line">Post UTME: <strong>' + (putme || 'Not entered') + '/' + result.postUtmeMax + '</strong></div>';
html += `<div class="target-line">O'Level Points: <strong>${result.olevelScore}/20</strong></div>`;
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '/100</strong></div>';
} else if (result.type === 'oau') {
html += '<div class="target-line">Post UTME: <strong>' + (putme || 'Not entered') + '/' + result.postUtmeMax + '</strong></div>';
html += `<div class="target-line">O'Level Points: <strong>${result.olevelScore}/10</strong></div>`;
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '/100</strong></div>';
} else if (result.type === 'unilorin') {
const putmeConverted = putme ? ((parseFloat(putme) / 100) * 30).toFixed(1) : 'Not entered';
html += '<div class="target-line">Post UTME: <strong>' + (putme || 'Not entered') + '/100</strong> → Converted: <strong>' + putmeConverted + '/30</strong></div>';
html += `<div class="target-line">O'Level Points: <strong>${result.olevelScore}/20</strong></div>`;
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '/100</strong></div>';
} else {
html += '<div class="target-line">Post UTME: <strong>' + (putme || 'Not entered') + '/' + result.postUtmeMax + '</strong> → Post UTME Points: <strong>' + (putme ? (parseFloat(putme) / 2).toFixed(1) : 'Not entered') + '/50</strong></div>';
html += '<div class="target-line">Total Aggregate: <strong>' + result.aggregate + '/100</strong></div>';
if (result.type === 'standard') {
html += `<div class="target-line" style="color:var(--warning);font-size:0.85rem;">ℹ O'Level grades are required for admission but do not affect this university's aggregate calculation.</div>`;
}
}

html += '<div class="target-line" style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--border);">Departmental Cutoff: <strong>' + result.cutoff + '</strong></div>';
breakdownBox.innerHTML = html;
breakdownBox.style.display = 'block';
}

//Targets Rendering
if (targetBox) {
let targetHTML = '<h4>What You Should Aim For</h4>';
if (result.belowMinPass) {
targetHTML += '<div class="target-line" style="color:#92400e;font-weight:600;background:#fffbeb;padding:12px;border-radius:8px;border:1px solid #fde68a;margin-bottom:12px;">💡 Note: ' + result.uniName + ' requires a minimum Post UTME score of ' + result.minPostUtmePass + '/' + result.postUtmeMax + ' to be considered. You need ' + result.requiredPutme + '/' + result.postUtmeMax + ' for the cutoff, but aim for ' + result.minPostUtmePass + '+ to stay safely above the minimum pass mark. You can do this!</div>';
}
if (hasFailingGrade(grades) && !hasF9(grades)) {
targetHTML += '<div class="target-line" style="color:#dc2626;font-weight:700;background:#fef2f2;padding:12px;border-radius:8px;border:1px solid #fecaca;margin-bottom:12px;">⚠ D7 or E8 grade detected. JAMB CAPS requires a minimum of C6 (credit pass) for admission. D7 and E8 are NOT accepted as credit passes at most Nigerian universities, including ' + result.uniName + '. You may be ineligible unless these are in non-core subjects —verify immediately with the university\'s admission office.</div>';
}

if (result.cushion !== undefined) {
const cushionNum = parseFloat(result.cushion);
if (cushionNum > 0) {
targetHTML += '<div class="target-line" style="color:var(--success);font-weight:700;">✓ You are ' + cushionNum.toFixed(1) + ' points above cutoff</div>';
} else if (cushionNum < 0) {
targetHTML += '<div class="target-line" style="color:var(--danger);font-weight:700;">⚠ You are ' + Math.abs(cushionNum).toFixed(1) + ' points below cutoff</div>';
}
}

if (result.headroom !== undefined && parseFloat(result.headroom) > 0 && result.putmeUsed === 0 && result.postUtmeMax > 0) {
targetHTML += '<div class="target-line" style="color:var(--warning);">📈 Headroom: ' + parseFloat(result.headroom).toFixed(1) + ' more points available in Post UTME</div>';
}

targetHTML += targets.map(t => '<div class="target-line">' + t + '</div>').join('');
targetBox.innerHTML = targetHTML;
}

if (clusterElite) clusterElite.style.width = clusters.elite.width + '%';
if (clusterStrong) clusterStrong.style.width = clusters.strong.width + '%';
if (clusterComp) clusterComp.style.width = clusters.competitive.width + '%';
if (clusterBorder) clusterBorder.style.width = clusters.borderline.width + '%';
if (clusterBelow) clusterBelow.style.width = clusters.below.width + '%';

let warningBox = document.getElementById('minPassWarningBox');
if (result.belowMinPass) {
if (!warningBox) {
warningBox = document.createElement('div');
warningBox.id = 'minPassWarningBox';
if (aitext && aitext.parentElement) {
aitext.parentElement.insertBefore(warningBox, aitext);
}
}
warningBox.innerHTML = '<div style="font-weight:700;font-size:1.05rem;margin-bottom:8px;color:#92400e;">💡 Minimum Post UTME Pass Note</div><div style="color:#78350f;">' + result.uniName + ' requires a minimum Post UTME score of <strong>' + result.minPostUtmePass + '/' + result.postUtmeMax + '</strong> to be considered for admission. Even if your aggregate hits the cutoff, scoring below this minimum could affect your eligibility. Aim for at least <strong>' + result.minPostUtmePass + '/' + result.postUtmeMax + '</strong> to stay safely above the minimum —you\'ve got this!</div>';
warningBox.style.cssText = 'background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin:16px 0;';
warningBox.style.display = 'block';
} else if (warningBox) {
warningBox.style.display = 'none';
}

if (aitext) aitext.textContent = analysis;

if (ctaBox) {
let ctaHTML = '';
if (result.chance >= 65) {
ctaHTML = '<div class="whatsapp-text"><h4>You Are in a Strong Position</h4><p>Protect your advantage with targeted Post UTME prep. Join 5,000+ students getting real-time updates from Tutor TechMed.</p></div>' +
'<a href="https://whatsapp.com/channel/0029Vb7tQsfD38CSNxWtHN3i" class="whatsapp-btn" target="_blank">Join TechMed Channel →</a>';
} else if (result.chance >= 35) {
ctaHTML = '<div class="whatsapp-text"><h4>You Need Strategic Support</h4><p>Students in your position have turned things around with guidance from Tutor TechMed. Get personalized advice now.</p></div>' +
'<a href="https://wa.me/2347044255045?text=Hi%20Tutor%20TechMed,%20I%20need%20guidance%20on%20my%20' + encodeURIComponent(course) + '%20admission%20at%20' + encodeURIComponent(result.uniName) + '.%20My%20aggregate%20is%20' + result.aggregate + '." class="whatsapp-btn" target="_blank">Message Tutor TechMed →</a>';
} else {
ctaHTML = '<div class="whatsapp-text"><h4>Explore Your Options with Tutor TechMed</h4><p>Your current profile may not be competitive for this course. Let Tutor TechMed help you find alternative courses, universities, or next steps.</p></div>' +
'<a href="https://wa.me/2347044255045?text=Hi%20Tutor%20TechMed,%20I%20need%20help%20exploring%20alternatives%20for%20my%20' + encodeURIComponent(course) + '%20application.%20My%20JAMB%20is%20' + jamb + '." class="whatsapp-btn" target="_blank">Get Alternative Options from Tutor TechMed →</a>';
}
ctaBox.innerHTML = ctaHTML;
ctaBox.style.display = 'flex';
}

rs.scrollIntoView({ behavior: 'smooth', block: 'start' });

} catch (err) {
console.error('Prediction error:', err);
alert('Something went wrong while calculating.\n\nError: ' + (err.message || err));
} finally {
if (btn) {
btn.disabled = false;
btn.innerHTML = 'Predict My Admission Chances';
}
}
}

function renderIneligible(result, name, course, jamb) {
const rs = document.getElementById('rs');
if (!rs) return;
rs.style.display = 'block';
rs.classList.add('show');

const rname = document.getElementById('rname');
const rsub = document.getElementById('rsub');
const rformula = document.getElementById('rformula');
const rposition = document.getElementById('rposition');
const rpositionDesc = document.getElementById('rpositionDesc');
const rchance = document.getElementById('rchance');
const rchanceLabel = document.getElementById('rchanceLabel');
const scJamb = document.getElementById('sc-jamb');
const scAgg = document.getElementById('sc-agg');
const scNeeded = document.getElementById('sc-needed');
const breakdownBox = document.getElementById('breakdownBox');
const targetBox = document.getElementById('targetBox');
const aitext = document.getElementById('aitext');
const ctaBox = document.getElementById('ctaBox');

if (rname) rname.textContent = name;
if (rsub) rsub.textContent = course + ' · ' + result.uniName + ' · Admission Cycle';
if (rformula) rformula.textContent = 'Formula: ' + result.formula;
if (rposition) {
rposition.className = 'position-badge below';
rposition.textContent = 'Ineligible';
}
if (rpositionDesc) rpositionDesc.textContent = result.ineligibleReason;
if (rchance) rchance.textContent = '0%';
if (rchanceLabel) rchanceLabel.textContent = 'Admission Chance';
if (scJamb) scJamb.textContent = jamb;
if (scAgg) scAgg.textContent = '—';
if (scNeeded) scNeeded.textContent = result.cutoff + '+';
if (breakdownBox) {
breakdownBox.innerHTML = '<h4>Ineligible</h4><div class="target-line" style="color:#dc2626;">' + result.ineligibleReason + '</div>';
breakdownBox.style.display = 'block';
}

const warningBoxInel = document.getElementById('minPassWarningBox');
if (warningBoxInel) warningBoxInel.style.display = 'none';

if (targetBox) {
if (result.ineligibleReason && result.ineligibleReason.includes('F9')) {
targetBox.innerHTML = '<h4>What You Should Do</h4>' +
'<div class="target-line" style="color:#dc2626;">• F9 grade detected in your O\'Level results</div>' +
'<div class="target-line">• JAMB CAPS disqualifies F9 grades for admission at most universities</div>' +
'<div class="target-line">• You must retake the subject with F9 and obtain at least a C6 before applying</div>' +
'<div class="target-line">• Consider WAEC GCE, NECO, or NABTEB to replace the F9 grade</div>' +
'<div class="target-line">• Contact Tutor TechMed for guidance on O\'Level grade remediation</div>';
} else {
targetBox.innerHTML = '<h4>What You Should Do</h4>' +
'<div class="target-line">• Your JAMB score of ' + jamb + ' is below the minimum required (' + result.profile.minJamb + ')</div>' +
'<div class="target-line">• Consider universities with lower JAMB requirements: FUD, FUL, FUK, FUWUKARI, FED-LAFIA, FED-DUTSINMA, EKSU, DELSU, AAU</div>' +
'<div class="target-line">• Prepare to rewrite JAMB to score ' + result.profile.minJamb + '+</div>';
}
}

if (aitext) aitext.textContent = 'INELIGIBLE\n\n' + result.ineligibleReason + '\n\nYou cannot proceed with this application. Consider alternative options or contact Tutor TechMed for guidance.';

if (ctaBox) {
let ctaHTML = '';
if (result.ineligibleReason && result.ineligibleReason.includes('F9')) {
ctaHTML = '<div class="whatsapp-text"><h4>Need Help With O\'Level Grade Issues?</h4><p>Get expert advice from Tutor TechMed on how to remediate F9 grades and explore alternative admission pathways.</p></div>' +
'<a href="https://wa.me/2347044255045?text=Hi%20Tutor%20TechMed,%20I%20have%20an%20F9%20grade%20in%20my%20O\'Level%20and%20need%20guidance%20on%20alternative%20options%20for%20' + encodeURIComponent(course) + '." class="whatsapp-btn" target="_blank">Message Tutor TechMed →</a>';
} else {
ctaHTML = '<div class="whatsapp-text"><h4>Need Help With Alternatives?</h4><p>Get expert advice from Tutor TechMed on alternative universities and courses that match your JAMB score.</p></div>' +
'<a href="https://wa.me/2347044255045?text=Hi%20Tutor%20TechMed,%20I%20scored%20' + jamb + '%20in%20JAMB%20and%20need%20help%20finding%20alternative%20universities%20for%20' + encodeURIComponent(course) + '." class="whatsapp-btn" target="_blank">Message Tutor TechMed →</a>';
}
ctaBox.innerHTML = ctaHTML;
ctaBox.style.display = 'flex';
}

['clusterElite', 'clusterStrong', 'clusterComp', 'clusterBorder', 'clusterBelow'].forEach(id => {
const el = document.getElementById(id);
if (el) el.style.width = '0%';
});

rs.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm() {
document.getElementById('rs').style.display = 'none';
document.getElementById('rs').classList.remove('show');
const bb = document.getElementById('breakdownBox');
if (bb) bb.style.display = 'none';
const cb = document.getElementById('ctaBox');
if (cb) cb.style.display = 'none';
const inputs = ['iname', 'iuni', 'icourse', 'ijamb', 'iputme', 'ge', 'gm', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];
inputs.forEach(id => {
const el = document.getElementById(id);
if (el) el.value = '';
});
sits = 1;
window.sits = 1;
indigene = false;
window.indigene = false;
document.querySelectorAll('.toggle-btn').forEach((btn, idx) => {
if (idx === 0 || idx === 2) btn.classList.add('active');
else btn.classList.remove('active');
});
clearAllErrors();
window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('resize', function () {
if (window.innerWidth > 768) closeMenu();
});

document.addEventListener('DOMContentLoaded', () => {
initScrollReveal();

const uniSelect = document.getElementById('iuni');
if (uniSelect) {
uniSelect.addEventListener('change', function() {
togglePostUtmeField();
updateSubjectLabels(this.value);
filterCoursesByUni(this.value);
});
// Run once on load in case of page refresh with pre-selected value
if (uniSelect.value) {
togglePostUtmeField();
updateSubjectLabels(uniSelect.value);
filterCoursesByUni(uniSelect.value);
}
}
});
