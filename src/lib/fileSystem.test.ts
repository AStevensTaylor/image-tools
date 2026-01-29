import { afterEach, beforeEach, expect, test } from "vitest";
import type { TestGlobal, TestWindow } from "../../test/types";
import {
	checkFilesExist,
	dataUrlToBlob,
	isFileSystemAccessSupported,
	requestDirectory,
	saveFilesToDirectory,
	saveFileToDirectory,
} from "./fileSystem";

interface MockFileSystemFileHandle {
	name: string;
	createWritable: () => Promise<MockFileSystemWritableFileStream>;
}

interface MockFileSystemWritableFileStream {
	write: (data: Blob | string) => Promise<void>;
	close: () => Promise<void>;
}

interface MockFileSystemDirectoryHandle {
	name: string;
	getFileHandle: (
		name: string,
		options?: { create?: boolean },
	) => Promise<MockFileSystemFileHandle>;
	getDirectoryHandle: (
		name: string,
		options?: { create?: boolean },
	) => Promise<MockFileSystemDirectoryHandle>;
	queryPermission?: (descriptor?: {
		mode?: string;
	}) => Promise<PermissionStatus>;
	requestPermission?: (descriptor?: {
		mode?: string;
	}) => Promise<PermissionStatus>;
}

class MockWritableFileStream implements MockFileSystemWritableFileStream {
	chunks: (Blob | string)[] = [];

	async write(data: Blob | string): Promise<void> {
		this.chunks.push(data);
	}

	async close(): Promise<void> {
		void 0;
	}
}

class MockFileHandle implements MockFileSystemFileHandle {
	name: string;

	constructor(name: string) {
		this.name = name;
	}

	async createWritable(): Promise<MockFileSystemWritableFileStream> {
		return new MockWritableFileStream();
	}
}

class MockDirectoryHandle implements MockFileSystemDirectoryHandle {
	name: string;

	files: Map<string, MockFileHandle> = new Map();

	subdirs: Map<string, MockDirectoryHandle> = new Map();

	permissionState: PermissionStatus = "granted" as unknown as PermissionStatus;

	queryPermission?: (descriptor?: {
		mode?: string;
	}) => Promise<PermissionStatus>;

	requestPermission?: (descriptor?: {
		mode?: string;
	}) => Promise<PermissionStatus>;

	constructor(name: string) {
		this.name = name;
		this.queryPermission = async () => this.permissionState;
		this.requestPermission = async () => this.permissionState;
	}

	async getFileHandle(
		name: string,
		options?: { create?: boolean },
	): Promise<MockFileSystemFileHandle> {
		if (this.files.has(name)) {
			return this.files.get(name) as MockFileHandle;
		}
		if (!options?.create) {
			const DOMExceptionConstructor = (global as TestGlobal).DOMException;
			if (DOMExceptionConstructor) {
				throw new DOMExceptionConstructor("File not found", "NotFoundError");
			}
		}
		const handle = new MockFileHandle(name);
		this.files.set(name, handle);
		return handle;
	}

	async getDirectoryHandle(
		name: string,
		options?: { create?: boolean },
	): Promise<MockFileSystemDirectoryHandle> {
		if (this.subdirs.has(name)) {
			return this.subdirs.get(name) as MockDirectoryHandle;
		}
		if (!options?.create) {
			const DOMExceptionConstructor = (global as TestGlobal).DOMException;
			if (DOMExceptionConstructor) {
				throw new DOMExceptionConstructor(
					"Directory not found",
					"NotFoundError",
				);
			}
		}
		const handle = new MockDirectoryHandle(name);
		this.subdirs.set(name, handle);
		return handle;
	}
}

beforeEach(() => {
	(global.window as TestWindow).showDirectoryPicker = undefined;
	(global as TestGlobal).DOMException = class DOMException extends Error {
		constructor(
			message: string,
			public override name: string,
		) {
			super(message);
		}
	} as unknown as typeof DOMException;
});

afterEach(() => {
	const win = global.window as TestWindow;
	if (win && "showDirectoryPicker" in win) {
		delete win.showDirectoryPicker;
	}
});

