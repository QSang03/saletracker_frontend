import { createContext, useContext } from "react";
import type { User } from "@/types";

export type CurrentUserContextType = {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
};

export const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined);

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser must be used within CurrentUserContext.Provider");
  return ctx;
}
