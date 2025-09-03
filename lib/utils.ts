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
  ];
  return colors[departmentId % colors.length];
};
