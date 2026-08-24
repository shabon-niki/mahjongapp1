import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "cream" | "danger";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-board-800 text-washi-100 hover:bg-board-700 active:bg-board-900 disabled:opacity-40",
  secondary:
    "bg-gold-500 text-board-900 hover:bg-gold-400 active:bg-gold-600 disabled:opacity-40",
  ghost:
    "bg-transparent text-board-800 border border-board-700/30 hover:bg-board-700/5 disabled:opacity-40",
  cream:
    "bg-washi-100 text-board-800 hover:bg-washi-200 active:bg-washi-300 disabled:opacity-40",
  danger:
    "bg-red-600 text-washi-100 hover:bg-red-700 active:bg-red-800 disabled:opacity-40",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
