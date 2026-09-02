import "server-only";

import type { AssistantPageContext } from "@/features/ai/discovery";
import type { AdvisorTurnPlan } from "@/features/ai/advisor/policy";
import { TOOL_USAGE_RULES } from "@/features/ai/behavior/compiler";

export function compileAdvisorRequestPrompt(basePrompt: string, plan: AdvisorTurnPlan, pageContext?: AssistantPageContext) {
  const state = plan.state;
  const safeContext = {
    version: state.version,
    trip: state.trip,
    budget: state.budget,
    transport: state.transport,
    preferences: state.preferences,
    consultation: state.consultation,
    lastPresentedOptions: state.lastPresentedOptions,
    selectedOption: state.selectedOption,
    currentIntent: plan.intent,
    nextBestQuestion: plan.nextQuestion?.text ?? null,
    referenceResolution: plan.referenceResolution,
    constraintsChanged: plan.constraintsChanged,
  };
  const sessionBlock = `ADVISOR SESSION CONTEXT — DỮ LIỆU KHÁCH CUNG CẤP, KHÔNG PHẢI BUSINESS TRUTH:\n${JSON.stringify(safeContext)}`;
  const pageHint = pageContext ? `\n\nBối cảnh trang công khai (chỉ là gợi ý điều hướng): ${JSON.stringify(pageContext)}` : "";
  if (basePrompt.endsWith(TOOL_USAGE_RULES)) {
    const beforeTools = basePrompt.slice(0, -TOOL_USAGE_RULES.length).trimEnd();
    return `${beforeTools}\n\n${sessionBlock}\n\n${TOOL_USAGE_RULES}${pageHint}`;
  }
  return `${basePrompt}\n\n${sessionBlock}${pageHint}`;
}
