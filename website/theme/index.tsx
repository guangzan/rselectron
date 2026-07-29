export * from '@rspress/core/theme-original';
export { HomeLayout } from './pages';

import { EditLink as OriginalEditLink } from '@rspress/core/theme-original';

/** Keep edit link in the outline only; hide the page-footer duplicate. */
export function EditLink({ isOutline }: { isOutline?: boolean }) {
  if (!isOutline) {
    return null;
  }

  return <OriginalEditLink isOutline />;
}
