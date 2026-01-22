import { useState, useCallback, useRef, useEffect } from "react";
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
import { Download, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
  private pageWidth: number;
  private pageHeight: number;

  constructor(pageWidth: number, pageHeight: number) {
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;
    this.freeRects = [{ x: 0, y: 0, width: pageWidth, height: pageHeight }];
  }

  // Find best position for a rectangle, trying both orientations
  findPosition(
    width: number,
    height: number
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
        });
      }

      // Right portion
      if (placedRect.x + placedRect.width < freeRect.x + freeRect.width) {
        newFreeRects.push({
          x: placedRect.x + placedRect.width,
          y: freeRect.y,
          width: freeRect.x + freeRect.width - (placedRect.x + placedRect.width),
          height: freeRect.height,
        });
      }

      // Top portion
      if (placedRect.y > freeRect.y) {
        newFreeRects.push({
          x: freeRect.x,
          y: freeRect.y,
          width: freeRect.width,
          height: placedRect.y - freeRect.y,
        });
      }

      // Bottom portion
      if (placedRect.y + placedRect.height < freeRect.y + freeRect.height) {
        newFreeRects.push({
          x: freeRect.x,
          y: placedRect.y + placedRect.height,
          width: freeRect.width,
          height: freeRect.y + freeRect.height - (placedRect.y + placedRect.height),
        });
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
      let isContained = false;
      for (let j = 0; j < rects.length; j++) {
        if (i !== j && this.contains(rects[j], rects[i])) {
          isContained = true;
          break;
        }
      }
      if (!isContained) {
        result.push(rects[i]);
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

// Pack images using MaxRects algorithm with rotation support
function packImages(
  images: PrintImage[],
  pageWidth: number,
  pageHeight: number,
  pageMargin: number,
  imageMargin: number
): Page[] {
  const pages: Page[] = [];
  const availableWidth = pageWidth - 2 * pageMargin;
  const availableHeight = pageHeight - 2 * pageMargin;

  // Sort images by area (largest first) for better packing
  const sortedImages = [...images].sort(
    (a, b) => b.width * b.height - a.width * a.height
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
      if (placedIds.has(remainingImages[i].id)) {
        remainingImages.splice(i, 1);
      }
    }

    if (page.images.length > 0) {
      pages.push(page);
    } else if (remainingImages.length > 0) {
      // Image too large for page - place it anyway with rotation if it helps
      const img = remainingImages.shift()!;
      const fitsNormal = img.width <= availableWidth && img.height <= availableHeight;
      const fitsRotated = img.height <= availableWidth && img.width <= availableHeight;
      
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

  const selectedPageSize = PAGE_SIZES.find((p) => p.id === pageSize) || PAGE_SIZES[0];
  const effectiveWidth = pageSize === "custom" ? customWidth : selectedPageSize.width;
  const effectiveHeight = pageSize === "custom" ? customHeight : selectedPageSize.height;

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
    []
  );

  // Update image size
  const updateImageSize = useCallback(
    (imageId: string, width: number, height: number, maintainAspect: boolean = true) => {
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
        })
      );
    },
    []
  );

  // Remove image from print list
  const removeImage = useCallback((imageId: string) => {
    setPrintImages((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  // Helper function to draw an image with optional rotation and cut markers
  const drawPackedImage = (
    ctx: CanvasRenderingContext2D,
    packedImg: PackedImage,
    img: HTMLImageElement,
    scale: number
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

    // Draw cut markers
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = scale > 5 ? 1 : 0.5;
    const markerLen = CUT_MARKER_LENGTH * scale;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(x - markerLen, y);
    ctx.lineTo(x - 2, y);
    ctx.moveTo(x, y - markerLen);
    ctx.lineTo(x, y - 2);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(x + w + 2, y);
    ctx.lineTo(x + w + markerLen, y);
    ctx.moveTo(x + w, y - markerLen);
    ctx.lineTo(x + w, y - 2);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(x - markerLen, y + h);
    ctx.lineTo(x - 2, y + h);
    ctx.moveTo(x, y + h + 2);
    ctx.lineTo(x, y + h + markerLen);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(x + w + 2, y + h);
    ctx.lineTo(x + w + markerLen, y + h);
    ctx.moveTo(x + w, y + h + 2);
    ctx.lineTo(x + w, y + h + markerLen);
    ctx.stroke();
  };

  // Repack images when settings change
  useEffect(() => {
    const newPages = packImages(
      printImages,
      effectiveWidth,
      effectiveHeight,
      pageMargin,
      imageMargin
    );
    setPages(newPages);
    if (currentPageIndex >= newPages.length) {
      setCurrentPageIndex(Math.max(0, newPages.length - 1));
    }
  }, [printImages, effectiveWidth, effectiveHeight, pageMargin, imageMargin, currentPageIndex]);

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
      (effectiveHeight - 2 * pageMargin) * scale
    );
    ctx.setLineDash([]);

    const currentPage = pages[currentPageIndex];
    if (!currentPage) return;

    // Load and draw images
    const imagePromises = currentPage.images.map(
      (packedImg) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            drawPackedImage(ctx, packedImg, img, scale);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = packedImg.image.url;
        })
    );

    Promise.all(imagePromises);
  }, [pages, currentPageIndex, effectiveWidth, effectiveHeight, pageMargin]);

  // Download all pages as images
  const downloadPages = useCallback(async () => {
    const scale = MM_TO_PX * 2; // Higher resolution for print (2x)

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      const canvas = document.createElement("canvas");
      canvas.width = effectiveWidth * scale;
      canvas.height = effectiveHeight * scale;

      const ctx = canvas.getContext("2d")!;

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load and draw all images
      await Promise.all(
        page.images.map(
          (packedImg) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                drawPackedImage(ctx, packedImg, img, scale);
                resolve();
              };
              img.onerror = () => resolve();
              img.src = packedImg.image.url;
            })
        )
      );

      // Download
      const link = document.createElement("a");
      link.download = `print-layout-page-${pageIdx + 1}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      await new Promise((r) => setTimeout(r, 100));
    }
  }, [pages, effectiveWidth, effectiveHeight]);

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Print Layout</h2>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Settings panel */}
        <div className="w-72 flex flex-col gap-4 overflow-y-auto">
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
                    {size.name} {size.id !== "custom" && `(${size.width}×${size.height}mm)`}
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
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    min={50}
                    max={1000}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Height (mm)</Label>
                  <Input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value))}
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
                  onChange={(e) => setPageMargin(Number(e.target.value))}
                  min={0}
                  max={50}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Image (mm)</Label>
                <Input
                  type="number"
                  value={imageMargin}
                  onChange={(e) => setImageMargin(Number(e.target.value))}
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
                          onChange={(e) =>
                            updateImageSize(img.id, Number(e.target.value), img.height)
                          }
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
                          onChange={(e) =>
                            updateImageSize(img.id, img.width, Number(e.target.value))
                          }
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

          {/* Download button */}
          <Button
            onClick={downloadPages}
            disabled={pages.length === 0}
            className="w-full"
          >
            <Download className="size-4" />
            Download All Pages ({pages.length})
          </Button>
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
