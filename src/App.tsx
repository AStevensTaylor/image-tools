import DOMPurify from "dompurify";
import {
	ChevronLeft,
	ChevronRight,
	Crop,
	FileImage,
	Film,
	Image as ImageIcon,
	Layers,
	Printer,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AspectRatioCrop } from "@/components/AspectRatioCrop";
import { BatchCrop } from "@/components/BatchCrop";
import { GifFrameExtractor } from "@/components/GifFrameExtractor";
import { ImageGallery } from "@/components/ImageGallery";
import { PngConverter } from "@/components/PngConverter";
import { PrintLayout } from "@/components/PrintLayout";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Button } from "@/components/ui/button";
import type { WindowWithGallery } from "@/lib/gallery";
import { cn } from "@/lib/utils";
import "@/index.css";

const RASTER_MIME_TYPES = [
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
] as const;

const ALLOWED_MIME_TYPES = [...RASTER_MIME_TYPES, "image/svg+xml"] as const;

const SVG_SANITIZE_OPTIONS = {
	USE_PROFILES: { svg: true, svgFilters: true },
	ADD_TAGS: ["use"],
	ADD_ATTR: ["xlink:href", "href"],
};

// Sanitize SVG content using DOMPurify
async function sanitizeSvgFile(file: File): Promise<File> {
	const svgText = await file.text();
	const sanitized = DOMPurify.sanitize(svgText, SVG_SANITIZE_OPTIONS);
	return new File([new Blob([sanitized])], file.name, { type: "image/svg+xml" });
}

async function sanitizeSvgBlob(blob: Blob, fileName: string): Promise<File> {
	const svgText = await blob.text();
	const sanitized = DOMPurify.sanitize(svgText, SVG_SANITIZE_OPTIONS);
	return new File([new Blob([sanitized])], fileName, { type: "image/svg+xml" });
}

type Tool =
	| "crop"
	| "gif-frames"
	| "png-convert"
	| "batch-crop"
	| "print-layout";

interface ImageItem {
	id: string;
	file: File;
	url: string;
}

const tools: {
	id: Tool;
	label: string;
	icon: typeof Crop;
	description: string;
	requiresAnimated?: boolean;
	requiresImage?: boolean;
}[] = [
	{
		id: "crop",
		label: "Aspect Crop",
		icon: Crop,
		description: "Crop with custom aspect ratio",
		requiresImage: true,
	},
	{
		id: "batch-crop",
		label: "Batch Crop",
		icon: Layers,
		description: "Generate multiple crops for app stores",
		requiresImage: true,
	},
	{
		id: "gif-frames",
		label: "Extract Frames",
		icon: Film,
		description: "Extract frames from GIF/WebP",
		requiresAnimated: true,
	},
	{
		id: "png-convert",
		label: "Convert to PNG",
		icon: FileImage,
		description: "Convert any image to PNG",
		requiresImage: true,
	},
	{
		id: "print-layout",
		label: "Print Layout",
		icon: Printer,
		description: "Pack images onto pages for printing",
	},
];

const SCROLL_AMOUNT = 200;

