import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { SurveySubmissionAttributes } from "@/runtime/contracts/surveySubmission";

type SubmissionPayload = {
  tenantId?: string;
  scannerVersionId?: string;
  attributes?: Partial<Record<keyof SurveySubmissionAttributes, unknown>>;
  responses?: Array<{
    questionId?: string;
    answerId?: string;
    answerScore?: number;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmissionPayload;
    const attributes = body?.attributes;
    const responses = body?.responses ?? [];
    const hasTenant = typeof body?.tenantId === "string" && body.tenantId.trim().length > 0;
    const hasScannerVersion =
      typeof body?.scannerVersionId === "string" && body.scannerVersionId.trim().length > 0;
    const hasAttributes = Boolean(attributes && typeof attributes === "object");
    const hasResponses = responses.length > 0;

    if (!hasTenant || !hasScannerVersion || !hasAttributes || !hasResponses) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required survey submission fields.",
        },
        { status: 400 },
      );
    }

    const invalidResponses = responses.some(
      (response) =>
        typeof response?.questionId !== "string" ||
        typeof response?.answerId !== "string" ||
        typeof response?.answerScore !== "number" ||
        !Number.isFinite(response.answerScore),
    );
    const requiredAttributeKeys: Array<keyof SurveySubmissionAttributes> = [
      "stream",
      "location",
      "function",
      "department",
      "gender",
      "age",
      "seniority",
    ];
    const invalidAttributes = requiredAttributeKeys.some(
      (key) => typeof attributes?.[key] !== "string",
    );

    if (invalidResponses || invalidAttributes) {
      return NextResponse.json(
        {
          success: false,
          message: "Survey submissions require string attributes plus responses with questionId, answerId, and answerScore.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        submissionId: randomUUID(),
        receivedAt: new Date().toISOString(),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to process survey submission payload.",
      },
      { status: 400 },
    );
  }
}
