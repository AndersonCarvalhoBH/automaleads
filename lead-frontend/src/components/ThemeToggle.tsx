import React from "react";

type Theme = "dark" | "light";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  const label = theme === "dark" ? "Dark mode" : "Light mode";

  return (
    <button type="button" className="theme-toggle" onClick={onToggle}>
      <span className="theme-dot" />
      <span>{label}</span>
    </button>
  );
};
