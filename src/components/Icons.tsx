import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function GoogleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
      />
    </svg>
  );
}

export function GitHubIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.26 5.69.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z"
      />
    </svg>
  );
}

export function MusicIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true" {...props}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true" {...props}>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M8 5v14l11-7z" />
    </svg>
  );
}

export function GripIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="9" cy="6" r="1.5" fill="currentColor" />
      <circle cx="15" cy="6" r="1.5" fill="currentColor" />
      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      <circle cx="9" cy="18" r="1.5" fill="currentColor" />
      <circle cx="15" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true" {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true" {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true" {...props}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true" {...props}>
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

export function SpinnerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  );
}

export function SkipNextIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M6 5v14l10-7z" />
      <path fill="currentColor" d="M16 5h2.5v14H16z" />
    </svg>
  );
}

export function SkipPreviousIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M18 5v14L8 12z" />
      <path fill="currentColor" d="M5.5 5H8v14H5.5z" />
    </svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true" {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  );
}

export function RowsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true" {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function EqualizerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M4 14h2.5v6H4zM10.75 8h2.5v12h-2.5zM17.5 4H20v16h-2.5z"
      />
    </svg>
  );
}

