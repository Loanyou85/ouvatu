import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-8 w-8", className)}>
      <rect width="32" height="32" rx="10" fill="#6C63FF" />
      <path
        d="M14.5 7.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5Z"
        fill="#fff"
      />
      <circle cx="22" cy="22" r="2.6" fill="#fff" fillOpacity=".9" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="h-7 w-7" />
      <span className="text-[1.35rem] font-extrabold tracking-[-0.04em] text-ink">{BRAND.wordmark}</span>
      <span className="sr-only">{BRAND.name}</span>
    </span>
  );
}