export function App() {
	const [images, setImages] = useState<ImageItem[]>([]);
	const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
	const [activeTool, setActiveTool] = useState<Tool>("crop");
	const [isGalleryCollapsed, setIsGalleryCollapsed] = useState(false);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	const toolsContainerRef = useRef<HTMLDivElement>(null);
	const isInitializedRef = useRef(false);

	const selectedImage = images.find((img) => img.id === selectedImageId);
	const isAnimatedFormat =
		selectedImage?.file.type === "image/gif" ||
		selectedImage?.file.type === "image/webp";

	const updateScrollButtons = useCallback(() => {
		const container = toolsContainerRef.current;
		if (!container) return;

		const hasOverflow = container.scrollWidth > container.clientWidth;
		setCanScrollLeft(hasOverflow && container.scrollLeft > 0);
		setCanScrollRight(
			hasOverflow &&
				container.scrollLeft < container.scrollWidth - container.clientWidth,
		);
	}, []);

	useEffect(() => {
		if (!isInitializedRef.current) {
			isInitializedRef.current = true;
			updateScrollButtons();
		}

		window.addEventListener("resize", updateScrollButtons);
		return () => window.removeEventListener("resize", updateScrollButtons);
	}, [updateScrollButtons]);

	const imageUrlsRef = useRef<string[]>([]);

	useEffect(() => {
		imageUrlsRef.current = images.map((img) => img.url);
	}, [images]);

	useEffect(() => {
		return () => {
			imageUrlsRef.current.forEach((url) => {
				URL.revokeObjectURL(url);
			});
		};
	}, []);

	const scroll = useCallback((direction: "left" | "right") => {
		const container = toolsContainerRef.current;
		if (!container) return;

		container.scrollBy({
			left: direction === "left" ? -SCROLL_AMOUNT : SCROLL_AMOUNT,
			behavior: "smooth",
		});
	}, []);

	const handleImagesAdd = useCallback(
		async (files: FileList) => {
			const newImages: ImageItem[] = [];

			for (const file of Array.from(files)) {
				if (
					!ALLOWED_MIME_TYPES.includes(
						file.type as (typeof ALLOWED_MIME_TYPES)[number],
					)
				) {
					continue;
				}

				let processedFile = file;

				// Sanitize SVG files with DOMPurify
				if (file.type === "image/svg+xml") {
					processedFile = await sanitizeSvgFile(file);
				}

				newImages.push({
					id: crypto.randomUUID(),
					file: processedFile,
					url: URL.createObjectURL(processedFile),
				});
			}

			setImages((prev) => [...prev, ...newImages]);

			if (newImages.length > 0 && !selectedImageId) {
				setSelectedImageId(newImages[0]?.id ?? null);
			}
		},
		[selectedImageId],
	);

	const handleAddGeneratedImage = useCallback(
		async (dataUrl: string, suggestedName?: string) => {
			try {
				const response = await fetch(dataUrl);
				const blob = await response.blob();
				if (
					!ALLOWED_MIME_TYPES.includes(
						blob.type as (typeof ALLOWED_MIME_TYPES)[number],
					)
				)
					return;

				const extensionFromMime =
					blob.type.split("/")[1]?.replace("+xml", "") || "png";
				const fileName =
					suggestedName || `output-${Date.now()}.${extensionFromMime}`;

				let file: File;

				// Sanitize SVG content with DOMPurify
				if (blob.type === "image/svg+xml") {
					file = await sanitizeSvgBlob(blob, fileName);
				} else {
					file = new File([blob], fileName, { type: blob.type });
				}

				const image: ImageItem = {
					id: crypto.randomUUID(),
					file,
					url: URL.createObjectURL(file),
				};

				setImages((prev) => [...prev, image]);
				setSelectedImageId(image.id);
			} catch (error) {
				console.error("Failed to add generated image to gallery", error);
			}
		},
		[],
	);

	useEffect(() => {
		(window as WindowWithGallery).addGeneratedImage = handleAddGeneratedImage;
		return () => {
			(window as WindowWithGallery).addGeneratedImage = undefined;
		};
	}, [handleAddGeneratedImage]);

	const handleImageSelect = useCallback((id: string) => {
		setSelectedImageId(id);
	}, []);

	const handleImageRemove = useCallback(
		(id: string) => {
			setImages((prev) => {
				const updatedImages = prev.filter((img) => img.id !== id);
				const removedImage = prev.find((img) => img.id === id);
				if (removedImage) {
					URL.revokeObjectURL(removedImage.url);
				}

				if (selectedImageId === id) {
					setSelectedImageId(updatedImages[0]?.id ?? null);
				}

				return updatedImages;
			});
		},
		[selectedImageId],
	);

	return (
		<div className="fixed inset-0 flex flex-col md:flex-row">
			{/* Desktop: Left sidebar - 30% | Mobile: Bottom carousel - 30% */}
			<div
				className={cn(
					"order-2 md:order-1 md:h-full md:w-[30%] md:min-w-[250px] md:max-w-[400px]",
					"transition-all duration-300 ease-in-out",
					isGalleryCollapsed ? "h-[48px]" : "h-[30%]",
				)}
			>
				<ImageGallery
					images={images}
					selectedImageId={selectedImageId}
					onImagesAdd={handleImagesAdd}
					onImageSelect={handleImageSelect}
					onImageRemove={handleImageRemove}
					isCollapsed={isGalleryCollapsed}
					onToggleCollapse={() => setIsGalleryCollapsed(!isGalleryCollapsed)}
				/>
			</div>

			{/* Desktop: Right content area - 70% | Mobile: Top manipulation - 70% */}
			<div
				className="order-1 md:order-2 flex-1 bg-background overflow-hidden flex flex-col"
				onClick={() => {
					// Collapse gallery when clicking on manipulation area on mobile
					if (!isGalleryCollapsed && window.innerWidth < 768) {
						setIsGalleryCollapsed(true);
					}
				}}
			>
				{/* Tool selector */}
				<div className="relative flex items-center border-b border-border bg-card">
					{/* Left scroll button */}
					{canScrollLeft && (
						<Button
							variant="ghost"
							size="sm"
							className="absolute left-0 z-10 h-full rounded-none bg-gradient-to-r from-card to-transparent px-2"
							onClick={() => scroll("left")}
						aria-label="Scroll left"
					>
						<ChevronLeft className="size-5" />
					</Button>
				)}

				{/* Scrollable tools container */}
				<div
						ref={toolsContainerRef}
						className="flex gap-2 p-4 overflow-x-auto scrollbar-hide"
						onScroll={updateScrollButtons}
					>
						{tools.map((tool) => {
							const Icon = tool.icon;
							const isDisabled =
								tool.requiresAnimated && selectedImage && !isAnimatedFormat;
							return (
								<Button
									key={tool.id}
									variant={activeTool === tool.id ? "default" : "outline"}
									size="sm"
									onClick={() => setActiveTool(tool.id)}
									disabled={isDisabled}
									className={cn(
										"whitespace-nowrap",
										isDisabled && "opacity-50",
									)}
									title={tool.description}
								>
									<Icon className="size-4" />
									{tool.label}
								</Button>
							);
						})}
					</div>

					{/* Right scroll button */}
					{canScrollRight && (
						<Button
							variant="ghost"
							size="sm"
							className="absolute right-0 z-10 h-full rounded-none bg-gradient-to-l from-card to-transparent px-2"
							onClick={() => scroll("right")}
							aria-label="Scroll right"
						>
							<ChevronRight className="size-5" />
						</Button>
					)}
					<SettingsDialog />
				</div>

				{/* Tool content */}
				<div className="flex-1 overflow-hidden">
					{activeTool === "print-layout" ? (
						<PrintLayout images={images} />
					) : selectedImage ? (
						activeTool === "crop" ? (
							<AspectRatioCrop
								imageUrl={selectedImage.url}
								imageName={selectedImage.file.name}
							/>
						) : activeTool === "gif-frames" ? (
							isAnimatedFormat ? (
								<GifFrameExtractor
									imageUrl={selectedImage.url}
									imageName={selectedImage.file.name}
									fileType={selectedImage.file.type}
								/>
							) : (
								<div className="h-full flex flex-col items-center justify-center text-muted-foreground">
									<Film className="size-16 mb-4 opacity-30" />
									<p className="text-lg">
										Select a GIF or WebP to extract frames
									</p>
									<p className="text-sm mt-1">
										This tool works with animated GIF and WebP files
									</p>
								</div>
							)
						) : activeTool === "png-convert" ? (
							<PngConverter
								imageUrl={selectedImage.url}
								imageName={selectedImage.file.name}
							/>
						) : activeTool === "batch-crop" ? (
							<BatchCrop
								imageUrl={selectedImage.url}
								imageName={selectedImage.file.name}
							/>
						) : null
					) : (
						<div className="h-full flex flex-col items-center justify-center text-muted-foreground">
							<ImageIcon className="size-16 mb-4 opacity-30" />
							<p className="text-lg">Select an image to get started</p>
							<p className="text-sm mt-1 hidden md:inline">
								Upload images using the gallery on the left
							</p>
							<p className="text-sm mt-1 md:hidden">
								Upload images using the gallery below
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default App;
