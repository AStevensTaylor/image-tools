import { jsPDF } from "jspdf";
import {
	ChevronLeft,
	ChevronRight,
	Download,
	Printer,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface PrintLayoutProps {
	images: Array<{ id: string; url: string; file: File }>;
}

interface PageSize {
	id: string;
	name: string;
	width: number; // in mm
	height: number; // in mm
}

interface PrintImage {
	id: string;
	sourceId: string;
	url: string;
	width: number; // in mm
	height: number; // in mm
	naturalWidth: number;
	naturalHeight: number;
}

interface PackedImage {
	image: PrintImage;
	x: number; // in mm
	y: number; // in mm
	rotated: boolean; // true if image was rotated 90 degrees
}

interface Page {
	images: PackedImage[];
}

interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

const PAGE_SIZES: PageSize[] = [
	{ id: "a4", name: "A4", width: 210, height: 297 },
	{ id: "a3", name: "A3", width: 297, height: 420 },
	{ id: "letter", name: "Letter", width: 215.9, height: 279.4 },
	{ id: "legal", name: "Legal", width: 215.9, height: 355.6 },
	{ id: "a5", name: "A5", width: 148, height: 210 },
	{ id: "custom", name: "Custom", width: 210, height: 297 },
];

const DEFAULT_PAGE_MARGIN = 10; // mm
const DEFAULT_IMAGE_MARGIN = 5; // mm
const CUT_MARKER_LENGTH = 5; // mm
const MM_TO_PX = 3.7795275591; // 1mm = ~3.78px at 96 DPI

// MaxRects bin packing algorithm with rotation support
// Based on the "Best Short Side Fit" heuristic
class MaxRectsPacker {
	private freeRects: Rect[] = [];

	constructor(pageWidth: number, pageHeight: number) {
		this.freeRects = [{ x: 0, y: 0, width: pageWidth, height: pageHeight }];
	}

	// Find best position for a rectangle, trying both orientations
	findPosition(
		width: number,
		height: number,
	): { x: number; y: number; rotated: boolean } | null {
		let bestScore = Infinity;
		let bestRect: { x: number; y: number; rotated: boolean } | null = null;

		for (const rect of this.freeRects) {
			// Try normal orientation
			if (width <= rect.width && height <= rect.height) {
				const score = Math.min(rect.width - width, rect.height - height);
				if (score < bestScore) {
					bestScore = score;
					bestRect = { x: rect.x, y: rect.y, rotated: false };
				}
			}

			// Try rotated orientation (90 degrees)
			if (height <= rect.width && width <= rect.height) {
				const score = Math.min(rect.width - height, rect.height - width);
				if (score < bestScore) {
					bestScore = score;
					bestRect = { x: rect.x, y: rect.y, rotated: true };
				}
			}
		}

		return bestRect;
	}

	// Place a rectangle and update free space
	place(x: number, y: number, width: number, height: number): void {
		const placedRect = { x, y, width, height };
		const newFreeRects: Rect[] = [];

		for (const freeRect of this.freeRects) {
			// Check if placed rect overlaps with this free rect
			if (!this.intersects(placedRect, freeRect)) {
				newFreeRects.push(freeRect);
				continue;
			}

			// Split the free rect around the placed rect
			// Left portion
			if (placedRect.x > freeRect.x) {
				newFreeRects.push({
					x: freeRect.x,
					y: freeRect.y,
					width: placedRect.x - freeRect.x,
					height: freeRect.height,
				} as Rect);
			}

			// Right portion
			if (placedRect.x + placedRect.width < freeRect.x + freeRect.width) {
				newFreeRects.push({
					x: placedRect.x + placedRect.width,
					y: freeRect.y,
					width:
						freeRect.x + freeRect.width - (placedRect.x + placedRect.width),
					height: freeRect.height,
				} as Rect);
			}

			// Top portion
			if (placedRect.y > freeRect.y) {
				newFreeRects.push({
					x: freeRect.x,
					y: freeRect.y,
					width: freeRect.width,
					height: placedRect.y - freeRect.y,
				} as Rect);
			}

			// Bottom portion
			if (placedRect.y + placedRect.height < freeRect.y + freeRect.height) {
				newFreeRects.push({
					x: freeRect.x,
					y: placedRect.y + placedRect.height,
					width: freeRect.width,
					height:
						freeRect.y + freeRect.height - (placedRect.y + placedRect.height),
				} as Rect);
			}
		}

		// Remove redundant rectangles (those fully contained in another)
		this.freeRects = this.pruneRects(newFreeRects);
	}

	private intersects(a: Rect, b: Rect): boolean {
		return !(
			a.x >= b.x + b.width ||
			a.x + a.width <= b.x ||
			a.y >= b.y + b.height ||
			a.y + a.height <= b.y
		);
	}

	private pruneRects(rects: Rect[]): Rect[] {
		const result: Rect[] = [];
		for (let i = 0; i < rects.length; i++) {
			const rectI = rects[i];
			if (!rectI) continue;

			let isContained = false;
			for (let j = 0; j < rects.length; j++) {
				if (i !== j) {
					const rectJ = rects[j];
					if (rectJ && this.contains(rectJ, rectI)) {
						isContained = true;
						break;
					}
				}
			}
			if (!isContained) {
				result.push(rectI);
			}
		}
		return result;
	}

	private contains(outer: Rect, inner: Rect): boolean {
		return (
			inner.x >= outer.x &&
			inner.y >= outer.y &&
			inner.x + inner.width <= outer.x + outer.width &&
			inner.y + inner.height <= outer.y + outer.height
		);
	}
}

/**
 * Packs multiple images onto pages using MaxRects bin packing algorithm with rotation support.
 * Arranges images to minimize wasted space while respecting margins.
 * @param images - Array of PrintImage objects to pack
 * @param pageWidth - Page width in millimeters
 * @param pageHeight - Page height in millimeters
 * @param pageMargin - Margin around page edges in millimeters
 * @param imageMargin - Spacing between images in millimeters
 * @returns Array of Page objects containing packed images
 */
function packImages(
	images: PrintImage[],
	pageWidth: number,
	pageHeight: number,
	pageMargin: number,
	imageMargin: number,
): Page[] {
	const pages: Page[] = [];
	const availableWidth = pageWidth - 2 * pageMargin;
	const availableHeight = pageHeight - 2 * pageMargin;

	// Sort images by area (largest first) for better packing
	const sortedImages = [...images].sort(
		(a, b) => b.width * b.height - a.width * a.height,
	);
	const remainingImages = [...sortedImages];

	while (remainingImages.length > 0) {
		const packer = new MaxRectsPacker(availableWidth, availableHeight);
		const page: Page = { images: [] };
		const placedIds: Set<string> = new Set();

		// Try to place each remaining image
		for (const img of remainingImages) {
			// Add margin to image dimensions for spacing
			const imgWidth = img.width + imageMargin;
			const imgHeight = img.height + imageMargin;

			const position = packer.findPosition(imgWidth, imgHeight);

			if (position) {
				const actualWidth = position.rotated ? imgHeight : imgWidth;
				const actualHeight = position.rotated ? imgWidth : imgHeight;

				packer.place(position.x, position.y, actualWidth, actualHeight);

				page.images.push({
					image: img,
					x: position.x + pageMargin,
					y: position.y + pageMargin,
					rotated: position.rotated,
				});

				placedIds.add(img.id);
			}
		}

		// Remove placed images
		for (let i = remainingImages.length - 1; i >= 0; i--) {
			if (remainingImages[i] && placedIds.has(remainingImages[i]!.id)) {
				remainingImages.splice(i, 1);
			}
		}

		if (page.images.length > 0) {
			pages.push(page);
		} else if (remainingImages.length > 0) {
			// Image too large for page - place it anyway with rotation if it helps
			const img = remainingImages.shift()!;
			const fitsNormal =
				img.width <= availableWidth && img.height <= availableHeight;
			const fitsRotated =
				img.height <= availableWidth && img.width <= availableHeight;

			page.images.push({
				image: img,
				x: pageMargin,
				y: pageMargin,
				rotated: !fitsNormal && fitsRotated,
			});
			pages.push(page);
		}
	}

	return pages;
}

/**
 * PrintLayout component arranges images on pages optimized for printing.
 * Supports various paper sizes, custom dimensions, margins, and PDF export.
 * Uses MaxRects bin packing algorithm for efficient space utilization.
 * @param props - Component props containing images array
 * @returns The rendered PrintLayout component
 */
export function PrintLayout({ images }: PrintLayoutProps) {
	const [pageSize, setPageSize] = useState<string>("a4");
	const [customWidth, setCustomWidth] = useState<number>(210);
	const [customHeight, setCustomHeight] = useState<number>(297);
	const [pageMargin, setPageMargin] = useState<number>(DEFAULT_PAGE_MARGIN);
	const [imageMargin, setImageMargin] = useState<number>(DEFAULT_IMAGE_MARGIN);
	const [printImages, setPrintImages] = useState<PrintImage[]>([]);
	const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
	const [pages, setPages] = useState<Page[]>([]);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const isInitializedRef = useRef(false);

	const selectedPageSize: PageSize = (PAGE_SIZES.find(
		(p) => p.id === pageSize,
	) ?? PAGE_SIZES[0])!;
	const effectiveWidth =
		pageSize === "custom" ? customWidth : selectedPageSize.width;
	const effectiveHeight =
		pageSize === "custom" ? customHeight : selectedPageSize.height;

	// Add image to print list
	const addImageToPrint = useCallback(
		(sourceImage: { id: string; url: string }) => {
			const img = new Image();
			img.crossOrigin = "anonymous";
			img.onload = () => {
				// Default size: 50mm width, maintain aspect ratio
				const defaultWidth = 50;
				const aspectRatio = img.naturalHeight / img.naturalWidth;
				const defaultHeight = defaultWidth * aspectRatio;

				const newPrintImage: PrintImage = {
					id: crypto.randomUUID(),
					sourceId: sourceImage.id,
					url: sourceImage.url,
					width: defaultWidth,
					height: defaultHeight,
					naturalWidth: img.naturalWidth,
					naturalHeight: img.naturalHeight,
				};

				setPrintImages((prev) => [...prev, newPrintImage]);
			};
			img.src = sourceImage.url;
		},
		[],
	);

	// Update image size
	const updateImageSize = useCallback(
		(
			imageId: string,
			width: number,
			height: number,
			maintainAspect: boolean = true,
		) => {
			setPrintImages((prev) =>
				prev.map((img) => {
					if (img.id !== imageId) return img;

					if (maintainAspect) {
						const aspectRatio = img.naturalHeight / img.naturalWidth;
						if (width !== img.width) {
							return { ...img, width, height: width * aspectRatio };
						} else {
							return { ...img, width: height / aspectRatio, height };
						}
					}
					return { ...img, width, height };
				}),
			);
		},
		[],
	);

	// Remove image from print list
	const removeImage = useCallback((imageId: string) => {
		setPrintImages((prev) => prev.filter((img) => img.id !== imageId));
	}, []);

	// Helper function to draw an image with optional rotation and cut markers
	const drawPackedImage = useCallback(
		(
			ctx: CanvasRenderingContext2D,
			packedImg: PackedImage,
			img: HTMLImageElement,
			scale: number,
		) => {
			const x = packedImg.x * scale;
			const y = packedImg.y * scale;
			const imgW = packedImg.image.width * scale;
			const imgH = packedImg.image.height * scale;

			// Dimensions on canvas (swapped if rotated)
			const w = packedImg.rotated ? imgH : imgW;
			const h = packedImg.rotated ? imgW : imgH;

			ctx.save();

			if (packedImg.rotated) {
				// Translate to position, rotate 90 degrees clockwise
				ctx.translate(x + w, y);
				ctx.rotate(Math.PI / 2);
				ctx.drawImage(img, 0, 0, imgW, imgH);
			} else {
				ctx.drawImage(img, x, y, imgW, imgH);
			}

			ctx.restore();

			// Draw cut markers - limit length to half the image margin to avoid overlap
			ctx.strokeStyle = "#000000";
			ctx.lineWidth = scale > 5 ? 1 : 0.5;
			const maxMarkerLen = Math.max(0, (imageMargin * scale) / 2 - 1);
			const markerLen = Math.min(
				CUT_MARKER_LENGTH * scale,
				Math.max(2, maxMarkerLen),
			);

			// Only draw markers if there's enough margin space
			if (markerLen > 1) {
				// Draw L-shaped marks at each corner
				// Lines meet exactly at the corner point, stroke is centered on coordinates

				// Top-left corner
				ctx.beginPath();
				ctx.moveTo(x - markerLen, y);
				ctx.lineTo(x, y);
				ctx.lineTo(x, y - markerLen);
				ctx.stroke();

				// Top-right corner
				ctx.beginPath();
				ctx.moveTo(x + w + markerLen, y);
				ctx.lineTo(x + w, y);
				ctx.lineTo(x + w, y - markerLen);
				ctx.stroke();

				// Bottom-left corner
				ctx.beginPath();
				ctx.moveTo(x - markerLen, y + h);
				ctx.lineTo(x, y + h);
				ctx.lineTo(x, y + h + markerLen);
				ctx.stroke();

				// Bottom-right corner
				ctx.beginPath();
				ctx.moveTo(x + w + markerLen, y + h);
				ctx.lineTo(x + w, y + h);
				ctx.lineTo(x + w, y + h + markerLen);
				ctx.stroke();
			}
		},
		[imageMargin],
	);

	// Repack images when settings change
	useEffect(() => {
		if (!isInitializedRef.current && printImages.length === 0) {
			return;
		}
		isInitializedRef.current = true;

		const newPages = packImages(
			printImages,
			effectiveWidth,
			effectiveHeight,
			pageMargin,
			imageMargin,
		);
		setPages(newPages);
		setCurrentPageIndex((prev) =>
			prev >= newPages.length ? Math.max(0, newPages.length - 1) : prev,
		);
	}, [printImages, effectiveWidth, effectiveHeight, pageMargin, imageMargin]);

	// Render preview
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const scale = MM_TO_PX;
		canvas.width = effectiveWidth * scale;
		canvas.height = effectiveHeight * scale;

		// White background
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw page border
		ctx.strokeStyle = "#cccccc";
		ctx.lineWidth = 1;
		ctx.strokeRect(0, 0, canvas.width, canvas.height);

		// Draw margin guides (dashed)
		ctx.setLineDash([5, 5]);
		ctx.strokeStyle = "#e0e0e0";
		ctx.strokeRect(
			pageMargin * scale,
			pageMargin * scale,
			(effectiveWidth - 2 * pageMargin) * scale,
			(effectiveHeight - 2 * pageMargin) * scale,
		);
		ctx.setLineDash([]);

		const currentPage: Page | undefined = pages[currentPageIndex];
		if (!currentPage) return;

		let cancelled = false;

		// Load and draw images
		const imagePromises = currentPage.images.map(
			(packedImg) =>
				new Promise<void>((resolve) => {
					const img = new Image();
					img.crossOrigin = "anonymous";
					img.onload = () => {
						if (cancelled) {
							resolve();
							return;
						}
						drawPackedImage(ctx, packedImg, img, scale);
						resolve();
					};
					img.onerror = () => resolve();
					img.src = packedImg.image.url;
				}),
		);

		Promise.all(imagePromises);

		return () => {
			cancelled = true;
		};
	}, [
		pages,
		currentPageIndex,
		effectiveWidth,
		effectiveHeight,
		pageMargin,
		drawPackedImage,
	]);

	// Download all pages as images
	// Helper to convert image URL to base64 data URL
	const loadImageAsDataUrl = useCallback((url: string): Promise<string> => {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = "anonymous";
			img.onload = () => {
				try {
					const canvas = document.createElement("canvas");
					canvas.width = img.naturalWidth;
					canvas.height = img.naturalHeight;
					const ctx = canvas.getContext("2d");
					if (!ctx) {
						reject(new Error("Failed to get canvas context"));
						return;
					}
					ctx.drawImage(img, 0, 0);
					resolve(canvas.toDataURL("image/png"));
				} catch (error) {
					reject(
						new Error(
							`Failed to export canvas: ${error instanceof Error ? error.message : "Unknown error"}`,
						),
					);
				}
			};
			img.onerror = () => {
				reject(new Error(`Failed to load image from URL: ${url}`));
			};
			img.src = url;
		});
	}, []);

	// Download as PDF
	const downloadPdf = useCallback(async () => {
		if (pages.length === 0) return;

		const pdf = new jsPDF({
			orientation: effectiveWidth > effectiveHeight ? "landscape" : "portrait",
			unit: "mm",
			format: [effectiveWidth, effectiveHeight],
		});

		for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
			if (pageIdx > 0) {
				pdf.addPage(
					[effectiveWidth, effectiveHeight],
					effectiveWidth > effectiveHeight ? "landscape" : "portrait",
				);
			}

			const page: Page | undefined = pages[pageIdx];
			if (!page) continue;

			// Draw each image
			for (const packedImg of page.images) {
				try {
					const dataUrl = await loadImageAsDataUrl(packedImg.image.url);
					const imgW = packedImg.image.width;
					const imgH = packedImg.image.height;

					if (packedImg.rotated) {
						// For rotated images, we need to use jsPDF's rotation
						pdf.saveGraphicsState();
						// Translate to center, rotate, then draw offset
						// Calculate position for rotated image
						const rotatedX = packedImg.x;
						const rotatedY = packedImg.y;

						// Add image with rotation using transformation matrix
						pdf.addImage(
							dataUrl,
							"PNG",
							rotatedX + imgH,
							rotatedY,
							imgW,
							imgH,
							undefined,
							"FAST",
							-90,
						);
						pdf.restoreGraphicsState();
					} else {
						pdf.addImage(dataUrl, "PNG", packedImg.x, packedImg.y, imgW, imgH);
					}

					// Draw cut markers
					const markerLen = Math.min(
						CUT_MARKER_LENGTH,
						Math.max(1, imageMargin / 2 - 0.5),
					);
					const x = packedImg.x;
					const y = packedImg.y;
					const w = packedImg.rotated ? imgH : imgW;
					const h = packedImg.rotated ? imgW : imgH;

					if (markerLen > 0.5) {
						pdf.setDrawColor(0);
						pdf.setLineWidth(0.1);

						// L-shaped marks at each corner, meeting at corner point
						// Top-left corner
						pdf.line(x - markerLen, y, x, y);
						pdf.line(x, y - markerLen, x, y);

						// Top-right corner
						pdf.line(x + w, y, x + w + markerLen, y);
						pdf.line(x + w, y - markerLen, x + w, y);

						// Bottom-left corner
						pdf.line(x - markerLen, y + h, x, y + h);
						pdf.line(x, y + h, x, y + h + markerLen);

						// Bottom-right corner
						pdf.line(x + w, y + h, x + w + markerLen, y + h);
						pdf.line(x + w, y + h, x + w, y + h + markerLen);
					}
				} catch (err) {
					console.error("Failed to add image to PDF:", err);
				}
			}
		}

		pdf.save("print-layout.pdf");
	}, [pages, effectiveWidth, effectiveHeight, imageMargin, loadImageAsDataUrl]);

	// Print directly using browser print dialog
	const handlePrint = useCallback(async () => {
		if (pages.length === 0) return;

		// Create a hidden iframe for printing
		const iframe = document.createElement("iframe");
		iframe.style.position = "absolute";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "none";
		document.body.appendChild(iframe);

		const doc = iframe.contentDocument!;
		doc.open();
		doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @page {
              size: ${effectiveWidth}mm ${effectiveHeight}mm;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .page {
              width: ${effectiveWidth}mm;
              height: ${effectiveHeight}mm;
              position: relative;
              page-break-after: always;
            }
            .page:last-child {
              page-break-after: auto;
            }
            .image-container {
              position: absolute;
              overflow: visible;
            }
            .image-container img {
              display: block;
            }
            .cut-marker {
              position: absolute;
              background: black;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          </style>
        </head>
        <body></body>
      </html>
    `);
		doc.close();

		const body = doc.body;

		// Render each page
		for (const page of pages) {
			const pageDiv = doc.createElement("div");
			pageDiv.className = "page";

			for (const packedImg of (page as Page).images) {
				const container = doc.createElement("div");
				container.className = "image-container";

				const imgW = packedImg.image.width;
				const imgH = packedImg.image.height;
				const w = packedImg.rotated ? imgH : imgW;
				const h = packedImg.rotated ? imgW : imgH;

				container.style.left = packedImg.x + "mm";
				container.style.top = packedImg.y + "mm";

				const img = doc.createElement("img");
				img.src = packedImg.image.url;
				img.style.width = imgW + "mm";
				img.style.height = imgH + "mm";

				if (packedImg.rotated) {
					img.style.transform = "rotate(90deg) translateY(-100%)";
					img.style.transformOrigin = "top left";
				}

				container.appendChild(img);

				// Add cut markers - L-shaped marks centered on corner
				const markerLen = Math.min(
					CUT_MARKER_LENGTH,
					Math.max(1, imageMargin / 2 - 0.5),
				);
				const markerThickness = 0.2;
				const halfThickness = markerThickness / 2;

				if (markerLen > 0.5) {
					// Each marker is positioned so its center aligns with the image edge
					const markers = [
						// Top-left horizontal (ends at corner)
						{
							left: -markerLen,
							top: -halfThickness,
							width: markerLen,
							height: markerThickness,
						},
						// Top-left vertical (ends at corner)
						{
							left: -halfThickness,
							top: -markerLen,
							width: markerThickness,
							height: markerLen,
						},
						// Top-right horizontal (starts at corner)
						{
							left: w,
							top: -halfThickness,
							width: markerLen,
							height: markerThickness,
						},
						// Top-right vertical (ends at corner)
						{
							left: w - halfThickness,
							top: -markerLen,
							width: markerThickness,
							height: markerLen,
						},
						// Bottom-left horizontal (ends at corner)
						{
							left: -markerLen,
							top: h - halfThickness,
							width: markerLen,
							height: markerThickness,
						},
						// Bottom-left vertical (starts at corner)
						{
							left: -halfThickness,
							top: h,
							width: markerThickness,
							height: markerLen,
						},
						// Bottom-right horizontal (starts at corner)
						{
							left: w,
							top: h - halfThickness,
							width: markerLen,
							height: markerThickness,
						},
						// Bottom-right vertical (starts at corner)
						{
							left: w - halfThickness,
							top: h,
							width: markerThickness,
							height: markerLen,
						},
					];

					for (const m of markers) {
						const marker = doc.createElement("div");
						marker.className = "cut-marker";
						marker.style.left = m.left + "mm";
						marker.style.top = m.top + "mm";
						marker.style.width = m.width + "mm";
						marker.style.height = m.height + "mm";
						container.appendChild(marker);
					}
				}

				pageDiv.appendChild(container);
			}

			body.appendChild(pageDiv);
		}

		// Wait for images to load then print
		const images = doc.querySelectorAll("img");
		await Promise.all(
			Array.from(images).map(
				(img) =>
					new Promise<void>((resolve) => {
						if (img.complete) {
							resolve();
						} else {
							img.onload = () => resolve();
							img.onerror = () => resolve();
						}
					}),
			),
		);

		// Small delay to ensure rendering is complete
		await new Promise((r) => setTimeout(r, 100));

		iframe.contentWindow?.print();

		// Clean up after print dialog closes
		setTimeout(() => {
			document.body.removeChild(iframe);
		}, 1000);
	}, [pages, effectiveWidth, effectiveHeight, imageMargin]);

	return (
		<div className="h-full flex flex-col p-6 overflow-hidden">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold">Print Layout</h2>
			</div>

			<div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
				{/* Settings panel */}
				<div className="w-full lg:w-72 flex flex-col gap-4 overflow-y-auto">
					{/* Page size settings */}
					<div className="space-y-3">
						<h3 className="text-sm font-medium">Page Size</h3>
						<Select value={pageSize} onValueChange={setPageSize}>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PAGE_SIZES.map((size) => (
									<SelectItem key={size.id} value={size.id}>
										{size.name}{" "}
										{size.id !== "custom" && `(${size.width}×${size.height}mm)`}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{pageSize === "custom" && (
							<div className="flex gap-2">
								<div className="flex-1">
									<Label className="text-xs">Width (mm)</Label>
									<Input
										type="number"
										value={customWidth}
										onChange={(e) => {
											const val = e.target.valueAsNumber;
											if (!isNaN(val)) {
												setCustomWidth(Math.max(50, Math.min(1000, val)));
											}
										}}
										min={50}
										max={1000}
									/>
								</div>
								<div className="flex-1">
									<Label className="text-xs">Height (mm)</Label>
									<Input
										type="number"
										value={customHeight}
										onChange={(e) => {
											const val = e.target.valueAsNumber;
											if (!isNaN(val)) {
												setCustomHeight(Math.max(50, Math.min(1000, val)));
											}
										}}
										min={50}
										max={1000}
									/>
								</div>
							</div>
						)}
					</div>

					{/* Margin settings */}
					<div className="space-y-3">
						<h3 className="text-sm font-medium">Margins</h3>
						<div className="flex gap-2">
							<div className="flex-1">
								<Label className="text-xs">Page (mm)</Label>
								<Input
									type="number"
									value={pageMargin}
									onChange={(e) => {
										const val = e.target.valueAsNumber;
										if (!isNaN(val)) {
											setPageMargin(Math.max(0, Math.min(50, val)));
										}
									}}
									min={0}
									max={50}
								/>
							</div>
							<div className="flex-1">
								<Label className="text-xs">Image (mm)</Label>
								<Input
									type="number"
									value={imageMargin}
									onChange={(e) => {
										const val = e.target.valueAsNumber;
										if (!isNaN(val)) {
											setImageMargin(Math.max(0, Math.min(20, val)));
										}
									}}
									min={0}
									max={20}
								/>
							</div>
						</div>
					</div>

					{/* Available images */}
					<div className="space-y-3">
						<h3 className="text-sm font-medium">Add Images</h3>
						<div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
							{images.map((img) => (
								<button
									key={img.id}
									onClick={() => addImageToPrint(img)}
									className="aspect-square rounded border border-border overflow-hidden hover:border-primary transition-colors"
									title="Click to add"
									aria-label={`Add image ${img.id}`}
								>
									<img
										src={img.url}
										alt=""
										className="w-full h-full object-cover"
									/>
								</button>
							))}
						</div>
						{images.length === 0 && (
							<p className="text-xs text-muted-foreground">
								Upload images in the gallery first
							</p>
						)}
					</div>

					{/* Print images list */}
					<div className="space-y-3 flex-1 min-h-0">
						<h3 className="text-sm font-medium">
							Images to Print ({printImages.length})
						</h3>
						<div className="space-y-2 overflow-y-auto max-h-64">
							{printImages.map((img) => (
								<div
									key={img.id}
									className="flex items-center gap-2 p-2 rounded border border-border"
								>
									<img
										src={img.url}
										alt=""
										className="w-10 h-10 object-cover rounded"
									/>
									<div className="flex-1 min-w-0">
										<div className="flex gap-1">
											<div className="flex-1">
												<Label className="text-xs">W (mm)</Label>
												<Input
													type="number"
													value={Math.round(img.width)}
													onChange={(e) => {
														const val = e.target.valueAsNumber;
														if (!isNaN(val)) {
															updateImageSize(
																img.id,
																Math.max(
																	5,
																	Math.min(
																		effectiveWidth - 2 * pageMargin,
																		val,
																	),
																),
																img.height,
															);
														}
													}}
													min={5}
													max={effectiveWidth - 2 * pageMargin}
													className="h-7 text-xs"
												/>
											</div>
											<div className="flex-1">
												<Label className="text-xs">H (mm)</Label>
												<Input
													type="number"
													value={Math.round(img.height)}
													onChange={(e) => {
														const val = e.target.valueAsNumber;
														if (!isNaN(val)) {
															updateImageSize(
																img.id,
																img.width,
																Math.max(
																	5,
																	Math.min(
																		effectiveHeight - 2 * pageMargin,
																		val,
																	),
																),
															);
														}
													}}
													min={5}
													max={effectiveHeight - 2 * pageMargin}
													className="h-7 text-xs"
												/>
											</div>
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => removeImage(img.id)}
										className="h-7 w-7 p-0"
										aria-label="Remove image"
										title="Remove image"
									>
										<Trash2 className="size-4" />
									</Button>
								</div>
							))}
							{printImages.length === 0 && (
								<p className="text-xs text-muted-foreground text-center py-4">
									Click images above to add them
								</p>
							)}
						</div>
					</div>

					{/* Action buttons */}
					<div className="flex flex-col gap-2">
						<Button
							onClick={downloadPdf}
							disabled={pages.length === 0}
							className="w-full"
						>
							<Download className="size-4" />
							Download PDF ({pages.length}{" "}
							{pages.length === 1 ? "page" : "pages"})
						</Button>
						<Button
							onClick={handlePrint}
							disabled={pages.length === 0}
							variant="outline"
							className="w-full"
						>
							<Printer className="size-4" />
							Print
						</Button>
					</div>
				</div>

				{/* Preview area */}
				<div className="flex-1 flex flex-col bg-muted/30 rounded-lg overflow-hidden">
					{/* Page navigation */}
					{pages.length > 1 && (
						<div className="flex items-center justify-center gap-2 p-2 border-b border-border">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setCurrentPageIndex((i) => Math.max(0, i - 1))}
								disabled={currentPageIndex === 0}
								aria-label="Previous page"
								title="Previous page"
							>
								<ChevronLeft className="size-4" />
							</Button>
							<span className="text-sm">
								Page {currentPageIndex + 1} of {pages.length}
							</span>
							<Button
								variant="ghost"
								size="sm"
								onClick={() =>
									setCurrentPageIndex((i) => Math.min(pages.length - 1, i + 1))
								}
								disabled={currentPageIndex === pages.length - 1}
								aria-label="Next page"
								title="Next page"
							>
								<ChevronRight className="size-4" />
							</Button>
						</div>
					)}

					{/* Canvas preview */}
					<div className="flex-1 flex items-center justify-center p-4 overflow-auto">
						{printImages.length > 0 ? (
							<canvas
								ref={canvasRef}
								className="max-w-full max-h-full shadow-lg"
								style={{ background: "#fff" }}
							/>
						) : (
							<div className="text-center text-muted-foreground">
								<p className="text-lg">Add images to see preview</p>
								<p className="text-sm mt-1">
									Click on images in the left panel to add them
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
