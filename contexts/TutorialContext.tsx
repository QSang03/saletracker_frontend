"use client";
import React, { createContext, useContext, useState } from 'react';

interface TutorialContextType {
  isTutorialActive: boolean;
  setIsTutorialActive: (active: boolean) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isTutorialActive, setIsTutorialActive] = useState(false);

  return (
    <TutorialContext.Provider value={{ isTutorialActive, setIsTutorialActive }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
