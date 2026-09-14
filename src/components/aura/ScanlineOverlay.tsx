export function ScanlineOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden scanline">
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,oklch(0.16_0.03_250/0.05)_50%)] bg-[length:100%_4px] opacity-20" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[length:4px_100%] opacity-10" />
    </div>
  );
}
