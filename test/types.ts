/**
 * Type definitions for test utilities and global test environment
 */

/**
 * Window interface extensions for test environment
 */
export interface TestWindow extends Window {
	addGeneratedImage?: (dataUrl: string, name?: string) => void;
	showDirectoryPicker?: (options?: {
		mode?: string;
		startIn?: string;
	}) => Promise<FileSystemDirectoryHandle>;
	Image?: typeof Image;
}

/**
 * Global interface extensions for test environment
 */
export interface TestGlobal {
	DOMException?: typeof DOMException;
	ImageDecoder?: typeof ImageDecoder;
	ResizeObserver?: typeof ResizeObserver;
	window: TestWindow;
}

/**
 * Mock HTMLImageElement for tests
 */
export interface MockImageElement {
	_src: string;
	crossOrigin: string;
	naturalWidth: number;
	naturalHeight: number;
	onload: (() => void) | null;
	onerror: ((e: Event) => void) | null;
	src: string;
}

/**
 * Type for rest parameters in createElement
 */
export type CreateElementRestArgs = ElementCreationOptions extends never
	? []
	: [ElementCreationOptions?];
