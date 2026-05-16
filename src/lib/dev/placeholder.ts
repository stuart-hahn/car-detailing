/** Tiny valid JPEG for dev photo gates (gray 2×2). */
const PLACEHOLDER_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQACEQADAPwA/9k=";

let cachedBytes: Uint8Array | null = null;

function placeholderBytes(): Uint8Array {
  if (cachedBytes) return cachedBytes;
  const binary = atob(PLACEHOLDER_JPEG_BASE64);
  cachedBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    cachedBytes[i] = binary.charCodeAt(i);
  }
  return cachedBytes;
}

/** Fresh File per call — reusing one File breaks createImageBitmap on 2+ saves. */
export function createPlaceholderImageFile(): File {
  const bytes = placeholderBytes();
  return new File([new Uint8Array(bytes)], "dev-placeholder.jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
