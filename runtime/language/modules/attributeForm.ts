import type { AppLanguage, TenantStaticCopy } from "../types";

type AttributeFormCopySection = Pick<TenantStaticCopy, "attributeForm">;

export const attributeFormCopy: Record<AppLanguage, AttributeFormCopySection> = {
  en: {
    attributeForm: {
      labels: {
        stream: "Stream",
        location: "Location",
        function: "Function",
        department: "Department",
        gender: "Gender",
        age: "Age Group",
        seniority: "Seniority Level",
      },
      placeholders: {
        stream: "Select your stream",
        location: "Select your location",
        function: "Select your function",
        department: "Select your department",
        gender: "Select your gender",
        age: "Select your age group",
        seniority: "Select your seniority level",
      },
      emptyMessages: {
        streamsMissing: "No streams are configured for this tenant yet.",
        noLocationsForStream: "No locations are available for the selected stream.",
        noFunctionsForLocation: "No functions are available for the selected location.",
        noDepartmentsForFunction: "No departments are available for the selected function.",
        noGenderOptions: "No gender options are configured for this tenant.",
        noAgeOptions: "No age-group options are configured for this tenant.",
        noSeniorityOptions: "No seniority options are configured for this tenant.",
      },
      blockingIssues: {
        missingStreamConfiguration:
          "A stream configuration is required before the survey can start.",
        missingLocationMappings: "The selected stream has no location mappings.",
        missingFunctionMappings: "The selected location has no function mappings.",
        missingDepartmentMappings: "The selected function has no department mappings.",
        missingGenderOptions:
          "Gender is required, but the tenant configuration does not provide any options.",
        missingAgeOptions:
          "Age group is required, but the tenant configuration does not provide any options.",
        missingSeniorityOptions:
          "Seniority is required, but the tenant configuration does not provide any options.",
      },
    },
  },
  ar: {
    attributeForm: {
      labels: {
        stream: "المسار",
        location: "الموقع",
        function: "الوظيفة",
        department: "القسم",
        gender: "الجنس",
        age: "الفئة العمرية",
        seniority: "المستوى الوظيفي",
      },
      placeholders: {
        stream: "اختر المسار",
        location: "اختر الموقع",
        function: "اختر الوظيفة",
        department: "اختر القسم",
        gender: "اختر الجنس",
        age: "اختر الفئة العمرية",
        seniority: "اختر المستوى الوظيفي",
      },
      emptyMessages: {
        streamsMissing: "لم يتم إعداد أي مسارات لهذا المستأجر بعد.",
        noLocationsForStream: "لا توجد مواقع متاحة للمسار المحدد.",
        noFunctionsForLocation: "لا توجد وظائف متاحة للموقع المحدد.",
        noDepartmentsForFunction: "لا توجد أقسام متاحة للوظيفة المحددة.",
        noGenderOptions: "لم يتم إعداد خيارات الجنس لهذا المستأجر.",
        noAgeOptions: "لم يتم إعداد خيارات الفئات العمرية لهذا المستأجر.",
        noSeniorityOptions: "لم يتم إعداد خيارات المستوى الوظيفي لهذا المستأجر.",
      },
      blockingIssues: {
        missingStreamConfiguration: "يلزم إعداد المسارات قبل بدء الاستبيان.",
        missingLocationMappings: "المسار المحدد لا يحتوي على تعيينات مواقع.",
        missingFunctionMappings: "الموقع المحدد لا يحتوي على تعيينات وظائف.",
        missingDepartmentMappings: "الوظيفة المحددة لا تحتوي على تعيينات أقسام.",
        missingGenderOptions: "حقل الجنس مطلوب، لكن إعداد المستأجر لا يوفر أي خيارات.",
        missingAgeOptions:
          "حقل الفئة العمرية مطلوب، لكن إعداد المستأجر لا يوفر أي خيارات.",
        missingSeniorityOptions:
          "حقل المستوى الوظيفي مطلوب، لكن إعداد المستأجر لا يوفر أي خيارات.",
      },
    },
  },
};
