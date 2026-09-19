/**
 * Streck-ikoner i SF Symbols-anda. 24×24, 1.6 px streck, rundade ändar.
 * Inline SVG — inget ikonbibliotek att hålla uppdaterat.
 */
type P = { className?: string };

const base = (className?: string) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: className ?? 'w-6 h-6',
  'aria-hidden': true,
});

export const IconHome = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M3 10.5 12 3.5l9 7" />
    <path d="M5.5 9.5V20a.5.5 0 0 0 .5.5h4V15h4v5.5h4a.5.5 0 0 0 .5-.5V9.5" />
  </svg>
);

export const IconReceipt = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M6 2.75h12a.75.75 0 0 1 .75.75v17.25l-2.6-1.6-2.6 1.6-2.55-1.6-2.55 1.6-2.6-1.6V3.5A.75.75 0 0 1 6 2.75Z" />
    <path d="M9 7.5h6M9 11h6M9 14.5h3.5" />
  </svg>
);

export const IconChart = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M3.5 20.5h17" />
    <path d="M6.5 16.5v-4M11 16.5V7M15.5 16.5v-6M20 16.5V4.5" />
  </svg>
);

export const IconDumbbell = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M3 9.5v5M6 7.5v9M18 7.5v9M21 9.5v5" />
    <path d="M6 12h12" />
  </svg>
);

export const IconCamera = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.2l1.3-2h7l1.3 2H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-9Z" />
    <circle cx="12" cy="13" r="3.4" />
  </svg>
);

export const IconPlus = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconSparkle = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" />
    <path d="M18.5 15.5 19.3 18l2.5.8-2.5.8-.8 2.4-.8-2.4-2.5-.8 2.5-.8.8-2.5Z" />
  </svg>
);

export const IconTrash = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 6.5h16M9.5 6.5V4.75A1.25 1.25 0 0 1 10.75 3.5h2.5a1.25 1.25 0 0 1 1.25 1.25V6.5" />
    <path d="M6.5 6.5 7.4 20a1.2 1.2 0 0 0 1.2 1.1h6.8a1.2 1.2 0 0 0 1.2-1.1l.9-13.5" />
  </svg>
);

export const IconWarning = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 4.2 2.8 19.3h18.4L12 4.2Z" />
    <path d="M12 10v4.2M12 17.2h.01" />
  </svg>
);

export const IconArrowUp = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 19V6M6.5 11.5 12 6l5.5 5.5" />
  </svg>
);

export const IconArrowDown = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 5v13M17.5 12.5 12 18l-5.5-5.5" />
  </svg>
);

export const IconCheck = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M5 12.5 9.5 17 19 7.5" />
  </svg>
);
