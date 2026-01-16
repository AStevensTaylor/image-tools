import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, RotateCcw } from "lucide-react";

interface AspectRatioCropProps {
  imageUrl: string;
  imageName: string;
}

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function AspectRatioCrop({ imageUrl, imageName }: AspectRatioCropProps) {
  const [aspectWidth, setAspectWidth] = useState("16");
  const [aspectHeight, setAspectHeight] = useState("9");
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const aspectRatio =
    parseFloat(aspectWidth) / parseFloat(aspectHeight) || 16 / 9;

  const initializeCropBox = useCallback(() => {
    if (!imageSize.width || !imageSize.height) return;

    const imgAspect = imageSize.width / imageSize.height;
    let boxWidth: number;
    let boxHeight: number;

    // Make the crop box as large as possible while fitting within the image
    if (aspectRatio > imgAspect) {
      // Crop box is wider than image - constrain by width
      boxWidth = imageSize.width;
      boxHeight = boxWidth / aspectRatio;
    } else {
      // Crop box is taller than image - constrain by height
      boxHeight = imageSize.height;
      boxWidth = boxHeight * aspectRatio;
    }

    setCropBox({
      x: (imageSize.width - boxWidth) / 2,
      y: (imageSize.height - boxHeight) / 2,
      width: boxWidth,
      height: boxHeight,
    });
  }, [imageSize, aspectRatio]);

  useEffect(() => {
    initializeCropBox();
  }, [initializeCropBox]);

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

  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        setImageSize({ width: rect.width, height: rect.height });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      if (!cropBox || (!isDragging && !isResizing)) return;

      const rect = imageRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isDragging) {
        const deltaX = x - dragStart.x;
        const deltaY = y - dragStart.y;

        let newX = cropBox.x + deltaX;
        let newY = cropBox.y + deltaY;

        newX = Math.max(0, Math.min(newX, imageSize.width - cropBox.width));
        newY = Math.max(0, Math.min(newY, imageSize.height - cropBox.height));

        setCropBox({ ...cropBox, x: newX, y: newY });
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

        setCropBox({ ...cropBox, width: newWidth, height: newHeight });
      }
    },
    [cropBox, isDragging, isResizing, dragStart, aspectRatio, imageSize]
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

  const handleCrop = async () => {
    if (!cropBox || !imageRef.current) return;

    const scaleX = naturalSize.width / imageSize.width;
    const scaleY = naturalSize.height / imageSize.height;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = cropBox.width * scaleX;
    canvas.height = cropBox.height * scaleY;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    ctx.drawImage(
      img,
      cropBox.x * scaleX,
      cropBox.y * scaleY,
      cropBox.width * scaleX,
      cropBox.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const link = document.createElement("a");
    link.download = `cropped-${imageName}`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">Aspect Ratio Crop</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="aspect-width" className="sr-only">
              Width
            </Label>
            <Input
              id="aspect-width"
              type="number"
              value={aspectWidth}
              onChange={(e) => setAspectWidth(e.target.value)}
              className="w-16"
              min="1"
            />
            <span className="text-muted-foreground">:</span>
            <Label htmlFor="aspect-height" className="sr-only">
              Height
            </Label>
            <Input
              id="aspect-height"
              type="number"
              value={aspectHeight}
              onChange={(e) => setAspectHeight(e.target.value)}
              className="w-16"
              min="1"
            />
          </div>
          <Button variant="outline" size="sm" onClick={initializeCropBox}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
          <Button size="sm" onClick={handleCrop} disabled={!cropBox}>
            <Download className="size-4" />
            Download Crop
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden"
      >
        <div className="relative inline-block max-w-full max-h-full">
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Image to crop"
            onLoad={handleImageLoad}
            className="max-w-full max-h-[calc(100vh-200px)] object-contain select-none"
            draggable={false}
          />

          {cropBox && (
            <>
              {/* Darkened overlay outside crop area */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(to right, 
                    rgba(0,0,0,0.5) ${cropBox.x}px, 
                    transparent ${cropBox.x}px, 
                    transparent ${cropBox.x + cropBox.width}px, 
                    rgba(0,0,0,0.5) ${cropBox.x + cropBox.width}px)`,
                }}
              />
              <div
                className="absolute pointer-events-none"
                style={{
                  left: cropBox.x,
                  top: 0,
                  width: cropBox.width,
                  height: cropBox.y,
                  background: "rgba(0,0,0,0.5)",
                }}
              />
              <div
                className="absolute pointer-events-none"
                style={{
                  left: cropBox.x,
                  top: cropBox.y + cropBox.height,
                  width: cropBox.width,
                  height: imageSize.height - (cropBox.y + cropBox.height),
                  background: "rgba(0,0,0,0.5)",
                }}
              />

              {/* Crop box */}
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
                {/* Grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="border border-white/30" />
                  ))}
                </div>

                {/* Resize handle */}
                <div
                  className="absolute -right-2 -bottom-2 w-4 h-4 bg-white rounded-full cursor-se-resize shadow-md"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, "resize");
                  }}
                />

                {/* Corner indicators */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
