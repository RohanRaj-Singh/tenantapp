import type { AppLanguage, TenantStaticCopy } from "../types";

type RuntimeUnavailableCopySection = Pick<TenantStaticCopy, "runtimeUnavailable">;

export const runtimeUnavailableCopy: Record<AppLanguage, RuntimeUnavailableCopySection> = {
  en: {
    runtimeUnavailable: {
      chip: "Survey unavailable",
      title: "This survey is unavailable right now.",
      requestedTenant: "Requested tenant:",
      footerHelp:
        "If you were expecting to access this survey, please contact your organization's survey administrator, HR team, or tenant owner.",
      unresolvedRequest:
        "The published runtime configuration could not be resolved for this request.",
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
  },
  ar: {
    runtimeUnavailable: {
      chip: "الاستبيان غير متاح",
      title: "هذا الاستبيان غير متاح حاليًا.",
      requestedTenant: "المستأجر المطلوب:",
      footerHelp:
        "إذا كنت تتوقع الوصول إلى هذا الاستبيان، يرجى التواصل مع مسؤول الاستبيان في مؤسستك أو فريق الموارد البشرية أو مالك المستأجر.",
      unresolvedRequest: "تعذر تحديد إعداد وقت التشغيل المنشور لهذا الطلب.",
      returnHome: "العودة للرئيسية",
      contactSupport: "التواصل مع الدعم",
      missingTenantWorkspace:
        "رابط هذا الاستبيان يفتقد مساحة عمل المستأجر. أعد فتحه من عنوان URL الصحيح للمستأجر أو اطلب أحدث رابط من المسؤول.",
      invalidTenantLink:
        "يبدو أن رابط الاستبيان غير مكتمل أو غير صالح. يرجى التحقق من الرابط مع مسؤول المستأجر والمحاولة مرة أخرى.",
      missingPublishedSurvey:
        "لم نتمكن من العثور على استبيان منشور ونشط لهذا المستأجر. يرجى التواصل مع مسؤول مؤسستك أو مالك المستأجر للتأكد من نشر الاستبيان.",
      genericUnavailable:
        "إعداد وقت تشغيل المستأجر المطلوب غير منشور أو غير متاح حاليًا. يرجى التواصل مع مسؤول مؤسستك أو مالك المستأجر للحصول على المساعدة.",
    },
  },
};
