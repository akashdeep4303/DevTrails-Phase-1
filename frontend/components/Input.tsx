import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition-colors
            focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100
            disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60
            ${error ? "border-red-300 focus:border-red-400 focus:ring-red-50" : "border-slate-200"}
            ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
