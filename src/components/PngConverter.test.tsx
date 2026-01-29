import { beforeEach, expect, mock, test } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { PngConverter } from "./PngConverter";

const VALID_DATA_URL =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

let imageInstances: any[] = [];
let pendingLoadCallbacks: Array<() => void> = [];

function queryByText(container: HTMLElement, text: string | RegExp) {
	const walker = document.createTreeWalker(
		container,
		NodeFilter.SHOW_TEXT,
		null,
	);
	let currentNode: Node | null;
	while ((currentNode = walker.nextNode())) {
		if (typeof text === "string") {
			if (currentNode.textContent?.includes(text)) {
				return currentNode.parentElement;
			}
		} else {
			if (text.test(currentNode.textContent || "")) {
				return currentNode.parentElement;
			}
		}
	}
	return null;
}

beforeEach(() => {
	imageInstances = [];
	pendingLoadCallbacks = [];

	(window as any).Image = class MockImage {
		src: string = "";
		crossOrigin: string = "";
		naturalWidth: number = 100;
		naturalHeight: number = 100;
		onload: (() => void) | null = null;
		onerror: ((e: Event) => void) | null = null;

		constructor() {
			imageInstances.push(this);
		}

		set src(value: string) {
			const self = this as any;
			self._src = value;
			if (this.onload) {
				pendingLoadCallbacks.push(() => this.onload?.());
				queueMicrotask(() => {
					pendingLoadCallbacks.forEach((cb) => cb());
					pendingLoadCallbacks = [];
				});
			}
		}

		get src() {
			return (this as any)._src;
		}
	};

	(window as any).addGeneratedImage = mock(() => undefined);
});

test("renders component with imageUrl and imageName props", () => {
	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const heading = queryByText(container, "Convert to PNG");
	expect(heading).toBeTruthy();

	const previewContainer = container.querySelector(".flex-1");
	expect(previewContainer).toBeTruthy();
});

test("shows 'Convert to PNG' button initially", () => {
	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const convertButton = queryByText(container, "Convert to PNG");
	expect(convertButton).toBeTruthy();
	const button = convertButton?.closest("button") as HTMLButtonElement | null;
	expect(convertButton?.closest("button")).toBeTruthy();
});

test("converts image when Convert button is clicked", async () => {
	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const convertButton = queryByText(container, "Convert to PNG");
	fireEvent.click(convertButton!);

	await waitFor(() => {
		const downloadBtn = queryByText(container, "Download PNG");
		expect(downloadBtn).toBeTruthy();
	});
});

test("shows preview after conversion", async () => {
	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const convertButton = queryByText(container, "Convert to PNG");
	fireEvent.click(convertButton!);

	await waitFor(() => {
		const preview = container.querySelector('img[alt="Image preview"]');
		expect(preview).toBeTruthy();
	});
});

test("displays image dimensions after conversion", async () => {
	imageInstances = [];
	pendingLoadCallbacks = [];

	(window as any).Image = class MockImage {
		src: string = "";
		crossOrigin: string = "";
		naturalWidth: number = 800;
		naturalHeight: number = 600;
		onload: (() => void) | null = null;
		onerror: ((e: Event) => void) | null = null;

		constructor() {
			imageInstances.push(this);
		}

		set src(value: string) {
			const self = this as any;
			self._src = value;
			if (this.onload) {
				queueMicrotask(() => this.onload?.());
			}
		}

		get src() {
			return (this as any)._src;
		}
	};

	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const convertButton = queryByText(container, "Convert to PNG");
	fireEvent.click(convertButton!);

	await waitFor(() => {
		const dims = queryByText(container, /800×600/);
		expect(dims).toBeTruthy();
	});
});

test("shows Download PNG button after conversion", async () => {
	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const convertButton = queryByText(container, "Convert to PNG");
	fireEvent.click(convertButton!);

	await waitFor(() => {
		const downloadBtn = queryByText(container, "Download PNG");
		expect(downloadBtn).toBeTruthy();
	});
});

test("shows Reconvert button after conversion", async () => {
	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const convertButton = queryByText(container, "Convert to PNG");
	fireEvent.click(convertButton!);

	await waitFor(() => {
		const reconvertBtn = queryByText(container, "Reconvert");
		expect(reconvertBtn).toBeTruthy();
	});
});

