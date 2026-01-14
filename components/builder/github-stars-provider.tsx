"use client";

import { createContext, type ReactNode, useContext } from "react";

const GitHubStarsContext = createContext<number | null>(null);

export interface GitHubStarsProviderProps {
  /** Child components that will have access to GitHub stars context */
  children: ReactNode;
  /** Number of GitHub stars or null if not available */
  stars: number | null;
}

export function GitHubStarsProvider({
  children,
  stars,
}: GitHubStarsProviderProps) {
  return (
    <GitHubStarsContext.Provider value={stars}>
      {children}
    </GitHubStarsContext.Provider>
  );
}

export function useGitHubStars() {
  return useContext(GitHubStarsContext);
}
