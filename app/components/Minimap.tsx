"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AppIcon } from "./Icon";

type MinimapProps = {
  containerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLElement | null>;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onPanTo: (x: number, y: number) => void;
  isSidebarOpen?: boolean; // Is AI sidebar open?
};

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

export function Minimap({
  containerRef,
  contentRef,
  zoom,
  onZoomChange,
  onPanTo,
  isSidebarOpen = false,
}: MinimapProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dimensions, setDimensions] = useState({
    contentWidth: 0,
    contentHeight: 0,
    viewportWidth: 0,
    viewportHeight: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const minimapCanvasRef = useRef<HTMLDivElement>(null);
  const updateIntervalRef = useRef<number | null>(null);

  // Update dimensions from container and content
  const updateDimensions = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;

    if (!container || !content) return;

    const contentRect = content.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setDimensions({
      contentWidth: content.scrollWidth,
      contentHeight: content.scrollHeight,
      viewportWidth: container.clientWidth,
      viewportHeight: container.clientHeight,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    });
  }, [containerRef, contentRef]);

  // Set up observers and listeners
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;

    if (!container || !content) return;

    // Initial update
    updateDimensions();

    // Update on scroll
    const handleScroll = () => {
      updateDimensions();
    };

    // Update on resize
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    container.addEventListener("scroll", handleScroll, { passive: true });
    resizeObserver.observe(container);
    resizeObserver.observe(content);

    // Poll for updates when expanded (to catch any dynamic changes)
    if (isExpanded) {
      updateIntervalRef.current = window.setInterval(updateDimensions, 500);
    }

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [containerRef, contentRef, updateDimensions, isExpanded]);

  // Handle click on minimap to jump to location
  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!minimapCanvasRef.current) return;

    const rect = minimapCanvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const targetScrollLeft = x * dimensions.contentWidth - dimensions.viewportWidth / 2;
    const targetScrollTop = y * dimensions.contentHeight - dimensions.viewportHeight / 2;

    onPanTo(targetScrollLeft, targetScrollTop);
  };

  // Zoom controls
  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= zoom);
    const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
    onZoomChange(ZOOM_LEVELS[nextIndex]);
  };

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= zoom);
    const prevIndex = Math.max(currentIndex - 1, 0);
    onZoomChange(ZOOM_LEVELS[prevIndex]);
  };

  const handleZoomReset = () => {
    onZoomChange(1);
  };

  const canZoomIn = zoom < MAX_ZOOM;
  const canZoomOut = zoom > MIN_ZOOM;

  // Calculate minimap scale and viewport position
  const minimapScale = Math.min(200 / dimensions.contentWidth, 150 / dimensions.contentHeight);
  const minimapWidth = dimensions.contentWidth * minimapScale;
  const minimapHeight = dimensions.contentHeight * minimapScale;

  const viewportRectX = (dimensions.scrollLeft / dimensions.contentWidth) * minimapWidth;
  const viewportRectY = (dimensions.scrollTop / dimensions.contentHeight) * minimapHeight;
  const viewportRectWidth = (dimensions.viewportWidth / dimensions.contentWidth) * minimapWidth;
  const viewportRectHeight = (dimensions.viewportHeight / dimensions.contentHeight) * minimapHeight;

  // Position relative to main panel, accounting for AI button
  // When AI sidebar is closed, the AI button (60px + padding) is visible, so indent more
  // When AI sidebar is open, the AI button is hidden, so use normal padding
  const rightOffset = isSidebarOpen ? "16px" : "92px"; // 60px button + 16px padding + 16px gap

  return (
    <>

      {/* Minimap - Bottom Right of Main Panel */}
      <div
        className="absolute z-30 transition-all duration-300 ease-out"
        style={{
          bottom: "16px",
          right: rightOffset,
          width: isExpanded ? "250px" : "auto",
          height: isExpanded ? "auto" : "auto",
        }}
      >
        {isExpanded ? (
          // Expanded minimap
          <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)] shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
              <span
                className="font-medium text-[var(--text-primary)]"
                style={{ fontSize: "12px" }}
              >
                Minimap
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--bg-hover)] transition-colors"
                title="Collapse minimap"
              >
                <AppIcon name="chevronDown" size="xs" />
              </button>
            </div>
            <div className="p-3">
              <div
                ref={minimapCanvasRef}
                className="relative cursor-pointer bg-[var(--bg-sidebar)] rounded border border-[var(--border-subtle)] overflow-hidden"
                style={{
                  width: `${minimapWidth}px`,
                  height: `${minimapHeight}px`,
                  maxWidth: "220px",
                  maxHeight: "165px",
                }}
                onClick={handleMinimapClick}
              >
                {/* Content preview (scaled down actual content) */}
                {contentRef.current && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      transform: `scale(${minimapScale})`,
                      transformOrigin: "0 0",
                      width: `${dimensions.contentWidth}px`,
                      height: `${dimensions.contentHeight}px`,
                      opacity: 0.6,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: contentRef.current.innerHTML,
                    }}
                  />
                )}

                {/* Viewport indicator */}
                <div
                  className="absolute border-2 border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 pointer-events-none z-10"
                  style={{
                    left: `${viewportRectX}px`,
                    top: `${viewportRectY}px`,
                    width: `${viewportRectWidth}px`,
                    height: `${viewportRectHeight}px`,
                    transition: "all 0.1s ease-out",
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          // Collapsed tab
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)] shadow-lg px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors"
            title="Expand minimap"
          >
            <AppIcon name="grid_view" size="sm" />
            <span
              className="font-medium text-[var(--text-primary)]"
              style={{ fontSize: "12px" }}
            >
              Minimap
            </span>
            <AppIcon name="chevronUp" size="xs" />
          </button>
        )}
      </div>
    </>
  );
}
