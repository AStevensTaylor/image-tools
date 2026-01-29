import { decompressFrames, parseGIF } from "gifuct-js";
import {
	ChevronLeft,
	ChevronRight,
	Download,
	FolderDown,
	Pause,
	Play,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	clearCachedDirectory,
	dataUrlToBlob,
	hasCachedDirectory,
	isFileSystemAccessSupported,
	requestDirectory,
	saveFilesToDirectory,
} from "@/lib/fileSystem";
import type { WindowWithGallery } from "@/lib/gallery";
import {
	getExportExtension,
	getExportMimeType,
	useSettings,
} from "@/lib/settings";
import { cn } from "@/lib/utils";

interface GifFrameExtractorProps {
	imageUrl: string;
	imageName: string;
	fileType: string;
}

interface Frame {
	index: number;
	imageData: ImageData;
	delay: number;
	dataUrl: string;
}

type DecodedFrame = VideoFrame | ImageBitmap;

const FRAME_ADD_DELAY_MS = 50;
const FRAME_DOWNLOAD_DELAY_MS = 100;

const getFrameDimensions = (frame: DecodedFrame) => {
	if ("displayWidth" in frame && "displayHeight" in frame) {
		return { width: frame.displayWidth, height: frame.displayHeight };
	}

	if ("width" in frame && "height" in frame) {
		return { width: frame.width, height: frame.height };
	}

	return { width: 0, height: 0 };
};

