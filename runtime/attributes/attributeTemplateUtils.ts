import type {
  RuntimeAttributeOption,
  RuntimeAttributeTemplate,
  RuntimeDepartmentOption,
  RuntimeFixedAttributeConfig,
  RuntimeFixedAttributeKey,
  RuntimeFunctionOption,
  RuntimeLocationOption,
} from "../contracts/runtime";

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

const DEFAULT_FIELD_LABELS: Record<RuntimeAttributeField, string> = {
  stream: "Stream",
  location: "Location",
  function: "Function",
  department: "Department",
  gender: "Gender",
  age: "Age Group",
  seniority: "Seniority Level",
};

const DEFAULT_FIELD_PLACEHOLDERS: Record<RuntimeAttributeField, string> = {
  stream: "Select your stream",
  location: "Select your location",
  function: "Select your function",
  department: "Select your department",
  gender: "Select your gender",
  age: "Select your age group",
  seniority: "Select your seniority level",
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
  const filteredIssues = [...normalized.issues];

  normalized.options.forEach((option) => {
    // Filter retired gender values so legacy runtime snapshots do not surface them in the survey UI.
    const normalizedValue = option.value.trim().toLowerCase().replace(/[\s-]+/g, "_");

    if (DISALLOWED_GENDER_OPTION_VALUES.has(normalizedValue)) {
      filteredIssues.push(`Gender option "${option.label}" is no longer supported and was ignored.`);
      return;
    }

    filteredOptions.push(option);
  });

  return {
    options: filteredOptions,
    issues: filteredIssues,
  };
}

function resolveFixedAttributeConfig(
  field: RuntimeFixedAttributeKey,
  providedConfig: RuntimeFixedAttributeConfig | undefined,
  optionCount: number,
) {
  const label = providedConfig?.label?.trim() || DEFAULT_FIELD_LABELS[field === "age" ? "age" : field];
  const placeholder =
    providedConfig?.placeholder?.trim() || DEFAULT_FIELD_PLACEHOLDERS[field === "age" ? "age" : field];
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
        ...resolveFixedAttributeConfig("location", providedLocationConfig, locationCount),
        enabled: locationCount > 0 ? true : providedLocationConfig?.enabled ?? false,
        required: locationCount > 0 ? true : providedLocationConfig?.required ?? false,
      },
      gender: resolveFixedAttributeConfig(
        "gender",
        template?.fixedAttributes?.gender,
        genderResult.options.length,
      ),
      age: resolveFixedAttributeConfig("age", template?.fixedAttributes?.age, ageGroupResult.options.length),
      seniority: resolveFixedAttributeConfig(
        "seniority",
        template?.fixedAttributes?.seniority,
        seniorityResult.options.length,
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
  settings: {
    label?: string;
    placeholder?: string;
    required?: boolean;
    visible?: boolean;
    disabled?: boolean;
    emptyMessage?: string | null;
  } = {},
): RuntimeAttributeFieldState {
  return {
    key,
    label: settings.label ?? DEFAULT_FIELD_LABELS[key],
    placeholder: settings.placeholder ?? DEFAULT_FIELD_PLACEHOLDERS[key],
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
): RuntimeAttributeFormState {
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
    stream: createFieldState("stream", template.streams, {
      required: true,
      visible: true,
      emptyMessage: template.streams.length === 0 ? "No streams are configured for this tenant yet." : null,
    }),
    location: createFieldState("location", locationOptions, {
      label: locationConfig.label,
      placeholder: locationConfig.placeholder,
      required: locationConfig.required,
      visible: locationConfig.enabled && hasStreamSelection,
      disabled: locationOptions.length === 0,
      emptyMessage:
        locationConfig.enabled && hasStreamSelection && locationOptions.length === 0
          ? "No locations are available for the selected stream."
          : null,
    }),
    function: createFieldState("function", functionOptions, {
      required: hasLocationSelection,
      visible: hasLocationSelection,
      disabled: functionOptions.length === 0,
      emptyMessage:
        hasLocationSelection && functionOptions.length === 0
          ? "No functions are available for the selected location."
          : null,
    }),
    department: createFieldState("department", departmentOptions, {
      required: hasFunctionSelection,
      visible: hasFunctionSelection,
      disabled: departmentOptions.length === 0,
      emptyMessage:
        hasFunctionSelection && departmentOptions.length === 0
          ? "No departments are available for the selected function."
          : null,
    }),
    gender: createFieldState("gender", template.genders, {
      label: genderConfig.label,
      placeholder: genderConfig.placeholder,
      required: genderConfig.required,
      visible: genderConfig.enabled,
      disabled: template.genders.length === 0,
      emptyMessage:
        genderConfig.enabled && template.genders.length === 0
          ? "No gender options are configured for this tenant."
          : null,
    }),
    age: createFieldState("age", template.ageGroups, {
      label: ageConfig.label,
      placeholder: ageConfig.placeholder,
      required: ageConfig.required,
      visible: ageConfig.enabled,
      disabled: template.ageGroups.length === 0,
      emptyMessage:
        ageConfig.enabled && template.ageGroups.length === 0
          ? "No age-group options are configured for this tenant."
          : null,
    }),
    seniority: createFieldState("seniority", template.seniorityLevels, {
      label: seniorityConfig.label,
      placeholder: seniorityConfig.placeholder,
      required: seniorityConfig.required,
      visible: seniorityConfig.enabled,
      disabled: template.seniorityLevels.length === 0,
      emptyMessage:
        seniorityConfig.enabled && template.seniorityLevels.length === 0
          ? "No seniority options are configured for this tenant."
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
    "A stream configuration is required before the survey can start.",
  );
  appendBlockingIssue(
    blockingIssues,
    fields.location.visible && fields.location.required && fields.location.options.length === 0,
    "The selected stream has no location mappings.",
  );
  appendBlockingIssue(
    blockingIssues,
    fields.function.visible && fields.function.options.length === 0,
    "The selected location has no function mappings.",
  );
  appendBlockingIssue(
    blockingIssues,
    fields.department.visible && fields.department.options.length === 0,
    "The selected function has no department mappings.",
  );
  appendBlockingIssue(
    blockingIssues,
    fields.gender.visible && fields.gender.required && fields.gender.options.length === 0,
    "Gender is required, but the tenant configuration does not provide any options.",
  );
  appendBlockingIssue(
    blockingIssues,
    fields.age.visible && fields.age.required && fields.age.options.length === 0,
    "Age group is required, but the tenant configuration does not provide any options.",
  );
  appendBlockingIssue(
    blockingIssues,
    fields.seniority.visible && fields.seniority.required && fields.seniority.options.length === 0,
    "Seniority is required, but the tenant configuration does not provide any options.",
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
