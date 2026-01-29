import { afterEach, beforeEach, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	type ExportFormat,
	getExportExtension,
	getExportMimeType,
	SettingsProvider,
	type Theme,
	useSettings,
} from "./settings";

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
});

// Mock window.matchMedia
const mockMatchMedia = (matches: boolean) => {
	return {
		matches,
		media: "(prefers-color-scheme: dark)",
		onchange: null,
		addListener: () => {
			// No-op listener
		},
		removeListener: () => {
			// No-op listener
		},
		addEventListener: () => {
			// No-op listener
		},
		removeEventListener: () => {
			// No-op listener
		},
		dispatchEvent: () => true,
	};
};

beforeEach(() => {
	localStorage.clear();
	document.documentElement.className = "";
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: () => mockMatchMedia(false),
	});
});

afterEach(() => {
	localStorage.clear();
	document.documentElement.className = "";
});

// Test component that uses useSettings hook
function TestComponent() {
	const { settings, setTheme, setExportFormat, setExportQuality } =
		useSettings();
	return (
		<div>
			<div data-testid="theme">{settings.theme}</div>
			<div data-testid="export-format">{settings.exportFormat}</div>
			<div data-testid="export-quality">{settings.exportQuality}</div>
			<button onClick={() => setTheme("dark")} data-testid="btn-theme-dark">
				Set Dark Theme
			</button>
			<button onClick={() => setTheme("light")} data-testid="btn-theme-light">
				Set Light Theme
			</button>
			<button onClick={() => setTheme("system")} data-testid="btn-theme-system">
				Set System Theme
			</button>
			<button
				onClick={() => setExportFormat("webp")}
				data-testid="btn-format-webp"
			>
				Set WebP Format
			</button>
			<button
				onClick={() => setExportFormat("jpg")}
				data-testid="btn-format-jpg"
			>
				Set JPG Format
			</button>
			<button
				onClick={() => setExportQuality(0.5)}
				data-testid="btn-quality-half"
			>
				Set Quality 0.5
			</button>
			<button
				onClick={() => setExportQuality(1.5)}
				data-testid="btn-quality-over"
			>
				Set Quality 1.5
			</button>
		</div>
	);
}

// Test: SettingsProvider renders children
test("SettingsProvider renders children", () => {
	const { container } = render(
		<SettingsProvider>
			<div>Test Content</div>
		</SettingsProvider>,
	);

	expect(container.textContent?.includes("Test Content")).toBe(true);
});

// Test: useSettings throws error when used outside SettingsProvider
test("useSettings throws error when used outside SettingsProvider", () => {
	function ComponentWithoutProvider() {
		useSettings();
		return <div>Test</div>;
	}

	expect(() => {
		render(<ComponentWithoutProvider />);
	}).toThrow("useSettings must be used within a SettingsProvider");
});

// Test: SettingsProvider loads default settings on mount
test("SettingsProvider loads default settings on mount", () => {
	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const theme = container.querySelector('[data-testid="theme"]');
	const format = container.querySelector('[data-testid="export-format"]');
	const quality = container.querySelector('[data-testid="export-quality"]');

	expect(theme?.textContent).toBe("system");
	expect(format?.textContent).toBe("png");
	expect(quality?.textContent).toBe("0.95");
});

// Test: SettingsProvider loads settings from localStorage if available
test("SettingsProvider loads settings from localStorage", () => {
	const storedSettings = {
		theme: "dark" as const,
		exportFormat: "webp" as const,
		exportQuality: 0.8,
	};
	localStorage.setItem("image-tools-settings", JSON.stringify(storedSettings));

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const theme = container.querySelector('[data-testid="theme"]');
	const format = container.querySelector('[data-testid="export-format"]');
	const quality = container.querySelector('[data-testid="export-quality"]');

	expect(theme?.textContent).toBe("dark");
	expect(format?.textContent).toBe("webp");
	expect(quality?.textContent).toBe("0.8");
});

