"use client";

import React from "react";
import type { ChartPatternId } from "@/lib/quant-engine/chartPatterns";

interface PatternVisualAssetProps {
  patternId: ChartPatternId;
  width?: number | string;
  height?: number | string;
  size?: number | string;
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

/**
 * Komponen Visual Geometri SVG untuk 20 Karakteristik Pola Chart
 * Menampilkan diagram visual presisi seperti pada Cheat Sheet
 */
export default function PatternVisualAsset({
  patternId,
  width,
  height,
  size,
  className = "",
}: PatternVisualAssetProps) {
  const finalWidth = width ?? size ?? 90;
  const finalHeight = height ?? (typeof size === "number" ? Math.round(size * 0.78) : size) ?? 70;
  const strokeBlue = "#38BDF8";
  const strokeGreen = "#10B981";
  const strokeRed = "#F43F5E";
  const strokeLine = "#64748B";

  const renderPatternSvg = () => {
    switch (patternId) {
      // 1. BULLISH FLAG
      case "BULLISH_FLAG":
        return (
          <>
            {/* Pole */}
            <path d="M 15 80 L 35 25" stroke={strokeGreen} strokeWidth="3" strokeLinecap="round" />
            {/* Flag parallel channels */}
            <line x1="30" y1="20" x2="75" y2="45" stroke={strokeLine} strokeWidth="1.5" strokeDasharray="3 2" />
            <line x1="25" y1="42" x2="70" y2="67" stroke={strokeLine} strokeWidth="1.5" strokeDasharray="3 2" />
            {/* Price zig zag */}
            <path d="M 35 25 L 45 55 L 55 35 L 65 62 L 72 44" fill="none" stroke={strokeBlue} strokeWidth="2" />
            {/* Breakout Arrow */}
            <path d="M 72 44 L 88 15" stroke={strokeGreen} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="88,15 80,18 85,25" fill={strokeGreen} />
          </>
        );

      // 2. BULLISH PENNANT
      case "BULLISH_PENNANT":
        return (
          <>
            {/* Pole */}
            <path d="M 15 80 L 38 28" stroke={strokeGreen} strokeWidth="3" strokeLinecap="round" />
            {/* Symmetrical converging pennant lines */}
            <line x1="35" y1="25" x2="75" y2="45" stroke={strokeLine} strokeWidth="1.5" />
            <line x1="35" y1="65" x2="75" y2="45" stroke={strokeLine} strokeWidth="1.5" />
            {/* Zig zag */}
            <path d="M 38 28 L 48 58 L 58 36 L 68 50 L 73 44" fill="none" stroke={strokeBlue} strokeWidth="2" />
            {/* Breakout Arrow */}
            <path d="M 73 44 L 88 18" stroke={strokeGreen} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="88,18 80,21 85,28" fill={strokeGreen} />
          </>
        );

      // 3. BULLISH FALLING WEDGE
      case "BULLISH_FALLING_WEDGE":
        return (
          <>
            {/* Falling converging wedge lines */}
            <line x1="20" y1="20" x2="80" y2="55" stroke={strokeLine} strokeWidth="1.5" />
            <line x1="15" y1="60" x2="78" y2="70" stroke={strokeLine} strokeWidth="1.5" />
            {/* Price path */}
            <path d="M 15 80 L 30 25 L 45 65 L 60 40 L 72 68 L 78 52" fill="none" stroke={strokeBlue} strokeWidth="2" />
            {/* Breakout */}
            <path d="M 78 52 L 90 20" stroke={strokeGreen} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="90,20 82,23 87,30" fill={strokeGreen} />
          </>
        );

      // 4. BEARISH FLAG
      case "BEARISH_FLAG":
        return (
          <>
            {/* Downward Pole */}
            <path d="M 15 20 L 35 75" stroke={strokeRed} strokeWidth="3" strokeLinecap="round" />
            {/* Upward parallel channel */}
            <line x1="25" y1="58" x2="70" y2="33" stroke={strokeLine} strokeWidth="1.5" strokeDasharray="3 2" />
            <line x1="30" y1="80" x2="75" y2="55" stroke={strokeLine} strokeWidth="1.5" strokeDasharray="3 2" />
            {/* Price path */}
            <path d="M 35 75 L 45 45 L 55 65 L 65 38 L 72 56" fill="none" stroke={strokeBlue} strokeWidth="2" />
            {/* Breakdown Arrow */}
            <path d="M 72 56 L 88 85" stroke={strokeRed} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="88,85 85,75 80,82" fill={strokeRed} />
          </>
        );

      // 5. BEARISH PENNANT
      case "BEARISH_PENNANT":
        return (
          <>
            {/* Downward Pole */}
            <path d="M 15 20 L 38 72" stroke={strokeRed} strokeWidth="3" strokeLinecap="round" />
            {/* Pennant lines */}
            <line x1="35" y1="35" x2="75" y2="55" stroke={strokeLine} strokeWidth="1.5" />
            <line x1="35" y1="75" x2="75" y2="55" stroke={strokeLine} strokeWidth="1.5" />
            {/* Zig zag */}
            <path d="M 38 72 L 48 42 L 58 64 L 68 50 L 73 56" fill="none" stroke={strokeBlue} strokeWidth="2" />
            {/* Breakdown */}
            <path d="M 73 56 L 88 82" stroke={strokeRed} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="88,82 85,72 80,79" fill={strokeRed} />
          </>
        );

      // 6. BEARISH FALLING WEDGE
      case "BEARISH_FALLING_WEDGE":
        return (
          <>
            <path d="M 15 20 L 30 55" stroke={strokeRed} strokeWidth="3" strokeLinecap="round" />
            <line x1="25" y1="35" x2="75" y2="60" stroke={strokeLine} strokeWidth="1.5" />
            <line x1="20" y1="70" x2="72" y2="80" stroke={strokeLine} strokeWidth="1.5" />
            <path d="M 30 55 L 42 42 L 54 68 L 66 54 L 74 78" fill="none" stroke={strokeBlue} strokeWidth="2" />
            <path d="M 74 78 L 88 92" stroke={strokeRed} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="88,92 84,82 80,89" fill={strokeRed} />
          </>
        );

      // 7. BEARISH DOUBLE TOP ("M")
      case "BEARISH_DOUBLE_TOP":
        return (
          <>
            {/* Neckline */}
            <line x1="15" y1="58" x2="85" y2="58" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 2" />
            {/* "M" Price Path */}
            <path d="M 12 75 L 30 25 L 50 58 L 70 25 L 82 58" fill="none" stroke="#F8FAFC" strokeWidth="2.5" />
            {/* Breakdown Arrow */}
            <path d="M 82 58 L 92 85" stroke={strokeRed} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="92,85 89,75 83,82" fill={strokeRed} />
          </>
        );

      // 8. BEARISH HEAD AND SHOULDERS
      case "BEARISH_HEAD_AND_SHOULDERS":
        return (
          <>
            {/* Neckline */}
            <line x1="15" y1="62" x2="88" y2="62" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 2" />
            {/* Head and shoulders shape */}
            <path d="M 12 75 L 26 42 L 40 62 L 52 18 L 64 62 L 78 42 L 86 62" fill="none" stroke="#F8FAFC" strokeWidth="2.5" />
            {/* Breakdown Arrow */}
            <path d="M 86 62 L 94 88" stroke={strokeRed} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="94,88 92,78 85,84" fill={strokeRed} />
          </>
        );

      // 9. BEARISH RISING WEDGE
      case "BEARISH_RISING_WEDGE":
        return (
          <>
            {/* Upward converging lines */}
            <line x1="15" y1="65" x2="75" y2="25" stroke={strokeLine} strokeWidth="1.5" />
            <line x1="20" y1="80" x2="78" y2="40" stroke={strokeLine} strokeWidth="1.5" />
            <path d="M 15 80 L 30 55 L 45 70 L 60 42 L 72 58 L 76 35" fill="none" stroke={strokeBlue} strokeWidth="2" />
            <path d="M 76 35 L 90 85" stroke={strokeRed} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="90,85 88,75 82,82" fill={strokeRed} />
          </>
        );

      // 10. BEARISH EXPANDING TRIANGLE
      case "BEARISH_EXPANDING_TRIANGLE":
        return (
          <>
            <line x1="30" y1="45" x2="80" y2="20" stroke={strokeLine} strokeWidth="1.5" />
            <line x1="30" y1="55" x2="80" y2="80" stroke={strokeLine} strokeWidth="1.5" />
            <path d="M 20 50 L 35 38 L 50 68 L 65 26 L 78 80" fill="none" stroke={strokeBlue} strokeWidth="2" />
            <path d="M 78 80 L 90 92" stroke={strokeRed} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="90,92 86,82 82,89" fill={strokeRed} />
          </>
        );

      // 11. BEARISH TRIPLE TOP
      case "BEARISH_TRIPLE_TOP":
        return (
          <>
            {/* Top Resistance */}
            <line x1="20" y1="28" x2="80" y2="28" stroke={strokeLine} strokeWidth="1.5" />
            {/* Neckline */}
            <line x1="15" y1="62" x2="85" y2="62" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 2" />
            {/* Triple peaks */}
            <path d="M 12 75 L 26 28 L 38 62 L 50 28 L 62 62 L 74 28 L 82 62" fill="none" stroke="#F8FAFC" strokeWidth="2.5" />
            <path d="M 82 62 L 92 88" stroke={strokeRed} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="92,88 90,78 83,84" fill={strokeRed} />
          </>
        );

      // 12. BULLISH DOUBLE BOTTOM ("W")
      case "BULLISH_DOUBLE_BOTTOM":
        return (
          <>
            {/* Neckline */}
            <line x1="15" y1="42" x2="85" y2="42" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 2" />
            {/* "W" Price Path */}
            <path d="M 12 25 L 30 75 L 50 42 L 70 75 L 82 42" fill="none" stroke="#F8FAFC" strokeWidth="2.5" />
            {/* Breakout Arrow */}
            <path d="M 82 42 L 92 15" stroke={strokeGreen} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="92,15 85,22 89,28" fill={strokeGreen} />
          </>
        );

      // 13. BULLISH INVERTED HEAD AND SHOULDERS
      case "BULLISH_INVERTED_HEAD_AND_SHOULDERS":
        return (
          <>
            {/* Neckline */}
            <line x1="15" y1="38" x2="88" y2="38" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 2" />
            {/* Inverted H&S Path */}
            <path d="M 12 25 L 26 58 L 40 38 L 52 82 L 64 38 L 78 58 L 86 38" fill="none" stroke="#F8FAFC" strokeWidth="2.5" />
            {/* Breakout Arrow */}
            <path d="M 86 38 L 94 12" stroke={strokeGreen} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="94,12 87,19 91,25" fill={strokeGreen} />
          </>
        );

      // 14. BULLISH FALLING WEDGE (REVERSAL)
      case "BULLISH_FALLING_WEDGE_REV":
        return (
          <>
            <path d="M 15 20 L 28 65" stroke={strokeRed} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="25" y1="45" x2="75" y2="70" stroke={strokeLine} strokeWidth="1.5" />
            <line x1="20" y1="80" x2="75" y2="85" stroke={strokeLine} strokeWidth="1.5" />
            <path d="M 28 65 L 42 52 L 56 75 L 68 62 L 74 72" fill="none" stroke={strokeBlue} strokeWidth="2" />
            <path d="M 74 72 L 90 25" stroke={strokeGreen} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="90,25 83,32 87,38" fill={strokeGreen} />
          </>
        );

      // 15. BULLISH EXPANDING TRIANGLE
      case "BULLISH_EXPANDING_TRIANGLE":
        return (
          <>
            <line x1="30" y1="45" x2="80" y2="15" stroke={strokeLine} strokeWidth="1.5" />
            <line x1="30" y1="55" x2="80" y2="85" stroke={strokeLine} strokeWidth="1.5" />
            <path d="M 20 40 L 35 62 L 50 32 L 65 75 L 80 20" fill="none" stroke={strokeBlue} strokeWidth="2" />
            <path d="M 80 20 L 92 10" stroke={strokeGreen} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="92,10 85,17 89,23" fill={strokeGreen} />
          </>
        );

      // 16. BULLISH TRIPLE BOTTOM
      case "BULLISH_TRIPLE_BOTTOM":
        return (
          <>
            {/* Bottom Support */}
            <line x1="20" y1="72" x2="80" y2="72" stroke={strokeLine} strokeWidth="1.5" />
            {/* Neckline */}
            <line x1="15" y1="38" x2="85" y2="38" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 2" />
            {/* Triple bottoms */}
            <path d="M 12 25 L 26 72 L 38 38 L 50 72 L 62 38 L 74 72 L 82 38" fill="none" stroke="#F8FAFC" strokeWidth="2.5" />
            <path d="M 82 38 L 92 12" stroke={strokeGreen} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="92,12 85,19 89,25" fill={strokeGreen} />
          </>
        );

      // 17. ASCENDING TRIANGLE
      case "ASCENDING_TRIANGLE":
        return (
          <>
            {/* Flat Horizontal Resistance */}
            <line x1="20" y1="28" x2="80" y2="28" stroke="#F43F5E" strokeWidth="2" />
            {/* Sloping Support (Higher Lows) */}
            <line x1="18" y1="75" x2="80" y2="30" stroke="#10B981" strokeWidth="2" />
            {/* Zig zag path */}
            <path d="M 15 75 L 30 28 L 45 60 L 60 28 L 72 45 L 78 28" fill="none" stroke={strokeBlue} strokeWidth="2" />
            {/* Breakout Arrow */}
            <path d="M 78 28 L 92 10" stroke={strokeGreen} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="92,10 85,17 89,23" fill={strokeGreen} />
          </>
        );

      // 18. DESCENDING TRIANGLE
      case "DESCENDING_TRIANGLE":
        return (
          <>
            {/* Flat Horizontal Support */}
            <line x1="20" y1="72" x2="80" y2="72" stroke="#10B981" strokeWidth="2" />
            {/* Sloping Resistance (Lower Highs) */}
            <line x1="18" y1="25" x2="80" y2="70" stroke="#F43F5E" strokeWidth="2" />
            {/* Zig zag path */}
            <path d="M 15 25 L 30 72 L 45 40 L 60 72 L 72 55 L 78 72" fill="none" stroke={strokeBlue} strokeWidth="2" />
            {/* Breakdown Arrow */}
            <path d="M 78 72 L 92 90" stroke={strokeRed} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="92,90 90,80 83,86" fill={strokeRed} />
          </>
        );

      // 19. SYMMETRICAL TRIANGLE
      case "SYMMETRICAL_TRIANGLE":
        return (
          <>
            {/* Converging Upper & Lower Lines */}
            <line x1="20" y1="20" x2="80" y2="50" stroke={strokeLine} strokeWidth="1.8" />
            <line x1="20" y1="80" x2="80" y2="50" stroke={strokeLine} strokeWidth="1.8" />
            {/* Coiling Zig zag */}
            <path d="M 15 25 L 30 75 L 46 32 L 60 65 L 72 42 L 78 52" fill="none" stroke={strokeBlue} strokeWidth="2" />
            {/* Bilateral Arrow (Breakout up or down) */}
            <path d="M 78 52 L 92 25" stroke={strokeGreen} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="92,25 85,32 89,38" fill={strokeGreen} />
          </>
        );

      // 20. SYMMETRICAL EXPANDING TRIANGLE (MEGAPHONE)
      case "SYMMETRICAL_EXPANDING_TRIANGLE":
        return (
          <>
            {/* Diverging Megaphone Lines */}
            <line x1="25" y1="48" x2="80" y2="15" stroke={strokeLine} strokeWidth="1.8" />
            <line x1="25" y1="52" x2="80" y2="85" stroke={strokeLine} strokeWidth="1.8" />
            {/* Expanding swings */}
            <path d="M 15 50 L 32 38 L 48 68 L 65 22 L 78 82" fill="none" stroke={strokeBlue} strokeWidth="2" />
            <path d="M 78 82 L 90 94" stroke={strokeRed} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="90,94 86,84 82,91" fill={strokeRed} />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`relative flex items-center justify-center rounded border border-[#1F2430] bg-[#090C14] p-1.5 shadow-inner ${className}`}
      style={{ width: finalWidth, height: finalHeight }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {renderPatternSvg()}
      </svg>
    </div>
  );
}
