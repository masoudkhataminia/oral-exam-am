export type OralPart = "A" | "B" | "C";

export type CatalogEntry = {
  part: OralPart;
  caseId: string;
  item?: number;
  title: string;
  prompt: string;
  order: number;
};

const partASeed: Array<[string, string]> = [
  ["F4283", "15 year old female presents with redness in the face."],
  ["F4297", "Adult male wanting something for an ear problem."],
  ["F4246", "Lady asks for advice about sunscreen and sunburn before travelling to Cairns."],
  ["F42C7", "A customer requests something for a headache."],
  ["F424E", "A woman asks for something for her husband's back pain."],
  ["F4247", "Mother requests treatment for a rash on her 6 year old son."],
  ["F42A8", "A patient asks to speak to the pharmacist."],
  ["F42BC", "Daughter requests cough medicine for her father."],
  ["F4241", "Mother presents with her 6 year old child who has a rash."],
  ["F427F", "A patient requests something for sleep."],
  ["F4261", "Patient requests treatment for dry mouth."],
  ["F42AD", "A man requests treatment for dizziness and weakness."],
  ["F42C6", "A customer requests something for a chesty cough."],
  ["F42B3", "A 22 year old woman presents with pain."],
  ["F424C", "A patient asks for a sunburn product."],
  ["F4288", "A woman requests something for a sore ankle."],
  ["F42E4", "A woman requests an iron supplement."],
  ["F424B", "Mother requests treatment for an itchy rash on her 12 year old daughter."],
  ["F42B7", "An 18 year old woman requests treatment for a sore toe."],
  ["F4254", "A middle-aged woman presents with dry and itchy hands."],
  ["F428A", "A woman requests something for pain."],
  ["F4294", "A woman requests treatment for a sore finger."],
  ["F4243", "A 44 year old man requests nicotine replacement therapy."],
  ["F425E", "A woman presents with dry and red palms."],
  ["F4263", "A mother requests help for her breastfed baby who vomits mostly after feeds."],
  ["F42DC", "A patient requests a product for cold sores."],
  ["F42CB", "A 39 year old man requests treatment for hair loss."],
  ["F42AC", "A 24 year old man presents with a rash under both arms."],
  ["F4260", "A 55 year old patient presents with haemorrhoids."],
  ["F4284", "A patient presents with a bee sting to the foot."],
  ["F42E9", "A patient presents with three hard lumps on the hand."],
  ["F42CA", "A 58 year old woman requests help to quit smoking."],
  ["F4253", "A 55 year old man presents with piles."],
  ["F42E2", "A patient requests a product for a sore stomach."],
  ["F427E", "A patient presents with a runny nose."],
  ["F429A", "A patient requests something for tooth pain. Asthma is well controlled and paracetamol plus clove oil have not helped."],
  ["F4268", "A 20 year old woman requests treatment for a mostly dry post-viral cough with occasional mucus."],
  ["F4242", "A son requests treatment for his 95 year old mother's dry eyes."],
  ["F42D1", "A parent requests treatment for fever and a red injection site in a 4 month old after vaccination."],
  ["F42DA", "A woman requests treatment for vaginal thrush."],
  ["F4282", "A father requests treatment for a rash on his daughter's elbow and knee flexures after changing soap."],
  ["F42CD", "A 17 year old presents with whiteheads and blackheads across the face and neck."],
  ["F4244", "A 59 year old woman requests treatment for a cold sore that started about 24 hours ago."],
  ["F4265", "A father requests treatment for his 5 year old daughter's blocked nose, fever and improving sore throat."],
  ["F427B", "A patient presents with bad breath secondary to dry mouth after an Endep dose increase."],
  ["F4267", "A 50 year old man presents with new severe burning chest discomfort after alcohol and a large meal."],
  ["F42EA", "A woman requests a product to assist with weight loss."],
];

