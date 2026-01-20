import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FolderDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isFileSystemAccessSupported,
  requestDirectory,
  saveFilesToDirectory,
  dataUrlToBlob,
  hasCachedDirectory,
  clearCachedDirectory,
} from "@/lib/fileSystem";

interface BatchCropProps {
  imageUrl: string;
  imageName: string;
}

interface CropPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  filename: string;
  enabled: boolean;
}

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const defaultPresets: CropPreset[] = [
  { id: "phone", name: "Google Phone", width: 1080, height: 1920, filename: "phone", enabled: true },
  { id: "tab7", name: "Google Tab 7", width: 1200, height: 1920, filename: "tab7", enabled: true },
  { id: "tab10", name: "Google Tab 10", width: 1800, height: 2560, filename: "tab10", enabled: true },
  { id: "feature", name: "Feature Graphic", width: 1024, height: 500, filename: "feature", enabled: true },
];

export function BatchCrop({ imageUrl, imageName }: BatchCropProps) {
  const [presets, setPresets] = useState<CropPreset[]>(defaultPresets);
  const [selectedPreset, setSelectedPreset] = useState<string>("phone");
  const [cropBoxes, setCropBoxes] = useState<Record<string, CropBox>>({});
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [hasCachedDir, setHasCachedDir] = useState(false);
  const [filenamePrefix, setFilenamePrefix] = useState(() => {
    return imageName.replace(/\.[^.]+$/, "");
  });

  const imageRef = useRef<HTMLImageElement>(null);

  // Check for cached directory on mount
  useEffect(() => {
    const checkCache = async () => {
      const hasCache = await hasCachedDirectory();
      setHasCachedDir(hasCache);
    };
    checkCache();
  }, []);

  const currentPreset = presets.find((p) => p.id === selectedPreset);
  const cropBox = currentPreset ? cropBoxes[currentPreset.id] : null;

  const initializeCropBox = useCallback(
    (preset: CropPreset) => {
      if (!imageSize.width || !imageSize.height) return null;

      const aspectRatio = preset.width / preset.height;
      const imgAspect = imageSize.width / imageSize.height;

      let boxWidth: number;
      let boxHeight: number;

      if (aspectRatio > imgAspect) {
        boxWidth = imageSize.width;
        boxHeight = boxWidth / aspectRatio;
      } else {
        boxHeight = imageSize.height;
        boxWidth = boxHeight * aspectRatio;
      }

      return {
        x: (imageSize.width - boxWidth) / 2,
        y: (imageSize.height - boxHeight) / 2,
        width: boxWidth,
        height: boxHeight,
      };
    },
    [imageSize]
  );

  useEffect(() => {
    if (!imageSize.width || !imageSize.height) return;

    const newCropBoxes: Record<string, CropBox> = {};
    for (const preset of presets) {
      if (!cropBoxes[preset.id]) {
        const box = initializeCropBox(preset);
        if (box) newCropBoxes[preset.id] = box;
      }
    }

    if (Object.keys(newCropBoxes).length > 0) {
      setCropBoxes((prev) => ({ ...prev, ...newCropBoxes }));
    }
  }, [imageSize, presets, initializeCropBox, cropBoxes]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      setImageSize({ width: rect.width, height: rect.height });
      setNaturalSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
    }
  };

  const getMousePosition = (e: React.MouseEvent) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent, action: "drag" | "resize") => {
    e.preventDefault();
    const pos = getMousePosition(e);
    setDragStart(pos);
    if (action === "drag") {
      setIsDragging(true);
    } else {
      setIsResizing(true);
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!cropBox || !currentPreset || (!isDragging && !isResizing)) return;

      const rect = imageRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const aspectRatio = currentPreset.width / currentPreset.height;

      if (isDragging) {
        const deltaX = x - dragStart.x;
        const deltaY = y - dragStart.y;

        let newX = cropBox.x + deltaX;
        let newY = cropBox.y + deltaY;

        newX = Math.max(0, Math.min(newX, imageSize.width - cropBox.width));
        newY = Math.max(0, Math.min(newY, imageSize.height - cropBox.height));

        setCropBoxes((prev) => ({
          ...prev,
          [currentPreset.id]: { ...cropBox, x: newX, y: newY },
        }));
        setDragStart({ x, y });
      } else if (isResizing) {
        const deltaX = x - (cropBox.x + cropBox.width);
        const deltaY = y - (cropBox.y + cropBox.height);

        let newWidth = cropBox.width + deltaX;
        let newHeight = newWidth / aspectRatio;

        if (deltaY > deltaX / aspectRatio) {
          newHeight = cropBox.height + deltaY;
          newWidth = newHeight * aspectRatio;
        }

        newWidth = Math.max(50, Math.min(newWidth, imageSize.width - cropBox.x));
        newHeight = newWidth / aspectRatio;

        if (cropBox.y + newHeight > imageSize.height) {
          newHeight = imageSize.height - cropBox.y;
          newWidth = newHeight * aspectRatio;
        }

        setCropBoxes((prev) => ({
          ...prev,
          [currentPreset.id]: { ...cropBox, width: newWidth, height: newHeight },
        }));
      }
    },
    [cropBox, currentPreset, isDragging, isResizing, dragStart, imageSize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const togglePreset = (id: string) => {
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const generateCroppedImage = async (preset: CropPreset): Promise<Blob | null> => {
    const box = cropBoxes[preset.id];
    if (!box || !imageRef.current) return null;

    const scaleX = naturalSize.width / imageSize.width;
    const scaleY = naturalSize.height / imageSize.height;

    // Output canvas at exact preset dimensions
    const canvas = document.createElement("canvas");
    canvas.width = preset.width;
    canvas.height = preset.height;

    const ctx = canvas.getContext("2d")!;
    
    // Fill with white background (no alpha for Google Play)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Enable high-quality image scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    // Draw cropped region scaled to fill the output canvas
    ctx.drawImage(
      img,
      box.x * scaleX,        // source x
      box.y * scaleY,        // source y
      box.width * scaleX,    // source width
      box.height * scaleY,   // source height
      0,                     // dest x
      0,                     // dest y
      preset.width,          // dest width (scales to exact dimensions)
      preset.height          // dest height (scales to exact dimensions)
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const downloadAll = async () => {
    const enabledPresets = presets.filter((p) => p.enabled && cropBoxes[p.id]);

    for (const preset of enabledPresets) {
      const blob = await generateCroppedImage(preset);
      if (blob) {
        const link = document.createElement("a");
        link.download = `${filenamePrefix}_${preset.filename}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  };

  const saveToDirectory = async () => {
    const dirHandle = await requestDirectory();
    if (!dirHandle) return;

    // Update cache status after getting directory
    setHasCachedDir(true);

    const enabledPresets = presets.filter((p) => p.enabled && cropBoxes[p.id]);
    if (enabledPresets.length === 0) return;

    setIsSaving(true);

    try {
      const files: Array<{ filename: string; data: Blob }> = [];

      for (const preset of enabledPresets) {
        const blob = await generateCroppedImage(preset);
        if (blob) {
          files.push({
            filename: `${filenamePrefix}_${preset.filename}.png`,
            data: blob,
          });
        }
      }

      await saveFilesToDirectory(dirHandle, files);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDirectory = async () => {
    await clearCachedDirectory();
    setHasCachedDir(false);
  };

  const enabledCount = presets.filter((p) => p.enabled).length;

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Batch Crop</h2>
        <div className="flex items-center gap-2">
          <Label htmlFor="prefix" className="text-sm">
            Filename prefix:
          </Label>
          <Input
            id="prefix"
            value={filenamePrefix}
            onChange={(e) => setFilenamePrefix(e.target.value)}
            className="w-48"
          />
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Preset list */}
        <div className="w-64 flex flex-col gap-2">
          <div className="text-sm text-muted-foreground mb-2">
            Click to select, checkbox to include in export
          </div>
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all",
                selectedPreset === preset.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground/50"
              )}
              onClick={() => setSelectedPreset(preset.id)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePreset(preset.id);
                }}
                className={cn(
                  "size-5 rounded border flex items-center justify-center transition-colors",
                  preset.enabled
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/50"
                )}
              >
                {preset.enabled && <Check className="size-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{preset.name}</div>
                <div className="text-xs text-muted-foreground">
                  {preset.width}×{preset.height} • {preset.filename}.png
                </div>
              </div>
            </div>
          ))}

          <div className="mt-auto pt-4 flex flex-col gap-2">
            <Button onClick={downloadAll} disabled={enabledCount === 0 || isSaving}>
              <Download className="size-4" />
              Download All ({enabledCount})
            </Button>
            {isFileSystemAccessSupported() && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={saveToDirectory}
                  disabled={enabledCount === 0 || isSaving}
                  className="flex-1"
                  title={hasCachedDir ? "Save to the previously selected folder" : "Save to a folder on your computer"}
                >
                  <FolderDown className="size-4" />
                  {isSaving ? "Saving..." : "Save to Folder"}
                </Button>
                {hasCachedDir && (
                  <Button
                    variant="ghost"
                    onClick={handleResetDirectory}
                    disabled={isSaving}
                    title="Clear saved folder location"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden">
          <div className="relative inline-block max-w-full max-h-full">
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Image to crop"
              onLoad={handleImageLoad}
              className="max-w-full max-h-[calc(100vh-250px)] object-contain select-none"
              draggable={false}
            />

            {cropBox && currentPreset && (
              <>
                <div
                  className="absolute border-2 border-white cursor-move"
                  style={{
                    left: cropBox.x,
                    top: cropBox.y,
                    width: cropBox.width,
                    height: cropBox.height,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                  }}
                  onMouseDown={(e) => handleMouseDown(e, "drag")}
                >
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="border border-white/30" />
                    ))}
                  </div>

                  <div
                    className="absolute -right-2 -bottom-2 w-4 h-4 bg-white rounded-full cursor-se-resize shadow-md"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleMouseDown(e, "resize");
                    }}
                  />

                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />

                  <div className="absolute -top-6 left-0 text-xs text-white bg-black/50 px-1 rounded">
                    {currentPreset.name} ({currentPreset.width}×{currentPreset.height})
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