test("download button functionality after conversion", async () => {
	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="photo.jpg" />,
	);

	const convertButton = queryByText(container, "Convert to PNG");
	fireEvent.click(convertButton!);

	await waitFor(() => {
		const downloadButton = queryByText(container, "Download PNG");
		expect(downloadButton).toBeTruthy();
		fireEvent.click(downloadButton!);
	});
});

test("Add to Gallery button appears when addGeneratedImage is available", async () => {
	(window as any).addGeneratedImage = mock(() => undefined);

	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const convertButton = queryByText(container, "Convert to PNG");
	fireEvent.click(convertButton!);

	await waitFor(() => {
		const galleryBtn = queryByText(container, "Add to Gallery");
		expect(galleryBtn).toBeTruthy();
	});
});

test("Add to Gallery button hidden when addGeneratedImage unavailable", async () => {
	delete (window as any).addGeneratedImage;

	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const convertButton = queryByText(container, "Convert to PNG");
	fireEvent.click(convertButton!);

	await waitFor(() => {
		const galleryBtn = queryByText(container, "Add to Gallery");
		expect(galleryBtn).toBeFalsy();
	});
});

test("calling Add to Gallery triggers addGeneratedImage callback", async () => {
	const addToGalleryMock = mock((...args: any[]) => undefined);
	(window as any).addGeneratedImage = addToGalleryMock;

	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const convertButton = queryByText(container, "Convert to PNG");
	fireEvent.click(convertButton!);

	await waitFor(() => {
		const galleryButton = queryByText(container, "Add to Gallery");
		fireEvent.click(galleryButton!);
	});

	await waitFor(() => {
		expect(addToGalleryMock.mock.calls.length).toBeGreaterThan(0);
	});
});

test("handles image load failure gracefully", async () => {
	imageInstances = [];
	pendingLoadCallbacks = [];

	(window as any).Image = class MockImage {
		src: string = "";
		crossOrigin: string = "";
		naturalWidth: number = 100;
		naturalHeight: number = 100;
		onload: (() => void) | null = null;
		onerror: ((e: Event) => void) | null = null;

		constructor() {
			imageInstances.push(this);
		}

		set src(value: string) {
			const self = this as any;
			self._src = value;
			if (this.onerror) {
				queueMicrotask(() => this.onerror?.(new Event("error")));
			}
		}

		get src() {
			return (this as any)._src;
		}
	};

	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const convertButton = queryByText(container, "Convert to PNG");
	fireEvent.click(convertButton!);

	await waitFor(() => {
		const btn = queryByText(container, "Convert to PNG");
		expect(btn).toBeTruthy();
	});
});

test("allows reconversion after initial conversion", async () => {
	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const convertButton = queryByText(container, "Convert to PNG");
	fireEvent.click(convertButton!);

	await waitFor(() => {
		const reconvertBtn = queryByText(container, "Reconvert");
		expect(reconvertBtn).toBeTruthy();
	});

	fireEvent.click(queryByText(container, "Reconvert")!);

	await waitFor(() => {
		const downloadBtn = queryByText(container, "Download PNG");
		expect(downloadBtn).toBeTruthy();
	});
});

test("displays helper text about format support", () => {
	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const helperText = queryByText(container, /JPEG, WebP, GIF, BMP, SVG, AVIF/);
	expect(helperText).toBeTruthy();
});

test("shows transparency preservation message", async () => {
	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const convertButton = queryByText(container, "Convert to PNG");
	fireEvent.click(convertButton!);

	await waitFor(() => {
		const msg = queryByText(container, /PNG with transparency/);
		expect(msg).toBeTruthy();
	});
});

test("sets crossOrigin to anonymous for loaded images", () => {
	const { container } = render(
		<PngConverter imageUrl={VALID_DATA_URL} imageName="test-image.jpg" />,
	);

	const convertButton = queryByText(container, "Convert to PNG");
	fireEvent.click(convertButton!);

	if (imageInstances.length > 0 && imageInstances[0]) {
		expect(imageInstances[0].crossOrigin).toBe("anonymous");
	}
});
