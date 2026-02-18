"use client";

import { ZoomControls } from "../../../../components/ZoomControls";
import { useZoom } from "./CanvasWithMinimap";

export function HeaderZoomControls() {
  const { zoom, handleZoomChange } = useZoom();
  
  return <ZoomControls zoom={zoom} onZoomChange={handleZoomChange} />;
}
