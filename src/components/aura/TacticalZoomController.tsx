import { Button } from "../ui/button";

export function TacticalZoomController({
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleMode,
  mode,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleMode: () => void;
  mode: "globe" | "map";
}) {
  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
      <Button variant="outline" size="sm" onClick={onZoomIn}>
        +
      </Button>
      <Button variant="outline" size="sm" onClick={onZoomOut}>
        -
      </Button>
      <Button variant="outline" size="sm" onClick={onReset}>
        0
      </Button>
      <Button variant="outline" size="sm" onClick={onToggleMode}>
        {mode === "globe" ? "Map" : "Globe"}
      </Button>
    </div>
  );
}
