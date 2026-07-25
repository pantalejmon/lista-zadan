import { useState, useEffect, useCallback } from 'react';
import {
  type Settings,
  loadSettings,
  saveSettings,
  applySettings,
  isDarkTheme,
  THEME_TOGGLE,
} from '../lib/settings';

// Single source of truth for appearance (theme / accent / font size). Applies to
// the DOM and persists on every change; replaces the old useDark hook.
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    applySettings(settings);
    saveSettings(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleDark = useCallback(() => {
    setSettings((prev) => ({ ...prev, theme: THEME_TOGGLE[prev.theme] }));
  }, []);

  // Replace local settings with the ones stored on the account (on login).
  const hydrate = useCallback((incoming: Settings) => {
    setSettings((prev) => ({ ...prev, ...incoming }));
  }, []);

  return { settings, update, toggleDark, hydrate, dark: isDarkTheme(settings.theme) };
}
