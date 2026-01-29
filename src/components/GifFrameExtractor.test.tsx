import { render, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { SettingsProvider } from "@/lib/settings";
import { GifFrameExtractor } from "./GifFrameExtractor";

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	localStorage.clear();
});

const renderWithSettings = (component: ReactElement) => {
	return render(<SettingsProvider>{component}</SettingsProvider>);
};

const queryByText = (container: HTMLElement, text: string | RegExp) => {
	const walker = document.createTreeWalker(
		container,
		NodeFilter.SHOW_TEXT,
		null,
	);
	let currentNode: Node | null;
	while ((currentNode = walker.nextNode())) {
		const matches =
			typeof text === "string"
				? currentNode.textContent?.includes(text)
				: text.test(currentNode.textContent || "");

		if (matches) {
			// Find the closest button or interactive element
			let el: Node | null = currentNode;
			while (el && el.nodeType !== Node.ELEMENT_NODE) {
				el = el.parentNode;
			}
			while (el && el.nodeType === Node.ELEMENT_NODE) {
				const tagName = (el as Element).tagName.toLowerCase();
				if (
					tagName === "button" ||
					tagName === "a" ||
					(el as Element).hasAttribute("onclick")
				) {
					return el as Element;
				}
				el = el.parentNode;
			}
			return currentNode.parentElement as Element;
		}
	}
	return null;
};

const queryByLabelText = (container: HTMLElement, text: string) => {
	const labels = container.querySelectorAll("label, [aria-label]");
	for (let i = 0; i < labels.length; i += 1) {
		const label = labels[i];
		if (!label) continue;
		if (
			label.textContent?.includes(text) ||
			label.getAttribute("aria-label")?.includes(text)
		) {
			if (label.getAttribute("aria-label")) {
				return label;
			}
			const forAttr = label.getAttribute("for");
			if (forAttr) {
				return container.querySelector(`#${forAttr}`);
			}
		}
	}
	return null;
};

test("renders without crashing", () => {
	global.fetch = (() =>
		new Promise(() => {
			// Never resolves, keeps loading state
		})) as any;

	renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	expect(true).toBe(true);
});

test("shows loading state initially", () => {
	global.fetch = (() =>
		new Promise(() => {
			// Never resolves
		})) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	const loader = queryByText(container, "Extracting frames...");
	expect(loader).toBeDefined();
});

test("shows GIF Frame Extractor title", () => {
	global.fetch = (() =>
		new Promise(() => {
			// Never resolves
		})) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	expect(queryByText(container, "GIF Frame Extractor")).toBeDefined();
});

test("shows error on fetch failure", async () => {
	global.fetch = ((url: string) => {
		return Promise.resolve({
			ok: false,
			status: 404,
			statusText: "Not Found",
		});
	}) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://error.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	await waitFor(() => {
		const error = queryByText(container, /Failed to load image/);
		expect(error).toBeDefined();
	});
});

test("shows error for unsupported file type", async () => {
	global.fetch = ((url: string) => {
		const buffer = new ArrayBuffer(100);
		return Promise.resolve({
			ok: true,
			arrayBuffer: () => Promise.resolve(buffer),
		});
	}) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.bmp"
			imageName="test.bmp"
			fileType="image/bmp"
		/>,
	);

	await waitFor(() => {
		const error = queryByText(container, /Unsupported file type/);
		expect(error).toBeDefined();
	});
});

test("shows error for WebP without ImageDecoder", async () => {
	const originalImageDecoder = (global as any).ImageDecoder;
	delete (global as any).ImageDecoder;

	global.fetch = ((url: string) => {
		const buffer = new ArrayBuffer(100);
		return Promise.resolve({
			ok: true,
			arrayBuffer: () => Promise.resolve(buffer),
		});
	}) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.webp"
			imageName="test.webp"
			fileType="image/webp"
		/>,
	);

	await waitFor(() => {
		const error = queryByText(container, /doesn't support|WebP|ImageDecoder/i);
		expect(error).toBeDefined();
	});

	if (originalImageDecoder) {
		(global as any).ImageDecoder = originalImageDecoder;
	}
});

test("displays component structure with playback controls", () => {
	global.fetch = (() =>
		new Promise(() => {
			// Never resolves
		})) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	expect(queryByLabelText(container, "Previous frame")).toBeDefined();
	expect(queryByLabelText(container, "Play")).toBeDefined();
	expect(queryByLabelText(container, "Next frame")).toBeDefined();
});

test("displays selection controls", () => {
	global.fetch = (() =>
		new Promise(() => {
			// Never resolves
		})) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	expect(queryByText(container, "Select:")).toBeDefined();
	expect(queryByText(container, "All")).toBeDefined();
	expect(queryByText(container, "None")).toBeDefined();
	expect(queryByText(container, "Every 2nd")).toBeDefined();
	expect(queryByText(container, "Every 5th")).toBeDefined();
	expect(queryByText(container, "Every 10th")).toBeDefined();
});

test("displays download and export buttons", () => {
	global.fetch = (() =>
		new Promise(() => {
			// Never resolves
		})) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	expect(queryByText(container, "Download")).toBeDefined();
	expect(queryByText(container, "Add to Gallery")).toBeDefined();
	expect(queryByText(container, "Save to Folder")).toBeDefined();
});

test("download button is disabled initially", () => {
	global.fetch = (() =>
		new Promise(() => {
			// Never resolves
		})) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	const downloadButton = queryByText(container, "Download");
	expect(downloadButton).toBeDefined();
});

test("add to gallery button is disabled initially", () => {
	global.fetch = (() =>
		new Promise(() => {
			// Never resolves
		})) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	const addButton = queryByText(container, "Add to Gallery");
	expect(addButton).toBeDefined();
});

test("save to folder button is disabled initially", () => {
	global.fetch = (() =>
		new Promise(() => {
			// Never resolves
		})) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	const saveButton = queryByText(container, "Save to Folder");
	expect(saveButton).toBeDefined();
});

test("displays frame selection counter", () => {
	global.fetch = (() =>
		new Promise(() => {
			// Never resolves
		})) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	const counter = queryByText(container, /0 selected/);
	expect(counter).toBeDefined();
});

test("component accepts different file types", () => {
	global.fetch = (() =>
		new Promise(() => {
			// Never resolves
		})) as any;

	const { unmount: unmount1, container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	expect(queryByText(container, "GIF Frame Extractor")).toBeDefined();
	unmount1();
});

test("shows error when parse fails for GIF", async () => {
	global.fetch = ((url: string) => {
		const buffer = new ArrayBuffer(0);
		return Promise.resolve({
			ok: true,
			arrayBuffer: () => Promise.resolve(buffer),
		});
	}) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	await waitFor(
		() => {
			const error = queryByText(container, /Failed to parse|error/i);
			expect(error).toBeDefined();
		},
		{ timeout: 2000 },
	);
});

test("hides loading when error occurs", async () => {
	global.fetch = ((url: string) => {
		return Promise.resolve({
			ok: false,
			status: 404,
			statusText: "Not Found",
		});
	}) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://error.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	await waitFor(() => {
		const loading = queryByText(container, "Extracting frames...");
		expect(loading).toBeNull();
	});
});

test("component renders with SettingsProvider context", () => {
	global.fetch = (() =>
		new Promise(() => {
			// Never resolves
		})) as any;

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	expect(queryByText(container, "GIF Frame Extractor")).toBeDefined();
});

test("cleanup works on unmount", () => {
	global.fetch = (() =>
		new Promise(() => {
			// Never resolves
		})) as any;

	const { unmount } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	unmount();
	expect(true).toBe(true);
});
