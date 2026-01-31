import type { Domain } from "@/lib/types";

export type SampleQuestion = {
  id: string;
  domain: Domain;
  prompt: string;
  difficulty: "hard";
};

export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    id: "finance-1",
    domain: "finance",
    difficulty: "hard",
    prompt:
      "Should a portfolio manager increase NVIDIA exposure given AI regulation uncertainty, considering valuation, concentration risk, and historical analogs?",
  },
  {
    id: "finance-2",
    domain: "finance",
    difficulty: "hard",
    prompt:
      "Is it defensible to mark a private AI startup at a 40x revenue multiple in the current rate environment?",
  },
  {
    id: "finance-3",
    domain: "finance",
    difficulty: "hard",
    prompt:
      "Would a bank breach Basel III liquidity rules by reallocating 15% of HQLA to tokenized treasuries?",
  },
  {
    id: "finance-4",
    domain: "finance",
    difficulty: "hard",
    prompt:
      "Does the carry trade unwind risk outweigh yield benefits for a USD investor adding 10% allocation to JPY bonds this quarter?",
  },
  {
    id: "healthcare-1",
    domain: "healthcare",
    difficulty: "hard",
    prompt:
      "A 55‑year‑old smoker has persistent cough, weight loss, and fatigue; how should a clinician prioritize differential diagnoses and next tests?",
  },
  {
    id: "healthcare-2",
    domain: "healthcare",
    difficulty: "hard",
    prompt:
      "In a patient on warfarin with fluctuating INR, should a clinician switch to a DOAC given stage‑3 CKD and recent GI bleed history?",
  },
  {
    id: "healthcare-3",
    domain: "healthcare",
    difficulty: "hard",
    prompt:
      "How should a hospital balance sepsis protocol timing with antibiotic stewardship when biomarkers are equivocal?",
  },
  {
    id: "healthcare-4",
    domain: "healthcare",
    difficulty: "hard",
    prompt:
      "For a patient with long‑COVID symptoms and normal imaging, what is the evidence‑based approach to management and return‑to‑work planning?",
  },
  {
    id: "legal-1",
    domain: "legal",
    difficulty: "hard",
    prompt:
      "Does a 3‑year non‑compete across all industries hold up in California versus Delaware, and what factors drive enforceability?",
  },
  {
    id: "legal-2",
    domain: "legal",
    difficulty: "hard",
    prompt:
      "Is a generative‑AI training dataset of public web content likely to qualify as fair use under recent US case law?",
  },
  {
    id: "legal-3",
    domain: "legal",
    difficulty: "hard",
    prompt:
      "Can a company rely on a browse‑wrap agreement for arbitration clauses after recent circuit splits on assent?",
  },
  {
    id: "legal-4",
    domain: "legal",
    difficulty: "hard",
    prompt:
      "Should a firm disclose a material cybersecurity incident under SEC rules within 4 business days if attribution is unclear?",
  },
  {
    id: "general-1",
    domain: "general",
    difficulty: "hard",
    prompt:
      "Will AGI be achieved before 2030 if current scaling trends continue but regulatory constraints tighten?",
  },
  {
    id: "general-2",
    domain: "general",
    difficulty: "hard",
    prompt:
      "Does the evidence support remote work policies improving long‑term productivity in knowledge work, despite short‑term gains?",
  },
  {
    id: "general-3",
    domain: "general",
    difficulty: "hard",
    prompt:
      "Should governments impose a moratorium on facial recognition in public spaces until bias and oversight standards mature?",
  },
  {
    id: "general-4",
    domain: "general",
    difficulty: "hard",
    prompt:
      "Is it defensible to mandate open‑sourcing frontier models given security, innovation, and competitive risks?",
  },
];

export const SAMPLE_QUESTIONS_BY_DOMAIN = SAMPLE_QUESTIONS.reduce(
  (acc, item) => {
    acc[item.domain].push(item);
    return acc;
  },
  {
    finance: [] as SampleQuestion[],
    healthcare: [] as SampleQuestion[],
    legal: [] as SampleQuestion[],
    general: [] as SampleQuestion[],
  }
);
