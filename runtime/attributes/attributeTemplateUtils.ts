import type {
  RuntimeAttributeOption,
  RuntimeAttributeTemplate,
  RuntimeDepartmentOption,
  RuntimeFixedAttributeConfig,
  RuntimeFixedAttributeKey,
  RuntimeFunctionOption,
  RuntimeLocationOption,
} from "../contracts/runtime";
import { getTenantStaticCopy, type AppLanguage } from "../language/translations";

export const RUNTIME_ATTRIBUTE_FIELDS = [
  "stream",
  "location",
  "function",
  "department",
  "gender",
  "age",
  "seniority",
] as const;

export type RuntimeAttributeField = (typeof RUNTIME_ATTRIBUTE_FIELDS)[number];
export type RuntimeSelectionField = RuntimeAttributeField;

export interface RuntimeAttributeSelections {
  stream: string;
  location: string;
  function: string;
  department: string;
  gender: string;
  age: string;
  seniority: string;
}

export interface RuntimeAttributeFieldState {
  key: RuntimeAttributeField;
  label: string;
  placeholder: string;
  required: boolean;
  visible: boolean;
  disabled: boolean;
  options: RuntimeAttributeOption[];
  emptyMessage: string | null;
}

export interface RuntimeAttributeValidation {
  missingRequiredFields: RuntimeAttributeField[];
  blockingIssues: string[];
  canSubmit: boolean;
}

interface ResolvedFixedAttributeConfig {
  enabled: boolean;
  required: boolean;
  label: string;
  placeholder: string;
}

export interface ResolvedRuntimeAttributeTemplate {
  streams: RuntimeAttributeOption[];
  locations: RuntimeLocationOption[];
  functions: RuntimeFunctionOption[];
  departments: RuntimeDepartmentOption[];
  genders: RuntimeAttributeOption[];
  ageGroups: RuntimeAttributeOption[];
  seniorityLevels: RuntimeAttributeOption[];
  fixedAttributes: Record<RuntimeFixedAttributeKey, ResolvedFixedAttributeConfig>;
  configurationIssues: string[];
}

export interface RuntimeAttributeFormState {
  fields: Record<RuntimeAttributeField, RuntimeAttributeFieldState>;
  validation: RuntimeAttributeValidation;
  configurationIssues: string[];
}

export const EMPTY_RUNTIME_ATTRIBUTE_SELECTIONS: RuntimeAttributeSelections = {
  stream: "",
  location: "",
  function: "",
  department: "",
  gender: "",
  age: "",
  seniority: "",
};

