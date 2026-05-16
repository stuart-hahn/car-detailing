const PREFIX = "[dev-tools]";

export function logDevToolStart(action: string, context?: Record<string, unknown>) {
  if (!import.meta.env.DEV) return;
  if (context) {
    console.info(PREFIX, action, context);
  } else {
    console.info(PREFIX, action);
  }
}

export function logDevToolError(
  action: string,
  error: unknown,
  context?: Record<string, unknown>,
) {
  if (!import.meta.env.DEV) return;
  const err = normalizeError(error);
  if (context) {
    console.error(PREFIX, action, "failed", { ...context, error: err });
  } else {
    console.error(PREFIX, action, "failed", err);
  }
}

function normalizeError(error: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { name: "Error", message: String(error) };
}
