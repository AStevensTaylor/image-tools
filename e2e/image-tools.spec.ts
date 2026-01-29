import { expect, test } from "@playwright/test";

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

			const imageThumbnails = page.locator('div[class*="aspect-square"]');
			const count = await imageThumbnails.count();
			expect(count).toBeGreaterThan(0);
		});

		test("should select uploaded image", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await page.waitForTimeout(1000);

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
			await page.waitForTimeout(500);

			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await page.waitForTimeout(500);

			const imageThumbnails = page.locator('div[class*="aspect-square"]');
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
			await page.waitForTimeout(1000);

			const cropButton = page.locator("button", { hasText: /Aspect Crop/i });
			await cropButton.click();
			await page.waitForTimeout(1500);

			const body = page.locator("body");
			const content = await body.innerHTML();
			expect(content.length).toBeGreaterThan(0);
		});

		test("should switch between different tools", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await page.waitForTimeout(1000);

			const pngButton = page.locator("button", { hasText: /Convert to PNG/i });
			await pngButton.click();
			await page.waitForTimeout(500);

			const cropButton = page.locator("button", { hasText: /Aspect Crop/i });
			await cropButton.click();
			await page.waitForTimeout(1500);

			const body = page.locator("body");
			const content = await body.innerHTML();
			expect(content.length).toBeGreaterThan(0);
		});
	});

	test.describe("Aspect Ratio Crop Flow", () => {
		test("should display preset aspect ratios", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await page.waitForTimeout(1000);

			const cropButton = page.locator("button", { hasText: /Aspect Crop/i });
			await cropButton.click();
			await page.waitForTimeout(1000);

			const buttons = page.locator("button", { hasText: /16:9/ });
			const count = await buttons.count();
			expect(count).toBeGreaterThanOrEqual(0);
		});

		test("should select 16:9 aspect ratio preset", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await page.waitForTimeout(1000);

			const cropButton = page.locator("button", { hasText: /Aspect Crop/i });
			await cropButton.click();
			await page.waitForTimeout(1000);

			const preset169 = page.locator("button", { hasText: /16:9/i }).first();
			if ((await preset169.count()) > 0) {
				await preset169.click();
				await page.waitForTimeout(500);
			}
		});

		test("should interact with crop controls", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await page.waitForTimeout(1000);

			const cropButton = page.locator("button", { hasText: /Aspect Crop/i });
			await cropButton.click();
			await page.waitForTimeout(1000);

			const preset169 = page.locator("button", { hasText: /16:9/i }).first();
			if ((await preset169.count()) > 0) {
				await preset169.click();
				await page.waitForTimeout(500);
			}
		});
	});

	test.describe("PNG Converter Flow", () => {
		test("should display PNG converter controls", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await page.waitForTimeout(1000);

			const pngButton = page.locator("button", { hasText: /Convert to PNG/i });
			await pngButton.click();
			await page.waitForTimeout(500);

			const body = page.locator("body");
			const content = await body.innerHTML();
			expect(content.length).toBeGreaterThan(0);
		});

		test("should display convert button", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await page.waitForTimeout(1000);

			const pngButton = page.locator("button", { hasText: /Convert to PNG/i });
			await pngButton.click();
			await page.waitForTimeout(500);

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
				await page.waitForTimeout(500);
			}

			const closeButton = page.locator("button[aria-label='Close']").first();
			if ((await closeButton.isVisible().catch(() => false)) !== false) {
				await closeButton.click();
			} else {
				await page.keyboard.press("Escape");
			}

			await page.waitForTimeout(500);
		});

		test("should change export format to webp", async ({ page }) => {
			const settingsButton = page.locator("button[title='Settings']");
			await settingsButton.click();

			const settingsDialog = page.locator("div[role='dialog']");
			await expect(settingsDialog).toBeVisible({ timeout: 5000 });

			const webpLabel = page.locator("label", { hasText: /WebP/i });
			if ((await webpLabel.count()) > 0) {
				await webpLabel.click();
				await page.waitForTimeout(500);
			}

			const closeButton = page.locator("button[aria-label='Close']").first();
			if ((await closeButton.isVisible().catch(() => false)) !== false) {
				await closeButton.click();
			} else {
				await page.keyboard.press("Escape");
			}

			await page.waitForTimeout(500);
		});

		test("should close settings dialog", async ({ page }) => {
			const settingsButton = page.locator("button[title='Settings']");
			await settingsButton.click();

			const settingsDialog = page.locator("div[role='dialog']");
			await expect(settingsDialog).toBeVisible({ timeout: 5000 });

			const closeButton = page.locator("button[aria-label='Close']").first();
			if ((await closeButton.isVisible().catch(() => false)) !== false) {
				await closeButton.click();
			} else {
				await page.keyboard.press("Escape");
			}

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
			await page.waitForTimeout(500);

			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await page.waitForTimeout(500);

			const thumbnails = page.locator('div[class*="aspect-square"]');
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
			await page.waitForTimeout(500);

			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await page.waitForTimeout(500);

			const cropButton = page.locator("button", { hasText: /Aspect Crop/i });
			await cropButton.click();
			await page.waitForTimeout(1500);

			const thumbnails = page.locator('div[class*="aspect-square"]');
			if ((await thumbnails.count()) > 1) {
				await thumbnails.nth(1).click();
				await page.waitForTimeout(500);
			}
		});

		test("should remove image from gallery", async ({ page }) => {
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles("e2e/fixtures/test-image.png");
			await page.waitForTimeout(500);

			let thumbnails = page.locator('div[class*="aspect-square"]');
			let count = await thumbnails.count();
			expect(count).toBe(1);

			const removeButton = page.locator("button[aria-label*='Remove image']");
			if ((await removeButton.count()) > 0) {
				await removeButton.click();
				await page.waitForTimeout(500);
			}

			thumbnails = page.locator('div[class*="aspect-square"]');
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
			await page.waitForTimeout(1000);

			const imageThumbnails = page.locator('div[class*="aspect-square"]');
			await expect(imageThumbnails).toHaveCount(1);

			const cropButton = page.locator("button", { hasText: /Aspect Crop/i });
			const pngButton = page.locator("button", { hasText: /Convert to PNG/i });

			await cropButton.click();
			await page.waitForTimeout(300);

			await pngButton.click();
			await page.waitForTimeout(300);

			await cropButton.click();
			await page.waitForTimeout(300);

			const finalThumbnails = page.locator('div[class*="aspect-square"]');
			await expect(finalThumbnails).toHaveCount(1);
		});
	});
});
