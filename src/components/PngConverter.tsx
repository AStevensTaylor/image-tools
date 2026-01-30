import { Download } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import type { WindowWithGallery } from "@/lib/gallery";

interface PngConverterProps {
	imageUrl: string;
	imageName: string;
}

/**
 * Validates that the URL is a safe image URL with an allowed protocol.
 * @param url - The URL to validate
 * @returns true if the URL is valid and safe, false otherwise
 */
const isValidImageUrl = (url: string | undefined): boolean => {
	if (!url || typeof url !== "string" || url.trim() === "") {
		return false;
	}

	try {
		const urlObj = new URL(url);
		const allowedProtocols = ["https:", "http:", "data:", "blob:"];
		return allowedProtocols.includes(urlObj.protocol);
	} catch {
		// Handle relative URLs or data URLs that might fail URL parsing
		return url.startsWith("data:") || url.startsWith("blob:");
	}
};

/**
 * Gets the addGeneratedImage function from the window object.
 * @returns The addGeneratedImage function if available, undefined otherwise
 */
function getAddToGallery() {
	return (window as WindowWithGallery).addGeneratedImage;
}

/**
 * PngConverter component converts any image format to PNG with transparency preservation.
 * Supports JPEG, WebP, GIF, BMP, SVG, AVIF, and more formats.
 * @param props - Component props containing imageUrl and imageName
 * @returns The rendered PngConverter component
 */
export function PngConverter({ imageUrl, imageName }: PngConverterProps) {
	const [isConverting, setIsConverting] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
	const [error, setError] = useState<string | null>(null);

	const convertToPng = useCallback(async () => {
		setIsConverting(true);
		setError(null);

		try {
			// Validate URL before creating Image instance
			if (!isValidImageUrl(imageUrl)) {
				throw new Error(
					"Invalid or unsafe image URL. Only https:, http:, data:, and blob: URLs are allowed.",
				);
			}

			const img = new Image();
			img.crossOrigin = "anonymous";
			img.src = imageUrl;

			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
			});

			const canvas = document.createElement("canvas");
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			setDimensions({ width: img.naturalWidth, height: img.naturalHeight });

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				throw new Error("Failed to get canvas 2D context");
			}
			// Don't fill background - preserve transparency
			ctx.drawImage(img, 0, 0);

			const pngDataUrl = canvas.toDataURL("image/png");
			setPreviewUrl(pngDataUrl);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to convert image";
			setError(errorMessage);
			console.error("Failed to convert image:", err);
		} finally {
			setIsConverting(false);
		}
	}, [imageUrl]);

	const downloadPng = useCallback(() => {
		if (!previewUrl) return;

		const link = document.createElement("a");
		const baseName = imageName.replace(/\.[^.]+$/, "");
		link.download = `${baseName}.png`;
		link.href = previewUrl;
		link.click();
	}, [previewUrl, imageName]);

	const addPreviewToGallery = useCallback(() => {
		const addToGallery = getAddToGallery();
		if (!previewUrl || !addToGallery) return;
		const baseName = imageName.replace(/\.[^.]+$/, "");
		addToGallery(previewUrl, `${baseName}.png`);
	}, [previewUrl, imageName]);

	return (
		<div className="h-full flex flex-col p-6">
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-xl font-semibold">Convert to PNG</h2>
				<div className="flex items-center gap-2">
					{previewUrl && (
						<span className="text-sm text-muted-foreground">
							{dimensions.width}×{dimensions.height} • PNG with transparency
						</span>
					)}
				</div>
			</div>

			<div className="flex-1 flex flex-col gap-4 min-h-0">
				<div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden min-h-0">
					{error ? (
						<div className="text-center p-6">
							<p className="text-destructive font-medium mb-2">
								Conversion Failed
							</p>
							<p className="text-sm text-muted-foreground">{error}</p>
						</div>
					) : (
						<>
							{/* Checkerboard background to show transparency */}
							<div
								className="relative max-w-full max-h-full"
								style={{
									backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%),
                linear-gradient(-45deg, #ccc 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #ccc 75%),
                linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
									backgroundSize: "20px 20px",
									backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
								}}
							>
								<img
									src={previewUrl || imageUrl}
									alt="Image preview"
									className="max-w-full max-h-[calc(100vh-250px)] object-contain"
								/>
							</div>
						</>
					)}
				</div>

				<div className="flex items-center justify-center gap-4">
					{!previewUrl ? (
						<Button onClick={convertToPng} disabled={isConverting} size="lg">
							{isConverting ? (
								<>
									<div className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" />
									Converting...
								</>
							) : (
								"Convert to PNG"
							)}
						</Button>
					) : (
						<>
							<Button variant="outline" onClick={convertToPng}>
								Reconvert
							</Button>
							<Button onClick={downloadPng} size="lg">
								<Download className="size-4" />
								Download PNG
							</Button>
							{getAddToGallery() && (
								<Button variant="outline" onClick={addPreviewToGallery}>
									Add to Gallery
								</Button>
							)}
						</>
					)}
				</div>

				<div className="text-center text-sm text-muted-foreground">
					<p>
						Converts any image format to PNG with full quality and transparency
						preserved.
					</p>
					<p className="mt-1">
						Supported inputs: JPEG, WebP, GIF, BMP, SVG, AVIF, and more.
					</p>
				</div>
			</div>
		</div>
	);
}
