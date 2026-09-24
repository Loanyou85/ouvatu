import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "accent" | "dark" | "secondary" | "ghost" | "danger" | "soft";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  accent: "bg-accent text-white shadow-accent hover:bg-accent-strong",
  dark: "bg-ink text-white hover:bg-black",
  secondary: "bg-card text-ink border border-line hover:bg-hover",
  ghost: "text-ink hover:bg-hover",
  danger: "bg-error text-white hover:brightness-95",
  soft: "bg-accent-soft text-accent-strong hover:brightness-[0.97]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-full",
  md: "h-11 px-5 text-[0.95rem] gap-2 rounded-full",
  lg: "h-14 px-7 text-base gap-2.5 rounded-full",
  icon: "h-10 w-10 rounded-full",
};

/** Class helper so links can look like buttons. */
export function buttonClass(variant: ButtonVariant = "dark", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center font-semibold whitespace-nowrap transition-all duration-150",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "dark", size = "md", loading, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...props}>
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}
