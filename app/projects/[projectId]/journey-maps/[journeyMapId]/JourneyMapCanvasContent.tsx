"use client";

import { ReactNode } from "react";
import { useZoom } from "./CanvasWithMinimap";

type JourneyMapCanvasContentProps = {
  children: ReactNode;
};

export function JourneyMapCanvasContent({ children }: JourneyMapCanvasContentProps) {
  const { zoom, containerRef, contentRef } = useZoom();

  return (
    <div ref={containerRef} className="flex-1 overflow-auto p-4">
      <div
        ref={contentRef}
        className="min-w-max origin-top-left transition-transform duration-200"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {children}
      </div>
    </div>
  );
}
