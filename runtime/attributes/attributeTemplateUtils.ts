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
  "department",
  "function",
  "gender",
  "age",
  "seniority",
] as const;

export type RuntimeAttributeField = (typeof RUNTIME_ATTRIBUTE_FIELDS)[number];
export type RuntimeSelectionField = RuntimeAttributeField;

export interface RuntimeAttributeSelections {
  stream: string;
  location: string;
  department: string;
  function: string;
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
  department: "",
  function: "",
  gender: "",
  age: "",
  seniority: "",
};

const DEFAULT_FIELD_LABELS: Record<RuntimeAttributeField, string> = {
  stream: "Stream",
  location: "Location",
  department: "Department",
  function: "Function",
  gender: "Gender",
  age: "Age Group",
  seniority: "Seniority Level",
};

const DEFAULT_FIELD_PLACEHOLDERS: Record<RuntimeAttributeField, string> = {
  stream: "Select your stream",
  location: "Select your location",
  department: "Select your department",
  function: "Select your function",
  gender: "Select your gender",
  age: "Select your age group",
  seniority: "Select your seniority level",
};

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

function normalizeReferenceIds(
  directId: string | undefined,
  collectionIds: string[] | undefined,
  validIds: Set<string>,
  itemLabel: string,
  relationshipLabel: string,
) {
  const issues: string[] = [];
  const ids = [...(directId ? [directId] : []), ...(collectionIds ?? [])].filter((id) =>
    isNonEmptyString(id),
  );

  const seenIds = new Set<string>();
  const normalizedIds: string[] = [];

  ids.forEach((id) => {
    const normalizedId = id.trim();
    if (!validIds.has(normalizedId)) {
      issues.push(`${itemLabel} references missing ${relationshipLabel} "${normalizedId}" and that link was ignored.`);
      return;
    }

    if (seenIds.has(normalizedId)) {
      return;
    }

    seenIds.add(normalizedId);
    normalizedIds.push(normalizedId);
  });

  return { ids: normalizedIds, issues };
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

export function resolveRuntimeAttributeTemplate(
  template: RuntimeAttributeTemplate | null | undefined,
): ResolvedRuntimeAttributeTemplate {
  const streamResult = normalizeOptions(template?.streams, "Stream option");
  const locationResult = normalizeOptions(template?.locations, "Location option");
  const streamIds = new Set(streamResult.options.map((item) => item.id));
  const locationIds = new Set(locationResult.options.map((item) => item.id));
  const locationIssues = [...locationResult.issues];

  const functionBaseResult = normalizeOptions(template?.functions, "Function option");
  const normalizedFunctions: RuntimeFunctionOption[] = [];
  const functionIssues = [...functionBaseResult.issues];

  functionBaseResult.options.forEach((item) => {
    const streamReference = normalizeReferenceIds(
      item.streamId,
      item.streamIds,
      streamIds,
      `Function "${item.label}"`,
      "stream",
    );

    if (!streamReference.ids.length) {
      functionIssues.push(`Function "${item.label}" has no valid stream mapping and was ignored.`);
      return;
    }

    const locationReference = normalizeReferenceIds(
      undefined,
      item.locationIds,
      locationIds,
      `Function "${item.label}"`,
      "location",
    );

    normalizedFunctions.push({
      ...item,
      streamId: undefined,
      streamIds: streamReference.ids,
      locationIds: locationReference.ids,
    });
    functionIssues.push(...streamReference.issues, ...locationReference.issues);
  });

  const functionIds = new Set(normalizedFunctions.map((item) => item.id));
  const departmentBaseResult = normalizeOptions(template?.departments, "Department option");
  const normalizedDepartments: RuntimeDepartmentOption[] = [];
  const departmentIssues = [...departmentBaseResult.issues];

  departmentBaseResult.options.forEach((item) => {
    const streamReference = normalizeReferenceIds(
      item.streamId,
      item.streamIds,
      streamIds,
      `Department "${item.label}"`,
      "stream",
    );
    const functionReference = normalizeReferenceIds(
      item.functionId,
      item.functionIds,
      functionIds,
      `Department "${item.label}"`,
      "function",
    );

    if (!streamReference.ids.length || !functionReference.ids.length) {
      departmentIssues.push(`Department "${item.label}" has incomplete hierarchy mappings and was ignored.`);
      return;
    }

    const locationReference = normalizeReferenceIds(
      undefined,
      item.locationIds,
      locationIds,
      `Department "${item.label}"`,
      "location",
    );

    normalizedDepartments.push({
      ...item,
      streamId: undefined,
      functionId: undefined,
      streamIds: streamReference.ids,
      functionIds: functionReference.ids,
      locationIds: locationReference.ids,
    });
    departmentIssues.push(...streamReference.issues, ...functionReference.issues, ...locationReference.issues);
  });

  const departmentIds = new Set(normalizedDepartments.map((item) => item.id));
  const finalFunctions = normalizedFunctions.map((item) => {
    const departmentReference = normalizeReferenceIds(
      undefined,
      item.departmentIds,
      departmentIds,
      `Function "${item.label}"`,
      "department",
    );

    functionIssues.push(...departmentReference.issues);

    return {
      ...item,
      departmentIds: departmentReference.ids,
    };
  });

  const finalLocations = locationResult.options.map((item) => {
    const streamReference = normalizeReferenceIds(
      undefined,
      item.streamIds,
      streamIds,
      `Location "${item.label}"`,
      "stream",
    );

    locationIssues.push(...streamReference.issues);

    return {
      ...item,
      streamIds: streamReference.ids,
    };
  });

  const genderResult = normalizeValueList(template?.genders, "Gender option");
  const ageGroupResult = normalizeValueList(template?.ageGroups, "Age option");
  const seniorityResult = normalizeValueList(template?.seniorityLevels, "Seniority option");

  return {
    streams: streamResult.options,
    locations: finalLocations,
    functions: finalFunctions,
    departments: normalizedDepartments,
    genders: genderResult.options,
    ageGroups: ageGroupResult.options,
    seniorityLevels: seniorityResult.options,
    fixedAttributes: {
      location: resolveFixedAttributeConfig(
        "location",
        template?.fixedAttributes?.location,
        finalLocations.length,
      ),
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

function getOptionByValue<T extends RuntimeAttributeOption>(items: T[], value: string) {
  return items.find((item) => item.value === value) ?? null;
}

function includesReference(referenceIds: string[] | undefined, id: string) {
  if (!referenceIds?.length) {
    return true;
  }

  return referenceIds.includes(id);
}

export function getAvailableLocations(
  template: ResolvedRuntimeAttributeTemplate,
  selections: RuntimeAttributeSelections,
) {
  const selectedStream = getOptionByValue(template.streams, selections.stream);

  if (!selectedStream) {
    return [];
  }

  return template.locations.filter((item) => includesReference(item.streamIds, selectedStream.id));
}

export function getAvailableDepartments(
  template: ResolvedRuntimeAttributeTemplate,
  selections: RuntimeAttributeSelections,
) {
  const selectedStream = getOptionByValue(template.streams, selections.stream);
  const selectedFunction = getOptionByValue(template.functions, selections.function);
  const selectedLocation = getOptionByValue(template.locations, selections.location);

  if (!selectedStream) {
    return [];
  }

  return template.departments.filter((item) => {
    const matchesStream = includesReference(item.streamIds, selectedStream.id);
    const matchesFunction = selectedFunction ? includesReference(item.functionIds, selectedFunction.id) : true;
    const matchesLocation = selectedLocation ? includesReference(item.locationIds, selectedLocation.id) : true;

    return matchesStream && matchesFunction && matchesLocation;
  });
}

export function getAvailableFunctions(
  template: ResolvedRuntimeAttributeTemplate,
  selections: RuntimeAttributeSelections,
) {
  const selectedStream = getOptionByValue(template.streams, selections.stream);
  const selectedDepartment = getOptionByValue(template.departments, selections.department);
  const selectedLocation = getOptionByValue(template.locations, selections.location);

  if (!selectedStream) {
    return [];
  }

  return template.functions.filter((item) => {
    const matchesStream = includesReference(item.streamIds, selectedStream.id);
    const matchesDepartment = selectedDepartment
      ? includesReference(selectedDepartment.functionIds, item.id) &&
        includesReference(item.departmentIds, selectedDepartment.id)
      : true;
    const matchesLocation = selectedLocation ? includesReference(item.locationIds, selectedLocation.id) : true;

    return matchesStream && matchesDepartment && matchesLocation;
  });
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

export function sanitizeRuntimeAttributeSelections(
  selections: RuntimeAttributeSelections,
  template: ResolvedRuntimeAttributeTemplate,
) {
  const nextSelections = { ...EMPTY_RUNTIME_ATTRIBUTE_SELECTIONS, ...selections };
  const selectedStream = getOptionByValue(template.streams, nextSelections.stream);

  if (!selectedStream) {
    return { ...EMPTY_RUNTIME_ATTRIBUTE_SELECTIONS, gender: nextSelections.gender, age: nextSelections.age, seniority: nextSelections.seniority };
  }

  const availableLocations = getAvailableLocations(template, nextSelections);
  if (nextSelections.location && !availableLocations.some((item) => item.value === nextSelections.location)) {
    nextSelections.location = "";
  }

  const availableDepartments = getAvailableDepartments(template, {
    ...nextSelections,
    function: "",
  });
  if (
    nextSelections.department &&
    !availableDepartments.some((item) => item.value === nextSelections.department)
  ) {
    nextSelections.department = "";
  }

  const availableFunctions = getAvailableFunctions(template, nextSelections);
  if (nextSelections.function && !availableFunctions.some((item) => item.value === nextSelections.function)) {
    nextSelections.function = "";
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

  if (!template.fixedAttributes.location.enabled) {
    nextSelections.location = "";
  }

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
    nextSelections.department = "";
    nextSelections.function = "";
  }

  if (field === "location") {
    nextSelections.department = "";
    nextSelections.function = "";
  }

  if (field === "department") {
    const departmentFunctionOptions = getAvailableFunctions(template, {
      ...nextSelections,
      function: "",
    });

    if (!departmentFunctionOptions.some((item) => item.value === nextSelections.function)) {
      nextSelections.function = "";
    }
  }

  if (field === "function") {
    const functionDepartmentOptions = getAvailableDepartments(template, {
      ...nextSelections,
      department: "",
    });

    if (!functionDepartmentOptions.some((item) => item.value === nextSelections.department)) {
      nextSelections.department = "";
    }
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
  const departmentOptions = getAvailableDepartments(template, selections);
  const functionOptions = getAvailableFunctions(template, selections);

  const locationConfig = template.fixedAttributes.location;
  const genderConfig = template.fixedAttributes.gender;
  const ageConfig = template.fixedAttributes.age;
  const seniorityConfig = template.fixedAttributes.seniority;

  const hasStreamSelection = Boolean(selections.stream);
  const locationBlocksHierarchy =
    locationConfig.enabled && locationConfig.required && locationOptions.length > 0;
  const hierarchyVisible = hasStreamSelection && (!locationBlocksHierarchy || Boolean(selections.location));

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
    department: createFieldState("department", departmentOptions, {
      required: hierarchyVisible,
      visible: hierarchyVisible,
      disabled: departmentOptions.length === 0,
      emptyMessage:
        hierarchyVisible && departmentOptions.length === 0
          ? "No departments match the current stream and location."
          : null,
    }),
    function: createFieldState("function", functionOptions, {
      required: hierarchyVisible,
      visible: hierarchyVisible,
      disabled: functionOptions.length === 0,
      emptyMessage:
        hierarchyVisible && functionOptions.length === 0
          ? "No functions match the current stream, department, and location."
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
    fields.department.visible && fields.department.options.length === 0,
    "The selected hierarchy does not expose any departments.",
  );
  appendBlockingIssue(
    blockingIssues,
    fields.function.visible && fields.function.options.length === 0,
    "The selected hierarchy does not expose any functions.",
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
