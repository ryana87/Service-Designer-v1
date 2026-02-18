"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type UseCanvasNavigationProps = {
  containerRef: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
};

export function useCanvasNavigation({
  containerRef,
  enabled = true,
}: UseCanvasNavigationProps) {
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  // Handle zoom change
  const handleZoomChange = useCallback((newZoom: number) => {
    const container = containerRef.current;
    if (!container) return;

    // Store current scroll position and dimensions
    const oldZoom = zoom;
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    const viewportCenterX = container.clientWidth / 2 + scrollLeft;
    const viewportCenterY = container.clientHeight / 2 + scrollTop;

    // Calculate zoom center point
    const zoomCenterX = viewportCenterX / oldZoom;
    const zoomCenterY = viewportCenterY / oldZoom;

    setZoom(newZoom);

    // After zoom is applied, adjust scroll to maintain center point
    requestAnimationFrame(() => {
      if (containerRef.current) {
        const newScrollLeft = zoomCenterX * newZoom - container.clientWidth / 2;
        const newScrollTop = zoomCenterY * newZoom - container.clientHeight / 2;
        containerRef.current.scrollLeft = newScrollLeft;
        containerRef.current.scrollTop = newScrollTop;
      }
    });
  }, [containerRef, zoom]);

  // Handle pan to specific coordinates
  const handlePanTo = useCallback((scrollLeft: number, scrollTop: number) => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      left: Math.max(0, scrollLeft),
      top: Math.max(0, scrollTop),
      behavior: "smooth",
    });
  }, [containerRef]);

  // Space-bar panning
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only activate if space is pressed and we're not in an input field
      if (
        e.code === "Space" &&
        !isSpacePressed &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setIsSpacePressed(true);
        document.body.style.setProperty('cursor', 'grab', 'important');
        container.style.setProperty('cursor', 'grab', 'important');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsPanning(false);
        document.body.style.removeProperty('cursor');
        container.style.removeProperty('cursor');
        panStartRef.current = null;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isSpacePressed && e.button === 0) {
        e.preventDefault();
        setIsPanning(true);
        document.body.style.setProperty('cursor', 'grabbing', 'important');
        container.style.setProperty('cursor', 'grabbing', 'important');
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: container.scrollLeft,
          scrollTop: container.scrollTop,
        };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning && panStartRef.current) {
        e.preventDefault();
        const deltaX = e.clientX - panStartRef.current.x;
        const deltaY = e.clientY - panStartRef.current.y;
        container.scrollLeft = panStartRef.current.scrollLeft - deltaX;
        container.scrollTop = panStartRef.current.scrollTop - deltaY;
      }
    };

    const handleMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        if (isSpacePressed) {
          document.body.style.setProperty('cursor', 'grab', 'important');
          container.style.setProperty('cursor', 'grab', 'important');
        } else {
          document.body.style.removeProperty('cursor');
          container.style.removeProperty('cursor');
        }
        panStartRef.current = null;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.removeProperty('cursor');
      container.style.removeProperty('cursor');
    };
  }, [containerRef, enabled, isSpacePressed, isPanning]);

  return {
    zoom,
    isSpacePressed,
    isPanning,
    handleZoomChange,
    handlePanTo,
  };
}
