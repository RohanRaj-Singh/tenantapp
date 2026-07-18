import type { DashboardPageId, TenantSurfacePageId } from "@/lib/dashboardMockData";

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
    logoAlt: (tenantName: string) => string;
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
    email: string;
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
  dashboard: {
    navigation: Record<
      TenantSurfacePageId,
      {
        name: string;
        description: string;
        headerTitle?: string;
      }
    >;
    shell: {
      badge: string;
      organizationDashboard: string;
      access: string;
      signedIn: string;
      collapse: string;
      expand: string;
      close: string;
      openNavigation: string;
      closeNavigation: string;
    };
    home: {
      chip: string;
      titleFallback: string;
      description: string;
      signedIn: string;
      cards: {
        analyticsSummaryTitle: string;
        analyticsSummaryDescription: string;
        identityTitle: string;
        identityDescription: string;
        isolationTitle: string;
        isolationDescription: string;
      };
    };
    shared: {
      loadingDashboardData: string;
      loadingExecutiveSummary: string;
      analyticsUnavailableTitle: string;
      analyticsUnavailableDescription: string;
      retry: string;
      recovery: string;
      participants: string;
      locations: string;
      filters: string;
      active: string;
      allData: string;
      scoped: string;
      global: string;
      currentResponseVolume: string;
      distinctReportingSites: string;
      customDrillDown: string;
      organizationWideView: string;
      summaryStatistics: string;
      currentParticipationForDomain: string;
      totalParticipants: string;
      acrossAllDepartments: string;
      higherIsHealthier: string;
      noResponsesForFilters: string;
      riskScore: string;
      bestPerformingLocation: string;
      participantsCountCaption: (count: number, risk: number) => string;
      responsesCountCaption: (count: number, risk: number) => string;
      satisfactionWithResponses: (satisfaction: number, responses: number) => string;
      mostExposedDepartment: string;
      highestRiskDepartmentDescription: (department: string, risk: number) => string;
      riskStatusCaption: (label: string) => string;
      highRiskResponsesCaption: (count: number) => string;
      eligibleResponsesCaption: string;
      fearCandorUnavailableTitle: string;
      fearCandorUnavailableDescription: string;
      subdomainBreakdownUnavailable: string;
      functionSummaryTitle: string;
      functionSummaryDescription: string;
      riskLabel: string;
      satisfactionLabel: string;
      workloadLabel: string;
      statusLegendTitle: string;
      statusLegendDescription: string;
      statusRanges: {
        thriving: string;
        stable: string;
        watchlist: string;
        atRisk: string;
      };
      statusLabels: {
        thriving: string;
        stable: string;
        watchlist: string;
        atRisk: string;
      };
      unavailableSoon: string;
      noQuestionsPrimary: string;
      noQuestionsFollowUp: string;
      currentView: string;
      monitorTitle: string;
      futureFeature: string;
    };
    filtersPanel: {
      title: string;
      select: string;
      selectStream: string;
      selectLocation: string;
      selectFunction: string;
      selectDepartment: string;
      selectAge: string;
      selectGender: string;
      allStreams: string;
      allLocations: string;
      allFunctions: string;
      allDepartments: string;
      allAges: string;
      allGenders: string;
      updating: string;
      reset: string;
      apply: string;
      pills: {
        stream: string;
        location: string;
        function: string;
        department: string;
        age: string;
        gender: string;
      };
    };
    executiveSummary: {
      participantsCaption: string;
      locationsCaption: string;
    };
    domainPages: Record<
      Exclude<DashboardPageId, "executive-summary" | "email-invitations">,
      {
        statLabel: string;
        primaryTitle: string;
        primaryDescription: string;
        secondaryTitle: string;
        secondaryDescription: string;
        detailTitle: string;
        detailItems: Array<{
          title: string;
          description: string;
        }>;
      }
    >;
    emailInvitations: {
      loginTitle: string;
      loginDescription: string;
      username: string;
      password: string;
      usernamePlaceholder: string;
      passwordPlaceholder: string;
      unlock: string;
      title: string;
      description: (tenantName: string) => string;
      uploadTab: string;
      sendTab: string;
      monitorTab: string;
      uploadTitle: string;
      uploadDescription: string;
      uploadBody: string;
      sendTitle: string;
      sendDescription: string;
      sendBody: string;
      monitorDescription: string;
      monitorBody: string;
    };
    reportsPage: {
      chip: string;
      title: string;
      description: string;
      cards: Array<{
        title: string;
        description: string;
      }>;
    };
    settingsPage: {
      chip: string;
      title: string;
      email: string;
      username: string;
      passwordTitle: string;
      passwordDescription: string;
      passwordSubmit: string;
    };
    changePasswordPage: {
      title: string;
      description: string;
      submitLabel: string;
    };
  };
  auth: {
    login: {
      signInFallbackTitle: string;
      subtitle: string;
      unresolvedTenant: string;
      unresolvedTenantCode: string;
      identifierLabel: string;
      identifierPlaceholder: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      submit: string;
      submitting: string;
      help: string;
      errors: {
        identifierRequired: string;
        passwordRequired: string;
        dashboardUnavailable: string;
        signInFailed: string;
      };
    };
    logout: {
      signOut: string;
      signingOut: string;
    };
    passwordForm: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
      passwordHint: string;
      errors: {
        currentPasswordRequired: string;
        newPasswordRequired: string;
        confirmationMismatch: string;
        changeFailed: string;
      };
      success: string;
    };
  };
  legacySurvey: {
    loading: string;
    thankYouTitle: string;
    thankYouBody: string;
    title: (tenantName: string) => string;
    answeredProgress: (answered: number, total: number) => string;
    filteredIssues: string;
    primaryQuestion: string;
    followUpQuestion: string;
    submitSurvey: string;
    submitting: string;
    submitFailure: string;
  };
  notFound: {
    description: string;
    goHome: string;
  };
}
