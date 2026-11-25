import type { SVGProps } from "react";

type IconName =
  | "bag"
  | "chevron"
  | "close"
  | "heart"
  | "menu"
  | "minus"
  | "plus"
  | "search"
  | "sparkle"
  | "star"
  | "user"
  | "arrow"
  | "play"
  | "refresh"
  | "trash"
  | "home"
  | "grid"
  | "shirt";

type IconProps = SVGProps<SVGSVGElement> & { name: IconName };

export default function Icon({ name, ...props }: IconProps) {
  const shared = {
    "aria-hidden": true as const,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.6,
    viewBox: "0 0 24 24",
    ...props,
  };

  switch (name) {
    case "bag":
      return (
        <svg {...shared}>
          <path d="M5 8h14l1 13H4L5 8Z" />
          <path d="M9 9V6a3 3 0 0 1 6 0v3" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...shared}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
    case "close":
      return (
        <svg {...shared}>
          <path d="m18 6-12 12M6 6l12 12" />
        </svg>
      );
    case "heart":
      return (
        <svg {...shared}>
          <path d="M20.8 8.6c0 5-8.8 10-8.8 10s-8.8-5-8.8-10a4.6 4.6 0 0 1 8.8-1.8 4.6 4.6 0 0 1 8.8 1.8Z" />
        </svg>
      );
    case "home":
      return (
        <svg {...shared}>
          <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" />
        </svg>
      );
    case "grid":
      return (
        <svg {...shared}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "shirt":
      return (
        <svg {...shared}>
          <path d="m8 4-5 3 2 5 3-1v9h8v-9l3 1 2-5-5-3-2 3h-4L8 4Z" />
        </svg>
      );
    case "menu":
      return (
        <svg {...shared}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "minus":
      return (
        <svg {...shared}>
          <path d="M5 12h14" />
        </svg>
      );
    case "plus":
      return (
        <svg {...shared}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "search":
      return (
        <svg {...shared}>
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...shared}>
          <path d="m12 2 1.8 7.2L21 12l-7.2 1.8L12 21l-1.8-7.2L3 12l7.2-2.8L12 2Z" />
        </svg>
      );
    case "star":
      return (
        <svg {...shared}>
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
        </svg>
      );
    case "user":
      return (
        <svg {...shared}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...shared}>
          <path d="M4 12h15m-6-6 6 6-6 6" />
        </svg>
      );
    case "play":
      return (
        <svg {...shared}>
          <path d="m9 6 10 6-10 6V6Z" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...shared}>
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M5.5 9a7 7 0 0 1 11.6-2L20 12M4 12l2.9 5a7 7 0 0 0 11.6-2" />
        </svg>
      );
    case "trash":
      return (
        <svg {...shared}>
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" />
        </svg>
      );
  }
}
