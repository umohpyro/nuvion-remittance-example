import type { ReactNode } from "react";

/** The page frame: a 5xl column with 16px gutters. */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10 ${className}`}>{children}</div>;
}

/** A page with a plain title block (eyebrow, title, intro) instead of a hero band. Home and the delivery page draw their own bands. */
export function PageShell({ title, intro, eyebrow, children }: { title: string; intro: string; eyebrow?: string; children: ReactNode }) {
  return (
    <Container>
      <header className="print:hidden max-w-2xl">
        {eyebrow && (
          <p className="flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.12em] text-c-text uppercase">
            <span className="h-0.5 w-6 rounded-full bg-c" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-[clamp(1.9rem,4vw,2.8rem)] leading-tight font-extrabold tracking-tight text-balance">{title}</h1>
        <p className="mt-2 text-muted-foreground text-pretty">{intro}</p>
      </header>
      <div className="mt-6 sm:mt-8">{children}</div>
    </Container>
  );
}
