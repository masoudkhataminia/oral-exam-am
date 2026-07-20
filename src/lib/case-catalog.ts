export type OralPart = "A" | "B" | "C";

export type CatalogEntry = {
  part: OralPart;
  caseId: string;
  item?: number;
  title: string;
  prompt: string;
  order: number;
};

const partAOrder = `
F4283 F4297 F4246 F42C7 F424E F4247 F42A8 F42BC F4241 F427F F4261 F42AD
F42C6 F42B3 F424C F4288 F42E4 F424B F42B7 F4254 F428A F4294 F4243 F425E
F4263 F42DC F42CB F42AC F4260 F4284 F42E9 F42CA F4253 F42E2 F427E F42B5
F42DB F42C0 F42C3 F42E7 F4296 F42C4 F4262 F42C8 F42AE F42A5 F42DE F42E5
F4250 F42A3 F428B F42AA F42B8 F4245 F429C F426B F428E NA F4259 F429D F4298
F429B F4252 F4291 F42EF F42EE F42BA F4258 F4269 F425B F42EB F42B4 F42AF
F42E3 F42CC F4285 F42E0 F4295 F4264 F42A6 F42D7 F42A2 F42C1 F42B9 F4281
F4286 F427D F42D8 F427C F424F F42BE F4287 F42B6 F429A F4268 F4242 F42D1
F42DA F4282 F42CD F4244 F4265 F427B F4267 F42EA F4279 F42D3 F427A F42A1
F42AB F424D F42D4 F4257 F42D9 F4299 F42C9 F429F F42C5 F428D F42F1 F42D0
F429E F42E8 F42CF F425D F42D2 F42EC F42BF F42BB F4289 F42D5 F42E6 F42CE
F424A F42F0 F42B2 F425F F4277 F42E1 F4290 F42ED F42A4 F4248 F42B0 F42DF
F42A9 F4266 F425C F4292 F4256 F425A F42A0 F4278 F428F F4293 F4249 F428C
F42BD F42D6 F4251 F42C2 F4280 F426A F42DD F42A7
`.trim().split(/\s+/);

const partATitles: Record<string, string> = {
  F4283: "15 year old female presents with redness in the face.",
  F4297: "Adult male requests help for an ear problem.",
  F4246: "Advice about sunscreen and sunburn before travelling to Cairns.",
  F42C7: "A customer requests something for a headache.",
  F424E: "A woman asks for something for her husband's back pain.",
  F4247: "Mother requests treatment for a rash on her 6 year old son.",
  F42A8: "A patient asks to speak to the pharmacist.",
  F42BC: "Daughter requests cough medicine for her father.",
  F4241: "Mother presents with her 6 year old child who has a rash.",
  F427F: "A patient requests something for sleep.",
  F4261: "Patient requests treatment for dry mouth.",
  F42AD: "A man requests treatment for dizziness and weakness.",
  F42C6: "A customer requests something for a chesty cough.",
  F42B3: "A 22 year old woman presents with pain.",
  F424C: "A patient asks for a sunburn product.",
  F4288: "A woman requests something for a sore ankle.",
  F42E4: "A woman requests an iron supplement.",
  F424B: "Mother requests treatment for an itchy rash on her 12 year old daughter.",
  F42B7: "An 18 year old woman requests treatment for a sore toe.",
  F4254: "A middle-aged woman presents with dry and itchy hands.",
  F428A: "A woman requests something for pain.",
  F4294: "A woman requests treatment for a sore finger.",
  F4243: "A 44 year old man requests nicotine replacement therapy.",
  F425E: "A woman presents with dry and red palms.",
  F4263: "A mother requests help for her breastfed baby who vomits after feeds.",
  F42DC: "A patient requests a product for cold sores.",
  F42CB: "A 39 year old man requests treatment for hair loss.",
  F42AC: "A 24 year old man presents with a rash under both arms.",
  F4260: "A 55 year old patient presents with haemorrhoids.",
  F4284: "A patient presents with a bee sting to the foot.",
  F42E9: "A patient presents with three hard lumps on the hand.",
  F42CA: "A 58 year old woman requests help to quit smoking.",
  F4253: "A 55 year old man presents with piles.",
  F42E2: "A patient requests a product for a sore stomach.",
  F427E: "A patient presents with a runny nose.",
  F429A: "A patient requests something for tooth pain.",
  F4268: "A 20 year old woman requests treatment for a cough.",
  F4242: "A son requests treatment for his 95 year old mother's dry eyes.",
  F42D1: "A customer requests a product for fever.",
  F42DA: "A woman requests treatment for vaginal thrush.",
  F4282: "A father requests treatment for his daughter's flexural rash.",
  F42CD: "A 17 year old presents with facial spots.",
  F4244: "A 59 year old woman requests treatment for a cold sore.",
  F4265: "A man requests treatment for a blocked nose.",
  F427B: "A patient presents with bad breath secondary to dry mouth.",
  F4267: "A 50 year old man presents with chest pain.",
  F42EA: "A woman requests a product to assist with weight loss.",
};