test("isFileSystemAccessSupported returns true when showDirectoryPicker exists", () => {
	(global.window as TestWindow).showDirectoryPicker = () =>
		Promise.resolve({} as FileSystemDirectoryHandle);
	expect(isFileSystemAccessSupported()).toBe(true);
});

test("isFileSystemAccessSupported returns false when showDirectoryPicker not available", () => {
	const win = global.window as TestWindow;
	if (win && "showDirectoryPicker" in win) {
		delete win.showDirectoryPicker;
	}
	expect(isFileSystemAccessSupported()).toBe(false);
});

test("requestDirectory returns null when API not supported", async () => {
	const win = global.window as TestWindow;
	if (win && "showDirectoryPicker" in win) {
		delete win.showDirectoryPicker;
	}
	const result = await requestDirectory();
	expect(result).toBeNull();
});

test("requestDirectory returns null when user cancels", async () => {
	const DOMExceptionConstructor = (global as TestGlobal).DOMException;
	if (!DOMExceptionConstructor) {
		throw new Error("DOMException not available");
	}
	const error = new DOMExceptionConstructor("User cancelled", "AbortError");
	(global.window as TestWindow).showDirectoryPicker = async () => {
		throw error;
	};

	const result = await requestDirectory(false);
	expect(result).toBeNull();
});

test("requestDirectory opens picker with readwrite mode", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	const options: { mode?: string; startIn?: string } = {};

	(global.window as TestWindow).showDirectoryPicker = async (opts?: {
		mode?: string;
		startIn?: string;
	}) => {
		if (opts) {
			Object.assign(options, opts);
		}
		return dirHandle as unknown as FileSystemDirectoryHandle;
	};

	await requestDirectory(false);
	expect(options.mode).toBe("readwrite");
	expect(options.startIn).toBe("downloads");
});

test("saveFileToDirectory saves file to directory", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	const blob = new Blob(["test content"]);

	await saveFileToDirectory(
		dirHandle as unknown as FileSystemDirectoryHandle,
		"test.txt",
		blob,
	);
	expect(dirHandle.files.has("test.txt")).toBe(true);
});

test("saveFileToDirectory saves file with string content", async () => {
	const dirHandle = new MockDirectoryHandle("test");

	await saveFileToDirectory(
		dirHandle as unknown as FileSystemDirectoryHandle,
		"test.txt",
		"test content",
	);
	expect(dirHandle.files.has("test.txt")).toBe(true);
});

test("saveFileToDirectory creates subdirectories", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	const blob = new Blob(["content"]);

	await saveFileToDirectory(
		dirHandle as unknown as FileSystemDirectoryHandle,
		"file.txt",
		blob,
		"path/to/nested",
	);
	expect(dirHandle.subdirs.has("path")).toBe(true);
	expect(dirHandle.subdirs.get("path")?.subdirs.has("to")).toBe(true);
	expect(
		dirHandle.subdirs.get("path")?.subdirs.get("to")?.subdirs.has("nested"),
	).toBe(true);
});

test("saveFileToDirectory rejects invalid filename ../invalid", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	const blob = new Blob(["content"]);

	try {
		await saveFileToDirectory(
			dirHandle as unknown as FileSystemDirectoryHandle,
			"../invalid",
			blob,
		);
		throw new Error("Should have thrown");
	} catch (err) {
		expect((err as Error).message).toContain("Invalid path segment");
	}
});

test("saveFileToDirectory rejects filename with slashes", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	const blob = new Blob(["content"]);

	try {
		await saveFileToDirectory(
			dirHandle as unknown as FileSystemDirectoryHandle,
			"file/name.txt",
			blob,
		);
		throw new Error("Should have thrown");
	} catch (err) {
		expect((err as Error).message).toContain("Invalid path segment");
	}
});

