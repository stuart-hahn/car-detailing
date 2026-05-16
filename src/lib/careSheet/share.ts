export type ShareResult = "shared" | "copied" | "failed";

/** Copy text; use Web Share API when available. */
export async function shareCareSheetText(
  text: string,
  title: string,
): Promise<ShareResult> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "failed";
      }
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
