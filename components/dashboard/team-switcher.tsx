"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string;
    logo: React.ElementType;
    plan: string;
  }[];
}) {
  const [activeTeam] = React.useState(teams[0]);

  if (!activeTeam) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-2 px-3 py-2">
          <motion.span
            className="font-black bg-gradient-to-r from-pink-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent leading-tight"
            style={{
              fontSize: "1.5rem",
              backgroundSize: "200% auto",
            }}
            animate={{
              backgroundPosition: ["0% center", "100% center"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          >
            SaleTracker v2.0
          </motion.span>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