const DISALLOWED_GENDER_OPTION_VALUES = new Set(["other", "prefer_not_to_say"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function formatAttributeLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function dedupeOptions<T extends RuntimeAttributeOption>(items: T[], issueLabel: string) {
  const seenValues = new Set<string>();
  const deduped: T[] = [];
  const issues: string[] = [];

  items.forEach((item) => {
    const normalizedValue = item.value.trim();

    if (seenValues.has(normalizedValue)) {
      issues.push(`${issueLabel} "${normalizedValue}" is duplicated and was ignored.`);
      return;
    }

    seenValues.add(normalizedValue);
    deduped.push({ ...item, value: normalizedValue, label: item.label.trim() } as T);
  });

  return { deduped, issues };
}

function normalizeOptions<T extends RuntimeAttributeOption>(
  items: T[] | undefined,
  issueLabel: string,
) {
  const issues: string[] = [];
  const normalizedItems = (items ?? []).flatMap((item) => {
    if (!isNonEmptyString(item?.id) || !isNonEmptyString(item?.value)) {
      issues.push(`${issueLabel} entries require non-empty id and value fields.`);
      return [];
    }

    return [
      {
        ...item,
        id: item.id.trim(),
        label: isNonEmptyString(item.label) ? item.label.trim() : formatAttributeLabel(item.value),
        value: item.value.trim(),
      },
    ];
  });

  const { deduped, issues: duplicateIssues } = dedupeOptions(normalizedItems, issueLabel);

  return {
    options: deduped,
    issues: [...issues, ...duplicateIssues],
  };
}

function normalizeValueList(values: string[] | undefined, issueLabel: string) {
  const issues: string[] = [];
  const normalizedItems = (values ?? []).flatMap((value) => {
    if (!isNonEmptyString(value)) {
      issues.push(`${issueLabel} entries must be non-empty strings.`);
      return [];
    }

    return [
      {
        id: value.trim(),
        label: formatAttributeLabel(value),
        value: value.trim(),
      },
    ];
  });

  const { deduped, issues: duplicateIssues } = dedupeOptions(normalizedItems, issueLabel);

  return {
    options: deduped,
    issues: [...issues, ...duplicateIssues],
  };
}

function normalizeGenderValueList(values: string[] | undefined) {
  const normalized = normalizeValueList(values, "Gender option");
  const filteredOptions: RuntimeAttributeOption[] = [];

  normalized.options.forEach((option) => {
    // Filter retired gender values silently so legacy runtime snapshots stay usable without showing a false mapping warning.
    const normalizedValue = option.value.trim().toLowerCase().replace(/[\s-]+/g, "_");

    if (DISALLOWED_GENDER_OPTION_VALUES.has(normalizedValue)) {
      return;
    }

    filteredOptions.push(option);
  });

  return {
    options: filteredOptions,
    issues: normalized.issues,
  };
}

function resolveFixedAttributeConfig(
  field: RuntimeFixedAttributeKey,
  providedConfig: RuntimeFixedAttributeConfig | undefined,
  optionCount: number,
  language: AppLanguage,
) {
  const attributeCopy = getTenantStaticCopy(language).attributeForm;
  const key = field === "age" ? "age" : field;
  const label = providedConfig?.label?.trim() || attributeCopy.labels[key];
  const placeholder = providedConfig?.placeholder?.trim() || attributeCopy.placeholders[key];
  const enabled = providedConfig?.enabled ?? optionCount > 0;
  const required = enabled ? (providedConfig?.required ?? optionCount > 0) : false;

  return {
    enabled,
    required,
    label,
    placeholder,
  };
}

function getOptionByValue<T extends RuntimeAttributeOption>(items: T[], value: string) {
  return items.find((item) => item.value === value) ?? null;
}

function getLocationById(template: ResolvedRuntimeAttributeTemplate, id: string) {
  return template.locations.find((item) => item.id === id) ?? null;
}

function getFunctionById(template: ResolvedRuntimeAttributeTemplate, id: string) {
  return template.functions.find((item) => item.id === id) ?? null;
}

function getLocationsForStream(
  template: ResolvedRuntimeAttributeTemplate,
  streamId: string,
) {
  return template.locations.filter((item) => item.streamId === streamId);
}

function getFunctionsForLocation(
  template: ResolvedRuntimeAttributeTemplate,
  locationId: string,
) {
  return template.functions.filter((item) => item.locationId === locationId);
}

function getDepartmentsForFunction(
  template: ResolvedRuntimeAttributeTemplate,
  functionId: string,
) {
  return template.departments.filter((item) => item.functionId === functionId);
}

function getDemographicOptions(
  template: ResolvedRuntimeAttributeTemplate,
  field: "gender" | "age" | "seniority",
) {
  if (field === "gender") {
    return template.genders;
  }

  if (field === "age") {
    return template.ageGroups;
  }

  return template.seniorityLevels;
}

export function resolveRuntimeAttributeTemplate(
  template: RuntimeAttributeTemplate | null | undefined,
  language: AppLanguage = "en",
): ResolvedRuntimeAttributeTemplate {
  const streamResult = normalizeOptions(template?.streams, "Stream option");
  const streamIds = new Set(streamResult.options.map((item) => item.id));

  const locationBaseResult = normalizeOptions(template?.locations, "Location option");
  const locations: RuntimeLocationOption[] = [];
  const locationIssues = [...locationBaseResult.issues];

  locationBaseResult.options.forEach((item) => {
    const streamId = isNonEmptyString(item.streamId) ? item.streamId.trim() : "";

    if (!streamId) {
      locationIssues.push(`Location "${item.label}" is missing a stream mapping and was ignored.`);
      return;
    }

    if (!streamIds.has(streamId)) {
      locationIssues.push(`Location "${item.label}" references missing stream "${streamId}" and was ignored.`);
      return;
    }

    locations.push({
      ...item,
      streamId,
    });
  });

  const locationIds = new Set(locations.map((item) => item.id));
  const functionBaseResult = normalizeOptions(template?.functions, "Function option");
  const functions: RuntimeFunctionOption[] = [];
  const functionIssues = [...functionBaseResult.issues];

  functionBaseResult.options.forEach((item) => {
    const locationId = isNonEmptyString(item.locationId) ? item.locationId.trim() : "";

    if (!locationId) {
      functionIssues.push(`Function "${item.label}" is missing a location mapping and was ignored.`);
      return;
    }

    if (!locationIds.has(locationId)) {
      functionIssues.push(`Function "${item.label}" references missing location "${locationId}" and was ignored.`);
      return;
    }

    functions.push({
      ...item,
      locationId,
    });
  });

  const functionIds = new Set(functions.map((item) => item.id));
  const departmentBaseResult = normalizeOptions(template?.departments, "Department option");
  const departments: RuntimeDepartmentOption[] = [];
  const departmentIssues = [...departmentBaseResult.issues];

  departmentBaseResult.options.forEach((item) => {
    const functionId = isNonEmptyString(item.functionId) ? item.functionId.trim() : "";

    if (!functionId) {
      departmentIssues.push(`Department "${item.label}" is missing a function mapping and was ignored.`);
      return;
    }

    if (!functionIds.has(functionId)) {
      departmentIssues.push(`Department "${item.label}" references missing function "${functionId}" and was ignored.`);
      return;
    }

    departments.push({
      ...item,
      functionId,
    });
  });

  streamResult.options.forEach((stream) => {
    if (!locations.some((item) => item.streamId === stream.id)) {
      locationIssues.push(`Stream "${stream.label}" has no linked locations.`);
    }
  });

  locations.forEach((location) => {
    if (!functions.some((item) => item.locationId === location.id)) {
      functionIssues.push(`Location "${location.label}" has no linked functions.`);
    }
  });

  functions.forEach((func) => {
    if (!departments.some((item) => item.functionId === func.id)) {
      departmentIssues.push(`Function "${func.label}" has no linked departments.`);
    }
  });

  const genderResult = normalizeGenderValueList(template?.genders);
  const ageGroupResult = normalizeValueList(template?.ageGroups, "Age option");
  const seniorityResult = normalizeValueList(template?.seniorityLevels, "Seniority option");
  const locationCount = locations.length;
  const providedLocationConfig = template?.fixedAttributes?.location;

  return {
    streams: streamResult.options,
    locations,
    functions,
    departments,
    genders: genderResult.options,
    ageGroups: ageGroupResult.options,
    seniorityLevels: seniorityResult.options,
    fixedAttributes: {
      location: {
        ...resolveFixedAttributeConfig("location", providedLocationConfig, locationCount, language),
        enabled: locationCount > 0 ? true : providedLocationConfig?.enabled ?? false,
        required: locationCount > 0 ? true : providedLocationConfig?.required ?? false,
      },
      gender: resolveFixedAttributeConfig(
        "gender",
        template?.fixedAttributes?.gender,
        genderResult.options.length,
        language,
      ),
      age: resolveFixedAttributeConfig("age", template?.fixedAttributes?.age, ageGroupResult.options.length, language),
      seniority: resolveFixedAttributeConfig(
        "seniority",
        template?.fixedAttributes?.seniority,
        seniorityResult.options.length,
        language,
      ),
    },
    configurationIssues: [
      ...streamResult.issues,
      ...locationIssues,
      ...functionIssues,
      ...departmentIssues,
      ...genderResult.issues,
      ...ageGroupResult.issues,
      ...seniorityResult.issues,
    ],
  };
}

export function getAvailableLocations(
  template: ResolvedRuntimeAttributeTemplate,
  selections: RuntimeAttributeSelections,
) {
  const selectedStream = getOptionByValue(template.streams, selections.stream);

  if (!selectedStream) {
    return [];
  }

  return getLocationsForStream(template, selectedStream.id);
}

export function getAvailableFunctions(
  template: ResolvedRuntimeAttributeTemplate,
  selections: RuntimeAttributeSelections,
) {
  const availableLocations = getAvailableLocations(template, selections);
  const selectedLocation = availableLocations.find((item) => item.value === selections.location) ?? null;

  if (!selectedLocation) {
    return [];
  }

  return getFunctionsForLocation(template, selectedLocation.id);
}

export function getAvailableDepartments(
  template: ResolvedRuntimeAttributeTemplate,
  selections: RuntimeAttributeSelections,
) {
  const availableFunctions = getAvailableFunctions(template, selections);
  const selectedFunction = availableFunctions.find((item) => item.value === selections.function) ?? null;

  if (!selectedFunction) {
    return [];
  }

  return getDepartmentsForFunction(template, selectedFunction.id);
}

export function sanitizeRuntimeAttributeSelections(
  selections: RuntimeAttributeSelections,
  template: ResolvedRuntimeAttributeTemplate,
) {
  const nextSelections = { ...EMPTY_RUNTIME_ATTRIBUTE_SELECTIONS, ...selections };
  const selectedStream = getOptionByValue(template.streams, nextSelections.stream);

  if (!selectedStream) {
    nextSelections.stream = "";
    nextSelections.location = "";
    nextSelections.function = "";
    nextSelections.department = "";
  } else {
    const availableLocations = getLocationsForStream(template, selectedStream.id);
    const selectedLocation = availableLocations.find((item) => item.value === nextSelections.location) ?? null;

    if (!selectedLocation) {
      nextSelections.location = "";
      nextSelections.function = "";
      nextSelections.department = "";
    } else {
      const availableFunctions = getFunctionsForLocation(template, selectedLocation.id);
      const selectedFunction = availableFunctions.find((item) => item.value === nextSelections.function) ?? null;

      if (!selectedFunction) {
        nextSelections.function = "";
        nextSelections.department = "";
      } else {
        const availableDepartments = getDepartmentsForFunction(template, selectedFunction.id);
        if (!availableDepartments.some((item) => item.value === nextSelections.department)) {
          nextSelections.department = "";
        }
      }
    }
  }

  (["gender", "age", "seniority"] as const).forEach((field) => {
    const fixedConfig = template.fixedAttributes[field];
    if (!fixedConfig.enabled) {
      nextSelections[field] = "";
      return;
    }

    const options = getDemographicOptions(template, field);
    if (!options.some((item) => item.value === nextSelections[field])) {
      nextSelections[field] = "";
    }
  });

  return nextSelections;
}

export function applyRuntimeAttributeSelection(
  selections: RuntimeAttributeSelections,
  field: RuntimeSelectionField,
  value: string,
  template: ResolvedRuntimeAttributeTemplate,
) {
  const nextSelections = {
    ...selections,
    [field]: value,
  };

  if (field === "stream") {
    nextSelections.location = "";
    nextSelections.function = "";
    nextSelections.department = "";
  }

  if (field === "location") {
    nextSelections.function = "";
    nextSelections.department = "";
  }

  if (field === "function") {
    nextSelections.department = "";
  }

  return sanitizeRuntimeAttributeSelections(nextSelections, template);
}

function createFieldState(
  key: RuntimeAttributeField,
  options: RuntimeAttributeOption[],
  language: AppLanguage,
  settings: {
    label?: string;
    placeholder?: string;
    required?: boolean;
    visible?: boolean;
    disabled?: boolean;
    emptyMessage?: string | null;
  } = {},
): RuntimeAttributeFieldState {
  const attributeCopy = getTenantStaticCopy(language).attributeForm;

  return {
    key,
    label: settings.label ?? attributeCopy.labels[key],
    placeholder: settings.placeholder ?? attributeCopy.placeholders[key],
    required: settings.required ?? false,
    visible: settings.visible ?? true,
    disabled: settings.disabled ?? options.length === 0,
    options,
    emptyMessage: settings.emptyMessage ?? null,
  };
}

function appendBlockingIssue(issues: string[], shouldAppend: boolean, message: string) {
  if (shouldAppend) {
    issues.push(message);
  }
}

export function buildRuntimeAttributeFormState(
  template: ResolvedRuntimeAttributeTemplate,
  selections: RuntimeAttributeSelections,
  language: AppLanguage = "en",
): RuntimeAttributeFormState {
  const attributeCopy = getTenantStaticCopy(language).attributeForm;
  const locationOptions = getAvailableLocations(template, selections);
  const functionOptions = getAvailableFunctions(template, selections);
  const departmentOptions = getAvailableDepartments(template, selections);

  const locationConfig = template.fixedAttributes.location;
  const genderConfig = template.fixedAttributes.gender;
  const ageConfig = template.fixedAttributes.age;
  const seniorityConfig = template.fixedAttributes.seniority;

  const hasStreamSelection = Boolean(selections.stream);
  const hasLocationSelection = Boolean(selections.location);
  const hasFunctionSelection = Boolean(selections.function);

  const fields: Record<RuntimeAttributeField, RuntimeAttributeFieldState> = {
    stream: createFieldState("stream", template.streams, language, {
      required: true,
      visible: true,
      emptyMessage: template.streams.length === 0 ? attributeCopy.emptyMessages.streamsMissing : null,
    }),
    location: createFieldState("location", locationOptions, language, {
      label: locationConfig.label,
      placeholder: locationConfig.placeholder,
      required: locationConfig.required,
      visible: locationConfig.enabled && hasStreamSelection,
      disabled: locationOptions.length === 0,
      emptyMessage:
        locationConfig.enabled && hasStreamSelection && locationOptions.length === 0
          ? attributeCopy.emptyMessages.noLocationsForStream
          : null,
    }),
    function: createFieldState("function", functionOptions, language, {
      required: hasLocationSelection,
      visible: hasLocationSelection,
      disabled: functionOptions.length === 0,
      emptyMessage:
        hasLocationSelection && functionOptions.length === 0
          ? attributeCopy.emptyMessages.noFunctionsForLocation
          : null,
    }),
    department: createFieldState("department", departmentOptions, language, {
      required: hasFunctionSelection,
      visible: hasFunctionSelection,
      disabled: departmentOptions.length === 0,
      emptyMessage:
        hasFunctionSelection && departmentOptions.length === 0
          ? attributeCopy.emptyMessages.noDepartmentsForFunction
          : null,
    }),
    gender: createFieldState("gender", template.genders, language, {
      label: genderConfig.label,
      placeholder: genderConfig.placeholder,
      required: genderConfig.required,
      visible: genderConfig.enabled,
      disabled: template.genders.length === 0,
      emptyMessage:
        genderConfig.enabled && template.genders.length === 0
          ? attributeCopy.emptyMessages.noGenderOptions
          : null,
    }),
    age: createFieldState("age", template.ageGroups, language, {
      label: ageConfig.label,
      placeholder: ageConfig.placeholder,
      required: ageConfig.required,
      visible: ageConfig.enabled,
      disabled: template.ageGroups.length === 0,
      emptyMessage:
        ageConfig.enabled && template.ageGroups.length === 0
          ? attributeCopy.emptyMessages.noAgeOptions
          : null,
    }),
    seniority: createFieldState("seniority", template.seniorityLevels, language, {
      label: seniorityConfig.label,
      placeholder: seniorityConfig.placeholder,
      required: seniorityConfig.required,
      visible: seniorityConfig.enabled,
      disabled: template.seniorityLevels.length === 0,
      emptyMessage:
        seniorityConfig.enabled && template.seniorityLevels.length === 0
          ? attributeCopy.emptyMessages.noSeniorityOptions
          : null,
    }),
  };

  const missingRequiredFields = RUNTIME_ATTRIBUTE_FIELDS.filter((field) => {
    const fieldState = fields[field];
    return fieldState.visible && fieldState.required && !selections[field];
  });

  const blockingIssues: string[] = [];

  appendBlockingIssue(
    blockingIssues,
    template.streams.length === 0,
    attributeCopy.blockingIssues.missingStreamConfiguration,
  );
  appendBlockingIssue(
    blockingIssues,
    fields.location.visible && fields.location.required && fields.location.options.length === 0,
    attributeCopy.blockingIssues.missingLocationMappings,
  );
  appendBlockingIssue(
    blockingIssues,
    fields.function.visible && fields.function.options.length === 0,
    attributeCopy.blockingIssues.missingFunctionMappings,
  );
  appendBlockingIssue(
    blockingIssues,
    fields.department.visible && fields.department.options.length === 0,
    attributeCopy.blockingIssues.missingDepartmentMappings,
  );
  appendBlockingIssue(
    blockingIssues,
    fields.gender.visible && fields.gender.required && fields.gender.options.length === 0,
    attributeCopy.blockingIssues.missingGenderOptions,
  );
  appendBlockingIssue(
    blockingIssues,
    fields.age.visible && fields.age.required && fields.age.options.length === 0,
    attributeCopy.blockingIssues.missingAgeOptions,
  );
  appendBlockingIssue(
    blockingIssues,
    fields.seniority.visible && fields.seniority.required && fields.seniority.options.length === 0,
    attributeCopy.blockingIssues.missingSeniorityOptions,
  );

  return {
    fields,
    validation: {
      missingRequiredFields,
      blockingIssues,
      canSubmit: missingRequiredFields.length === 0 && blockingIssues.length === 0,
    },
    configurationIssues: template.configurationIssues,
  };
}
