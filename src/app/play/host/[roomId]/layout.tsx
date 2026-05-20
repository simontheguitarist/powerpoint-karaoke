export default function HostStageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Full-bleed, no nav chrome — this is the front-of-room screen.
  return (
    <div className="fixed inset-0 z-50 bg-black text-white">{children}</div>
  );
}
