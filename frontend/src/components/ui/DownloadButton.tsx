"use client";

import React from "react";

interface DownloadButtonProps {
  as?: React.ElementType;
  className?: string;
  onClick?: (e: any) => void;
  [x: string]: any;
}

export default function DownloadButton({ as, className = "", onClick, ...props }: DownloadButtonProps) {
  const Component = (as || "button") as any;

  return (
    <div className={`relative group inline-block ${className}`}>
      <Component
        onClick={onClick}
        className="relative flex items-center justify-center w-[50px] h-[50px] rounded-full overflow-hidden transition-all duration-300 active:scale-[0.95]
          bg-white dark:bg-nexus-bg-elevated border border-gray-200 dark:border-nexus-glass-border
          hover:border-[#14C8EB]/50 dark:hover:border-[#3B82F6]/50
          shadow-sm hover:shadow-md dark:shadow-none
          hover:bg-gradient-to-br hover:from-[#14C8EB] hover:to-[#0F503C] dark:hover:from-[#3B82F6] dark:hover:to-[#7C3AED]
          cursor-pointer text-[#0F503C] dark:text-gray-300 hover:text-white dark:hover:text-white"
        aria-label="Download"
        {...props}
      >
        <div className="absolute flex flex-col items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:translate-y-[24px]">
          {/* Arrow sliding in from top */}
          <svg className="w-5 h-5 absolute -top-[24px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          
          {/* Default arrow */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
      </Component>

      {/* Tooltip */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap opacity-0 translate-y-2 pointer-events-none transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0
        bg-[#0F503C] text-white dark:bg-gray-800 dark:text-gray-200 shadow-lg z-50"
      >
        Download
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#0F503C] dark:bg-gray-800"></div>
      </div>
    </div>
  );
}
