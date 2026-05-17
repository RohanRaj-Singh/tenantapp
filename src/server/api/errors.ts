export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function toApiError(error: unknown) {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(
      500,
      "INTERNAL_SERVER_ERROR",
      process.env.NODE_ENV === "production"
        ? "An unexpected server error occurred."
        : error.message,
    );
  }

  return new ApiError(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.");
}
