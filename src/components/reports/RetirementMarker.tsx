'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin } from 'lucide-react';

interface RetirementMarkerProps {
  chartData: Array<{ label: string; date: string; [key: string]: any }>;
  retirementYear: number;
  retirementAge: number;
  currentAge: number;
  forecastAge: number;
  onRetirementAgeChange: (newAge: number) => void;
}

export default function RetirementMarker({
  chartData,
  retirementYear,
  retirementAge,
  currentAge,
  forecastAge,
  onRetirementAgeChange,
}: RetirementMarkerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  // Function to calculate and update position
  const updatePosition = useCallback(() => {
    if (!containerRef.current || chartData.length === 0) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Recharts ResponsiveContainer with AreaChart typically uses:
    // Left: ~60-80px for Y-axis labels and padding
    // Right: ~20px padding
    // Top: ~20px padding  
    // Bottom: ~80px for angled X-axis labels
    // Adjust left margin - may need fine-tuning based on actual chart rendering
    // Adjusted to 73px to align line and marker properly
    const leftMargin = 73;
    const rightMargin = 20;
    const topMargin = 20;
    const chartWidth = containerRect.width - leftMargin - rightMargin;

    // Find the index of the retirement year in chart data
    // ReferenceLine x prop matches the label field in chartData
    const retirementIndex = chartData.findIndex(
      (point) => point.label === retirementYear.toString()
    );

    if (retirementIndex === -1) {
      // Fallback: try matching by date/year
      const fallbackIndex = chartData.findIndex(
        (point) => parseInt(point.date) === retirementYear
      );
      if (fallbackIndex === -1) return;
      
      // Calculate X position for fallback
      const xPercent = chartData.length > 1 ? fallbackIndex / (chartData.length - 1) : 0;
      const x = leftMargin + xPercent * chartWidth;
      setPosition({ x, y: topMargin + 30 });
      return;
    }

    // Calculate X position (percentage of chart width)
    // Recharts positions data points evenly across the available chart width
    // For category scale, each data point gets equal spacing
    const xPercent = chartData.length > 1 ? retirementIndex / (chartData.length - 1) : 0;
    const x = leftMargin + xPercent * chartWidth;

    // Position marker at top of chart area
    const y = topMargin + 30; // Position lower so bubble is visible

    setPosition({ x, y });
  }, [chartData, retirementYear]);

  // Calculate position based on retirement year
  useEffect(() => {
    updatePosition();
  }, [updatePosition]);

  // Recalculate position on window resize and container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      // Small delay to ensure chart has finished resizing
      setTimeout(updatePosition, 50);
    };

    // Watch for window resize
    window.addEventListener('resize', handleResize);
    
    // Watch for container size changes (more accurate than window resize)
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(updatePosition, 50);
    });
    
    resizeObserver.observe(containerRef.current);
    
    // Initial position update after mount
    const timeoutId = setTimeout(updatePosition, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, [updatePosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !markerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const leftMargin = 73; // Adjusted to match line position
      const rightMargin = 20;
      const chartWidth = containerRect.width - leftMargin - rightMargin;
      const chartLeft = leftMargin;

      // Calculate mouse position relative to chart
      const mouseX = e.clientX - containerRect.left;
      const clampedX = Math.max(chartLeft, Math.min(chartLeft + chartWidth, mouseX));

      // Convert X position to year (matching the calculation above)
      const xPercent = (clampedX - chartLeft) / chartWidth;
      const yearIndex = Math.round(xPercent * (chartData.length - 1));
      const dataPoint = chartData[yearIndex];
      const newYear = dataPoint ? parseInt(dataPoint.date || dataPoint.label || retirementYear.toString()) : retirementYear;

      // Convert year to age (year - birth year)
      const birthYear = new Date().getFullYear() - currentAge;
      const newAge = newYear - birthYear;

      // Update retirement age if valid
      if (newAge >= currentAge + 1 && newAge <= forecastAge) {
        onRetirementAgeChange(newAge);
      }

      setPosition({ x: clampedX, y: position.y });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, chartData, currentAge, forecastAge, onRetirementAgeChange, position.y, retirementYear]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ pointerEvents: isDragging ? 'auto' : 'none' }}
    >
      <div
        ref={markerRef}
        className="absolute cursor-move pointer-events-auto"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translateX(-50%)',
          zIndex: isDragging ? 20 : 15, // Higher than line (z-index 10) so marker appears on top
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex flex-col items-center">
          <MapPin className="h-6 w-6 text-orange-500 fill-orange-500" />
          <div className="mt-1 px-2 py-1 bg-orange-500 text-white text-xs font-semibold rounded shadow-lg whitespace-nowrap">
            Age {retirementAge}
          </div>
        </div>
      </div>
    </div>
  );
}
