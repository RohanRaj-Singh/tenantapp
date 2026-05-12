import type { Db, Filter } from "mongodb";
import {
  COLLECTION_NAMES,
  type RawResponseDocument,
} from "@/src/server/db/documents";
import type {
  RawResponseAggregationQuery,
  ResponsesRepositoryContract,
} from "./contracts";

export class ResponsesRepository implements ResponsesRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<RawResponseDocument>(COLLECTION_NAMES.rawResponses);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { submissionId: 1 }, unique: true, name: "raw_response_submission_id_unique" },
      { key: { tenantId: 1, submittedAt: -1 }, name: "raw_response_tenant_submitted" },
      {
        key: { tenantId: 1, runtimeConfigId: 1, submittedAt: -1 },
        name: "raw_response_tenant_runtime_config_submitted",
      },
      {
        key: {
          tenantId: 1,
          "versionRefs.scannerVersionId": 1,
          "versionRefs.calculationVersionId": 1,
          submittedAt: -1,
        },
        name: "raw_response_version_tuple_submitted",
      },
      {
        key: { tenantId: 1, "completionState.status": 1, submittedAt: -1 },
        name: "raw_response_completion_status_submitted",
      },
      { key: { tenantId: 1, "attributes.stream": 1, submittedAt: -1 }, name: "raw_response_stream_submitted" },
      {
        key: { tenantId: 1, "attributes.department": 1, submittedAt: -1 },
        name: "raw_response_department_submitted",
      },
    ]);
  }

  async insert(document: RawResponseDocument) {
    await this.collection().insertOne(document);
  }

  async listForAggregation(query: RawResponseAggregationQuery) {
    const filter: Filter<RawResponseDocument> = {
      tenantId: query.tenantId,
      runtimeConfigId: query.runtimeConfig.runtimeConfigId,
      "versionRefs.scannerVersionId": query.runtimeConfig.versionRefs.scannerVersionId,
      "versionRefs.attributeTemplateVersionId":
        query.runtimeConfig.versionRefs.attributeTemplateVersionId,
      "versionRefs.calculationVersionId": query.runtimeConfig.versionRefs.calculationVersionId,
      "completionState.status": "completed",
    };

    if (query.period) {
      filter.submittedAt = {
        $gte: query.period.from,
        $lte: query.period.to,
      };
    }

    (Object.entries(query.filters) as Array<[string, string]>).forEach(
      ([key, value]) => {
        if (value) {
          (filter as Record<string, unknown>)[`attributes.${key}`] = value;
        }
      },
    );

    return this.collection().find(filter).sort({ submittedAt: -1 }).toArray();
  }
}
