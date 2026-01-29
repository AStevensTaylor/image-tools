import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
export type ExportFormat = "png" | "webp" | "jpg";

interface Settings {
	theme: Theme;
	exportFormat: ExportFormat;
	exportQuality: number; // 0-1 for jpg/webp
}

interface SettingsContextType {
	settings: Settings;
	setTheme: (theme: Theme) => void;
	setExportFormat: (format: ExportFormat) => void;
	setExportQuality: (quality: number) => void;
}

const defaultSettings: Settings = {
	theme: "system",
	exportFormat: "png",
	exportQuality: 0.95,
};

const SettingsContext = createContext<SettingsContextType | undefined>(
	undefined,
);

const STORAGE_KEY = "image-tools-settings";

const VALID_THEMES: readonly Theme[] = ["light", "dark", "system"];
const VALID_EXPORT_FORMATS: readonly ExportFormat[] = ["png", "webp", "jpg"];

function validateSettings(parsed: unknown): Partial<Settings> {
	const validated: Partial<Settings> = {};

	if (
		parsed &&
		typeof parsed === "object" &&
		"theme" in parsed &&
		VALID_THEMES.includes(parsed.theme as Theme)
	) {
		validated.theme = parsed.theme as Theme;
	}

	if (
		parsed &&
		typeof parsed === "object" &&
		"exportFormat" in parsed &&
		VALID_EXPORT_FORMATS.includes(parsed.exportFormat as ExportFormat)
	) {
		validated.exportFormat = parsed.exportFormat as ExportFormat;
	}

	if (
		parsed &&
		typeof parsed === "object" &&
		"exportQuality" in parsed &&
		typeof parsed.exportQuality === "number"
	) {
		validated.exportQuality = Math.min(Math.max(parsed.exportQuality, 0), 1);
	}

	return validated;
}

function getStoredSettings(): Settings {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			const validated = validateSettings(parsed);
			return { ...defaultSettings, ...validated };
		}
	} catch (error) {
		console.error("Failed to load settings from localStorage:", error);
	}
	return defaultSettings;
}

function saveSettings(settings: Settings) {
	try {
		const validated = validateSettings(settings);
		const toSave = { ...defaultSettings, ...validated };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
	} catch (error) {
		console.error("Failed to save settings to localStorage:", error);
	}
}

function applyTheme(theme: Theme) {
	const root = document.documentElement;

	if (theme === "system") {
		const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
			.matches
			? "dark"
			: "light";
		root.classList.toggle("dark", systemTheme === "dark");
	} else {
		root.classList.toggle("dark", theme === "dark");
	}
}

export function SettingsProvider({ children }: { children: ReactNode }) {
	const [settings, setSettings] = useState<Settings>(getStoredSettings);

	// Apply theme on mount and when it changes
	useEffect(() => {
		applyTheme(settings.theme);
	}, [settings.theme]);

	// Listen for system theme changes when theme is "system"
	useEffect(() => {
		if (settings.theme !== "system") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => applyTheme("system");

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [settings.theme]);

	const setTheme = (theme: Theme) => {
		const newSettings = { ...settings, theme };
		setSettings(newSettings);
		saveSettings(newSettings);
	};

	const setExportFormat = (exportFormat: ExportFormat) => {
		const newSettings = { ...settings, exportFormat };
		setSettings(newSettings);
		saveSettings(newSettings);
	};

	const setExportQuality = (exportQuality: number) => {
		const newSettings = { ...settings, exportQuality };
		setSettings(newSettings);
		saveSettings(newSettings);
	};

	return (
		<SettingsContext.Provider
			value={{ settings, setTheme, setExportFormat, setExportQuality }}
		>
			{children}
		</SettingsContext.Provider>
	);
}

export function useSettings() {
	const context = useContext(SettingsContext);
	if (context === undefined) {
		throw new Error("useSettings must be used within a SettingsProvider");
	}
	return context;
}

// Utility to get the MIME type and extension from format
export function getExportMimeType(format: ExportFormat): string {
	switch (format) {
		case "png":
			return "image/png";
		case "webp":
			return "image/webp";
		case "jpg":
			return "image/jpeg";
	}
}

export function getExportExtension(format: ExportFormat): string {
	switch (format) {
		case "png":
			return "png";
		case "webp":
			return "webp";
		case "jpg":
			return "jpg";
	}
}
