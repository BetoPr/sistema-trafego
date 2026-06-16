import SonarRadarBg from "@/components/layout/SonarRadarBg";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-1 items-center justify-center bg-muted/40 p-4"
      style={{ position: "relative", overflow: "hidden", minHeight: "100vh" }}
    >
      <SonarRadarBg size={900} opacity={0.5} spinSeconds={14} beam beamSize={600} beamDurationSeconds={1.6} />
      <div className="w-full max-w-md" style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}
