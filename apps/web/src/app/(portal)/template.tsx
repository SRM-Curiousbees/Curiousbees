/**
 * Re-mounts on every portal navigation, so each page enters with a short fade and
 * rise (globals.css .cb-page-enter). It never delays navigation, and reduced motion
 * removes it.
 */
export default function PortalTemplate({ children }: { children: React.ReactNode }) {
  return <div className="cb-page-enter">{children}</div>;
}