const partCOrder = `
2DC70A 2DC71E 2DC6C7 2DC74E 2DC6D0 2DC6C8 2DC730 2DC743 2DC6C1 2DC706
2DC6F0 2DC735 2DC74D 2DC73A 2DC6CE 2DC70F 2DC764 2DC6CD 2DC73E 2DC6D7
2DC711 2DC71B 2DC6C3 2DC6ED 2DC6F2 2DC75C 2DC752 2DC734 2DC6EF 2DC70B
2DC76A 2DC751 2DC6D6 2DC748 2DC762 2DC705 2DC6FB 2DC73C 2DC74B 2DC75B
2DC747 2DC767 2DC71D 2DC6F1 2DC736 2DC72D 2DC75E 2DC744 2DC6D2 2DC72A
2DC712 2DC732 2DC6C6 2DC723 2DC6FC 2DC715 2DC72B 2DC6DC 2DC724 2DC71F
2DC722 2DC6D5 2DC718 2DC772 2DC746 2DC73B 2DC6DA 2DC6FA 2DC6DE 2DC766
2DC731 2DC763 2DC70C 2DC760 2DC71C 2DC6F3 2DC726 2DC76B 2DC725 2DC741
2DC761 2DC708 2DC70D 2DC704 2DC758 2DC703 2DC6D1 2DC739 2DC70E 2DC720
2DC6F9 2DC6C2 2DC757 2DC75A 2DC709 2DC74A 2DC6C5 2DC6F6 2DC702 2DC6F8
2DC73D 2DC700 2DC753 2DC701 2DC737 2DC742 2DC6CF 2DC733 2DC6D9 2DC759
2DC727 2DC754 2DC72C 2DC76D 2DC75D 2DC707 2DC73F 2DC74F 2DC6E0 2DC750
2DC76E 2DC6FE 2DC6FD 2DC745 2DC755 2DC72F 2DC6D4 2DC713 2DC749 2DC6CB
2DC6EE 2DC721 2DC6DF 2DC765 2DC756 2DC769 2DC770 2DC728 2DC6C9 2DC75F
2DC6D8 2DC774 2DC710 2DC716 2DC72E 2DC738 2DC729 2DC740 2DC719 2DC6CA
2DC74C 2DC71A 2DC773 2DC771 2DC717 2DC6DD 2DC714 2DC6F7
`.trim().split(/\s+/);

