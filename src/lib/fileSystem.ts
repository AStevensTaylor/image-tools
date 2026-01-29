type PermissionMode = "read" | "readwrite";

type PermissionDescriptor = {
	mode?: PermissionMode;
};

type DirectoryPicker = (options?: {
	mode?: PermissionMode;
	startIn?:
		| FileSystemHandle
		| "desktop"
		| "documents"
		| "downloads"
		| "music"
		| "pictures"
		| "videos";
}) => Promise<FileSystemDirectoryHandle>;

type PermissionCapableDirectoryHandle = FileSystemDirectoryHandle & {
	queryPermission?: (
		descriptor?: PermissionDescriptor,
	) => Promise<PermissionState>;
	requestPermission?: (
		descriptor?: PermissionDescriptor,
	) => Promise<PermissionState>;
};

/**
 * Checks if the File System Access API is supported in the current browser.
 * @returns True if showDirectoryPicker is available, false otherwise
 */
export function isFileSystemAccessSupported(): boolean {
	return "showDirectoryPicker" in window;
}

const DB_NAME = "image-tools-db";
const DB_VERSION = 1;
const STORE_NAME = "directory-handles";
const HANDLE_KEY = "saved-directory";

/**
 * Opens or creates the IndexedDB database for storing directory handles.
 * Initializes the object store if needed.
 * @returns Promise resolving to the opened IDBDatabase instance
 */
function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
	});
}

/**
 * Persists a directory handle to IndexedDB for later retrieval.
 * Allows users to avoid re-selecting directories on subsequent app uses.
 * @param handle - The FileSystemDirectoryHandle to save
 * @returns Promise that resolves when the handle is saved
 */
export async function saveCachedDirectory(
	handle: FileSystemDirectoryHandle,
): Promise<void> {
	try {
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		store.put(handle, HANDLE_KEY);

		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => {
				db.close();
				resolve();
			};
			transaction.onerror = () => {
				db.close();
				reject(transaction.error);
			};
		});
	} catch (err) {
		console.error("Failed to save directory handle:", err);
	}
}

/**
 * Retrieves a previously saved directory handle from IndexedDB.
 * Verifies that permission is still granted before returning the handle.
 * @returns Promise resolving to the directory handle if found and accessible, null otherwise
 */
export async function getCachedDirectory(): Promise<FileSystemDirectoryHandle | null> {
	try {
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, "readonly");
		const store = transaction.objectStore(STORE_NAME);
		const request = store.get(HANDLE_KEY);

		return new Promise((resolve) => {
			request.onsuccess = async () => {
				db.close();
				const handle = request.result as FileSystemDirectoryHandle | undefined;

				if (!handle) {
					resolve(null);
					return;
				}

				// Verify we still have permission
				const permissionHandle = handle as PermissionCapableDirectoryHandle;

				try {
					const permission = permissionHandle.queryPermission
						? await permissionHandle.queryPermission({ mode: "readwrite" })
						: "granted";

					if (permission === "granted") {
						resolve(handle);
						return;
					}

					if (permissionHandle.requestPermission) {
						const requestedPermission =
							await permissionHandle.requestPermission({ mode: "readwrite" });
						if (requestedPermission === "granted") {
							resolve(handle);
							return;
						}
					}

					resolve(null);
				} catch (err) {
					console.error("Permission check failed:", err);
					resolve(null);
				}
			};

			request.onerror = () => {
				db.close();
				resolve(null);
			};
		});
	} catch (err) {
		console.error("Failed to get cached directory:", err);
		return null;
	}
}

// Clear cached directory handle
/**
 * Removes the cached directory handle from IndexedDB storage.
 * Called when the user opts to clear their directory selection.
 * @returns Promise that resolves when the cached handle is deleted
 */
export async function clearCachedDirectory(): Promise<void> {
	try {
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		store.delete(HANDLE_KEY);

		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => {
				db.close();
				resolve();
			};
			transaction.onerror = () => {
				db.close();
				reject(transaction.error);
			};
		});
	} catch (err) {
		console.error("Failed to clear directory handle:", err);
	}
}

/**
 * Checks if a directory handle exists in the cache.
 * @returns Promise resolving to true if a cached directory exists, false otherwise
 */
export async function hasCachedDirectory(): Promise<boolean> {
	try {
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, "readonly");
		const store = transaction.objectStore(STORE_NAME);
		const request = store.get(HANDLE_KEY);

		return new Promise((resolve) => {
			request.onsuccess = () => {
				db.close();
				const handle = request.result as FileSystemDirectoryHandle | undefined;
				resolve(!!handle);
			};

			request.onerror = () => {
				db.close();
				resolve(false);
			};
		});
	} catch (err) {
		console.error("Failed to check cached directory:", err);
		return false;
	}
}

/**
 * Requests directory access from the user via File System Access API.
 * Attempts to use a cached directory handle if useCache is true.
 * @param useCache - If true, tries to use previously saved directory handle first (default: true)
 * @returns Promise resolving to directory handle if granted, null if not supported or denied
 */
