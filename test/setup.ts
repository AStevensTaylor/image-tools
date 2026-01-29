/**
 * Test setup file for Bun tests
 * Configures happy-dom for browser-like environment and sets up mocks
 */
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";

GlobalRegistrator.register();

expect.extend(matchers);

afterEach(() => {
	cleanup();
});

class ResizeObserverMock {
	observe() {
		return undefined;
	}
	unobserve() {
		return undefined;
	}
	disconnect() {
		return undefined;
	}
}

global.ResizeObserver = ResizeObserverMock as any;

if (!global.window.matchMedia) {
	global.window.matchMedia = (query: string) => ({
		matches: query.includes("dark") ? false : true,
		media: query,
		onchange: null,
		addListener: () => undefined,
		removeListener: () => undefined,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
		dispatchEvent: () => true,
	});
}

(window as any).addGeneratedImage = (dataUrl: string, name?: string) => {
	return undefined;
};
