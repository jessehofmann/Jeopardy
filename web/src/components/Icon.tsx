import React from "react";

/**
 * Monochrome inline-SVG icons. `currentColor` fills them, so callers control
 * colour via CSS. Kept tiny and local — no icon-library dependency.
 */
export type IconName = "volume" | "volume-off" | "fullscreen" | "fullscreen-exit" | "star" | "close";

const PATHS: Record<IconName, React.ReactNode> = {
  volume: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a9 9 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  "volume-off": (
    <>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="m16 9 6 6m0-6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  fullscreen: (
    <path
      d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  "fullscreen-exit": (
    <path
      d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  star: <path d="m12 2 3 6.5 7 .9-5 4.8 1.3 7L12 18l-6.6 3.2L6.7 14l-5-4.8 7-.9z" />,
  close: (
    <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
}

const Icon: React.FC<IconProps> = ({ name, size = 20, className, title }) => (
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
