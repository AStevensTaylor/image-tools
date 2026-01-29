/**
 * Test setup file for Bun tests
 * Configures happy-dom for browser-like environment and sets up mocks
 */
import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { cleanup } from "@testing-library/react";

GlobalRegistrator.register();

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

class MockCanvasRenderingContext2D {
	drawImage() {
		return undefined;
	}
	fillRect() {
		return undefined;
	}
	clearRect() {
		return undefined;
	}
	getImageData() {
		return { data: new Uint8ClampedArray(4) };
	}
	putImageData() {
		return undefined;
	}
	createImageData() {
		return { data: new Uint8ClampedArray(4) };
	}
	setTransform() {
		return undefined;
	}
	fillText() {
		return undefined;
	}
	strokeText() {
		return undefined;
	}
	beginPath() {
		return undefined;
	}
	moveTo() {
		return undefined;
	}
	lineTo() {
		return undefined;
	}
	closePath() {
		return undefined;
	}
	stroke() {
		return undefined;
	}
	fill() {
		return undefined;
	}
	arc() {
		return undefined;
	}
	rect() {
		return undefined;
	}
	save() {
		return undefined;
	}
	restore() {
		return undefined;
	}
	scale() {
		return undefined;
	}
	rotate() {
		return undefined;
	}
	translate() {
		return undefined;
	}
}

class MockCanvas {
	width = 100;
	height = 100;

	getContext(contextType: string) {
		if (contextType === "2d") {
			return new MockCanvasRenderingContext2D() as any;
		}
		return null;
	}

	toDataURL(type?: string) {
		return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
	}

	toBlob() {
		return undefined;
	}
}

const originalCreateElement = document.createElement;
document.createElement = function (tagName: string, ...args: any[]) {
	if (tagName.toLowerCase() === "canvas") {
		return new MockCanvas() as any;
	}
	return originalCreateElement.call(document, tagName, ...args) as any;
};
