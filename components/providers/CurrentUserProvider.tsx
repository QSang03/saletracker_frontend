"use client";

import React, { useState } from "react";
import { CurrentUserContext } from "@/contexts/CurrentUserContext";
import type { User } from "@/types";

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  return (
    <CurrentUserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}
