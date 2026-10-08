"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Predict" },
  { href: "/training", label: "Training" },
];

export default function Nav() {
  const pathname = usePathname();
  const index = Math.max(0, LINKS.findIndex((l) => l.href === pathname));
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <Logo />
          <span>Catapult Control</span>
        </Link>
        <nav className="tabs" style={{ "--tab-count": LINKS.length, "--tab-index": index } as React.CSSProperties}>
          <span className="tab-indicator" aria-hidden />
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? "active" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="28" x2="28" y2="0">
          <stop stopColor="#c6f432" />
          <stop offset="1" stopColor="#3ee0cf" />
        </linearGradient>
      </defs>
      <path d="M3 23 C 8 4, 18 4, 25 17" stroke="url(#logo-g)" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="1 4.5" />
      <circle cx="25" cy="18" r="2.6" fill="#c6f432" />
      <path d="M2 25.5h24" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
