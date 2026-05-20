export default function ProjectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black text-white">{children}</div>
  );
}