const partCTitles: Record<string, string> = {
  "2DC70A": "Moduretic prescription, dry-mouth request and respiratory medicine history.",
  "2DC71E": "Norspan prescription review.",
  "2DC6C7": "New zolpidem prescription with analgesic and gout history.",
  "2DC74E": "Pantoprazole prescription review.",
  "2DC6D0": "Colchicine and allopurinol prescription review.",
  "2DC6C8": "Nexium HP7 prescription with penicillin allergy and interaction considerations.",
  "2DC730": "Doxycycline prescription review.",
  "2DC743": "Phenoxymethylpenicillin prescription review.",
  "2DC750": "Repeat pravastatin and new glucagon in an older patient with diabetes.",
  "2DC76E": "Sildenafil 50 mg prescription review.",
  "2DC6FE": "Norfloxacin and metoclopramide with moclobemide history.",
  "2DC6FD": "Diazepam prescription with duloxetine and antihypertensive history.",
  "2DC745": "Amoxicillin prescription review.",
  "2DC755": "Solifenacin prescription with levothyroxine and iron history.",
  "2DC72F": "Metronidazole prescription review.",
  "2DC6D4": "Finasteride repeat and a separate hay-fever request.",
  "2DC713": "Miconazole oral gel with warfarin history.",
  "2DC749": "Tapentadol prescription review.",
  "2DC6CB": "Prednisolone prescription with sodium valproate and respiratory medicines.",
  "2DC75D": "Final esomeprazole repeat with rivaroxaban history.",
  "2DC707": "Enoxaparin prescription review.",
};

const partBPrompts: Record<number, string> = {
  1: "A part-time pharmacist has received five Mogadon supplies over five weeks from different prescribers and requests another supply.",
  2: "A customer requests an early dexamphetamine repeat late on Friday; the prescriber is unavailable.",
  3: "A locum doctor phones an order for MS Contin 100 mg, quantity 60, but provides insufficient details.",
  4: "The owner asks you to dispense quickly while a dispensary technician hands out prescriptions and counsels patients.",
  5: "A pharmacist has supplied a large quantity of testosterone ampoules after saying the doctor told them not to worry.",
  6: "The pharmacist in charge instructs you to use generic brands in DAAs even when brand substitution is prohibited.",
  7: "Medicines and prescriptions are returned for a patient who died two days ago, but the owner dispensed them yesterday.",
  8: "A pharmacist uses patient and doctor contact details to promote their own business venture.",
  9: "A school principal requests Ventolin and Bricanyl Turbuhalers for school first-aid kits.",
  10: "A patient requests an early dexamphetamine repeat because they live remotely.",
  11: "A patient presents early for a staged supply of oxycodone.",
  12: "The owner asks you to recommend complementary medicines with no safety or efficacy evidence.",
  13: "A patient presents an expired quetiapine prescription and becomes aggressive when supply is refused.",
  14: "A regular patient requests alprazolam without a prescription and says it is usually supplied as an owing prescription.",
  15: "A patient has received Rikodeine every two weeks for four months and requests another supply.",
  16: "A handwritten diazepam prescription appears to have an overwritten quantity.",
};

function buildCaseCatalog(part: "A" | "C", order: string[], titles: Record<string, string>) {
  return order.map((caseId, index): CatalogEntry => {
    const title = titles[caseId] ?? `${part === "A" ? "OTC" : "Clinical"} case ${caseId}`;
    return {
      part,
      caseId,
      title,
      prompt: `Part ${part}, Case ID: ${caseId}. ${title} Retrieve the exact case wording and evidence from the approved indexed source before answering.`,
      order: index + 1,
    };
  });
}

export const partACases = buildCaseCatalog("A", partAOrder, partATitles);
export const partCCases = buildCaseCatalog("C", partCOrder, partCTitles);

export const partBQuestions: CatalogEntry[] = Array.from({ length: 171 }, (_, index) => {
  const questionNumber = index + 1;
  const title = partBPrompts[questionNumber] ?? `Part B question ${questionNumber}`;
  return {
    part: "B",
    caseId: String(questionNumber),
    title,
    prompt: `Part B, Question ${questionNumber}. ${title} Retrieve the exact scenario wording and current jurisdiction-specific evidence from the approved indexed source before answering.`,
    order: questionNumber,
  };
});

export function getCatalogForPart(part: OralPart): CatalogEntry[] {
  if (part === "A") return partACases;
  if (part === "B") return partBQuestions;
  return partCCases;
}