export async function requestDirectory(
	useCache: boolean = true,
): Promise<FileSystemDirectoryHandle | null> {
	if (!isFileSystemAccessSupported()) {
		return null;
	}

	// Try to use cached directory first
	if (useCache) {
		const cached = await getCachedDirectory();
		if (cached) {
			return cached;
		}
	}

	const directoryPicker = (
		window as Window & { showDirectoryPicker?: DirectoryPicker }
	).showDirectoryPicker;
	if (!directoryPicker) {
		return null;
	}

	try {
		const handle = await directoryPicker({
			mode: "readwrite",
			startIn: "downloads",
		});

		// Save the handle for future use
		await saveCachedDirectory(handle);

		return handle;
	} catch (err) {
		// User cancelled or permission denied
		if ((err as Error).name !== "AbortError") {
			console.error("Failed to get directory access:", err);
		}
		return null;
	}
}

const SAFE_PATH_SEGMENT_REGEX = /^[a-zA-Z0-9._-]+$/;

/**
 * Validates a path segment for safe file system operations.
 * Ensures segment doesn't contain invalid characters or path traversal attempts.
 * @param segment - The path segment to validate
 * @throws Error if segment is invalid or unsafe
 */
function validatePathSegment(segment: string): void {
	const trimmed = segment.trim();
	if (
		!trimmed ||
		trimmed === "." ||
		trimmed === ".." ||
		!SAFE_PATH_SEGMENT_REGEX.test(trimmed)
	) {
		throw new Error(`Invalid path segment: "${segment}"`);
	}
}

/**
 * Saves a file to the specified directory handle using File System Access API.
 * Creates subdirectories if specified in subPath.
 * @param dirHandle - The directory handle to save the file to
 * @param filename - Name of the file to create
 * @param data - File content as Blob or string
 * @param subPath - Optional path of subdirectories to create/navigate to
 * @returns Promise that resolves when the file is written
 */
export async function saveFileToDirectory(
	dirHandle: FileSystemDirectoryHandle,
	filename: string,
	data: Blob | string,
	subPath?: string,
): Promise<void> {
	// Validate filename
	const trimmedFilename = filename.trim();
	validatePathSegment(trimmedFilename);

	let targetDir = dirHandle;

	// Create subdirectories if specified
	if (subPath) {
		const parts = subPath.split("/").filter(Boolean);
		for (const part of parts) {
			const trimmedPart = part.trim();
			validatePathSegment(trimmedPart);
			targetDir = await targetDir.getDirectoryHandle(trimmedPart, {
				create: true,
			});
		}
	}

	const fileHandle = await targetDir.getFileHandle(trimmedFilename, {
		create: true,
	});
	const writable = await fileHandle.createWritable();

	if (typeof data === "string") {
		await writable.write(data);
	} else {
		await writable.write(data);
	}

	await writable.close();
}

/**
 * Checks which files from a list already exist in the given directory.
 * @param dirHandle - The directory handle to check in
 * @param filenames - List of filenames to check for existence
 * @returns Promise resolving to an array of existing filenames
 */
export async function checkFilesExist(
	dirHandle: FileSystemDirectoryHandle,
	filenames: string[],
): Promise<string[]> {
	const existingFiles: string[] = [];

	for (const filename of filenames) {
		try {
			await dirHandle.getFileHandle(filename, { create: false });
			existingFiles.push(filename);
		} catch (err) {
			// File doesn't exist (NotFoundError), which is expected
			if (
				(err as Error).name !== "NotFoundError" &&
				(err as Error).name !== "TypeMismatchError"
			) {
				console.warn(`Unexpected error checking file ${filename}:`, err);
			}
		}
	}

	return existingFiles;
}

/**
 * Saves multiple files to a directory with progress tracking.
 * Calls the onProgress callback after each file is written.
 * @param dirHandle - The directory handle to save files to
 * @param files - Array of file objects containing filename, data, and optional subPath
 * @param onProgress - Optional callback receiving current count, total count, and current filename
 * @returns Promise that resolves when all files are written
 */
export async function saveFilesToDirectory(
	dirHandle: FileSystemDirectoryHandle,
	files: Array<{ filename: string; data: Blob | string; subPath?: string }>,
	onProgress?: (current: number, total: number, filename: string) => void,
): Promise<void> {
	let index = 0;
	for (const file of files) {
		const current = index + 1;
		onProgress?.(current, files.length, file.filename);
		await saveFileToDirectory(
			dirHandle,
			file.filename,
			file.data,
			file.subPath,
		);
		index += 1;
	}
}

/**
 * Converts a data URL (Base64) to a Blob object.
 * @param dataUrl - The data URL string to convert
 * @returns Blob object containing the decoded data
 */
export function dataUrlToBlob(dataUrl: string): Blob {
	const [header, base64] = dataUrl.split(",");
	if (!header || !base64) {
		throw new Error("Invalid data URL");
	}
	const mimeMatch = header.match(/:(.*?);/);
	const mime = mimeMatch ? mimeMatch[1] : "image/png";
	const binary = atob(base64);
	const array = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		array[i] = binary.charCodeAt(i);
	}
	return new Blob([array], { type: mime });
}
