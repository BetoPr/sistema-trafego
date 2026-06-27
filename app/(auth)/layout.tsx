export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-1 items-center justify-center p-4"
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: "100vh",
        background: "#060A08",
      }}
    >
      <div className="w-full max-w-md" style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}
