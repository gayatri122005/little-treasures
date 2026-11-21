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
          className="text-xs font-semibold tracking-[0.02em] text-[#1E1B18]"
        >
          {label}
        </label>
        {suffix}
      </div>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-12 w-full rounded-[3px] border border-[#E3D8C9] bg-white px-4 text-sm text-[#1E1B18] outline-none transition placeholder:text-[#aaa398] focus:border-[#B85042] focus:ring-2 focus:ring-[#B85042]/10 ${className}`}
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
