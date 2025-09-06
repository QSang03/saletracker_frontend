import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getDepartmentColor = (departmentId: number) => {
  const colors = [
    {
      bg: "bg-blue-500",
      light: "bg-blue-100",
      border: "border-blue-300",
      text: "text-blue-700",
    },
    {
      bg: "bg-green-500",
      light: "bg-green-100",
      border: "border-green-300",
      text: "text-green-700",
    },
    {
      bg: "bg-purple-500",
      light: "bg-purple-100",
      border: "border-purple-300",
      text: "text-purple-700",
    },
    {
      bg: "bg-orange-500",
      light: "bg-orange-100",
      border: "border-orange-300",
      text: "text-orange-700",
    },
    {
      bg: "bg-pink-500",
      light: "bg-pink-100",
      border: "border-pink-300",
      text: "text-pink-700",
    },
    {
      bg: "bg-teal-500",
      light: "bg-teal-100",
      border: "border-teal-300",
      text: "text-teal-700",
    },
    {
      bg: "bg-indigo-500",
      light: "bg-indigo-100",
      border: "border-indigo-300",
      text: "text-indigo-700",
    },
    {
      bg: "bg-red-500",
      light: "bg-red-100",
      border: "border-red-300",
      text: "text-red-700",
    },
    {
      bg: "bg-yellow-500",
      light: "bg-yellow-100",
      border: "border-yellow-300",
      text: "text-yellow-700",
    },
    {
      bg: "bg-cyan-500",
      light: "bg-cyan-100",
      border: "border-cyan-300",
      text: "text-cyan-700",
    },
    {
      bg: "bg-emerald-500",
      light: "bg-emerald-100",
      border: "border-emerald-300",
      text: "text-emerald-700",
    },
    {
      bg: "bg-lime-500",
      light: "bg-lime-100",
      border: "border-lime-300",
      text: "text-lime-700",
    },
    {
      bg: "bg-amber-500",
      light: "bg-amber-100",
      border: "border-amber-300",
      text: "text-amber-700",
    },
    {
      bg: "bg-sky-500",
      light: "bg-sky-100",
      border: "border-sky-300",
      text: "text-sky-700",
    },
    {
      bg: "bg-violet-500",
      light: "bg-violet-100",
      border: "border-violet-300",
      text: "text-violet-700",
    },
    {
      bg: "bg-fuchsia-500",
      light: "bg-fuchsia-100",
      border: "border-fuchsia-300",
      text: "text-fuchsia-700",
    },
    {
      bg: "bg-rose-500",
      light: "bg-rose-100",
      border: "border-rose-300",
      text: "text-rose-700",
    },
    {
      bg: "bg-slate-500",
      light: "bg-slate-100",
      border: "border-slate-300",
      text: "text-slate-700",
    },
    {
      bg: "bg-gray-500",
      light: "bg-gray-100",
      border: "border-gray-300",
      text: "text-gray-700",
    },
    {
      bg: "bg-zinc-500",
      light: "bg-zinc-100",
      border: "border-zinc-300",
      text: "text-zinc-700",
    },
    {
      bg: "bg-neutral-500",
      light: "bg-neutral-100",
      border: "border-neutral-300",
      text: "text-neutral-700",
    },
    {
      bg: "bg-stone-500",
      light: "bg-stone-100",
      border: "border-stone-300",
      text: "text-stone-700",
    },
  ];
  return colors[departmentId % colors.length];
};

/**
 * Return a human-friendly display name for a user object.
 * Preference order: fullName, nickName, username, email, then fallback '-'.
 */
export const getDisplayName = (user?: { fullName?: string | null; nickName?: string | null; username?: string | null; email?: string | null } | null): string => {
  if (!user) return "-";
  const v = (user.fullName || user.nickName || user.username || user.email || "").toString().trim();
  return v || "-";
};
