import Link from "next/link";
import { Bot, Clock3, MessagesSquare } from "lucide-react";

const links = [
  { href: "/admin/integrations/ai", label: "Control Center", icon: Bot },
  { href: "/admin/integrations/ai/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/admin/integrations/ai/retention", label: "Retention", icon: Clock3 },
] as const;

export function AIAdminNav() {
  return (
    <nav aria-label="AI Assistant" className="mb-5 flex gap-2 overflow-x-auto pb-1">
      {links.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-bold text-pine shadow-sm hover:border-trip-teal">
          <Icon size={17} aria-hidden="true" />{label}
        </Link>
      ))}
    </nav>
  );
}
