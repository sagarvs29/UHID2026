import { InteractionSeverity } from '@prisma/client';

// ─── Drug-Drug Interaction Table ──────────────────────────────────────────────
export interface DrugInteraction {
  drugA: string;         // canonical lower-case drug name
  drugB: string;
  severity: InteractionSeverity;
  mechanism: string;
  clinicalEffect: string;
  alternatives?: { forDrugA?: string[]; forDrugB?: string[] };
}

export const DRUG_INTERACTIONS: DrugInteraction[] = [
  // ── CRITICAL interactions ────────────────────────────────────────────────
  {
    drugA: 'ssri',
    drugB: 'maoi',
    severity: 'CRITICAL',
    mechanism: 'Excess serotonin accumulation due to inhibition of both reuptake and breakdown',
    clinicalEffect: 'Serotonin syndrome — hyperthermia, rigidity, clonus, can be fatal',
    alternatives: { forDrugA: ['bupropion', 'mirtazapine'], forDrugB: ['selegiline patch (low dose)'] },
  },
  {
    drugA: 'clopidogrel',
    drugB: 'omeprazole',
    severity: 'CRITICAL',
    mechanism: 'Omeprazole inhibits CYP2C19, markedly reducing active clopidogrel metabolite',
    clinicalEffect: 'Reduced antiplatelet effect → increased risk of stent thrombosis and MI',
    alternatives: { forDrugB: ['pantoprazole', 'rabeprazole'] },
  },
  {
    drugA: 'linezolid',
    drugB: 'ssri',
    severity: 'CRITICAL',
    mechanism: 'Linezolid is a MAO inhibitor; combined with SSRI causes severe serotonin excess',
    clinicalEffect: 'Serotonin syndrome — potentially fatal',
    alternatives: { forDrugA: ['daptomycin (for gram-positive infections)'] },
  },
  {
    drugA: 'methotrexate',
    drugB: 'trimethoprim',
    severity: 'CRITICAL',
    mechanism: 'Both inhibit dihydrofolate reductase — additive folate antagonism',
    clinicalEffect: 'Severe bone marrow suppression, pancytopenia, mucositis',
    alternatives: { forDrugB: ['nitrofurantoin', 'fosfomycin (for UTI)'] },
  },

  // ── HIGH interactions ────────────────────────────────────────────────────
  {
    drugA: 'warfarin',
    drugB: 'aspirin',
    severity: 'HIGH',
    mechanism: 'Both inhibit platelet function; aspirin also displaces warfarin from protein binding',
    clinicalEffect: 'Risk of major bleeding including GI and intracranial haemorrhage',
    alternatives: { forDrugB: ['acetaminophen (for pain)', 'clopidogrel (with caution, if necessary)'] },
  },
  {
    drugA: 'warfarin',
    drugB: 'ibuprofen',
    severity: 'HIGH',
    mechanism: 'NSAIDs inhibit platelet aggregation and cause GI mucosal damage; ibuprofen inhibits CYP2C9',
    clinicalEffect: 'Significantly elevated INR and bleeding risk',
    alternatives: { forDrugB: ['acetaminophen', 'celecoxib (with close INR monitoring)'] },
  },
  {
    drugA: 'warfarin',
    drugB: 'naproxen',
    severity: 'HIGH',
    mechanism: 'NSAID-mediated platelet inhibition and GI injury combined with anticoagulation',
    clinicalEffect: 'Increased risk of serious bleeding events',
    alternatives: { forDrugB: ['acetaminophen'] },
  },
  {
    drugA: 'simvastatin',
    drugB: 'clarithromycin',
    severity: 'HIGH',
    mechanism: 'Clarithromycin strongly inhibits CYP3A4, dramatically increasing simvastatin plasma levels',
    clinicalEffect: 'Risk of rhabdomyolysis and acute kidney injury',
    alternatives: { forDrugA: ['pravastatin', 'rosuvastatin (not CYP3A4 metabolised)'] },
  },
  {
    drugA: 'simvastatin',
    drugB: 'amiodarone',
    severity: 'HIGH',
    mechanism: 'Amiodarone inhibits CYP3A4 and CYP2C9, raising simvastatin concentrations',
    clinicalEffect: 'Myopathy and rhabdomyolysis',
    alternatives: { forDrugA: ['pravastatin', 'rosuvastatin'] },
  },
  {
    drugA: 'digoxin',
    drugB: 'amiodarone',
    severity: 'HIGH',
    mechanism: 'Amiodarone inhibits P-gp and reduces digoxin renal clearance',
    clinicalEffect: 'Digoxin toxicity — bradycardia, heart block, nausea, visual disturbances',
    alternatives: {},
  },
  {
    drugA: 'lithium',
    drugB: 'ibuprofen',
    severity: 'HIGH',
    mechanism: 'NSAIDs reduce renal prostaglandin synthesis, decreasing lithium clearance',
    clinicalEffect: 'Lithium toxicity — tremor, confusion, renal failure, cardiac arrhythmia',
    alternatives: { forDrugB: ['acetaminophen'] },
  },
  {
    drugA: 'metformin',
    drugB: 'contrast_iodinated',
    severity: 'HIGH',
    mechanism: 'Contrast can cause acute kidney injury impairing metformin clearance',
    clinicalEffect: 'Risk of lactic acidosis',
    alternatives: {},
  },
  {
    drugA: 'ciprofloxacin',
    drugB: 'tizanidine',
    severity: 'HIGH',
    mechanism: 'Ciprofloxacin is a potent CYP1A2 inhibitor, markedly increasing tizanidine levels',
    clinicalEffect: 'Severe hypotension, sedation, bradycardia',
    alternatives: { forDrugA: ['levofloxacin', 'azithromycin'] },
  },
  {
    drugA: 'fluconazole',
    drugB: 'warfarin',
    severity: 'HIGH',
    mechanism: 'Fluconazole inhibits CYP2C9, the main metabolic pathway for warfarin (S-enantiomer)',
    clinicalEffect: 'Greatly elevated INR and haemorrhagic risk',
    alternatives: { forDrugA: ['micafungin', 'anidulafungin (for candidaemia)'] },
  },
  {
    drugA: 'phenytoin',
    drugB: 'fluconazole',
    severity: 'HIGH',
    mechanism: 'Fluconazole inhibits CYP2C9, raising phenytoin concentrations',
    clinicalEffect: 'Phenytoin toxicity — nystagmus, ataxia, confusion',
    alternatives: {},
  },
  {
    drugA: 'atorvastatin',
    drugB: 'clarithromycin',
    severity: 'HIGH',
    mechanism: 'Strong CYP3A4 inhibition by clarithromycin raises atorvastatin AUC significantly',
    clinicalEffect: 'Elevated risk of myopathy and rhabdomyolysis',
    alternatives: { forDrugA: ['pravastatin', 'rosuvastatin'], forDrugB: ['azithromycin'] },
  },

  // ── MODERATE interactions ────────────────────────────────────────────────
  {
    drugA: 'metformin',
    drugB: 'alcohol',
    severity: 'MODERATE',
    mechanism: 'Both inhibit hepatic lactate metabolism; combined risk of lactic acidosis',
    clinicalEffect: 'Lactic acidosis risk; hypoglycaemia if caloric intake is poor',
    alternatives: {},
  },
  {
    drugA: 'ace_inhibitor',
    drugB: 'potassium_supplement',
    severity: 'MODERATE',
    mechanism: 'ACE inhibitors reduce renal potassium excretion; additive effect with supplements',
    clinicalEffect: 'Hyperkalaemia — cardiac arrhythmia risk',
    alternatives: {},
  },
  {
    drugA: 'ssri',
    drugB: 'tramadol',
    severity: 'MODERATE',
    mechanism: 'Tramadol inhibits serotonin reuptake; additive serotonergic effect with SSRIs',
    clinicalEffect: 'Serotonin syndrome (lower risk than SSRI+MAOI); seizure risk',
    alternatives: { forDrugB: ['acetaminophen', 'codeine (with caution)'] },
  },
  {
    drugA: 'metronidazole',
    drugB: 'warfarin',
    severity: 'MODERATE',
    mechanism: 'Metronidazole inhibits CYP2C9 and CYP3A4',
    clinicalEffect: 'Increased anticoagulant effect, elevated bleeding risk',
    alternatives: {},
  },
  {
    drugA: 'amlodipine',
    drugB: 'simvastatin',
    severity: 'MODERATE',
    mechanism: 'Amlodipine is a weak CYP3A4 inhibitor, modestly increasing simvastatin levels',
    clinicalEffect: 'Increased myopathy risk; simvastatin dose should not exceed 20 mg',
    alternatives: { forDrugA: ['rosuvastatin', 'pravastatin'] },
  },
  {
    drugA: 'bisoprolol',
    drugB: 'verapamil',
    severity: 'MODERATE',
    mechanism: 'Both slow AV node conduction through different mechanisms',
    clinicalEffect: 'Bradycardia, AV block, heart failure exacerbation',
    alternatives: { forDrugB: ['amlodipine (if rate control required)'] },
  },
  {
    drugA: 'ciprofloxacin',
    drugB: 'antacid',
    severity: 'MODERATE',
    mechanism: 'Divalent cations (Mg²⁺, Al³⁺, Ca²⁺) chelate ciprofloxacin in GI tract',
    clinicalEffect: 'Markedly reduced ciprofloxacin bioavailability',
    alternatives: {},
  },
  {
    drugA: 'spironolactone',
    drugB: 'ace_inhibitor',
    severity: 'MODERATE',
    mechanism: 'Both increase serum potassium through independent mechanisms',
    clinicalEffect: 'Hyperkalaemia; requires close monitoring',
    alternatives: {},
  },
  {
    drugA: 'rifampicin',
    drugB: 'oral_contraceptive',
    severity: 'MODERATE',
    mechanism: 'Rifampicin is a potent CYP3A4 and P-gp inducer, reducing hormonal exposure',
    clinicalEffect: 'Contraceptive failure; unintended pregnancy',
    alternatives: { forDrugB: ['copper IUD', 'depo-provera injection'] },
  },
  {
    drugA: 'azithromycin',
    drugB: 'amiodarone',
    severity: 'MODERATE',
    mechanism: 'Additive QTc prolongation',
    clinicalEffect: 'Risk of torsades de pointes and ventricular arrhythmia',
    alternatives: { forDrugA: ['doxycycline', 'co-amoxiclav'] },
  },

  // ── LOW interactions ─────────────────────────────────────────────────────
  {
    drugA: 'atorvastatin',
    drugB: 'amiodarone',
    severity: 'LOW',
    mechanism: 'Minor CYP3A4 inhibition by amiodarone modestly increases atorvastatin levels',
    clinicalEffect: 'Slightly elevated myopathy risk; monitor CPK if symptomatic',
    alternatives: {},
  },
  {
    drugA: 'metformin',
    drugB: 'furosemide',
    severity: 'LOW',
    mechanism: 'Furosemide may reduce metformin renal excretion and alter GFR',
    clinicalEffect: 'Modest increase in metformin plasma levels; monitor renal function',
    alternatives: {},
  },
  {
    drugA: 'aspirin',
    drugB: 'ibuprofen',
    severity: 'LOW',
    mechanism: 'Ibuprofen competitively blocks COX-1 site, interfering with aspirin antiplatelet effect',
    clinicalEffect: 'Reduced cardioprotective effect of low-dose aspirin',
    alternatives: { forDrugB: ['acetaminophen', 'celecoxib'] },
  },
];

