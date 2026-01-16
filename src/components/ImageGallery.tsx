import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ImageItem {
  id: string;
  file: File;
  url: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface ImageGalleryProps {
  images: ImageItem[];
  selectedImageId: string | null;
  onImagesAdd: (files: FileList) => void;
  onImageSelect: (id: string) => void;
  onImageRemove: (id: string) => void;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function getAspectRatio(width: number, height: number): string {
  const divisor = gcd(width, height);
  const w = width / divisor;
  const h = height / divisor;
  // Simplify common ratios
  if (w > 50 || h > 50) {
    const ratio = width / height;
    if (Math.abs(ratio - 16/9) < 0.01) return "16:9";
    if (Math.abs(ratio - 4/3) < 0.01) return "4:3";
    if (Math.abs(ratio - 3/2) < 0.01) return "3:2";
    if (Math.abs(ratio - 1) < 0.01) return "1:1";
    if (Math.abs(ratio - 9/16) < 0.01) return "9:16";
    return `${ratio.toFixed(2)}:1`;
  }
  return `${w}:${h}`;
}

function ImageThumbnail({ 
  image, 
  isSelected, 
  onSelect, 
  onRemove 
}: { 
  image: ImageItem; 
  isSelected: boolean; 
  onSelect: () => void; 
  onRemove: () => void;
}) {
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = image.url;
  }, [image.url]);

  return (
    <div
      className={cn(
        "relative rounded-md overflow-hidden cursor-pointer border-2 transition-all",
        "aspect-square min-w-[120px] md:min-w-0",
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-transparent hover:border-muted-foreground/30"
      )}
      onClick={onSelect}
    >
      <img
        src={image.url}
        alt={image.file.name}
        className="w-full h-full object-cover"
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
      >
        <X className="size-3" />
      </button>
      {dimensions && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1.5 py-1 text-center">
          {dimensions.width}×{dimensions.height} • {getAspectRatio(dimensions.width, dimensions.height)}
        </div>
      )}
    </div>
  );
}

export function ImageGallery({
  images,
  selectedImageId,
  onImagesAdd,
  onImageSelect,
  onImageRemove,
}: ImageGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImagesAdd(e.target.files);
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImagesAdd(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="h-full flex flex-col bg-card border-t md:border-t-0 md:border-r border-border">
      {/* Mobile: Horizontal layout with upload button on left, Desktop: Vertical with header */}
      <div className="p-2 md:p-4 border-b border-border flex md:flex-col gap-2">
        <h2 className="text-sm md:text-lg font-semibold md:mb-3 hidden md:block">Image Gallery</h2>
        <Button onClick={handleUploadClick} className="w-full flex-1 md:flex-none" size="sm">
          <Upload className="size-4" />
          <span className="hidden md:inline">Upload Images</span>
          <span className="md:hidden">Upload</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div
        className="flex-1 overflow-x-auto md:overflow-y-auto p-2"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {images.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
            <ImageIcon className="size-12 mb-2 opacity-50" />
            <p className="text-sm text-center">
              Drag and drop images here or click upload
            </p>
          </div>
        ) : (
          <div className="flex md:grid md:grid-cols-2 gap-2">
            {images.map((image) => (
              <ImageThumbnail
                key={image.id}
                image={image}
                isSelected={selectedImageId === image.id}
                onSelect={() => onImageSelect(image.id)}
                onRemove={() => onImageRemove(image.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
