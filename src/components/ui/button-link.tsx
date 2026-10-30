import Link from "next/link";
import type { ComponentProps } from "react";

type ButtonLinkProps = ComponentProps<typeof Link>;

export function ButtonLink({ className = "", ...props }: ButtonLinkProps) {
  return (
    <Link
      className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--brand)] px-5 font-bold text-white shadow-sm transition hover:bg-[var(--brand-strong)] ${className}`}
      {...props}
    />
  );
}