// ─── Normalised lookup helpers ────────────────────────────────────────────────
/** Find an interaction for a given drug pair (order-independent, prefix-matched) */
export function findInteraction(
  drugA: string,
  drugB: string
): DrugInteraction | null {
  const a = normaliseDrugName(drugA);
  const b = normaliseDrugName(drugB);

  return (
    DRUG_INTERACTIONS.find(
      (i) =>
        (matchesDrug(i.drugA, a) && matchesDrug(i.drugB, b)) ||
        (matchesDrug(i.drugA, b) && matchesDrug(i.drugB, a))
    ) ?? null
  );
}

function normaliseDrugName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
}

function matchesDrug(pattern: string, name: string): boolean {
  // exact match or name contains the pattern as a substring
  return name === pattern || name.includes(pattern) || pattern.includes(name);
}

// ─── Drug Class Map ───────────────────────────────────────────────────────────
// Maps drug names → drug class; used for cross-class allergy checks
export const DRUG_CLASS_MAP: Record<string, string> = {
  // Beta-lactams / Penicillins
  amoxicillin: 'penicillin',
  ampicillin: 'penicillin',
  flucloxacillin: 'penicillin',
  'co-amoxiclav': 'penicillin',
  piperacillin: 'penicillin',
  // Cephalosporins (cross-react with penicillin ~1%)
  cefalexin: 'cephalosporin',
  cefuroxime: 'cephalosporin',
  ceftriaxone: 'cephalosporin',
  ceftazidime: 'cephalosporin',
  // Sulfonamides
  trimethoprim: 'sulfonamide',
  sulfamethoxazole: 'sulfonamide',
  // NSAIDs
  ibuprofen: 'nsaid',
  naproxen: 'nsaid',
  diclofenac: 'nsaid',
  celecoxib: 'nsaid',
  aspirin: 'nsaid',
  ketorolac: 'nsaid',
  // Statins
  atorvastatin: 'statin',
  simvastatin: 'statin',
  rosuvastatin: 'statin',
  pravastatin: 'statin',
  // Opioids
  morphine: 'opioid',
  codeine: 'opioid',
  tramadol: 'opioid',
  fentanyl: 'opioid',
  oxycodone: 'opioid',
  // Fluoroquinolones
  ciprofloxacin: 'fluoroquinolone',
  levofloxacin: 'fluoroquinolone',
  moxifloxacin: 'fluoroquinolone',
  // SSRIs
  sertraline: 'ssri',
  fluoxetine: 'ssri',
  escitalopram: 'ssri',
  citalopram: 'ssri',
  paroxetine: 'ssri',
  // ACE Inhibitors
  ramipril: 'ace_inhibitor',
  enalapril: 'ace_inhibitor',
  lisinopril: 'ace_inhibitor',
  perindopril: 'ace_inhibitor',
  // ARBs
  losartan: 'arb',
  valsartan: 'arb',
  irbesartan: 'arb',
  candesartan: 'arb',
};

