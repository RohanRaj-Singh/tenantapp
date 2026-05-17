import { NextResponse } from "next/server";
import { toApiError } from "./errors";

export function apiErrorResponse(error: unknown) {
  const apiError = toApiError(error);
  const shouldExposeDetails =
    process.env.NODE_ENV !== "production" || apiError.status < 500;

  return NextResponse.json(
    {
      error: {
        code: apiError.code,
        message: apiError.message,
        details: shouldExposeDetails ? apiError.details : {},
      },
    },
    { status: apiError.status },
  );
}
