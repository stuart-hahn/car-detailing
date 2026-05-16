/** Dev placeholder image — generated via canvas so decode/compress always works. */

let cachedBlob: Blob | null = null;

export async function createPlaceholderBlob(): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("createPlaceholderBlob requires a browser (dev tools only)");
  }

  if (cachedBlob) {
    return cachedBlob.slice(0, cachedBlob.size, cachedBlob.type);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d not available");

  ctx.fillStyle = "#6b7280";
  ctx.fillRect(0, 0, 8, 8);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))),
      "image/jpeg",
      0.82,
    );
  });

  cachedBlob = blob;
  return blob.slice(0, blob.size, blob.type);
}
