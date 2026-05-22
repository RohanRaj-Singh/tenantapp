export type AppLanguage = "en" | "ar";
export type AttributeFieldKey =
  | "stream"
  | "location"
  | "function"
  | "department"
  | "gender"
  | "age"
  | "seniority";

export interface TenantStaticCopy {
  navigation: {
    home: string;
    about: string;
    contact: string;
  };
  languageToggle: {
    ariaLabel: string;
    english: string;
    arabic: string;
  };
  header: {
    menuAriaLabel: string;
  };
  home: {
    bannerAlt: string;
    heroTitle: string;
    heroDescription: string;
    startSurvey: string;
  };
  about: {
    titlePrefix: string;
    intro: string;
    missionTitle: string;
    missionCopy: string;
    visionTitle: string;
    visionCopy: string;
    valuesTitle: string;
    valuesCopy: string;
  };
  contact: {
    chip: string;
    title: string;
    description: (tenantName: string) => string;
    location: string;
  };
  survey: {
    loadingWorkspace: string;
    backToHome: string;
    title: (tenantName: string) => string;
    incompleteMappingsTitle: string;
    additionalMappingIssues: (count: number) => string;
    startSurvey: string;
  };
  surveyQuestions: {
    loadingSurvey: string;
    missingAnswersError: string;
    submitFailure: string;
    incompleteSetupTitle: string;
    incompleteSetupDescription: string;
    returnToSurveySetup: string;
    thankYouTitle: string;
    thankYouBody: string;
    noQuestionsTitle: string;
    noQuestionsDescription: string;
    questionLabel: (questionNumber: number) => string;
    back: string;
    continue: string;
    submit: string;
    submitting: string;
  };
  runtimeUnavailable: {
    chip: string;
    title: string;
    requestedTenant: string;
    footerHelp: string;
    unresolvedRequest: string;
    returnHome: string;
    contactSupport: string;
    missingTenantWorkspace: string;
    invalidTenantLink: string;
    missingPublishedSurvey: string;
    genericUnavailable: string;
  };
  attributeForm: {
    labels: Record<AttributeFieldKey, string>;
    placeholders: Record<AttributeFieldKey, string>;
    emptyMessages: {
      streamsMissing: string;
      noLocationsForStream: string;
      noFunctionsForLocation: string;
      noDepartmentsForFunction: string;
      noGenderOptions: string;
      noAgeOptions: string;
      noSeniorityOptions: string;
    };
    blockingIssues: {
      missingStreamConfiguration: string;
      missingLocationMappings: string;
      missingFunctionMappings: string;
      missingDepartmentMappings: string;
      missingGenderOptions: string;
      missingAgeOptions: string;
      missingSeniorityOptions: string;
    };
  };
}

