"use client";

import { useContext, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoveLeft } from "lucide-react";
import RuntimeUnavailableState from "@/components/runtime/RuntimeUnavailableState";
import type { RuntimeAttributeOption } from "@/runtime/contracts/runtime";
import { type RuntimeAttributeField } from "@/runtime/attributes/attributeTemplateUtils";
import { saveRuntimeSurveySession } from "@/runtime/attributes/surveySession";
import { RuntimeContext } from "@/runtime/context/RuntimeContext";
import { useRuntimeAttributeForm } from "@/runtime/hooks/useRuntimeAttributeForm";
import type { TenantRuntimeConfig } from "@/runtime/contracts/runtime";
import { useLanguage } from "@/runtime/language/LanguageContext";
import { useTheme } from "@/runtime/theme/useTheme";

const SELECT_FIELDS: RuntimeAttributeField[] = ["stream", "location", "function", "department"];
const CHOICE_FIELDS: RuntimeAttributeField[] = ["gender", "age", "seniority"];

export default function SurveyPage() {
  const { config, loading, error, tenantSlug, tenantSource } = useContext(RuntimeContext);
  const { copy } = useLanguage();
  const theme = useTheme();

  if (loading) {
    return (
      <div className="tenant-page-shell flex min-h-screen w-full items-center justify-center px-4 pt-24">
        <div
          className="w-full max-w-lg rounded-[28px] border bg-white px-8 py-10 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]"
          style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
        >
          <p className="text-sm font-medium text-slate-500">{copy.survey.loadingWorkspace}</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return <RuntimeUnavailableState error={error} tenantSlug={tenantSlug} tenantSource={tenantSource} />;
  }

  return <SurveyPageContent config={config} />;
}

function SurveyPageContent({ config }: { config: TenantRuntimeConfig }) {
  const theme = useTheme();
  const router = useRouter();
  const { language, copy } = useLanguage();
  const { selections, fields, validation, configurationIssues, resetSelections, updateSelection } =
    useRuntimeAttributeForm(config.attributeTemplate, language);

  useEffect(() => {
    resetSelections();
  }, [config.tenant.id, resetSelections]);

  const selectedChoiceStyle = {
    borderColor: theme.primaryColor,
    backgroundColor: theme.surfaceAccentStrong,
    color: theme.linkColor,
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!validation.canSubmit) {
      return;
    }

    saveRuntimeSurveySession({
      runtimeConfigId: config.runtimeConfigId,
      tenantId: config.tenant.id,
      tenantSlug: config.tenant.slug,
      scannerVersionId: config.scannerVersion.id,
      attributeTemplateVersionId: config.versionRefs.attributeTemplateVersionId,
      attributes: {
        stream: selections.stream,
        location: selections.location,
        function: selections.function,
        department: selections.department,
        gender: selections.gender,
        age: selections.age,
        seniority: selections.seniority,
      },
      savedAt: new Date().toISOString(),
    });

    router.push("/survey-questions");
  };

  const renderEmptyMessage = (message: string | null) => {
    if (!message) {
      return null;
    }

    return <p className="mt-2 text-sm text-amber-700">{message}</p>;
  };

  const renderSelectField = (fieldKey: RuntimeAttributeField) => {
    const field = fields[fieldKey];

    if (!field.visible) {
      return null;
    }

    return (
      <div key={field.key} className="animate-fadeIn">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {field.label}
          {field.required ? " *" : ""}
        </label>
        <select
          value={selections[field.key]}
          onChange={(event) => updateSelection(field.key, event.target.value)}
          className="tenant-field w-full rounded-lg px-3 py-2"
          style={{ borderColor: theme.borderAccent }}
          disabled={field.disabled}
          required={field.required}
        >
          <option value="">{field.placeholder}</option>
          {field.options.map((option: RuntimeAttributeOption) => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {renderEmptyMessage(field.emptyMessage)}
      </div>
    );
  };

  const renderChoiceField = (fieldKey: RuntimeAttributeField) => {
    const field = fields[fieldKey];

    if (!field.visible) {
      return null;
    }

    return (
      <div key={field.key}>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {field.label}
          {field.required ? " *" : ""}
        </label>
        <div className="flex flex-wrap gap-2">
          {field.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => updateSelection(field.key, option.value)}
              className="min-h-11 flex-1 rounded-xl border px-4 py-2.5 text-center text-sm font-medium sm:flex-none sm:text-base"
              style={
                selections[field.key] === option.value
                  ? selectedChoiceStyle
                  : { borderColor: theme.borderAccent }
              }
            >
              {option.label}
            </button>
          ))}
        </div>
        {renderEmptyMessage(field.emptyMessage)}
      </div>
    );
  };

  return (
    <div className="tenant-page-shell flex min-h-screen w-full flex-col items-center px-4 pb-10 pt-24 sm:px-6 sm:pt-28">
      <div className="mb-6 flex w-full max-w-2xl items-center justify-between">
        <Link
          href="/"
          className="tenant-brand-text z-10 inline-flex items-center justify-center text-sm text-gray-700"
        >
          <MoveLeft className="mr-2 h-4 w-4" />
          {copy.survey.backToHome}
        </Link>
      </div>

      <form
        className="w-full max-w-2xl space-y-6 rounded-[28px] border bg-white p-5 shadow-lg sm:p-6"
        style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <span className="tenant-chip inline-flex rounded-full px-4 py-1.5 text-sm font-medium">
            {theme.tenantName}
          </span>
          <h1 className="break-words text-2xl font-bold text-gray-800 sm:text-3xl">
            {copy.survey.title(theme.tenantName)}
          </h1>
        </div>

        {configurationIssues.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">{copy.survey.incompleteMappingsTitle}</p>
            <p className="mt-1">
              {configurationIssues[0]}
              {configurationIssues.length > 1
                ? ` ${copy.survey.additionalMappingIssues(configurationIssues.length - 1)}`
                : ""}
            </p>
          </div>
        ) : null}

        {SELECT_FIELDS.map((fieldKey) => renderSelectField(fieldKey))}
        {CHOICE_FIELDS.map((fieldKey) => renderChoiceField(fieldKey))}

        {validation.blockingIssues.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {validation.blockingIssues.map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!validation.canSubmit}
            className="tenant-button w-full rounded-full px-6 py-3 font-medium transition-opacity hover:opacity-90 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copy.survey.startSurvey}
          </button>
        </div>
      </form>
    </div>
  );
}
