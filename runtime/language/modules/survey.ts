import type { AppLanguage, TenantStaticCopy } from "../types";

type SurveyCopySection = Pick<TenantStaticCopy, "survey" | "surveyQuestions" | "legacySurvey">;

export const surveyCopy: Record<AppLanguage, SurveyCopySection> = {
  en: {
    survey: {
      loadingWorkspace: "Loading your survey workspace...",
      backToHome: "Back to Home",
      title: (tenantName) => `${tenantName} Wellbeing Survey`,
      incompleteMappingsTitle: "Incomplete tenant mappings were ignored.",
      additionalMappingIssues: (count) =>
        `${count} more mapping issue${count === 1 ? " was" : "s were"} filtered safely.`,
      startSurvey: "Start Survey",
    },
    surveyQuestions: {
      loadingSurvey: "Loading survey...",
      missingAnswersError:
        "Every visible question must be answered before the survey can be submitted.",
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
      questionLabel: (questionNumber) => `Question ${questionNumber}`,
      back: "Back",
      continue: "Continue",
      submit: "Submit",
      submitting: "Submitting...",
    },
    legacySurvey: {
      loading: "Loading survey...",
      thankYouTitle: "Thank you",
      thankYouBody: "Your survey has been submitted successfully.",
      title: (tenantName) => `${tenantName} Survey`,
      answeredProgress: (answered, total) => `${answered} / ${total} answered`,
      filteredIssues: "Scanner configuration issues were filtered safely.",
      primaryQuestion: "Primary",
      followUpQuestion: "Follow-up",
      submitSurvey: "Submit Survey",
      submitting: "Submitting...",
      submitFailure: "Unable to submit your survey right now. Please try again.",
    },
  },
  ar: {
    survey: {
      loadingWorkspace: "جارٍ تحميل مساحة الاستبيان...",
      backToHome: "العودة للرئيسية",
      title: (tenantName) => `استبيان الرفاهية في ${tenantName}`,
      incompleteMappingsTitle: "تم تجاهل إعدادات الربط غير المكتملة الخاصة بالمستأجر.",
      additionalMappingIssues: (count) =>
        `تمت تصفية ${count} مشكلة ربط إضافية بأمان.`,
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
      thankYouBody:
        "تم إرسال استبيان الرفاهية الخاص بك بنجاح. نقدر وقتك وملاحظاتك الصادقة.",
      noQuestionsTitle: "لا توجد أسئلة استبيان متاحة",
      noQuestionsDescription:
        "إعداد الماسح لا يحتوي حاليًا على أي أسئلة صالحة لوقت التشغيل. يرجى المحاولة لاحقًا بعد تحديث إعدادات المستأجر.",
      questionLabel: (questionNumber) => `السؤال ${questionNumber}`,
      back: "رجوع",
      continue: "متابعة",
      submit: "إرسال",
      submitting: "جارٍ الإرسال...",
    },
    legacySurvey: {
      loading: "جارٍ تحميل الاستبيان...",
      thankYouTitle: "شكرًا لك",
      thankYouBody: "تم إرسال استبيانك بنجاح.",
      title: (tenantName) => `استبيان ${tenantName}`,
      answeredProgress: (answered, total) => `${answered} / ${total} تمت الإجابة`,
      filteredIssues: "تمت تصفية مشكلات إعداد الماسح بأمان.",
      primaryQuestion: "أساسي",
      followUpQuestion: "متابعة",
      submitSurvey: "إرسال الاستبيان",
      submitting: "جارٍ الإرسال...",
      submitFailure: "تعذر إرسال الاستبيان الآن. يرجى المحاولة مرة أخرى.",
    },
  },
};
