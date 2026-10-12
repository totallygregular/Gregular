import { useEffect, useRef, type ReactNode } from "react";

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    journal: (
      <>
        <path d="M5 3h13v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M7 3v18m4-13h4m-4 4h4M3 17h15" />
      </>
    ),
    route: (
      <>
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="6" r="3" />
        <path d="M6 15V8a3 3 0 0 1 3-3h6M9 18h6a3 3 0 0 0 3-3v-2" />
      </>
    ),
    dungeon: (
      <>
        <path d="M3 21V9l5-6h8l5 6v12H3ZM8 21v-8a4 4 0 0 1 8 0v8M3 9h5m8 0h5M8 3v3m8-3v3" />
      </>
    ),
    talent: (
      <>
        <path d="M12 4v6m0 0L5 16m7-6 7 6" />
        <circle cx="12" cy="3" r="2" />
        <rect x="2" y="16" width="6" height="6" rx="1" />
        <rect x="16" y="16" width="6" height="6" rx="1" />
      </>
    ),
    equipment: (
      <>
        <path d="m16 3 5 5-8 8-5-5 8-8ZM8 11l-3 3m8 2-3 3M3 21l5-5M5 14l5 5" />
      </>
    ),
    notes: (
      <>
        <path d="M4 3h12v5M4 3v18h16v-9M11 14l1-4 7-7 3 3-7 7-4 1Z" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    edit: (
      <>
        <path d="m14 5 5 5M4 20l5-1L21 7l-5-5L4 14v6Z" />
      </>
    ),
    back: <path d="m14 5-7 7 7 7" />,
    shield: <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.journal}
    </svg>
  );
}

export function ClassCrest({
  className,
  small = false,
}: {
  className: string;
  small?: boolean;
}) {
  const shape = className.toLowerCase();
  return (
    <svg
      className={`class-crest ${small ? "small" : ""}`}
      viewBox="0 0 180 180"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="90" cy="90" r="67" stroke="currentColor" opacity=".16" />
      <path
        d="m90 8 65 39v86l-65 39-65-39V47L90 8Z"
        stroke="currentColor"
        opacity=".23"
      />
      <path d="M90 15v15m0 120v15M15 90h15m120 0h15" stroke="currentColor" />
      {shape === "priest" || shape === "mage" || shape === "warlock" ? (
        <>
          <path
            d="M90 58v81m-13 0h26M90 43l16 15-16 15-16-15 16-15Z"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            d="m59 44-8 9 8 9m62-18 8 9-8 9M65 94l-8 9 8 9m50-18 8 9-8 9"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="m90 24 3 8-3 8-3-8 3-8Z" fill="currentColor" />
        </>
      ) : shape === "hunter" || shape === "rogue" ? (
        <>
          <path
            d="M67 38c67 35 67 69 0 104l14-52-14-52Zm14 52h49m-9-9 9 9-9 9M81 90l-34 34"
            stroke="currentColor"
            strokeWidth="3"
          />
        </>
      ) : shape === "druid" || shape === "shaman" ? (
        <>
          <path
            d="M90 140V83m0 28L59 80m31 16 31-31M90 94C39 97 49 45 49 45s48-5 41 49Zm0-12c-5-43 40-42 40-42s9 46-40 42Z"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path d="m73 139 17-10 17 10" stroke="currentColor" strokeWidth="3" />
        </>
      ) : (
        <>
          <path
            d="m90 34 35 15v40c0 24-35 49-35 49S55 113 55 89V49l35-15Z"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M90 54v61M76 69h28m-28 26 14 20 14-20"
            stroke="currentColor"
            strokeWidth="3"
          />
        </>
      )}
      <circle cx="30" cy="90" r="3" fill="currentColor" />
      <circle cx="150" cy="90" r="3" fill="currentColor" />
    </svg>
  );
}

export function Landscape() {
  return (
    <svg
      className="landscape"
      viewBox="0 0 1400 460"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#293739" />
          <stop offset="1" stopColor="#11191b" />
        </linearGradient>
        <linearGradient id="mist" x2="0" y2="1">
          <stop stopColor="#8d9e91" stopOpacity=".1" />
          <stop offset="1" stopColor="#101719" />
        </linearGradient>
      </defs>
      <path fill="url(#sky)" d="M0 0h1400v460H0z" />
      <circle cx="1040" cy="110" r="52" fill="#bec4ac" opacity=".12" />
      <path
        fill="#354346"
        d="m0 280 130-135 68 67 130-165 155 202 126-129 110 128 162-180 120 107 90-65 209 194v156H0Z"
      />
      <path
        fill="#273638"
        d="m0 323 196-92 165 104 112-113 152 133 172-104 187 98 133-151 283 117v145H0Z"
      />
      <g fill="#172427">
        <path d="M1010 367v-92h19v-38h13v-22l9-21 9 21v22h13v38h19v92zm87 0v-61h15v-17h17v-44l10-17 10 17v44h17v17h15v61z" />
        <path d="M1020 326h140v66h-140zM950 374h234v40H950z" />
      </g>
      <g fill="#0e1b1d">
        <path d="m47 249-26 73h17l-28 61h26v77h22v-77h26l-28-61h17Zm1243-23-33 91h21l-35 76h33v67h28v-67h33l-35-76h21Zm-68 50-24 69h15l-26 58h24v57h22v-57h24l-26-58h15Z" />
      </g>
      <path fill="url(#mist)" d="M0 250h1400v210H0z" />
    </svg>
  );
}

export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    ref.current?.showModal();
    ref.current
      ?.querySelector<HTMLElement>(
        'input:not([type="checkbox"]), textarea, select',
      )
      ?.focus({ preventScroll: true });
    return () => {
      if (opener.current?.isConnected) opener.current.focus();
      else document.querySelector<HTMLElement>("main")?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-labelledby="dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-head">
        <div>
          <p className="eyebrow">YOUR ADVENTURE, YOUR WAY</p>
          <h2 id="dialog-title">{title}</h2>
        </div>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
