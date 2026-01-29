import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { WindowWithGallery } from "@/lib/gallery";

interface PngConverterProps {
	imageUrl: string;
	imageName: string;
}

export function PngConverter({ imageUrl, imageName }: PngConverterProps) {
	const [isConverting, setIsConverting] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
	const getAddToGallery = () => (window as WindowWithGallery).addGeneratedImage;

	const convertToPng = async () => {
		setIsConverting(true);

		try {
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

			const ctx = canvas.getContext("2d")!;
			// Don't fill background - preserve transparency
			ctx.drawImage(img, 0, 0);

			const pngDataUrl = canvas.toDataURL("image/png");
			setPreviewUrl(pngDataUrl);
		} catch (err) {
			console.error("Failed to convert image:", err);
		} finally {
			setIsConverting(false);
		}
	};

	const downloadPng = () => {
		if (!previewUrl) return;

		const link = document.createElement("a");
		const baseName = imageName.replace(/\.[^.]+$/, "");
		link.download = `${baseName}.png`;
		link.href = previewUrl;
		link.click();
	};

	const addPreviewToGallery = () => {
		const addToGallery = getAddToGallery();
		if (!previewUrl || !addToGallery) return;
		const baseName = imageName.replace(/\.[^.]+$/, "");
		addToGallery(previewUrl, `${baseName}.png`);
	};

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
