import type { ReactNode } from "react";

/**
 * Monochrome inline-SVG icons for the companion app. Filled with currentColor.
 */
export type IconName = "star" | "close" | "check" | "arrow-right" | "undo" | "settings" | "edit" | "swap";

const PATHS: Record<IconName, ReactNode> = {
  star: <path d="m12 2 3 6.5 7 .9-5 4.8 1.3 7L12 18l-6.6 3.2L6.7 14l-5-4.8 7-.9z" />,
  close: <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />,
  check: <path d="m5 13 4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />,
  "arrow-right": <path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  undo: <path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10H9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1m11.4-11.4 2.1-2.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  edit: (
    <path
      d="M4 20h4L19 9a2.12 2.12 0 0 0-3-3L5 17v3zM14 8l2 2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  swap: (
    <path
      d="M7 4 3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
}

const Icon = ({ name, size = 18, className, title }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    role={title ? "img" : "presentation"}
    aria-label={title}
    aria-hidden={title ? undefined : true}
    focusable="false"
  >
    {PATHS[name]}
  </svg>
);

export default Icon;
