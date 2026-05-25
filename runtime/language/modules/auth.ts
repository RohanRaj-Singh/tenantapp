import type { AppLanguage, TenantStaticCopy } from "../types";

type AuthCopySection = Pick<TenantStaticCopy, "auth">;

export const authCopy: Record<AppLanguage, AuthCopySection> = {
  en: {
    auth: {
      login: {
        signInFallbackTitle: "Sign in",
        subtitle: "Enter your credentials to access the dashboard.",
        unresolvedTenant:
          "A tenant workspace could not be resolved. Use your tenant subdomain or include a",
        unresolvedTenantCode: "tenant",
        identifierLabel: "Email or username",
        identifierPlaceholder: "you@company.com",
        passwordLabel: "Password",
        passwordPlaceholder: "Enter your password",
        submit: "Sign in",
        submitting: "Signing in...",
        help: "Need help? Contact your administrator.",
        errors: {
          identifierRequired: "Email or username is required.",
          passwordRequired: "Password is required.",
          dashboardUnavailable: "Tenant dashboard access is unavailable.",
          signInFailed: "Unable to sign in.",
        },
      },
      logout: {
        signOut: "Sign Out",
        signingOut: "Signing out",
      },
      passwordForm: {
        currentPassword: "Current password",
        newPassword: "New password",
        confirmPassword: "Confirm new password",
        passwordHint:
          "Use at least 12 characters with uppercase, lowercase, and a number.",
        errors: {
          currentPasswordRequired: "Current password is required.",
          newPasswordRequired: "New password is required.",
          confirmationMismatch: "New password confirmation does not match.",
          changeFailed: "Password change failed.",
        },
        success: "Password updated successfully.",
      },
    },
  },
  ar: {
    auth: {
      login: {
        signInFallbackTitle: "تسجيل الدخول",
        subtitle: "أدخل بياناتك للوصول إلى لوحة التحكم.",
        unresolvedTenant:
          "تعذر تحديد مساحة عمل المستأجر. استخدم النطاق الفرعي الخاص بك أو أضف معامل الاستعلام",
        unresolvedTenantCode: "tenant",
        identifierLabel: "البريد الإلكتروني أو اسم المستخدم",
        identifierPlaceholder: "you@company.com",
        passwordLabel: "كلمة المرور",
        passwordPlaceholder: "أدخل كلمة المرور",
        submit: "تسجيل الدخول",
        submitting: "جارٍ تسجيل الدخول...",
        help: "هل تحتاج إلى مساعدة؟ تواصل مع المسؤول.",
        errors: {
          identifierRequired: "البريد الإلكتروني أو اسم المستخدم مطلوب.",
          passwordRequired: "كلمة المرور مطلوبة.",
          dashboardUnavailable: "الوصول إلى لوحة المستأجر غير متاح.",
          signInFailed: "تعذر تسجيل الدخول.",
        },
      },
      logout: {
        signOut: "تسجيل الخروج",
        signingOut: "جارٍ تسجيل الخروج",
      },
      passwordForm: {
        currentPassword: "كلمة المرور الحالية",
        newPassword: "كلمة المرور الجديدة",
        confirmPassword: "تأكيد كلمة المرور الجديدة",
        passwordHint:
          "استخدم 12 حرفًا على الأقل مع أحرف كبيرة وصغيرة ورقم.",
        errors: {
          currentPasswordRequired: "كلمة المرور الحالية مطلوبة.",
          newPasswordRequired: "كلمة المرور الجديدة مطلوبة.",
          confirmationMismatch: "تأكيد كلمة المرور الجديدة غير متطابق.",
          changeFailed: "فشل تغيير كلمة المرور.",
        },
        success: "تم تحديث كلمة المرور بنجاح.",
      },
    },
  },
};
