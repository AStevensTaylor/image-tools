import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface GifFrameExtractorProps {
  imageUrl: string;
  imageName: string;
  fileType: string;
}

// Helper to check if file is a video format
const isVideoFormat = (fileType: string): boolean => {
  return fileType.startsWith("video/");
};

// Helper to check if file is a GIF/WebP
const isAnimatedImage = (fileType: string): boolean => {
  return fileType === "image/gif" || fileType === "image/webp";
};

// File extension pattern for animated/video formats
const FRAME_EXTRACT_FILE_EXTENSIONS = /\.(gif|webp|mp4|webm|mov|avi)$/i;

export function GifFrameExtractor({ imageUrl, imageName, fileType }: GifFrameExtractorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [isPrecisionMode, setIsPrecisionMode] = useState(false);

  // Convert GIF/WebP to video for consistent playback
  useEffect(() => {
    const convertToVideo = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (isVideoFormat(fileType)) {
          // Use video directly
          setVideoUrl(imageUrl);
          // Note: isLoading will be set to false in handleLoadedMetadata
        } else if (isAnimatedImage(fileType)) {
          // Convert GIF/WebP to video
          await convertAnimatedImageToVideo(imageUrl, fileType);
        } else {
          setError("Unsupported file type. Please use video files (MP4, WebM, MOV).");
          setIsLoading(false);
        }
      } catch (err) {
        setError("Failed to load file. Please try again.");
        setIsLoading(false);
        console.error(err);
      }
    };

    convertToVideo();
  }, [imageUrl, fileType]);

  const convertAnimatedImageToVideo = async (url: string, type: string) => {
    // For GIF/WebP, since HTML5 video can't play them directly,
    // we need to render them using canvas
    // For now, we'll use the image directly and show a message
    // A full implementation would extract frames and create a video blob
    setError("GIF/WebP playback not yet fully implemented. Please use video files (MP4, WebM, MOV) for now.");
    setIsLoading(false);
    
    // TODO: Implement proper GIF/WebP to video conversion
    // This would require:
    // 1. Extract all frames from GIF/WebP
    // 2. Create a MediaRecorder stream
    // 3. Encode frames as video
    // 4. Create a video blob URL
  };

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setVideoDimensions({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      });
      setIsLoading(false);
    }
  };

  // Handle video error
  const handleVideoError = () => {
    setError("Failed to load video. Please check the file format and try again.");
    setIsLoading(false);
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current && !isDragging) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Seek to specific frame (1 frame forward)
  const seekFrameForward = () => {
    if (videoRef.current) {
      const fps = 30; // Assume 30fps
      const frameDuration = 1 / fps;
      videoRef.current.currentTime = Math.min(
        videoRef.current.currentTime + frameDuration,
        videoRef.current.duration
      );
    }
  };

  // Seek to specific frame (1 frame backward)
  const seekFrameBackward = () => {
    if (videoRef.current) {
      const fps = 30; // Assume 30fps
      const frameDuration = 1 / fps;
      videoRef.current.currentTime = Math.max(
        videoRef.current.currentTime - frameDuration,
        0
      );
    }
  };

  // Export current frame
  const exportCurrentFrame = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    // Download as PNG
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const extension = imageName.match(FRAME_EXTRACT_FILE_EXTENSIONS);
      const baseName = extension ? imageName.replace(extension[0], "") : imageName;
      const timestamp = Math.floor(currentTime * 1000);
      link.download = `${baseName}-frame-${timestamp}ms.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  // Handle scrubber mouse down
  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartTime(videoRef.current.currentTime);
  };

  // Handle scrubber mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !videoRef.current) return;

      const deltaY = dragStartY - e.clientY;
      
      // Check if dragging up to enter precision mode
      if (deltaY > 20 && !isPrecisionMode) {
        setIsPrecisionMode(true);
      }

      if (isPrecisionMode) {
        // Precision mode: ±1s across screen width
        const rect = videoRef.current.getBoundingClientRect();
        const deltaX = e.clientX - rect.left;
        const normalizedX = deltaX / rect.width; // 0 to 1
        const timeOffset = (normalizedX - 0.5) * 2; // -1 to 1
        const newTime = Math.max(0, Math.min(
          dragStartTime + timeOffset,
          videoRef.current.duration
        ));
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      } else {
        // Normal mode: scrub through entire video
        const rect = videoRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        const newTime = percentage * videoRef.current.duration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsPrecisionMode(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStartY, dragStartTime, isPrecisionMode]);

  // Handle scrubber click (for normal seeking)
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading media...</p>
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

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Frame Extractor</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {videoDimensions.width}×{videoDimensions.height}
          </span>
        </div>
      </div>

      {/* Video Player */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden min-h-0">
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-w-full max-h-full"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onError={handleVideoError}
            preload="metadata"
            muted
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3">
          {/* Frame navigation */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={seekFrameBackward}
              title="Previous frame"
            >
              <SkipBack className="size-4" />
            </Button>
            <Button
              size="sm"
              onClick={exportCurrentFrame}
              title="Export current frame as PNG"
            >
              <Download className="size-4 mr-2" />
              Export Frame
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={seekFrameForward}
              title="Next frame"
            >
              <SkipForward className="size-4" />
            </Button>
          </div>

          {/* Time display */}
          <div className="text-center text-sm text-muted-foreground">
            {currentTime.toFixed(3)}s / {duration.toFixed(3)}s
            {isPrecisionMode && (
              <span className="ml-2 text-primary">(Precision Mode: ±1s)</span>
            )}
          </div>

          {/* Custom scrubber */}
          <div
            className={cn(
              "relative h-12 bg-muted rounded-lg cursor-pointer transition-all",
              isDragging && "ring-2 ring-primary",
              isPrecisionMode && "bg-primary/10"
            )}
            onMouseDown={handleScrubberMouseDown}
            onClick={handleScrubberClick}
          >
            {/* Progress bar */}
            <div
              className="absolute inset-0 bg-primary/20 rounded-lg transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
            
            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-primary rounded-full"
              style={{ left: `${progressPercentage}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full border-2 border-background" />
            </div>

            {/* Instruction text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs text-muted-foreground">
                {isPrecisionMode 
                  ? "Drag left/right to scrub ±1s"
                  : "Drag up for precision mode, or click to seek"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
