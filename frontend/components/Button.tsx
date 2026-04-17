import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  isLoading,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-sky-600 text-white shadow-md shadow-sky-600/20 hover:bg-sky-700 focus:ring-sky-500",
    secondary:
      "bg-white text-slate-700 border border-slate-200 shadow-sm hover:border-sky-200 hover:bg-sky-50/80 focus:ring-sky-400",
    ghost:
      "text-slate-600 hover:bg-sky-50 hover:text-sky-900 focus:ring-sky-300",
    danger:
      "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 focus:ring-red-400",
  };

  const sizes = {
    sm: "px-3.5 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Processing…
        </>
      ) : (
        children
      )}
    </button>
  );
}