const EN_COPY: TenantStaticCopy = {
  navigation: {
    home: "Home",
    about: "About",
    contact: "Contact Us",
  },
  languageToggle: {
    ariaLabel: "Switch language",
    english: "EN",
    arabic: "AR",
  },
  header: {
    menuAriaLabel: "Toggle menu",
  },
  home: {
    bannerAlt: "Wellbeing Survey Banner",
    heroTitle: "Employee Wellbeing Survey",
    heroDescription:
      "Your organization cares about your wellbeing. Take this anonymous survey to help us understand and improve your work experience.",
    startSurvey: "Start Survey",
  },
  about: {
    titlePrefix: "About",
    intro:
      "Our wellbeing platform helps organizations understand and improve employee experience through data-driven insights.",
    missionTitle: "Our Mission",
    missionCopy: "To create healthier, more productive workplaces through meaningful employee feedback.",
    visionTitle: "Our Vision",
    visionCopy: "A world where every workplace prioritizes mental health and wellbeing.",
    valuesTitle: "Our Values",
    valuesCopy: "Privacy, Accuracy, Simplicity, and Growth guide everything we do.",
  },
  contact: {
    chip: "Contact",
    title: "Contact Us",
    description: (tenantName: string) =>
      `Have questions about the ${tenantName} wellbeing survey? Reach out to us.`,
    location: "Oman",
  },
  survey: {
    loadingWorkspace: "Loading your survey workspace...",
    backToHome: "Back to Home",
    title: (tenantName: string) => `${tenantName} Wellbeing Survey`,
    incompleteMappingsTitle: "Incomplete tenant mappings were ignored.",
    additionalMappingIssues: (count: number) =>
      `${count} more mapping issue${count === 1 ? " was" : "s were"} filtered safely.`,
    startSurvey: "Start Survey",
  },
  surveyQuestions: {
    loadingSurvey: "Loading survey...",
    missingAnswersError: "Every visible question must be answered before the survey can be submitted.",
    submitFailure: "Unable to submit your survey right now. Please try again.",
    incompleteSetupTitle: "Survey setup is incomplete",
    incompleteSetupDescription:
      "Your tenant attributes are missing, outdated, or tied to a different scanner version. Start again so the runtime app can rebuild a safe submission payload.",
    returnToSurveySetup: "Return to survey setup",
    thankYouTitle: "Thank you",
    thankYouBody:
      "Your wellbeing survey has been submitted successfully. We appreciate your time and honest feedback.",
    noQuestionsTitle: "No survey questions available",
    noQuestionsDescription:
      "The scanner configuration does not contain any valid runtime questions right now. Please check back after the tenant setup is updated.",
    questionLabel: (questionNumber: number) => `Question ${questionNumber}`,
    back: "Back",
    continue: "Continue",
    submit: "Submit",
    submitting: "Submitting...",
  },
  runtimeUnavailable: {
    chip: "Survey unavailable",
    title: "This survey is unavailable right now.",
    requestedTenant: "Requested tenant:",
    footerHelp:
      "If you were expecting to access this survey, please contact your organization's survey administrator, HR team, or tenant owner.",
    unresolvedRequest: "The published runtime configuration could not be resolved for this request.",
    returnHome: "Return to home",
    contactSupport: "Contact support",
    missingTenantWorkspace:
      "This survey link is missing its tenant workspace. Reopen it from the correct tenant URL, or ask your administrator for the latest survey link.",
    invalidTenantLink:
      "The survey link appears incomplete or invalid. Please confirm the link with your tenant administrator and try again.",
    missingPublishedSurvey:
      "We could not find an active published survey for this tenant. Please contact your organization's administrator or tenant owner to confirm the survey has been published.",
    genericUnavailable:
      "The requested tenant runtime is not currently published or available. Please contact your organization's administrator or tenant owner for assistance.",
  },
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
      missingStreamConfiguration: "A stream configuration is required before the survey can start.",
      missingLocationMappings: "The selected stream has no location mappings.",
      missingFunctionMappings: "The selected location has no function mappings.",
      missingDepartmentMappings: "The selected function has no department mappings.",
      missingGenderOptions: "Gender is required, but the tenant configuration does not provide any options.",
      missingAgeOptions: "Age group is required, but the tenant configuration does not provide any options.",
      missingSeniorityOptions: "Seniority is required, but the tenant configuration does not provide any options.",
    },
  },
};

