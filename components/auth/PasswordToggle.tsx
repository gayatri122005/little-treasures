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
      className="text-[11px] font-medium text-[#1E1B18] hover:text-[#9A3F33]"
    >
      {visible ? "Hide" : "Show"}
    </button>
  );
}
