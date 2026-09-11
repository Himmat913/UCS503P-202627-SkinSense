/**
 * Inline icons, drawn in lucide's style (24x24 grid, 2px stroke, round caps)
 * so the frontend keeps react-router-dom as its only runtime dependency.
 */

function Svg({ children, size = 20, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const SunIcon = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </Svg>
);

export const MoonIcon = (props) => (
  <Svg {...props}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Svg>
);

export const UploadIcon = (props) => (
  <Svg size={28} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </Svg>
);

export const AlertIcon = (props) => (
  <Svg size={18} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </Svg>
);

export const InfoIcon = (props) => (
  <Svg size={18} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Svg>
);

export const ArrowRightIcon = (props) => (
  <Svg size={16} {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const RefreshIcon = (props) => (
  <Svg size={16} {...props}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </Svg>
);

export const CheckIcon = (props) => (
  <Svg size={16} {...props}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const StarIcon = ({ filled = false, size = 24, ...props }) => (
  <Svg size={size} fill={filled ? "currentColor" : "none"} {...props}>
    <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.2l5.9-.9L12 3Z" />
  </Svg>
);

export const FlaskIcon = (props) => (
  <Svg size={18} {...props}>
    <path d="M10 2v6.5L4.5 18A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 8.5V2" />
    <path d="M8.5 2h7M7 14h10" />
  </Svg>
);

export const ClockIcon = (props) => (
  <Svg size={18} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const UserIcon = (props) => (
  <Svg size={18} {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Svg>
);
