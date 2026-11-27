import type { InputHTMLAttributes, ReactNode } from "react";

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  suffix?: ReactNode;
};

export default function AuthInput({
  label,
  id,
  error,
  suffix,
  className = "",
  ...props
}: AuthInputProps) {
  const inputId = id ?? props.name;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label
          htmlFor={inputId}
          className="text-xs font-semibold tracking-[0.02em] text-[var(--ink)]"
        >
          {label}
        </label>
        {suffix}
      </div>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-12 w-full rounded-[3px] border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)] outline-none transition placeholder:text-[#aaa398] focus:border-[var(--purple)] focus:ring-2 focus:ring-[var(--purple)]/10 ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-[#9a4338]">
          {error}
        </p>
      )}
    </div>
  );
}
