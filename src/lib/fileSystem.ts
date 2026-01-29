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

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
	return "showDirectoryPicker" in window;
}

const DB_NAME = "image-tools-db";
const DB_VERSION = 1;
const STORE_NAME = "directory-handles";
const HANDLE_KEY = "saved-directory";

// Open IndexedDB database
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

// Save directory handle to IndexedDB
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

// Retrieve cached directory handle from IndexedDB
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

// Check if we have a cached directory
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

// Request directory access from user (with caching support)
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

// Save a file to the directory
export async function saveFileToDirectory(
	dirHandle: FileSystemDirectoryHandle,
	filename: string,
	data: Blob | string,
	subPath?: string,
): Promise<void> {
	let targetDir = dirHandle;

	// Create subdirectories if specified
	if (subPath) {
		const parts = subPath.split("/").filter(Boolean);
		for (const part of parts) {
			targetDir = await targetDir.getDirectoryHandle(part, { create: true });
		}
	}

	const fileHandle = await targetDir.getFileHandle(filename, { create: true });
	const writable = await fileHandle.createWritable();

	if (typeof data === "string") {
		await writable.write(data);
	} else {
		await writable.write(data);
	}

	await writable.close();
}

// Check if files exist in directory
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

// Save multiple files to directory with progress callback
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

// Convert data URL to Blob
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
