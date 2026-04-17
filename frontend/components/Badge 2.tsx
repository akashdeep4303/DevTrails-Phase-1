interface BadgeProps {
  variant?: "success" | "warning" | "error" | "neutral";
  className?: string;
  children: React.ReactNode;
}

export default function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  const variants = {
    success:
      "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    warning:
      "bg-amber-50 text-amber-900 border-amber-200/80",
    error:
      "bg-red-50 text-red-800 border-red-200/80",
    neutral:
      "bg-slate-100 text-slate-700 border-slate-200/90",
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
