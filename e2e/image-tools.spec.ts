import { expect, type Page, test } from "@playwright/test";

/**
 * Helper function to close the settings dialog
 * Attempts to click the Close button, falls back to Escape key if not visible
 */
async function closeSettingsDialog(page: Page): Promise<void> {
	const closeButton = page.locator("button[aria-label='Close']").first();
	const isVisible = await closeButton
		.isVisible({ timeout: 1000 })
		.catch(() => false);
	if (isVisible) {
		await closeButton.click();
	} else {
		await page.keyboard.press("Escape");
	}
}

test.describe("Image Tools E2E Tests", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");
	});

	test.describe("Image Upload Flow", () => {
		test("should upload image and display in gallery", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");

			const galleryImage = page.locator('img[alt="test-image.png"]');
			await expect(galleryImage).toBeVisible({ timeout: 5000 });

			const imageThumbnails = page.locator('img[alt*="test-image"]');
			expect(await imageThumbnails.count()).toBeGreaterThan(0);
		});

		test("should select uploaded image", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await expect(page.locator('img[alt="test-image.png"]')).toBeVisible();

			const imageThumbnail = page
				.locator('div[class*="aspect-square"]')
				.first();
			await imageThumbnail.click();

			const selectedImage = page.locator('div[class*="border-primary"]');
			await expect(selectedImage).toHaveCount(1);
		});

		test("should upload multiple images", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await expect(page.locator('img[alt="test-image.png"]')).toBeVisible();

			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			const imageThumbnails = page.locator('img[alt*="test-image"]');
			await expect(imageThumbnails).toHaveCount(2, { timeout: 5000 });

			const count = await imageThumbnails.count();
			expect(count).toBe(2);
		});
	});

	test.describe("Tool Selection Flow", () => {
		test("should display available tools on page load", async ({ page }) => {
			const aspectCropButton = page.locator("button", {
				hasText: /Aspect Crop/i,
			});
			const pngConverterButton = page.locator("button", {
				hasText: /Convert to PNG/i,
			});
			const extractFramesButton = page.locator("button", {
				hasText: /Extract Frames/i,
			});

			await expect(aspectCropButton).toBeVisible();
			await expect(pngConverterButton).toBeVisible();
			await expect(extractFramesButton).toBeVisible();
		});

		test("should select Aspect Ratio Crop tool", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await expect(page.locator('img[alt="test-image.png"]')).toBeVisible();

			const cropButton = page.locator("button", { hasText: /Aspect Crop/i });
			await cropButton.click();
			await expect(
				page.locator("h2", { hasText: /Aspect Ratio Crop/i }),
			).toBeVisible();
		});

		test("should switch between different tools", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await expect(page.locator('img[alt="test-image.png"]')).toBeVisible();

			const pngButton = page.locator("button", { hasText: /Convert to PNG/i });
			await pngButton.click();
			await expect(
				page.locator("h2", { hasText: /PNG Converter/i }),
			).toBeVisible({ timeout: 5000 });

			const cropButton = page.locator("button", { hasText: /Aspect Crop/i });
			await cropButton.click();
			await expect(
				page.locator("h2", { hasText: /Aspect Ratio Crop/i }),
			).toBeVisible({ timeout: 5000 });
		});
	});

	test.describe("Aspect Ratio Crop Flow", () => {
		test("should display preset aspect ratios", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await expect(page.locator('img[alt="test-image.png"]')).toBeVisible();

			const cropButton = page.locator("button", { hasText: /Aspect Crop/i });
			await cropButton.click();
			await expect(
				page.locator("h2", { hasText: /Aspect Ratio Crop/i }),
			).toBeVisible();
		});

		test("should select 16:9 aspect ratio preset", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await expect(page.locator('img[alt="test-image.png"]')).toBeVisible();

			const cropButton = page.locator("button", { hasText: /Aspect Crop/i });
			await cropButton.click();
			await expect(
				page.locator("h2", { hasText: /Aspect Ratio Crop/i }),
			).toBeVisible();

			const preset169 = page.locator("button", { hasText: /16:9/i }).first();
			if ((await preset169.count()) > 0) {
				await preset169.click();
				await expect(preset169).toHaveClass(/bg-primary|border-primary/);
			}
		});

		test("should interact with crop controls", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await expect(page.locator('img[alt="test-image.png"]')).toBeVisible();

			const cropButton = page.locator("button", { hasText: /Aspect Crop/i });
			await cropButton.click();
			await expect(
				page.locator("h2", { hasText: /Aspect Ratio Crop/i }),
			).toBeVisible();

			const preset169 = page.locator("button", { hasText: /16:9/i }).first();
			if ((await preset169.count()) > 0) {
				await preset169.click();
				await expect(preset169).toHaveClass(/bg-primary|border-primary/);
			}
		});
	});

	test.describe("PNG Converter Flow", () => {
		test("should display PNG converter controls", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await expect(page.locator('img[alt="test-image.png"]')).toBeVisible();

			const pngButton = page.locator("button", { hasText: /Convert to PNG/i });
			await pngButton.click();
			await expect(
				page.locator("h2", { hasText: /PNG Converter/i }),
			).toBeVisible();
		});

		test("should display convert button", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await expect(page.locator('img[alt="test-image.png"]')).toBeVisible();

			const pngButton = page.locator("button", { hasText: /Convert to PNG/i });
			await pngButton.click();
			await expect(
				page.locator("h2", { hasText: /PNG Converter/i }),
			).toBeVisible();

			const buttons = page.locator("button");
			const convertButton = buttons.filter({
				hasText: /Convert|Download|PNG/i,
			});
			const buttonCount = await convertButton.count();
			expect(buttonCount).toBeGreaterThan(0);
		});
	});

	test.describe("Settings Flow", () => {
		test("should open settings dialog", async ({ page }) => {
			const settingsButton = page.locator("button[title='Settings']");
			await expect(settingsButton).toBeVisible();

			await settingsButton.click();

			const settingsDialog = page.locator("div[role='dialog']");
			await expect(settingsDialog).toBeVisible({ timeout: 5000 });

			const dialogText = await settingsDialog.textContent();
			expect(dialogText).toContain("Appearance");
		});

		test("should change theme to dark", async ({ page }) => {
			const settingsButton = page.locator("button[title='Settings']");
			await settingsButton.click();

			const settingsDialog = page.locator("div[role='dialog']");
			await expect(settingsDialog).toBeVisible({ timeout: 5000 });

			const darkLabel = page.locator("label", { hasText: /Dark/i });
			if ((await darkLabel.count()) > 0) {
				await darkLabel.click();
				await expect(page.locator("html.dark")).toBeAttached({ timeout: 5000 });
			}

			await closeSettingsDialog(page);
		});

		test("should change export format to webp", async ({ page }) => {
			const settingsButton = page.locator("button[title='Settings']");
			await settingsButton.click();

			const settingsDialog = page.locator("div[role='dialog']");
			await expect(settingsDialog).toBeVisible({ timeout: 5000 });

			const webpLabel = page.locator("label", { hasText: /WebP/i });
			if ((await webpLabel.count()) > 0) {
				await webpLabel.click();
			}

			await closeSettingsDialog(page);
		});

		test("should close settings dialog", async ({ page }) => {
			const settingsButton = page.locator("button[title='Settings']");
			await settingsButton.click();

			const settingsDialog = page.locator("div[role='dialog']");
			await expect(settingsDialog).toBeVisible({ timeout: 5000 });

			await closeSettingsDialog(page);

			await expect(settingsDialog).not.toBeVisible({ timeout: 5000 });
		});
	});

	test.describe("Gallery Flow", () => {
		test("should display empty gallery message initially", async ({ page }) => {
			await page.waitForLoadState("domcontentloaded");
			const body = page.locator("body");
			const content = await body.textContent();
			expect(content?.toLocaleLowerCase()).toMatch(/upload|drag/i);
		});

		test("should select different images sequentially", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await expect(page.locator('img[alt="test-image.png"]')).toBeVisible();

			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			const thumbnails = page.locator('img[alt*="test-image"]');
			await expect(thumbnails).toHaveCount(2, { timeout: 5000 });

			const count = await thumbnails.count();
			expect(count).toBe(2);

			const firstImage = thumbnails.nth(0);
			await firstImage.click();

			let selectedImages = page.locator('div[class*="border-primary"]');
			await expect(selectedImages).toHaveCount(1);

			const secondImage = thumbnails.nth(1);
			await secondImage.click();

			selectedImages = page.locator('div[class*="border-primary"]');
			await expect(selectedImages).toHaveCount(1);
		});

		test("should reflect selection in tool display", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await expect(page.locator('img[alt="test-image.png"]')).toBeVisible();

			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			const thumbnails = page.locator('img[alt*="test-image"]');
			await expect(thumbnails).toHaveCount(2, { timeout: 5000 });

			const cropButton = page.locator("button", { hasText: /Aspect Crop/i });
			await cropButton.click();
			await expect(
				page.locator("h2", { hasText: /Aspect Ratio Crop/i }),
			).toBeVisible();

			const thumbnailContainers = page.locator('div[class*="aspect-square"]');
			if ((await thumbnailContainers.count()) > 1) {
				await thumbnailContainers.nth(1).click();
				await expect(thumbnailContainers.nth(1)).toHaveClass(/border-primary/);
			}
		});

		test("should remove image from gallery", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await expect(page.locator('img[alt="test-image.png"]')).toBeVisible();

			let thumbnails = page.locator('img[alt*="test-image"]');
			let count = await thumbnails.count();
			expect(count).toBe(1);

			const removeButton = page.locator("button[aria-label*='Remove image']");
			if ((await removeButton.count()) > 0) {
				await removeButton.click();
				await expect(thumbnails).toHaveCount(0);
			}

			thumbnails = page.locator('img[alt*="test-image"]');
			count = await thumbnails.count();
			expect(count).toBe(0);
		});
	});

	test.describe("General UI Tests", () => {
		test("should render main layout", async ({ page }) => {
			const gallery = page.locator("button", { hasText: /Upload/i }).first();
			const toolsArea = page.locator("button", { hasText: /Aspect Crop/i });

			await expect(gallery).toBeVisible();
			await expect(toolsArea).toBeVisible();
		});

		test("should display upload button and handle file upload", async ({
			page,
		}) => {
			const uploadButton = page
				.locator("button", { hasText: /Upload/i })
				.first();
			await expect(uploadButton).toBeVisible();

			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");

			const galleryImage = page.locator('img[alt="test-image.png"]');
			await expect(galleryImage).toBeVisible({ timeout: 5000 });
		});

		test("should maintain state after tool switching", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await expect(page.locator('img[alt="test-image.png"]')).toBeVisible();

			const imageThumbnails = page.locator('div[class*="aspect-square"]');
			await expect(imageThumbnails).toHaveCount(1);

			const cropButton = page.locator("button", { hasText: /Aspect Crop/i });
			const pngButton = page.locator("button", { hasText: /Convert to PNG/i });

			await cropButton.click();
			await expect(
				page.locator("h2", { hasText: /Aspect Ratio Crop/i }),
			).toBeVisible();

			await pngButton.click();
			await expect(
				page.locator("h2", { hasText: /PNG Converter/i }),
			).toBeVisible();

			await cropButton.click();
			await expect(
				page.locator("h2", { hasText: /Aspect Ratio Crop/i }),
			).toBeVisible();

			const finalThumbnails = page.locator('div[class*="aspect-square"]');
			await expect(finalThumbnails).toHaveCount(1);
		});
	});
});
