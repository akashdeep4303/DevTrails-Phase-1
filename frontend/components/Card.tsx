import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "bordered" | "neo";
}

export function Card({
  variant = "default",
  className = "",
  children,
  ...props
}: CardProps) {
  const variants = {
    default:
      "bg-white border border-slate-200/90 rounded-2xl shadow-card",
    elevated:
      "bg-white border border-slate-200/80 rounded-2xl shadow-card-hover",
    bordered:
      "bg-sky-50/30 border border-sky-100 rounded-2xl",
    neo: "bg-white/85 border border-slate-200/80 rounded-2xl shadow-card backdrop-blur-md",
  };

  return (
    <div
      className={`${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-6">
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-slate-900">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-6 py-4 ${className}`} {...props} />;
}
