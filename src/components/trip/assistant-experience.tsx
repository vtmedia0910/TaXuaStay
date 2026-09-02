"use client";

import { Bot } from "lucide-react";
import { usePathname } from "next/navigation";
import { AssistantConversation } from "@/components/trip/assistant-conversation";
import { getAssistantPageContext, type AssistantPublicReadiness } from "@/features/ai/discovery";

export function AssistantExperience({
  initialPrompt = "",
  readiness = "ready",
}: {
  initialPrompt?: string;
  readiness?: AssistantPublicReadiness;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-[calc(100dvh-4.5rem)] bg-[linear-gradient(180deg,#e8f6fb_0%,#f8fafc_32%)]" data-assistant-discovery="disabled">
      <section className="mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-3xl flex-col px-4 pb-0 pt-5 sm:px-6 sm:pt-8">
        <header className="rounded-[1.75rem] bg-pine p-5 text-white shadow-lg sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/12"><Bot size={25} aria-hidden="true" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">TRỢ LÝ TÀ XÙA TRIP</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">Hỏi rõ trước khi lên đường</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/82">Trợ lý AI trả lời từ dữ liệu hiện có của Tà Xùa Trip. Thông tin chưa được xác minh sẽ được nói rõ là chưa xác minh.</p>
            </div>
          </div>
        </header>
        <AssistantConversation initialPrompt={initialPrompt} readiness={readiness} pageContext={getAssistantPageContext(pathname)} />
      </section>
    </main>
  );
}
