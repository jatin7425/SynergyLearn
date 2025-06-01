
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils'; // Added this import

export interface WhiteboardPath {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth: number;
  tool: 'pen' | 'eraser';
}

interface WhiteboardCanvasProps {
  paths: WhiteboardPath[];
  onDrawPath: (path: WhiteboardPath) => void;
  activeColor: string;
  activeStrokeWidth: number;
  activeTool: 'pen' | 'eraser';
  canvasBackgroundColorCssVar?: string; // e.g., 'hsl(var(--card))'
  className?: string;
}

const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  paths,
  onDrawPath,
  activeColor,
  activeStrokeWidth,
  activeTool,
  canvasBackgroundColorCssVar = 'hsl(var(--card))', // Default to card background
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [resolvedBackgroundColor, setResolvedBackgroundColor] = useState('white'); // Fallback

  const getResolvedCssVariable = useCallback((cssVar: string): string => {
    if (typeof window === 'undefined') return 'white'; // Default for SSR or if not available
    // Extract HSL values (e.g., from "0 0% 100%")
    const match = cssVar.match(/hsl\(\s*(\d+)\s+(\d+)%\s+(\d+)%\s*\)/);
    if (match) {
        return `hsl(${match[1]}, ${match[2]}%, ${match[3]}%)`;
    }
    // Fallback if parsing fails or it's not HSL (e.g. a direct color name)
    // For direct color name, this might not work correctly unless it's a basic one.
    // It's safer to use HSL for theme variables.
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar.startsWith('--') ? cssVar : `--${cssVar.replace(/hsl\(var\(|\)\)/g, '')}`).trim() || 'white';
  }, []);


  useEffect(() => {
    setResolvedBackgroundColor(getResolvedCssVariable(canvasBackgroundColorCssVar));
  }, [canvasBackgroundColorCssVar, getResolvedCssVariable]);
  

  const drawAllPaths = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Clear canvas
    context.fillStyle = resolvedBackgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    paths.forEach(path => {
      context.beginPath();
      context.strokeStyle = path.tool === 'eraser' ? resolvedBackgroundColor : path.color;
      context.lineWidth = path.strokeWidth;
      context.lineCap = 'round';
      context.lineJoin = 'round';

      if (path.points.length > 0) {
        context.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          context.lineTo(path.points[i].x, path.points[i].y);
        }
        context.stroke();
      }
    });
  }, [paths, resolvedBackgroundColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width, height });
        // Ensure canvas display size matches its drawing surface size
        canvas.width = width;
        canvas.height = height;
      }
    });
    resizeObserver.observe(parent);
    
    // Initial size set
    const { width, height } = parent.getBoundingClientRect();
    setCanvasSize({ width, height });
    canvas.width = width;
    canvas.height = height;

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    drawAllPaths();
  }, [paths, canvasSize, drawAllPaths]); // Redraw if paths or size changes


  const getCoordinates = (event: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in event) { // Touch event
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }
    // Mouse event
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(event);
    if (!coords) return;
    setIsDrawing(true);
    setCurrentPath([coords]);
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoordinates(event);
    if (!coords) return;

    setCurrentPath(prevPath => [...prevPath, coords]);

    // Draw current segment for immediate feedback
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (context && currentPath.length > 1) {
      context.beginPath();
      context.strokeStyle = activeTool === 'eraser' ? resolvedBackgroundColor : activeColor;
      context.lineWidth = activeStrokeWidth;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.moveTo(currentPath[currentPath.length - 2].x, currentPath[currentPath.length - 2].y);
      context.lineTo(coords.x, coords.y);
      context.stroke();
    }
  };

  const endDrawing = () => {
    if (!isDrawing || currentPath.length === 0) return;
    setIsDrawing(false);
    
    const newPath: WhiteboardPath = {
      id: `path-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      points: currentPath,
      color: activeTool === 'eraser' ? resolvedBackgroundColor : activeColor, // Eraser uses background color
      strokeWidth: activeStrokeWidth,
      tool: activeTool,
    };
    onDrawPath(newPath);
    setCurrentPath([]);
    // No need to redrawAllPaths here, it will happen when props.paths updates from Firebase
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={endDrawing}
      onMouseLeave={endDrawing} // End drawing if mouse leaves canvas
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={endDrawing}
      className={cn("w-full h-full touch-none", className)} // touch-none to prevent page scroll on canvas
      style={{ backgroundColor: resolvedBackgroundColor }} // For visual only, actual clear is fillRect
    />
  );
};

export default WhiteboardCanvas;