const AR_COPY: TenantStaticCopy = {
  navigation: {
    home: "الرئيسية",
    about: "حول",
    contact: "اتصل بنا",
  },
  languageToggle: {
    ariaLabel: "تبديل اللغة",
    english: "EN",
    arabic: "AR",
  },
  header: {
    menuAriaLabel: "تبديل القائمة",
  },
  home: {
    bannerAlt: "لافتة استبيان الرفاهية",
    heroTitle: "استبيان رفاهية الموظفين",
    heroDescription:
      "مؤسستك تهتم برفاهيتك. شارك في هذا الاستبيان المجهول لمساعدتنا على فهم تجربة عملك وتحسينها.",
    startSurvey: "ابدأ الاستبيان",
  },
  about: {
    titlePrefix: "نبذة عن",
    intro:
      "تساعد منصتنا للرفاهية المؤسسات على فهم تجربة الموظفين وتحسينها من خلال رؤى قائمة على البيانات.",
    missionTitle: "رسالتنا",
    missionCopy: "أن نصنع بيئات عمل أكثر صحة وإنتاجية من خلال ملاحظات الموظفين الهادفة.",
    visionTitle: "رؤيتنا",
    visionCopy: "عالم تعطي فيه كل جهة عمل أولوية للصحة النفسية والرفاهية.",
    valuesTitle: "قيمنا",
    valuesCopy: "الخصوصية والدقة والبساطة والنمو هي المبادئ التي توجه كل ما نقوم به.",
  },
  contact: {
    chip: "تواصل",
    title: "اتصل بنا",
    description: (tenantName: string) =>
      `هل لديك أسئلة حول استبيان رفاهية ${tenantName}؟ تواصل معنا.`,
    location: "عُمان",
  },
  survey: {
    loadingWorkspace: "جارٍ تحميل مساحة الاستبيان...",
    backToHome: "العودة إلى الرئيسية",
    title: (tenantName: string) => `استبيان الرفاهية في ${tenantName}`,
    incompleteMappingsTitle: "تم تجاهل إعدادات الربط غير المكتملة الخاصة بالمستأجر.",
    additionalMappingIssues: (count: number) => `تمت تصفية ${count} مشكلة ربط إضافية بأمان.`,
    startSurvey: "ابدأ الاستبيان",
  },
  surveyQuestions: {
    loadingSurvey: "جارٍ تحميل الاستبيان...",
    missingAnswersError: "يجب الإجابة عن كل سؤال ظاهر قبل إرسال الاستبيان.",
    submitFailure: "تعذر إرسال الاستبيان الآن. يرجى المحاولة مرة أخرى.",
    incompleteSetupTitle: "إعداد الاستبيان غير مكتمل",
    incompleteSetupDescription:
      "سمات المستأجر مفقودة أو قديمة أو مرتبطة بإصدار مختلف من الماسح. ابدأ من جديد حتى يتمكن التطبيق من إعادة بناء حمولة إرسال آمنة.",
    returnToSurveySetup: "العودة إلى إعداد الاستبيان",
    thankYouTitle: "شكرًا لك",
    thankYouBody: "تم إرسال استبيان الرفاهية الخاص بك بنجاح. نقدر وقتك وملاحظاتك الصادقة.",
    noQuestionsTitle: "لا توجد أسئلة استبيان متاحة",
    noQuestionsDescription:
      "إعداد الماسح لا يحتوي حاليًا على أي أسئلة صالحة لوقت التشغيل. يرجى المحاولة لاحقًا بعد تحديث إعدادات المستأجر.",
    questionLabel: (questionNumber: number) => `السؤال ${questionNumber}`,
    back: "رجوع",
    continue: "متابعة",
    submit: "إرسال",
    submitting: "جارٍ الإرسال...",
  },
  runtimeUnavailable: {
    chip: "الاستبيان غير متاح",
    title: "هذا الاستبيان غير متاح حاليًا.",
    requestedTenant: "المستأجر المطلوب:",
    footerHelp:
      "إذا كنت تتوقع الوصول إلى هذا الاستبيان، يرجى التواصل مع مسؤول الاستبيان في مؤسستك أو فريق الموارد البشرية أو مالك المستأجر.",
    unresolvedRequest: "تعذر تحديد إعداد وقت التشغيل المنشور لهذا الطلب.",
    returnHome: "العودة إلى الرئيسية",
    contactSupport: "التواصل مع الدعم",
    missingTenantWorkspace:
      "رابط هذا الاستبيان يفتقد مساحة عمل المستأجر. أعد فتحه من عنوان URL الصحيح للمستأجر أو اطلب أحدث رابط استبيان من المسؤول.",
    invalidTenantLink:
      "يبدو أن رابط الاستبيان غير مكتمل أو غير صالح. يرجى التحقق من الرابط مع مسؤول المستأجر والمحاولة مرة أخرى.",
    missingPublishedSurvey:
      "لم نتمكن من العثور على استبيان منشور ونشط لهذا المستأجر. يرجى التواصل مع مسؤول مؤسستك أو مالك المستأجر للتأكد من نشر الاستبيان.",
    genericUnavailable:
      "إعداد وقت تشغيل المستأجر المطلوب غير منشور أو غير متاح حاليًا. يرجى التواصل مع مسؤول مؤسستك أو مالك المستأجر للحصول على المساعدة.",
  },
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
      missingAgeOptions: "حقل الفئة العمرية مطلوب، لكن إعداد المستأجر لا يوفر أي خيارات.",
      missingSeniorityOptions: "حقل المستوى الوظيفي مطلوب، لكن إعداد المستأجر لا يوفر أي خيارات.",
    },
  },
};

export const APP_COPY: Record<AppLanguage, TenantStaticCopy> = {
  en: EN_COPY,
  ar: AR_COPY,
};

export function getTenantStaticCopy(language: AppLanguage): TenantStaticCopy {
  return APP_COPY[language];
}
