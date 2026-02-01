# Why Kritarch Lite

## The problem
High-stakes domains (healthcare, finance, legal) demand accuracy, transparency, and accountability. Single-model outputs can be brittle, inconsistent, and vulnerable to hallucinations. Kritarch Lite exists to make model behavior more *auditable* by turning a single answer into a structured debate with explicit critiques, revisions, and a final consensus.

## Why multi-agent debate
Research shows that structured debate and multi-perspective reasoning can improve factuality and reasoning quality by surfacing disagreements and forcing justification:
- Debate-based oversight as a safety mechanism was proposed by OpenAI in “AI Safety via Debate.”
- Empirical work finds multi-agent debate improves factuality and reasoning compared to single-model baselines.
- Recent debate-focused papers highlight that adversarial or persuasive debate can increase truthfulness and expose weak arguments.
- Multi-agent debate also encourages divergent thinking, helping surface missing perspectives.

## Domain-specific motivations
### Healthcare
- Safety and reliability are required for AI systems that may influence care decisions.
- Regulatory guidance emphasizes rigorous development practices and risk management.
- Evidence-based, transparent reasoning is essential when summarizing clinical guidelines or triaging risks.

### Finance
- Financial institutions must manage model risk with independent challenge and governance.
- High-stakes decisions (credit, portfolio risk, compliance) require explicit rationale and risk-aware outputs.

### Legal
- Legal practice demands competence, verification, and defensible reasoning.
- Courts have sanctioned filings that relied on AI-generated fake citations, reinforcing the need for rigorous validation.

## Use cases
### Healthcare
- Clinical guideline comparisons and evidence summaries
- Triage risk framing and contraindication checks
- Trial eligibility screening or protocol Q&A
- Patient-facing explanation drafts (with human review)

### Finance
- Investment thesis stress-testing and counter-argument generation
- Credit memo drafts with structured risk/caveat sections
- Regulatory and policy compliance checks
- Scenario analysis and portfolio risk narratives

### Legal
- Argument mapping with opposing viewpoints
- Contract clause review with risk flags
- Policy compliance and governance summaries
- Case law outline drafting with explicit uncertainty markers

## How Kritarch Lite addresses these needs
- **Multi-round debate**: positions → critiques → revisions → consensus verdict.
- **Structured outputs**: consistent schemas for positions, critiques, revisions, and verdicts.
- **Coordination logic**: skip rounds when agreement is high to control cost.
- **Independent evaluation**: baseline vs jury scoring for quality comparison.
- **Cost transparency**: estimated per-section cost visibility for user budgeting.

## Research & supporting evidence
**Multi-agent debate and reasoning quality**
- OpenAI: AI Safety via Debate — https://openai.com/index/debate/
- ICML 2024 (PMLR): Improving Factuality and Reasoning in Language Models through Multiagent Debate — https://proceedings.mlr.press/v235/du24c.html
- ICML 2024 (PMLR): Debating with More Persuasive LLMs Leads to More Truthful Answers — https://proceedings.mlr.press/v235/kadavath24a.html
- EMNLP 2024 (ACL Anthology): Encouraging Divergent Thinking in LLMs through Multi-Agent Debate — https://aclanthology.org/2024.emnlp-main.636/

**Cross-domain AI risk management**
- NIST AI Risk Management Framework (AI RMF 1.0) — https://www.nist.gov/itl/ai-risk-management-framework

**Healthcare governance and safety**
- WHO: Ethics and governance of AI for health — https://www.who.int/publications/i/item/9789240029200
- FDA/Health Canada/MHRA: Good Machine Learning Practice for Medical Device Development — https://www.fda.gov/medical-devices/software-medical-device-samd/good-machine-learning-practice-medical-device-development-guiding-principles

**Financial model risk and governance**
- Federal Reserve: SR 11-7 Supervisory Guidance on Model Risk Management — https://www.federalreserve.gov/supervisionreg/srletters/sr1107.htm

**Legal competence and real-world risk**
- ABA Formal Opinion 512 (Generative AI) — https://thesedonaconference.org/download-pub/9.8-aba-formal-opinion-512.pdf
- Mata v. Avianca sanctions order (AI-fabricated citations) — https://www.law.berkeley.edu/wp-content/uploads/2024/03/stanford_RLOP-Mata-v.-Avianca.pdf

## Notes
Kritarch Lite is a decision-support prototype, not a substitute for licensed professional judgment. Outputs must be reviewed by qualified experts before any real-world use.