const partCSeed: Array<[string, string]> = [
  ["2DC70A", "Clinical prescription review case 2DC70A."],
  ["2DC71E", "Clinical prescription review case 2DC71E."],
  ["2DC6C7", "Clinical prescription review case 2DC6C7."],
  ["2DC74E", "Clinical prescription review case 2DC74E."],
  ["2DC6D0", "Clinical prescription review case 2DC6D0."],
  ["2DC6C8", "Clinical prescription review case 2DC6C8."],
  ["2DC730", "Clinical prescription review case 2DC730."],
  ["2DC743", "Clinical prescription review case 2DC743."],
  ["2DC750", "John, 86 years old: repeat pravastatin and new glucagon; history includes metformin XR, glimepiride and linagliptin."],
  ["2DC76E", "Prescription for sildenafil 50 mg."],
  ["2DC6FE", "Prescription for norfloxacin 400 mg twice daily and metoclopramide; history includes moclobemide and doxycycline."],
  ["2DC6FD", "Prescription for diazepam 2 mg; history includes duloxetine, ramipril, lercanidipine and rosuvastatin."],
  ["2DC745", "Prescription for amoxicillin."],
  ["2DC755", "Jane: solifenacin 5 mg daily; history includes rosuvastatin, ramipril, levothyroxine and Ferro-Grad C."],
  ["2DC72F", "Prescription for metronidazole 400 mg twice daily for 7 days."],
  ["2DC6D4", "Repeat finasteride for a father; daughter also requests treatment for hay fever."],
  ["2DC713", "Prescription for miconazole oral gel; history includes warfarin, rosuvastatin, salbutamol and Seretide."],
  ["2DC749", "Prescription for tapentadol 50 mg."],
  ["2DC6CB", "Michael Mizzi: prednisolone 25 mg as directed; history includes sodium valproate and Seretide."],
  ["2DC75D", "Janet Cook, 72: final repeat esomeprazole; history includes rivaroxaban and newly commenced St John's wort."],
  ["2DC707", "Enoxaparin for travel prophylaxis in a patient with previous DVT, diclofenac use and a reported heparin allergy."],
];

const partBPrompts: Record<number, string> = {
  1: "A part-time pharmacist has received five supplies of Mogadon over five weeks from different prescribers and asks you to charge another prescription to his account. How do you proceed?",
  2: "A customer requests an early dexamphetamine repeat late on Friday and says the psychiatrist approved it, but the prescriber is unavailable.",
  3: "A locum doctor phones an order for MS Contin 100 mg, quantity 60, gives only a mobile number, and the clinic is 50 km away.",
  4: "The owner asks you to dispense quickly while an experienced dispensary technician hands out prescriptions and counsels patients.",
  5: "You notice another pharmacist dispensing a large quantity of testosterone ampoules for one patient after saying the doctor told them not to worry.",
  6: "The pharmacist in charge instructs you to use generic brands in DAAs even when no brand substitution is permitted.",
  7: "Medicines and prescriptions are returned for a patient who died two days ago, but dispensing occurred yesterday by the owner.",
  8: "A pharmacist uses patient and doctor contact details to send promotional products from their own business venture.",
  9: "A school principal requests two Ventolin inhalers and two Bricanyl Turbuhalers for school first-aid kits.",
  10: "A patient presents an early dexamphetamine repeat and says they live remotely without easy pharmacy access.",
  11: "A patient presents early for a staged supply of oxycodone.",
  12: "The owner asks you to recommend complementary medicines made by a friend even though no efficacy or safety studies are available.",
  13: "A patient presents an expired quetiapine prescription and becomes aggressive after supply is refused.",
  14: "A regular patient requests alprazolam without a prescription and says the proprietor regularly supplies it as an owing prescription.",
  15: "A patient has received Rikodeine every two weeks for four months and requests another supply from you as the locum pharmacist.",
  16: "A handwritten diazepam prescription appears to have an overwritten quantity and the patient is agitated and in a hurry.",
};

export const partACases: CatalogEntry[] = partASeed.map(([caseId, prompt], index) => ({
  part: "A",
  caseId,
  title: prompt,
  prompt,
  order: index + 1,
}));

export const partCCases: CatalogEntry[] = partCSeed.map(([caseId, prompt], index) => ({
  part: "C",
  caseId,
  title: prompt,
  prompt,
  order: index + 1,
}));

export const partBQuestions: CatalogEntry[] = Array.from({ length: 171 }, (_, index) => {
  const questionNumber = index + 1;
  const prompt =
    partBPrompts[questionNumber] ??
    `Part B question ${questionNumber}. Paste or edit the exact wording from the source PDF before generating the answer.`;

  return {
    part: "B" as const,
    caseId: String(questionNumber),
    title: prompt,
    prompt,
    order: questionNumber,
  };
});

export function getCatalogForPart(part: OralPart): CatalogEntry[] {
  if (part === "A") return partACases;
  if (part === "B") return partBQuestions;
  return partCCases;
}