export function GifFrameExtractor({
	imageUrl,
	imageName,
	fileType,
}: GifFrameExtractorProps) {
	const { settings } = useSettings();
	const getAddToGallery = () => (window as WindowWithGallery).addGeneratedImage;
	const [frames, setFrames] = useState<Frame[]>([]);
	const [selectedFrames, setSelectedFrames] = useState<Set<number>>(new Set());
	const [currentFrame, setCurrentFrame] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [gifDimensions, setGifDimensions] = useState({ width: 0, height: 0 });
	const [isSaving, setIsSaving] = useState(false);
	const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
	const [hasCachedDir, setHasCachedDir] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		let isActive = true;

		const loadAnimatedImage = async () => {
			setIsLoading(true);
			setError(null);
			setFrames([]);
			setSelectedFrames(new Set());
			setCurrentFrame(0);

			try {
				const response = await fetch(imageUrl, { signal: controller.signal });
				const buffer = await response.arrayBuffer();

				if (!isActive) return;

				if (fileType === "image/gif") {
					await loadGifFrames(buffer);
				} else if (fileType === "image/webp") {
					await loadWebpFrames(buffer);
				} else {
					if (isActive) {
						setError("Unsupported file type for frame extraction");
					}
				}
			} catch (err) {
				if (isActive && !(err instanceof Error && err.name === "AbortError")) {
					setError(
						"Failed to parse animated image. Make sure it's a valid file.",
					);
					console.error(err);
				}
			} finally {
				if (isActive) {
					setIsLoading(false);
				}
			}
		};

		const loadGifFrames = async (buffer: ArrayBuffer) => {
			const gif = parseGIF(buffer);
			const decompressedFrames = decompressFrames(gif, true);

			if (!isActive) return;

			if (decompressedFrames.length === 0) {
				if (isActive) {
					setError("No frames found in GIF");
				}
				return;
			}

			const width = gif.lsd.width;
			const height = gif.lsd.height;

			if (isActive) {
				setGifDimensions({ width, height });
			}

			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d")!;

			const extractedFrames: Frame[] = [];

			for (let i = 0; i < decompressedFrames.length; i++) {
				if (!isActive) return;

				const frame = decompressedFrames[i];
				if (!frame) {
					continue;
				}

				const imageData = new ImageData(
					new Uint8ClampedArray(frame.patch),
					frame.dims.width,
					frame.dims.height,
				);

				if (i === 0) {
					ctx.clearRect(0, 0, width, height);
				}

				const tempCanvas = document.createElement("canvas");
				tempCanvas.width = frame.dims.width;
				tempCanvas.height = frame.dims.height;
				const tempCtx = tempCanvas.getContext("2d")!;
				tempCtx.putImageData(imageData, 0, 0);

				ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);

				const fullFrameData = ctx.getImageData(0, 0, width, height);
				const frameCanvas = document.createElement("canvas");
				frameCanvas.width = width;
				frameCanvas.height = height;
				const frameCtx = frameCanvas.getContext("2d")!;
				frameCtx.putImageData(fullFrameData, 0, 0);

				extractedFrames.push({
					index: i,
					imageData: fullFrameData,
					delay: frame.delay * 10, // Convert centiseconds to milliseconds
					dataUrl: frameCanvas.toDataURL("image/png"),
				});
			}

			if (isActive) {
				setFrames(extractedFrames);
			}
		};

		const loadWebpFrames = async (buffer: ArrayBuffer) => {
			// Use ImageDecoder API for WebP (available in modern browsers)
			if (!("ImageDecoder" in window)) {
				if (isActive) {
					setError(
						"Your browser doesn't support WebP frame extraction. Please use Chrome or Edge.",
					);
				}
				return;
			}

			const decoder = new ImageDecoder({
				data: buffer,
				type: "image/webp",
			});

			try {
				const selectedTrack = (
					decoder as ImageDecoder & {
						tracks?: {
							selectedTrack?: {
								frameCount?: number;
								frameInfo?: Array<{ duration?: number }>;
							};
						};
					}
				).tracks?.selectedTrack;

				await decoder.decode({ frameIndex: 0 });
				if (!isActive) return;

				const frameCount = selectedTrack?.frameCount || 1;

				if (frameCount <= 1) {
					if (isActive) {
						setError("This WebP is not animated (only 1 frame found)");
					}
					return;
				}

				const extractedFrames: Frame[] = [];

				for (let i = 0; i < frameCount; i++) {
					if (!isActive) return;

					const result = await decoder.decode({ frameIndex: i });
					const frame = result.image as DecodedFrame;
					const { width, height } = getFrameDimensions(frame);

					if (i === 0 && isActive) {
						setGifDimensions({ width, height });
					}

					const canvas = document.createElement("canvas");
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext("2d")!;
					ctx.drawImage(frame, 0, 0);

					const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					const duration = selectedTrack?.frameInfo?.[i]?.duration ?? 100000;

					extractedFrames.push({
						index: i,
						imageData,
						delay: Math.round(duration / 1000), // Convert microseconds to milliseconds
						dataUrl: canvas.toDataURL("image/png"),
					});

					if ("close" in frame && typeof frame.close === "function") {
						frame.close();
					}
				}

				if (isActive) {
					setFrames(extractedFrames);
				}
			} finally {
				decoder.close();
			}
		};

		loadAnimatedImage();

		return () => {
			isActive = false;
			controller.abort();
		};
	}, [imageUrl, fileType]);

	// Playback
	useEffect(() => {
		if (!isPlaying || frames.length === 0) return;

		const frame = frames[currentFrame];
		if (!frame) {
			return;
		}
		const timeout = setTimeout(() => {
			setCurrentFrame((prev) => (prev + 1) % frames.length);
		}, frame.delay || 100);

		return () => clearTimeout(timeout);
	}, [isPlaying, currentFrame, frames]);

	const toggleFrame = (index: number) => {
		setSelectedFrames((prev) => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	};

	const selectAll = () => {
		setSelectedFrames(new Set(frames.map((f) => f.index)));
	};

	const selectNone = () => {
		setSelectedFrames(new Set());
	};

	const selectEveryNth = (n: number) => {
		setSelectedFrames(
			new Set(frames.filter((_, i) => i % n === 0).map((f) => f.index)),
		);
	};

	const convertFrameToFormat = (frame: Frame): string => {
		const canvas = document.createElement("canvas");
		canvas.width = gifDimensions.width;
		canvas.height = gifDimensions.height;
		const ctx = canvas.getContext("2d")!;
		ctx.putImageData(frame.imageData, 0, 0);

		const mimeType = getExportMimeType(settings.exportFormat);
		const quality =
			settings.exportFormat === "png" ? undefined : settings.exportQuality;
		return canvas.toDataURL(mimeType, quality);
	};

	const downloadFrame = (frame: Frame) => {
		const link = document.createElement("a");
		const baseName = imageName.replace(/\.[^.]+$/, "");
		const extension = getExportExtension(settings.exportFormat);
		link.download = `${baseName}-frame-${frame.index.toString().padStart(4, "0")}.${extension}`;
		link.href = convertFrameToFormat(frame);
		link.click();
	};

	const addFrameToGallery = (frame: Frame) => {
		const addToGallery = getAddToGallery();
		if (!addToGallery) return;
		const baseName = imageName.replace(/\.[^.]+$/, "");
		const extension = getExportExtension(settings.exportFormat);
		addToGallery(
			convertFrameToFormat(frame),
			`${baseName}-frame-${frame.index.toString().padStart(4, "0")}.${extension}`,
		);
	};

	const downloadSelected = () => {
		const selected = frames.filter((f) => selectedFrames.has(f.index));
		selected.forEach((frame, i) => {
			setTimeout(() => downloadFrame(frame), i * FRAME_DOWNLOAD_DELAY_MS);
		});
	};

	// Check for cached directory on mount
	useEffect(() => {
		const checkCache = async () => {
			const hasCache = await hasCachedDirectory();
			setHasCachedDir(hasCache);
		};
		checkCache();
	}, []);

	const saveToDirectory = async () => {
		const dirHandle = await requestDirectory();
		if (!dirHandle) return;

		// Update cache status after getting directory
		setHasCachedDir(true);

		const selected = frames.filter((f) => selectedFrames.has(f.index));
		if (selected.length === 0) return;

		setIsSaving(true);
		setSaveProgress({ current: 0, total: selected.length });

		try {
			const baseName = imageName.replace(/\.[^.]+$/, "");
			const extension = getExportExtension(settings.exportFormat);
			const files = selected.map((frame) => ({
				filename: `${baseName}-frame-${frame.index.toString().padStart(4, "0")}.${extension}`,
				data: dataUrlToBlob(convertFrameToFormat(frame)),
				subPath: "frames",
			}));

			await saveFilesToDirectory(dirHandle, files, (current, total) => {
				setSaveProgress({ current, total });
			});
		} catch (err) {
			console.error("Failed to save frames:", err);
		} finally {
			setIsSaving(false);
		}
	};

	const handleResetDirectory = async () => {
		await clearCachedDirectory();
		setHasCachedDir(false);
	};

	const goToPrevFrame = () => {
		setCurrentFrame((prev) => (prev - 1 + frames.length) % frames.length);
	};

	const goToNextFrame = () => {
		setCurrentFrame((prev) => (prev + 1) % frames.length);
	};

	if (isLoading) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
					<p className="text-muted-foreground">Extracting frames...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="text-center text-destructive">
					<p>{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col p-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold">GIF Frame Extractor</h2>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">
						{frames.length} frames • {gifDimensions.width}×
						{gifDimensions.height}
					</span>
				</div>
			</div>

			{/* Preview area */}
			<div className="flex-1 flex flex-col gap-4 min-h-0">
				<div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden min-h-0">
					{frames[currentFrame] && (
						<img
							src={frames[currentFrame].dataUrl}
							alt={`Frame ${currentFrame}`}
							className="max-w-full max-h-full object-contain"
							style={{ imageRendering: "pixelated" }}
						/>
					)}
				</div>

				{/* Playback controls */}
				<div className="flex items-center justify-center gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={goToPrevFrame}
						aria-label="Previous frame"
						title="Previous frame"
					>
						<ChevronLeft className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() => setIsPlaying(!isPlaying)}
						aria-label={isPlaying ? "Pause" : "Play"}
						title={isPlaying ? "Pause" : "Play"}
					>
						{isPlaying ? (
							<Pause className="size-4" />
						) : (
							<Play className="size-4" />
						)}
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={goToNextFrame}
						aria-label="Next frame"
						title="Next frame"
					>
						<ChevronRight className="size-4" />
					</Button>
					<span className="text-sm text-muted-foreground ml-2">
						Frame {currentFrame + 1} / {frames.length}
					</span>
				</div>

				{/* Selection controls */}
				<div className="flex items-center gap-2 flex-wrap">
					<Label className="text-sm">Select:</Label>
					<Button variant="outline" size="sm" onClick={selectAll}>
						All
					</Button>
					<Button variant="outline" size="sm" onClick={selectNone}>
						None
					</Button>
					<Button variant="outline" size="sm" onClick={() => selectEveryNth(2)}>
						Every 2nd
					</Button>
					<Button variant="outline" size="sm" onClick={() => selectEveryNth(5)}>
						Every 5th
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => selectEveryNth(10)}
					>
						Every 10th
					</Button>
					<div className="flex-1" />
					<span className="text-sm text-muted-foreground">
						{isSaving
							? `Saving ${saveProgress.current}/${saveProgress.total}...`
							: `${selectedFrames.size} selected`}
					</span>
					<Button
						size="sm"
						onClick={downloadSelected}
						disabled={selectedFrames.size === 0 || isSaving}
					>
						<Download className="size-4" />
						Download
					</Button>
					{getAddToGallery() && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => {
								const selected = frames.filter((f) =>
									selectedFrames.has(f.index),
								);
								selected.forEach((frame, i) => {
									setTimeout(
										() => addFrameToGallery(frame),
										i * FRAME_ADD_DELAY_MS,
									);
								});
							}}
							disabled={selectedFrames.size === 0 || isSaving}
						>
							Add to Gallery
						</Button>
					)}
					{isFileSystemAccessSupported() && (
						<>
							<Button
								size="sm"
								variant="outline"
								onClick={saveToDirectory}
								disabled={selectedFrames.size === 0 || isSaving}
								title={
									hasCachedDir
										? "Save to the previously selected folder"
										: "Save to a folder on your computer"
								}
							>
								<FolderDown className="size-4" />
								Save to Folder
							</Button>
							{hasCachedDir && (
								<Button
									size="sm"
									variant="ghost"
									onClick={handleResetDirectory}
									disabled={isSaving}
									title="Clear saved folder location"
								>
									<X className="size-4" />
								</Button>
							)}
						</>
					)}
				</div>

				{/* Frame grid */}
				<div className="h-32 overflow-x-auto overflow-y-hidden border rounded-lg bg-muted/20">
					<div className="flex gap-1 p-2 h-full">
						{frames.map((frame) => (
							<button
								key={frame.index}
								onClick={() => toggleFrame(frame.index)}
								onDoubleClick={() => {
									setCurrentFrame(frame.index);
									setIsPlaying(false);
								}}
								aria-label={`Frame ${frame.index + 1}`}
								aria-pressed={selectedFrames.has(frame.index)}
								className={cn(
									"relative flex-shrink-0 h-full aspect-square rounded border-2 overflow-hidden transition-all",
									selectedFrames.has(frame.index)
										? "border-primary ring-2 ring-primary/20"
										: "border-transparent hover:border-muted-foreground/30",
									currentFrame === frame.index && "ring-2 ring-blue-500",
								)}
							>
								<img
									src={frame.dataUrl}
									alt={`Frame ${frame.index}`}
									className="w-full h-full object-contain bg-black/5"
								/>
								<span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-0.5">
									{frame.index + 1}
								</span>
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
