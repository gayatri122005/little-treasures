"use client";

type PasswordToggleProps = {
  visible: boolean;
  onToggle: () => void;
};

export default function PasswordToggle({
  visible,
  onToggle,
}: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visible}
      className="text-[11px] font-medium text-[var(--ink)] hover:text-[var(--purple-dark)]"
    >
      {visible ? "Hide" : "Show"}
    </button>
  );
}
