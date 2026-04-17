import Link from "next/link";
import VigilLogo from "@/components/VigilLogo";

interface HeaderProps {
  variant?: "default" | "minimal";
}

const navLink =
  "rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-white hover:text-sky-800 hover:shadow-sm";

export default function Header({ variant = "default" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-sky-100/80 bg-white/70 backdrop-blur-2xl">
      <div className="mx-auto flex min-h-[5rem] max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <VigilLogo size={44} showWordmark />
        {variant === "default" && (
          <nav className="flex flex-wrap items-center justify-end gap-1 rounded-2xl border border-slate-200/80 bg-white/75 p-1.5 shadow-lg shadow-sky-100/40">
            <Link href="/protect" className={navLink}>
              Protect worker
            </Link>
            <Link href="/worker" className={navLink}>
              Worker dashboard
            </Link>
            <Link href="/protect/claims" className={navLink}>
              Worker claims
            </Link>
            <Link href="/claim" className={navLink}>
              File claim
            </Link>
            <Link href="/admin" className={navLink}>
              Admin
            </Link>
            <Link href="/admin/analytics" className={navLink}>
              Analytics
            </Link>
            <Link
              href="/claim"
              className="ml-1 inline-flex items-center rounded-xl bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:from-sky-700 hover:via-sky-600 hover:to-cyan-600"
            >
              Start now
            </Link>
          </nav>
        )}
        {variant === "minimal" && (
          <Link
            href="/"
            className="rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2 text-sm font-medium text-sky-700 shadow-sm transition-colors hover:text-sky-900"
          >
            ← Home
          </Link>
        )}
      </div>
    </header>
  );
}
