import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ImageItem {
  id: string;
  file: File;
  url: string;
}

interface ImageGalleryProps {
  images: ImageItem[];
  selectedImageId: string | null;
  onImagesAdd: (files: FileList) => void;
  onImageSelect: (id: string) => void;
  onImageRemove: (id: string) => void;
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
    <div className="h-full flex flex-col bg-card border-r border-border">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">Image Gallery</h2>
        <Button onClick={handleUploadClick} className="w-full" size="sm">
          <Upload className="size-4" />
          Upload Images
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
        className="flex-1 overflow-y-auto p-2"
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
          <div className="grid grid-cols-2 gap-2">
            {images.map((image) => (
              <div
                key={image.id}
                className={cn(
                  "relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all",
                  selectedImageId === image.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-transparent hover:border-muted-foreground/30"
                )}
                onClick={() => onImageSelect(image.id)}
              >
                <img
                  src={image.url}
                  alt={image.file.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageRemove(image.id);
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
