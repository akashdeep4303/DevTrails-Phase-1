import Link from "next/link";
import Header from "@/components/Header";
import PageBackdrop from "@/components/PageBackdrop";

export default function NotFound() {
  return (
    <div className="relative min-h-screen page-shell-light">
      <PageBackdrop variant="drift" />
      <div className="relative z-10 min-h-screen">
      <Header variant="minimal" />
      <main className="flex min-h-[calc(100vh-4.25rem)] flex-col items-center justify-center px-6">
        <p className="text-sm font-bold uppercase tracking-widest text-sky-600">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 max-w-sm text-center text-slate-600">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <nav className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-sky-700"
          >
            Home
          </Link>
          <Link
            href="/claim"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-sky-50"
          >
            File claim
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-sky-50"
          >
            Admin
          </Link>
        </nav>
      </main>
      </div>
    </div>
  );
}
