import React, { useEffect, useRef, useState } from "react";

/**
 * Props for the AnimatedCurvedLines component
 */
export interface AnimatedCurvedLinesProps {
  className?: string;
  containerRef?: React.RefObject<HTMLElement>;
  intensity?: number;
}

/**
 * AnimatedCurvedLines Component
 *
 * Displays animated curved lines with parallax effect that responds to mouse movement.
 * Can be reused throughout the app for dynamic background effects.
 */
export const AnimatedCurvedLines: React.FC<AnimatedCurvedLinesProps> = ({
  className = "",
  containerRef,
  intensity = 20,
}) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const ref = containerRef || internalRef;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const element = ref.current;
      if (element) {
        const rect = element.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        setMousePosition({ x, y });
      }
    };

    const container = ref.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      return () => container.removeEventListener("mousemove", handleMouseMove);
    }
  }, [ref]);

  return (
    <svg
      className={`absolute inset-0 h-full opacity-35 ${className}`}
      style={{
        pointerEvents: "none",
        width: "150%",
        left: "-25%",
        transform: `translate(${mousePosition.x * intensity}px, ${
          mousePosition.y * intensity
        }px)`,
        transition: "transform 0.1s ease-out",
      }}
      viewBox="0 0 2000 800"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="orangeGradient1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
      </defs>

      {/* Diagonal curve from top-left to bottom-right */}
      <path
        d="M -300,100 Q 800,450 2300,200"
        stroke="url(#orangeGradient1)"
        strokeWidth="2"
        fill="none"
        style={{
          transform: `translate(${mousePosition.x * 16}px, ${
            mousePosition.y * 10
          }px)`,
          transition: "transform 0.14s cubic-bezier(0.4,0,0.2,1)",
        }}
      />

      {/* Reverse diagonal curve from top-right to bottom-left */}
      <path
        d="M 2200,150 Q 900,550 -200,350"
        stroke="#fb923c"
        strokeWidth="1.5"
        fill="none"
        opacity="0.34"
        style={{
          transform: `translate(${mousePosition.x * -13}px, ${
            mousePosition.y * -8
          }px)`,
          transition: "transform 0.19s cubic-bezier(0.4,0,0.2,1)",
        }}
      />

      {/* Steep curve from middle-left to top-right */}
      <path
        d="M -100,600 Q 1200,200 2200,100"
        stroke="#fbbf24"
        strokeWidth="1.2"
        fill="none"
        opacity="0.29"
        style={{
          transform: `translate(${mousePosition.x * 8}px, ${
            mousePosition.y * 17
          }px)`,
          transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}
      />

      {/* Shallow wave from bottom to middle */}
      <path
        d="M -150,750 Q 1000,500 2150,650"
        stroke="#fb923c"
        strokeWidth="1.3"
        fill="none"
        opacity="0.25"
        style={{
          transform: `translate(${mousePosition.x * 12}px, ${
            mousePosition.y * -12
          }px)`,
          transition: "transform 0.16s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </svg>
  );
};

export default AnimatedCurvedLines;
