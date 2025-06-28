"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: number;
  fullScreen?: boolean;
  className?: string;
  message?: string;
}

export function LoadingSpinner({
  size = 60,
  fullScreen = true,
  className,
  message = "Đợi xíu nhaaa !!!",
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-center",
        fullScreen && "min-h-[calc(100vh-10rem)]",
        className
      )}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-4 border-t-transparent border-r-pink-500 border-b-purple-500 border-l-indigo-500",
          "drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]"
        )}
        style={{ width: size, height: size }}
      />
      <span className="text-xl font-bold animate-pulse text-zinc-950">
        {message}
      </span>
    </div>
  );
}
