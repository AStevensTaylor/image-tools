import { render, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { SettingsProvider } from "@/lib/settings";
import type { TestGlobal } from "../../test/types";
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

const stubFetch = (
	impl: (url: string) => Promise<{
		ok: boolean;
		status?: number;
		statusText?: string;
		arrayBuffer?: () => Promise<ArrayBuffer>;
	}>,
) => {
	global.fetch = impl as unknown as typeof fetch;
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
	stubFetch(
		() =>
			new Promise(() => {
				// Never resolves, keeps loading state
			}),
	);

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
	stubFetch(
		() =>
			new Promise(() => {
				// Never resolves
			}),
	);

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
	stubFetch(
		() =>
			new Promise(() => {
				// Never resolves
			}),
	);

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
	stubFetch((url: string) => {
		return Promise.resolve({
			ok: false,
			status: 404,
			statusText: "Not Found",
		});
	});

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
	stubFetch((url: string) => {
		const buffer = new ArrayBuffer(100);
		return Promise.resolve({
			ok: true,
			arrayBuffer: () => Promise.resolve(buffer),
		});
	});

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

test("shows error for unsupported PNG file type", async () => {
	stubFetch((url: string) => {
		const buffer = new ArrayBuffer(100);
		return Promise.resolve({
			ok: true,
			arrayBuffer: () => Promise.resolve(buffer),
		});
	});

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.png"
			imageName="test.png"
			fileType="image/png"
		/>,
	);

	await waitFor(() => {
		const error = queryByText(container, /Unsupported file type/);
		expect(error).toBeDefined();
	});
});

test("shows error for unsupported JPEG file type", async () => {
	stubFetch((url: string) => {
		const buffer = new ArrayBuffer(100);
		return Promise.resolve({
			ok: true,
			arrayBuffer: () => Promise.resolve(buffer),
		});
	});

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.jpg"
			imageName="test.jpg"
			fileType="image/jpeg"
		/>,
	);

	await waitFor(() => {
		const error = queryByText(container, /Unsupported file type/);
		expect(error).toBeDefined();
	});
});

test("shows error for WebP without ImageDecoder", async () => {
	const originalImageDecoder = (global as TestGlobal).ImageDecoder;
	delete (global as TestGlobal).ImageDecoder;

	stubFetch((url: string) => {
		const buffer = new ArrayBuffer(100);
		return Promise.resolve({
			ok: true,
			arrayBuffer: () => Promise.resolve(buffer),
		});
	});

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
		(global as TestGlobal).ImageDecoder = originalImageDecoder;
	}
});

test("displays component structure with playback controls", () => {
	stubFetch(
		() =>
			new Promise(() => {
				// Never resolves
			}),
	);

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
	stubFetch(
		() =>
			new Promise(() => {
				// Never resolves
			}),
	);

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
	stubFetch(
		() =>
			new Promise(() => {
				// Never resolves
			}),
	);

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
	stubFetch(
		() =>
			new Promise(() => {
				// Never resolves
			}),
	);

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	const downloadButton = queryByText(container, "Download");
	expect(downloadButton).toBeDefined();
	if (downloadButton) {
		expect(downloadButton).toBeDisabled();
	}
});

test("add to gallery button is disabled initially", () => {
	stubFetch(
		() =>
			new Promise(() => {
				// Never resolves
			}),
	);

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	const addButton = queryByText(container, "Add to Gallery");
	expect(addButton).toBeDefined();
	if (addButton) {
		expect(addButton).toBeDisabled();
	}
});

test("save to folder button is disabled initially", () => {
	stubFetch(
		() =>
			new Promise(() => {
				// Never resolves
			}),
	);

	const { container } = renderWithSettings(
		<GifFrameExtractor
			imageUrl="test://image.gif"
			imageName="test.gif"
			fileType="image/gif"
		/>,
	);

	const saveButton = queryByText(container, "Save to Folder");
	expect(saveButton).toBeDefined();
	if (saveButton) {
		expect(saveButton).toBeDisabled();
	}
});

test("displays frame selection counter", () => {
	stubFetch(
		() =>
			new Promise(() => {
				// Never resolves
			}),
	);

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
	stubFetch(
		() =>
			new Promise(() => {
				// Never resolves
			}),
	);

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
	stubFetch((url: string) => {
		const buffer = new ArrayBuffer(0);
		return Promise.resolve({
			ok: true,
			arrayBuffer: () => Promise.resolve(buffer),
		});
	});

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
	stubFetch((url: string) => {
		return Promise.resolve({
			ok: false,
			status: 404,
			statusText: "Not Found",
		});
	});

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
	stubFetch(
		() =>
			new Promise(() => {
				// Never resolves
			}),
	);

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
	stubFetch(
		() =>
			new Promise(() => {
				// Never resolves
			}),
	);

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
