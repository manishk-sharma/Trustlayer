import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("trustlayer_theme") || "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState("light");

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("trustlayer_theme", newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      let next;
      if (current === "light") {
        next = "dark";
      } else if (current === "dark") {
        next = "system";
      } else {
        next = "light";
      }
      localStorage.setItem("trustlayer_theme", next);
      return next;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      const active = theme === "system"
        ? (mediaQuery.matches ? "dark" : "light")
        : theme;
      
      setResolvedTheme(active);

      if (active === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    updateTheme();

    if (theme === "system") {
      mediaQuery.addEventListener("change", updateTheme);
      return () => mediaQuery.removeEventListener("change", updateTheme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
