export interface WindowWithGallery extends Window {
	addGeneratedImage?: (dataUrl: string, name?: string) => void;
}
