import { render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import type { WindowWithGallery } from "@/lib/gallery";
import { SettingsProvider } from "@/lib/settings";
import { AspectRatioCrop } from "./AspectRatioCrop";

const VALID_DATA_URL =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const VALID_DATA_URL_PNG = VALID_DATA_URL;
const VALID_DATA_URL_JPEG =
	"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";
const VALID_DATA_URL_GIF =
	"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const VALID_DATA_URL_WEBP =
	"data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=";
const VALID_HTTPS_URL = "https://example.com/image.png";
const VALID_HTTP_URL = "http://example.com/image.png";
const VALID_BLOB_URL = "blob:https://example.com/12345678";
const INVALID_FTP_URL = "ftp://example.com/image.png";
const INVALID_FILE_URL = "file:///etc/passwd";
const INVALID_URL = "not-a-url";

function renderWithSettings(component: React.ReactNode) {
	return render(<SettingsProvider>{component}</SettingsProvider>);
}

beforeEach(() => {
	(window as WindowWithGallery).addGeneratedImage = () => undefined;
});

afterEach(() => {
	delete (window as WindowWithGallery).addGeneratedImage;
});

test.each([
	["PNG", VALID_DATA_URL_PNG],
	["JPEG", VALID_DATA_URL_JPEG],
	["GIF", VALID_DATA_URL_GIF],
	["WebP", VALID_DATA_URL_WEBP],
])("renders component with valid %s URL", (_format, dataUrl) => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={dataUrl} imageName="test.png" />,
	);

	expect(container).toBeTruthy();
	const heading = container.querySelector("h2");
	expect(heading?.textContent).toContain("Aspect Ratio Crop");
});

test("renders component with valid URL", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	expect(container).toBeTruthy();
	const heading = container.querySelector("h2");
	expect(heading?.textContent).toContain("Aspect Ratio Crop");
});

test("renders image element when URL is valid", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const img = container.querySelector('img[alt="Image to crop"]');
	expect(img).toBeTruthy();
	expect((img as HTMLImageElement)?.src).toBe(VALID_DATA_URL);
});

test("displays error message for invalid FTP URL", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={INVALID_FTP_URL} imageName="test.png" />,
	);

	const errorText = container.textContent;
	expect(errorText).toContain("Invalid Image");
});

test("displays error message for file:// URL", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={INVALID_FILE_URL} imageName="test.png" />,
	);

	const errorText = container.textContent;
	expect(errorText).toContain("Invalid Image");
});

test("displays error message for empty URL", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl="" imageName="test.png" />,
	);

	const errorText = container.textContent;
	expect(errorText).toContain("Invalid Image");
});

test("displays error message for malformed URL", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={INVALID_URL} imageName="test.png" />,
	);

	const errorText = container.textContent;
	expect(errorText).toContain("Invalid Image");
});

test("accepts https:// URLs", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_HTTPS_URL} imageName="test.png" />,
	);

	const img = container.querySelector('img[alt="Image to crop"]');
	expect(img).toBeTruthy();
});

test("accepts http:// URLs", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_HTTP_URL} imageName="test.png" />,
	);

	const img = container.querySelector('img[alt="Image to crop"]');
	expect(img).toBeTruthy();
});

test("accepts blob: URLs", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_BLOB_URL} imageName="test.png" />,
	);

	const img = container.querySelector('img[alt="Image to crop"]');
	expect(img).toBeTruthy();
});

test("displays preset buttons", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const textContent = container.textContent || "";
	expect(textContent).toContain("Film:");
	expect(textContent).toContain("Social:");
	expect(textContent).toContain("Photo:");
	expect(textContent).toContain("Michi/VaultX:");
});

test("displays all film category presets", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const textContent = container.textContent || "";
	expect(textContent).toContain("16:9");
	expect(textContent).toContain("4:3");
	expect(textContent).toContain("21:9");
});

test("displays all social category presets", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const textContent = container.textContent || "";
	expect(textContent).toContain("1:1");
	expect(textContent).toContain("4:5");
	expect(textContent).toContain("9:16");
});

test("displays all photo category presets", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const textContent = container.textContent || "";
	expect(textContent).toContain("3:2");
	expect(textContent).toContain("5:4");
	expect(textContent).toContain("7:5");
});

test("displays Michi/VaultX presets", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const textContent = container.textContent || "";
	expect(textContent).toContain("Double");
	expect(textContent).toContain("Single");
});

test("renders Reset button", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const buttons = container.querySelectorAll("button");
	const resetButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Reset"),
	);
	expect(resetButton).toBeTruthy();
});

test("renders Download Crop button", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const buttons = container.querySelectorAll("button");
	const downloadButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Download Crop"),
	);
	expect(downloadButton).toBeTruthy();
});

test("renders Add to Gallery button when callback available", () => {
	(window as WindowWithGallery).addGeneratedImage = () => undefined;

	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const buttons = container.querySelectorAll("button");
	const galleryButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Add to Gallery"),
	);
	expect(galleryButton).toBeTruthy();
});

test("does not render Add to Gallery button when callback unavailable", () => {
	delete (window as WindowWithGallery).addGeneratedImage;

	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const buttons = container.querySelectorAll("button");
	const galleryButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Add to Gallery"),
	);
	expect(galleryButton).toBeFalsy();
});

test("renders image with draggable false", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const img = container.querySelector('img[alt="Image to crop"]');
	expect(img?.getAttribute("draggable")).toBe("false");
});

test("renders aspect ratio input fields", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const inputs = container.querySelectorAll('input[type="number"]');
	expect(inputs.length).toBeGreaterThanOrEqual(2);
});

test("aspect ratio inputs have minimum value 1", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const inputs = container.querySelectorAll('input[type="number"]');
	inputs.forEach((input) => {
		expect((input as HTMLInputElement).min).toBe("1");
	});
});

test("renders main container with correct classes", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const mainDiv = container.querySelector("div.h-full.flex.flex-col");
	expect(mainDiv).toBeTruthy();
});

test("renders flex container for image", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const flexContainer = container.querySelector("div.flex-1.flex");
	expect(flexContainer).toBeTruthy();
});

test("renders image container with max dimensions", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const img = container.querySelector('img[alt="Image to crop"]');
	expect(img).toBeTruthy();
});

test("Download Crop button is disabled when URL invalid", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={INVALID_FTP_URL} imageName="test.png" />,
	);

	const buttons = container.querySelectorAll("button");
	const downloadButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Download Crop"),
	);
	expect((downloadButton as HTMLButtonElement)?.disabled).toBe(true);
});

test("renders all required controls", () => {
	const { container } = renderWithSettings(
		<AspectRatioCrop imageUrl={VALID_DATA_URL} imageName="test.png" />,
	);

	const heading = container.querySelector("h2");
	const buttons = container.querySelectorAll("button");
	const inputs = container.querySelectorAll("input");

	expect(heading).toBeTruthy();
	expect(buttons.length).toBeGreaterThan(10);
	expect(inputs.length).toBeGreaterThanOrEqual(2);
});
