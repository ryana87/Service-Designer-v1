"use client";

import { useRef, ReactNode, useState, useEffect, createContext, useContext } from "react";
import { Minimap } from "../../../../components/Minimap";
import { useCanvasNavigation } from "../../../../components/useCanvasNavigation";

type ZoomContextType = {
  zoom: number;
  handleZoomChange: (zoom: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
};

const ZoomContext = createContext<ZoomContextType | null>(null);

export function useZoom() {
  const context = useContext(ZoomContext);
  if (!context) {
    throw new Error("useZoom must be used within CanvasWithMinimap");
  }
  return context;
}

type CanvasWithMinimapProps = {
  children: ReactNode;
};

export function CanvasWithMinimap({ children }: CanvasWithMinimapProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Detect if AI sidebar is open by checking DOM
  useEffect(() => {
    const checkSidebar = () => {
      // Check for AI sidebar by looking for elements with the AI sidebar width
      const aiSidebarElements = document.querySelectorAll('aside');
      let isOpen = false;
      
      aiSidebarElements.forEach((aside) => {
        const style = window.getComputedStyle(aside);
        const width = style.width;
        // Check if width is 300px (AI sidebar width)
        if (width === '300px') {
          isOpen = true;
        }
      });
      
      setIsSidebarOpen(isOpen);
    };

    // Check initially and on mutations
    checkSidebar();
    
    // Use MutationObserver to detect DOM changes
    const observer = new MutationObserver(() => {
      // Delay check to allow styles to apply
      setTimeout(checkSidebar, 50);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    });

    // Also check on window resize
    window.addEventListener('resize', checkSidebar);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkSidebar);
    };
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    zoom,
    handleZoomChange,
    handlePanTo,
  } = useCanvasNavigation({ containerRef });

  return (
    <ZoomContext.Provider value={{ zoom, handleZoomChange, containerRef, contentRef }}>
      {children}
      
      <Minimap
        containerRef={containerRef}
        contentRef={contentRef}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onPanTo={handlePanTo}
        isSidebarOpen={isSidebarOpen}
      />
    </ZoomContext.Provider>
  );
}