// ─── Drug-Condition Contraindications ────────────────────────────────────────
// Maps ICD-10 prefix → list of contraindicated drug names/classes
export const DRUG_CONDITION_CONTRAINDICATIONS: Record<
  string,
  Array<{ drug: string; severity: InteractionSeverity; reason: string }>
> = {
  // N18 – Chronic kidney disease
  N18: [
    { drug: 'metformin', severity: 'HIGH', reason: 'Metformin is contraindicated in significant CKD (eGFR <30) due to lactic acidosis risk' },
    { drug: 'nsaid', severity: 'HIGH', reason: 'NSAIDs further reduce renal blood flow and accelerate CKD progression' },
    { drug: 'contrast_iodinated', severity: 'HIGH', reason: 'Contrast nephropathy risk is greatly elevated in CKD' },
  ],
  // I50 – Heart failure
  I50: [
    { drug: 'nsaid', severity: 'HIGH', reason: 'NSAIDs cause sodium retention, worsening heart failure and increasing hospitalisation risk' },
    { drug: 'verapamil', severity: 'HIGH', reason: 'Verapamil has negative inotropic effect; contraindicated in systolic heart failure' },
    { drug: 'thiazolidinedione', severity: 'MODERATE', reason: 'Pioglitazone and rosiglitazone cause fluid retention' },
  ],
  // I48 – Atrial fibrillation
  I48: [
    { drug: 'amiodarone', severity: 'MODERATE', reason: 'Amiodarone has serious long-term toxicities; ensure benefit-risk assessment' },
  ],
  // K92 – GI bleeding
  K92: [
    { drug: 'aspirin', severity: 'HIGH', reason: 'Aspirin increases risk of further GI haemorrhage' },
    { drug: 'nsaid', severity: 'HIGH', reason: 'NSAIDs inhibit prostaglandin-mediated mucosal protection' },
    { drug: 'warfarin', severity: 'HIGH', reason: 'Anticoagulants markedly increase re-bleeding risk' },
    { drug: 'clopidogrel', severity: 'MODERATE', reason: 'Antiplatelet therapy increases GI bleeding risk' },
  ],
  // J45 – Asthma
  J45: [
    { drug: 'aspirin', severity: 'HIGH', reason: 'Aspirin-exacerbated respiratory disease affects ~10% of asthmatics' },
    { drug: 'nsaid', severity: 'HIGH', reason: 'NSAIDs can trigger severe bronchospasm via COX-1 inhibition' },
    { drug: 'beta_blocker', severity: 'MODERATE', reason: 'Non-selective beta-blockers provoke bronchoconstriction' },
    { drug: 'propranolol', severity: 'HIGH', reason: 'Non-selective beta-blockade is contraindicated in asthma' },
  ],
  // E11 – Type 2 diabetes
  E11: [
    { drug: 'corticosteroid', severity: 'MODERATE', reason: 'Systemic corticosteroids raise blood glucose; dosage adjustment usually required' },
    { drug: 'thiazide', severity: 'LOW', reason: 'Thiazide diuretics can impair insulin secretion and glucose tolerance' },
  ],
  // K70 – Alcoholic liver disease / K74 – Cirrhosis
  K70: [
    { drug: 'acetaminophen', severity: 'MODERATE', reason: 'Hepatotoxicity risk is elevated; limit to ≤2 g/day if unavoidable' },
    { drug: 'methotrexate', severity: 'HIGH', reason: 'Hepatotoxicity risk is greatly increased in pre-existing liver disease' },
    { drug: 'statins', severity: 'MODERATE', reason: 'Statins should be used with caution and LFTs monitored in liver disease' },
  ],
  K74: [
    { drug: 'nsaid', severity: 'HIGH', reason: 'NSAIDs precipitate hepatorenal syndrome and worsen ascites in cirrhosis' },
    { drug: 'acetaminophen', severity: 'MODERATE', reason: 'Use lowest effective dose; avoid if Child-Pugh C' },
  ],
  // G20 – Parkinson's disease
  G20: [
    { drug: 'metoclopramide', severity: 'HIGH', reason: 'Dopamine antagonist worsens parkinsonism' },
    { drug: 'haloperidol', severity: 'HIGH', reason: 'Dopamine blockade significantly worsens Parkinson symptoms' },
    { drug: 'prochlorperazine', severity: 'HIGH', reason: 'Phenothiazine anti-emetics block dopamine receptors' },
  ],
  // G40 – Epilepsy
  G40: [
    { drug: 'tramadol', severity: 'MODERATE', reason: 'Tramadol lowers seizure threshold, especially in combination with antiepileptics' },
    { drug: 'bupropion', severity: 'MODERATE', reason: 'Bupropion lowers seizure threshold in a dose-dependent manner' },
  ],
  // M05/M06 – Rheumatoid arthritis (on DMARDs)
  M05: [
    { drug: 'trimethoprim', severity: 'HIGH', reason: 'Risk of methotrexate toxicity (folate antagonism) if patient is on methotrexate' },
  ],
};
