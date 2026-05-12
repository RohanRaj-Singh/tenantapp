import { NextResponse } from "next/server";
import { toApiError } from "./errors";

export function apiErrorResponse(error: unknown) {
  const apiError = toApiError(error);

  return NextResponse.json(
    {
      error: {
        code: apiError.code,
        message: apiError.message,
        details: apiError.details,
      },
    },
    { status: apiError.status },
  );
}
