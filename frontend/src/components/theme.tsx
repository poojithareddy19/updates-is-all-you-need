"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "theme";

/**
 * Runs in <head> before the first paint: applies the saved choice, or the system
 * setting when there is none, and follows system changes until the user picks.
 */
export const themeScript = `(function(){try{var d=document.documentElement,m=window.matchMedia("(prefers-color-scheme: dark)");function a(){var t=localStorage.getItem("${STORAGE_KEY}");var k=t==="dark"||(t!=="light"&&m.matches);d.classList.toggle("dark",k);d.style.colorScheme=k?"dark":"light"}a();m.addEventListener("change",a)}catch(e){}})()`;

/** Flips between light and dark and remembers the choice. The icon is swapped by CSS, so server and client markup match. */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const dark = !root.classList.contains("dark");
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    try {
      localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
    } catch {
      // Private mode or storage disabled: the switch still applies to this page.
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Switch between light and dark theme">
      <SunIcon aria-hidden className="hidden dark:block" />
      <MoonIcon aria-hidden className="dark:hidden" />
    </Button>
  );
}