// Test: SettingsProvider merges partial localStorage with defaults
test("SettingsProvider merges partial settings with defaults", () => {
	const partialSettings = {
		theme: "light" as const,
	};
	localStorage.setItem("image-tools-settings", JSON.stringify(partialSettings));

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const theme = container.querySelector('[data-testid="theme"]');
	const format = container.querySelector('[data-testid="export-format"]');
	const quality = container.querySelector('[data-testid="export-quality"]');

	expect(theme?.textContent).toBe("light");
	expect(format?.textContent).toBe("png");
	expect(quality?.textContent).toBe("0.95");
});

// Test: SettingsProvider rejects invalid settings
test("SettingsProvider rejects invalid theme from localStorage", () => {
	const invalidSettings = {
		theme: "invalid-theme" as unknown,
		exportFormat: "png",
		exportQuality: 0.95,
	};
	localStorage.setItem("image-tools-settings", JSON.stringify(invalidSettings));

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const theme = container.querySelector('[data-testid="theme"]');
	expect(theme?.textContent).toBe("system");
});

// Test: SettingsProvider rejects invalid export format
test("SettingsProvider rejects invalid export format from localStorage", () => {
	const invalidSettings = {
		theme: "dark",
		exportFormat: "gif" as unknown,
		exportQuality: 0.95,
	};
	localStorage.setItem("image-tools-settings", JSON.stringify(invalidSettings));

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const format = container.querySelector('[data-testid="export-format"]');
	expect(format?.textContent).toBe("png");
});

// Test: SettingsProvider handles malformed JSON gracefully
test("SettingsProvider handles malformed JSON gracefully", () => {
	localStorage.setItem("image-tools-settings", "{invalid json");

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const theme = container.querySelector('[data-testid="theme"]');
	const format = container.querySelector('[data-testid="export-format"]');

	expect(theme?.textContent).toBe("system");
	expect(format?.textContent).toBe("png");
});

// Test: SettingsProvider clamps quality to [0, 1] range
test("SettingsProvider clamps quality to [0, 1] from localStorage", () => {
	const settingsWithInvalidQuality = {
		theme: "dark" as const,
		exportFormat: "png" as const,
		exportQuality: 1.5,
	};
	localStorage.setItem(
		"image-tools-settings",
		JSON.stringify(settingsWithInvalidQuality),
	);

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const quality = container.querySelector('[data-testid="export-quality"]');
	expect(quality?.textContent).toBe("1");
});

// Test: SettingsProvider applies theme to document
test("SettingsProvider applies light theme to document", () => {
	const storedSettings = {
		theme: "light" as const,
		exportFormat: "png" as const,
		exportQuality: 0.95,
	};
	localStorage.setItem("image-tools-settings", JSON.stringify(storedSettings));

	render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	expect(document.documentElement.classList.contains("dark")).toBe(false);
});

// Test: SettingsProvider applies dark theme to document
test("SettingsProvider applies dark theme to document", () => {
	const storedSettings = {
		theme: "dark" as const,
		exportFormat: "png" as const,
		exportQuality: 0.95,
	};
	localStorage.setItem("image-tools-settings", JSON.stringify(storedSettings));

	render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	expect(document.documentElement.classList.contains("dark")).toBe(true);
});

// Test: SettingsProvider applies system theme to document
test("SettingsProvider applies system theme (light) to document", () => {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: () => mockMatchMedia(false),
	});

	const storedSettings = {
		theme: "system" as const,
		exportFormat: "png" as const,
		exportQuality: 0.95,
	};
	localStorage.setItem("image-tools-settings", JSON.stringify(storedSettings));

	render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	expect(document.documentElement.classList.contains("dark")).toBe(false);
});

// Test: SettingsProvider applies system theme (dark) to document
test("SettingsProvider applies system theme (dark) to document", () => {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: () => mockMatchMedia(true),
	});

	const storedSettings = {
		theme: "system" as const,
		exportFormat: "png" as const,
		exportQuality: 0.95,
	};
	localStorage.setItem("image-tools-settings", JSON.stringify(storedSettings));

	render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	expect(document.documentElement.classList.contains("dark")).toBe(true);
});

