import { Link } from '@rspress/core/theme-original';
import type { ComponentProps, ReactNode } from 'react';

type SafeLinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  href?: string;
  children?: ReactNode;
};

/** Renders a real Link only when href is set; otherwise a non-navigating span. */
export function SafeLink({ href, children, ...rest }: SafeLinkProps) {
  if (!href) {
    return <span {...rest}>{children}</span>;
  }

  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