test("saveFileToDirectory rejects invalid subPath with traversal", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	const blob = new Blob(["content"]);

	try {
		await saveFileToDirectory(
			dirHandle as unknown as FileSystemDirectoryHandle,
			"file.txt",
			blob,
			"path/../evil",
		);
		throw new Error("Should have thrown");
	} catch (err) {
		expect((err as Error).message).toContain("Invalid path segment");
	}
});

test("saveFileToDirectory rejects empty filename", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	const blob = new Blob(["content"]);

	try {
		await saveFileToDirectory(
			dirHandle as unknown as FileSystemDirectoryHandle,
			"   ",
			blob,
		);
		throw new Error("Should have thrown");
	} catch (err) {
		expect((err as Error).message).toContain("Invalid path segment");
	}
});

test("saveFileToDirectory rejects dot filename", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	const blob = new Blob(["content"]);

	try {
		await saveFileToDirectory(
			dirHandle as unknown as FileSystemDirectoryHandle,
			".",
			blob,
		);
		throw new Error("Should have thrown");
	} catch (err) {
		expect((err as Error).message).toContain("Invalid path segment");
	}
});

test("saveFileToDirectory rejects double-dot filename", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	const blob = new Blob(["content"]);

	try {
		await saveFileToDirectory(
			dirHandle as unknown as FileSystemDirectoryHandle,
			"..",
			blob,
		);
		throw new Error("Should have thrown");
	} catch (err) {
		expect((err as Error).message).toContain("Invalid path segment");
	}
});

test("checkFilesExist returns existing files", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	await saveFileToDirectory(
		dirHandle as unknown as FileSystemDirectoryHandle,
		"exists1.txt",
		"content",
	);
	await saveFileToDirectory(
		dirHandle as unknown as FileSystemDirectoryHandle,
		"exists2.txt",
		"content",
	);

	const result = await checkFilesExist(
		dirHandle as unknown as FileSystemDirectoryHandle,
		["exists1.txt", "exists2.txt", "missing.txt"],
	);
	expect(result.length).toBe(2);
	expect(result).toContain("exists1.txt");
	expect(result).toContain("exists2.txt");
});

test("checkFilesExist returns empty array for missing files", async () => {
	const dirHandle = new MockDirectoryHandle("test");

	const result = await checkFilesExist(
		dirHandle as unknown as FileSystemDirectoryHandle,
		["missing1.txt", "missing2.txt"],
	);
	expect(result.length).toBe(0);
});

test("checkFilesExist handles mixed existing and missing", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	await saveFileToDirectory(
		dirHandle as unknown as FileSystemDirectoryHandle,
		"file1.txt",
		"content1",
	);
	await saveFileToDirectory(
		dirHandle as unknown as FileSystemDirectoryHandle,
		"file3.txt",
		"content3",
	);

	const result = await checkFilesExist(
		dirHandle as unknown as FileSystemDirectoryHandle,
		["file1.txt", "file2.txt", "file3.txt", "file4.txt"],
	);
	expect(result.length).toBe(2);
	expect(result).toContain("file1.txt");
	expect(result).toContain("file3.txt");
	expect(result).not.toContain("file2.txt");
	expect(result).not.toContain("file4.txt");
});

test("saveFilesToDirectory saves multiple files", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	const files = [
		{ filename: "file1.txt", data: "content1" },
		{ filename: "file2.txt", data: "content2" },
		{ filename: "file3.txt", data: "content3" },
	];

	await saveFilesToDirectory(
		dirHandle as unknown as FileSystemDirectoryHandle,
		files,
	);
	expect(dirHandle.files.has("file1.txt")).toBe(true);
	expect(dirHandle.files.has("file2.txt")).toBe(true);
	expect(dirHandle.files.has("file3.txt")).toBe(true);
});

test("saveFilesToDirectory calls onProgress callback", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	const files = [
		{ filename: "file1.txt", data: "content1" },
		{ filename: "file2.txt", data: "content2" },
	];

	const progressCalls: Array<[number, number, string]> = [];
	const onProgress = (current: number, total: number, filename: string) => {
		progressCalls.push([current, total, filename]);
	};

	await saveFilesToDirectory(
		dirHandle as unknown as FileSystemDirectoryHandle,
		files,
		onProgress,
	);
	expect(progressCalls.length).toBe(2);
	expect(progressCalls[0]).toEqual([1, 2, "file1.txt"]);
	expect(progressCalls[1]).toEqual([2, 2, "file2.txt"]);
});

