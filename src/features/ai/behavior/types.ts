export const AI_TONES = ["friendly", "neutral", "professional", "warm"] as const;
export const AI_VERBOSITIES = ["short", "medium", "detailed"] as const;
export const AI_ANSWER_STYLES = ["direct", "balanced", "guided"] as const;
export const AI_LANGUAGE_POLICIES = ["vietnamese_first", "match_customer"] as const;
export const AI_SALES_POLICIES = ["none", "light", "proactive"] as const;
export const AI_UNCERTAINTY_POLICIES = ["explicit", "clarify", "support"] as const;

export interface AIBehaviorProfile {
  id?: string;
  profileKey?: string;
  revision: number;
  name: string;
  roleDescription: string;
  persona: string;
  tone: (typeof AI_TONES)[number];
  verbosity: (typeof AI_VERBOSITIES)[number];
  answerStyle: (typeof AI_ANSWER_STYLES)[number];
  languagePolicy: (typeof AI_LANGUAGE_POLICIES)[number];
  salesPolicy: (typeof AI_SALES_POLICIES)[number];
  uncertaintyPolicy: (typeof AI_UNCERTAINTY_POLICIES)[number];
  customInstructions: string;
}
