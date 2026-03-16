"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { HugeiconsIcon } from "@hugeicons/react";
import { ComputerIcon, Moon01Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const themes = [
  { key: "system", icon: ComputerIcon, label: "Sistema" },
  { key: "light",  icon: Sun01Icon,    label: "Claro"   },
  { key: "dark",   icon: Moon01Icon,   label: "Escuro"  },
] as const;

export type ThemeSwitcherProps = {
  value?: "light" | "dark" | "system";
  onChange?: (theme: "light" | "dark" | "system") => void;
  defaultValue?: "light" | "dark" | "system";
  className?: string;
};

export const ThemeSwitcher = ({
  value,
  onChange,
  defaultValue = "system",
  className,
}: ThemeSwitcherProps) => {
  const [theme, setTheme] = useControllableState({
    defaultProp: defaultValue,
    prop: value,
    onChange,
  });
  const [mounted, setMounted] = useState(false);

  const handleThemeClick = useCallback(
    (themeKey: "light" | "dark" | "system") => {
      setTheme(themeKey);
    },
    [setTheme]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative isolate flex h-8 rounded-full bg-background p-1 ring-1 ring-border",
        className
      )}
    >
      {themes.map(({ key, icon, label }) => {
        const isActive = theme === key;

        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <button
                aria-label={label}
                className="relative h-6 w-6 rounded-full"
                onClick={() => handleThemeClick(key)}
                type="button"
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-secondary"
                    layoutId="activeTheme"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}
                <HugeiconsIcon
                  icon={icon}
                  className={cn(
                    "relative z-10 m-auto h-4 w-4",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};