test("saveFilesToDirectory saves files with subPath", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	const files = [
		{ filename: "file1.txt", data: "content1", subPath: "dir1" },
		{ filename: "file2.txt", data: "content2", subPath: "dir2" },
	];

	await saveFilesToDirectory(
		dirHandle as unknown as FileSystemDirectoryHandle,
		files,
	);
	expect(dirHandle.subdirs.has("dir1")).toBe(true);
	expect(dirHandle.subdirs.has("dir2")).toBe(true);
});

test("dataUrlToBlob converts PNG data URL", () => {
	const dataUrl =
		"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
	const blob = dataUrlToBlob(dataUrl);

	expect(blob.type).toBe("image/png");
	expect(blob.size).toBeGreaterThan(0);
});

test("dataUrlToBlob converts JPEG data URL", () => {
	const dataUrl =
		"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";
	const blob = dataUrlToBlob(dataUrl);

	expect(blob.type).toBe("image/jpeg");
	expect(blob.size).toBeGreaterThan(0);
});

test("dataUrlToBlob with empty MIME type extracted", () => {
	const dataUrl =
		"data:;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

	try {
		dataUrlToBlob(dataUrl);
		throw new Error("Should have thrown");
	} catch (err) {
		expect((err as Error).message).toContain("Invalid MIME type");
	}
});

test("dataUrlToBlob rejects invalid data URL without comma", () => {
	try {
		dataUrlToBlob("data:image/png;base64");
		throw new Error("Should have thrown");
	} catch (err) {
		expect((err as Error).message).toContain("Invalid data URL");
	}
});

test("dataUrlToBlob rejects non-raster MIME types", () => {
	const dataUrl =
		"data:application/javascript;base64,Y29uc29sZS5sb2coImV2aWwiKQ==";

	try {
		dataUrlToBlob(dataUrl);
		throw new Error("Should have thrown");
	} catch (err) {
		expect((err as Error).message).toContain("Invalid MIME type");
	}
});

test("dataUrlToBlob accepts whitelisted MIME types", () => {
	const validMimes = [
		"image/png",
		"image/jpeg",
		"image/gif",
		"image/webp",
		"image/avif",
		"image/heic",
		"image/heif",
		"image/bmp",
		"image/tiff",
		"image/x-icon",
	];

	for (const mime of validMimes) {
		const dataUrl = `data:${mime};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
		const blob = dataUrlToBlob(dataUrl);
		expect(blob.type).toBe(mime);
	}
});

test("dataUrlToBlob handles base64 data correctly", () => {
	const dataUrl =
		"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
	const blob = dataUrlToBlob(dataUrl);

	expect(blob).toBeInstanceOf(Blob);
	expect(blob.size).toBeGreaterThan(0);
});

test("saveFileToDirectory accepts valid filename characters", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	const blob = new Blob(["content"]);

	await saveFileToDirectory(
		dirHandle as unknown as FileSystemDirectoryHandle,
		"valid-file_name.123",
		blob,
	);
	expect(dirHandle.files.has("valid-file_name.123")).toBe(true);
});

test("saveFilesToDirectory with empty files array", async () => {
	const dirHandle = new MockDirectoryHandle("test");
	const files: Array<{
		filename: string;
		data: Blob | string;
		subPath?: string;
	}> = [];

	await saveFilesToDirectory(
		dirHandle as unknown as FileSystemDirectoryHandle,
		files,
	);
	expect(dirHandle.files.size).toBe(0);
});

test("checkFilesExist with empty filenames array", async () => {
	const dirHandle = new MockDirectoryHandle("test");

	const result = await checkFilesExist(
		dirHandle as unknown as FileSystemDirectoryHandle,
		[],
	);
	expect(result.length).toBe(0);
});