// Test: setTheme updates state and localStorage
test("setTheme updates state and saves to localStorage", async () => {
	const user = userEvent.setup();

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const darkButton = container.querySelector(
		'[data-testid="btn-theme-dark"]',
	) as HTMLButtonElement;
	await user.click(darkButton);

	await waitFor(() => {
		const theme = container.querySelector('[data-testid="theme"]');
		expect(theme?.textContent).toBe("dark");
	});

	const stored = JSON.parse(
		localStorage.getItem("image-tools-settings") || "{}",
	);
	expect(stored.theme).toBe("dark");
});

// Test: setTheme applies theme to document
test("setTheme applies theme to document", async () => {
	const user = userEvent.setup();

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const darkButton = container.querySelector(
		'[data-testid="btn-theme-dark"]',
	) as HTMLButtonElement;
	await user.click(darkButton);

	await waitFor(() => {
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	const lightButton = container.querySelector(
		'[data-testid="btn-theme-light"]',
	) as HTMLButtonElement;
	await user.click(lightButton);

	await waitFor(() => {
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});
});

// Test: setExportFormat updates state and localStorage
test("setExportFormat updates state and saves to localStorage", async () => {
	const user = userEvent.setup();

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const webpButton = container.querySelector(
		'[data-testid="btn-format-webp"]',
	) as HTMLButtonElement;
	await user.click(webpButton);

	await waitFor(() => {
		const format = container.querySelector('[data-testid="export-format"]');
		expect(format?.textContent).toBe("webp");
	});

	const stored = JSON.parse(
		localStorage.getItem("image-tools-settings") || "{}",
	);
	expect(stored.exportFormat).toBe("webp");
});

// Test: setExportQuality updates state and localStorage
test("setExportQuality updates state and saves to localStorage", async () => {
	const user = userEvent.setup();

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const qualityButton = container.querySelector(
		'[data-testid="btn-quality-half"]',
	) as HTMLButtonElement;
	await user.click(qualityButton);

	await waitFor(() => {
		const quality = container.querySelector('[data-testid="export-quality"]');
		expect(quality?.textContent).toBe("0.5");
	});

	const stored = JSON.parse(
		localStorage.getItem("image-tools-settings") || "{}",
	);
	expect(stored.exportQuality).toBe(0.5);
});

// Test: setExportQuality clamps to [0, 1] range
test("setExportQuality clamps values to [0, 1] range", async () => {
	const user = userEvent.setup();

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const overButton = container.querySelector(
		'[data-testid="btn-quality-over"]',
	) as HTMLButtonElement;
	await user.click(overButton);

	await waitFor(() => {
		const quality = container.querySelector('[data-testid="export-quality"]');
		expect(quality?.textContent).toBe("1");
	});

	const stored = JSON.parse(
		localStorage.getItem("image-tools-settings") || "{}",
	);
	expect(stored.exportQuality).toBe(1);
});

// Test: getExportMimeType returns correct MIME types
test("getExportMimeType returns correct MIME types", () => {
	expect(getExportMimeType("png")).toBe("image/png");
	expect(getExportMimeType("webp")).toBe("image/webp");
	expect(getExportMimeType("jpg")).toBe("image/jpeg");
});

// Test: getExportExtension returns correct extensions
test("getExportExtension returns correct extensions", () => {
	expect(getExportExtension("png")).toBe("png");
	expect(getExportExtension("webp")).toBe("webp");
	expect(getExportExtension("jpg")).toBe("jpg");
});

// Test: SettingsProvider persists updates across components
test("Settings persist across component updates", async () => {
	const user = userEvent.setup();

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const darkButton = container.querySelector(
		'[data-testid="btn-theme-dark"]',
	) as HTMLButtonElement;
	await user.click(darkButton);

	await waitFor(() => {
		const theme = container.querySelector('[data-testid="theme"]');
		expect(theme?.textContent).toBe("dark");
	});

	const webpButton = container.querySelector(
		'[data-testid="btn-format-webp"]',
	) as HTMLButtonElement;
	await user.click(webpButton);

	await waitFor(() => {
		const format = container.querySelector('[data-testid="export-format"]');
		expect(format?.textContent).toBe("webp");
	});

	const qualityButton = container.querySelector(
		'[data-testid="btn-quality-half"]',
	) as HTMLButtonElement;
	await user.click(qualityButton);

	await waitFor(() => {
		const quality = container.querySelector('[data-testid="export-quality"]');
		expect(quality?.textContent).toBe("0.5");
	});

	const stored = JSON.parse(
		localStorage.getItem("image-tools-settings") || "{}",
	);
	expect(stored.theme).toBe("dark");
	expect(stored.exportFormat).toBe("webp");
	expect(stored.exportQuality).toBe(0.5);
});

// Test: SettingsProvider clamps negative quality values
test("setExportQuality clamps negative values to 0", async () => {
	function TestComponentWithNegativeQuality() {
		const { settings, setExportQuality } = useSettings();
		return (
			<div>
				<div data-testid="quality">{settings.exportQuality}</div>
				<button
					onClick={() => setExportQuality(-0.5)}
					data-testid="btn-negative-quality"
				>
					Set Negative Quality
				</button>
			</div>
		);
	}

	const user = userEvent.setup();

	const { container } = render(
		<SettingsProvider>
			<TestComponentWithNegativeQuality />
		</SettingsProvider>,
	);

	const negativeButton = container.querySelector(
		'[data-testid="btn-negative-quality"]',
	) as HTMLButtonElement;
	await user.click(negativeButton);

	await waitFor(() => {
		const quality = container.querySelector('[data-testid="quality"]');
		expect(quality?.textContent).toBe("0");
	});

	const stored = JSON.parse(
		localStorage.getItem("image-tools-settings") || "{}",
	);
	expect(stored.exportQuality).toBe(0);
});

// Test: SettingsProvider handles empty localStorage object
test("SettingsProvider handles empty JSON object from localStorage", () => {
	localStorage.setItem("image-tools-settings", "{}");

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const theme = container.querySelector('[data-testid="theme"]');
	const format = container.querySelector('[data-testid="export-format"]');
	const quality = container.querySelector('[data-testid="export-quality"]');

	expect(theme?.textContent).toBe("system");
	expect(format?.textContent).toBe("png");
	expect(quality?.textContent).toBe("0.95");
});

// Test: SettingsProvider handles null values in stored settings
test("SettingsProvider handles null values in localStorage", () => {
	const settingsWithNulls = {
		theme: null,
		exportFormat: null,
		exportQuality: null,
	};
	localStorage.setItem(
		"image-tools-settings",
		JSON.stringify(settingsWithNulls),
	);

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const theme = container.querySelector('[data-testid="theme"]');
	const format = container.querySelector('[data-testid="export-format"]');
	const quality = container.querySelector('[data-testid="export-quality"]');

	expect(theme?.textContent).toBe("system");
	expect(format?.textContent).toBe("png");
	expect(quality?.textContent).toBe("0.95");
});

// Test: SettingsProvider handles non-numeric quality
test("SettingsProvider rejects non-numeric quality from localStorage", () => {
	const settingsWithInvalidQuality = {
		theme: "dark",
		exportFormat: "png",
		exportQuality: "not-a-number" as unknown,
	};
	localStorage.setItem(
		"image-tools-settings",
		JSON.stringify(settingsWithInvalidQuality),
	);

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const quality = container.querySelector('[data-testid="export-quality"]');
	expect(quality?.textContent).toBe("0.95");
});

// Test: Multiple settings updates in sequence
test("Multiple rapid settings updates work correctly", async () => {
	const user = userEvent.setup();

	const { container } = render(
		<SettingsProvider>
			<TestComponent />
		</SettingsProvider>,
	);

	const darkButton = container.querySelector(
		'[data-testid="btn-theme-dark"]',
	) as HTMLButtonElement;
	const webpButton = container.querySelector(
		'[data-testid="btn-format-webp"]',
	) as HTMLButtonElement;

	await user.click(darkButton);
	await user.click(webpButton);

	await waitFor(() => {
		const theme = container.querySelector('[data-testid="theme"]');
		const format = container.querySelector('[data-testid="export-format"]');
		expect(theme?.textContent).toBe("dark");
		expect(format?.textContent).toBe("webp");
	});

	const stored = JSON.parse(
		localStorage.getItem("image-tools-settings") || "{}",
	);
	expect(stored.theme).toBe("dark");
	expect(stored.exportFormat).toBe("webp");
});
