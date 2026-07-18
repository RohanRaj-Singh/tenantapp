import type { AppLanguage, TenantStaticCopy } from "../types";

type DashboardCopySection = Pick<TenantStaticCopy, "dashboard">;

export const dashboardCopy: Record<AppLanguage, DashboardCopySection> = {
  en: {
    dashboard: {
      navigation: {
        "executive-summary": {
          name: "Executive Summary",
          description: "Organization survey statistics and executive-level wellbeing signals.",
        },
        "clinical-risk-index": {
          name: "Clinical Risk Index",
          description:
            "Breakdown of burnout, anxiety, and depression indicators across your organization.",
        },
        "psychological-safety": {
          name: "Psychological Safety",
          headerTitle: "Psychological Safety Index",
          description:
            "Assessment of employee trust, open communication, and interpersonal safety.",
        },
        "workload-efficiency": {
          name: "Workload & Efficiency",
          description:
            "Analysis of employee workload management and satisfaction across the organization.",
        },
        "leadership-alignment": {
          name: "Leadership & Alignment",
          description:
            "Analysis of leadership effectiveness and organizational alignment across demographics.",
        },
        "satisfaction-engagement": {
          name: "Satisfaction & Engagement",
          description:
            "Measure of employee satisfaction with colleagues, personal fulfillment, and workplace environment.",
        },
        "email-invitations": {
          name: "Email Invitations",
          description: "Upload employee list, send survey invitations, and monitor completion status.",
        },
        reports: {
          name: "Reports",
          description: "Protected reporting surfaces for downloadable and review-ready summaries.",
        },
        settings: {
          name: "Settings",
          description: "Limited tenant settings for the single dashboard owner account.",
        },
        "change-password": {
          name: "Change Password",
          description: "Update the dashboard owner password before resuming access.",
        },
        employees: {
          name: "Employees",
          headerTitle: "Employee Management",
          description: "Manage tenant employees.",
        },
reimbursements: {
           name: "Claims",
           headerTitle: "Claims Management",
           description: "Review and manage employee claims.",
         },
      },
      shell: {
        badge: "Organization Dashboard",
        organizationDashboard: "Organization Dashboard",
        access: "Access",
        signedIn: "Signed In",
        collapse: "Collapse",
        expand: "Expand",
        close: "Close",
        openNavigation: "Open dashboard navigation",
        closeNavigation: "Close dashboard navigation",
      },
      home: {
        chip: "Dashboard Home",
        titleFallback: "Tenant Dashboard",
        description:
          "Secure access is now active for dashboards, analytics, reports, and future exports while public survey routes remain outside the authentication boundary.",
        signedIn: "Signed In",
        cards: {
          analyticsSummaryTitle: "Quick Analytics Summary",
          analyticsSummaryDescription:
            "Executive metrics below are now protected by the tenant session lifecycle and middleware gate.",
          identityTitle: "Authenticated Identity",
          identityDescription:
            "The current dashboard owner identity is restored after refresh and reused across protected routes and APIs.",
          isolationTitle: "Session Isolation",
          isolationDescription:
            "Tenant cookies and tenant session records stay isolated from super admin authentication.",
        },
      },
      shared: {
        loadingDashboardData: "Loading dashboard data...",
        loadingExecutiveSummary: "Loading executive summary...",
        analyticsUnavailableTitle: "Analytics Unavailable",
        analyticsUnavailableDescription: "The dashboard could not be loaded at this time.",
        retry: "Retry",
        recovery: "Recovery",
        participants: "Participants",
        locations: "Locations",
        filters: "Filters",
        active: "Active",
        allData: "All Data",
        scoped: "Scoped",
        global: "Global",
        currentResponseVolume: "Current response volume across the organization.",
        distinctReportingSites:
          "Distinct reporting sites included in the executive summary.",
        customDrillDown: "Custom drill-down is staged for this dashboard view.",
        organizationWideView: "Organization-wide view with no filters applied.",
        summaryStatistics: "Summary Statistics",
        currentParticipationForDomain: "Current participation for this domain view.",
        totalParticipants: "Total Participants",
        acrossAllDepartments: "Across all departments in the current dataset.",
        higherIsHealthier: "Higher is healthier",
        noResponsesForFilters: "0 responses match the current filters.",
        riskScore: "Risk Score",
        bestPerformingLocation: "Best Performing Location",
        participantsCountCaption: (count, risk) => `${count} participants - ${risk}% risk`,
        responsesCountCaption: (count, risk) => `${count} responses - ${risk}% risk`,
        satisfactionWithResponses: (satisfaction, responses) =>
          `${satisfaction}% satisfaction with ${responses} responses.`,
        mostExposedDepartment: "Most exposed department",
        highestRiskDepartmentDescription: (department, risk) =>
          `${department} is currently carrying the highest average risk score at ${risk}%.`,
        riskStatusCaption: (label) => `${label} status based on the current satisfaction score.`,
        highRiskResponsesCaption: (count) =>
          `${count} high-risk responses currently flagged in this domain.`,
        eligibleResponsesCaption:
          "Eligible responses currently contributing to this domain snapshot.",
        fearCandorUnavailableTitle: "Fear / Candor Pressure - Unavailable",
        fearCandorUnavailableDescription:
          "Fear/candor pressure breakdowns will appear here once the backend exposes subdomain-level psychological safety scores. No fabricated values are displayed.",
        subdomainBreakdownUnavailable:
          "Subdomain satisfaction breakdowns will appear here once the backend exposes per-subdomain satisfaction scores. No fabricated metric values are displayed.",
        functionSummaryTitle: "Function summary (3 Or More Participants)",
        functionSummaryDescription:
          "Function-level view using the same participant threshold as the source dashboard.",
        riskLabel: "Risk",
        satisfactionLabel: "Satisfaction",
        workloadLabel: "Workload",
        statusLegendTitle: "Status Legend",
        statusLegendDescription:
          "A simple interpretation guide used across the dashboard.",
        statusRanges: {
          thriving: "75% and above",
          stable: "65% to 74%",
          watchlist: "55% to 64%",
          atRisk: "Below 55%",
        },
        statusLabels: {
          thriving: "Thriving",
          stable: "Stable",
          watchlist: "Watchlist",
          atRisk: "At Risk",
        },
        unavailableSoon: "Coming Soon",
        noQuestionsPrimary: "Primary",
        noQuestionsFollowUp: "Follow-up",
        currentView: "Current View",
        monitorTitle: "Monitor Completion Status",
        futureFeature: "Future Feature",
      },
      filtersPanel: {
        title: "Filters",
        select: "Select",
        selectStream: "Select Stream",
        selectLocation: "Select Location",
        selectFunction: "Select Function",
        selectDepartment: "Select Department",
        selectAge: "Select Age",
        selectGender: "Select Gender",
        allStreams: "All Streams",
        allLocations: "All Locations",
        allFunctions: "All Functions",
        allDepartments: "All Departments",
        allAges: "All Ages",
        allGenders: "All Genders",
        updating: "Updating...",
        reset: "Reset",
        apply: "Apply",
        pills: {
          stream: "Stream",
          location: "Location",
          function: "Function",
          department: "Department",
          age: "Age",
          gender: "Gender",
        },
      },
      executiveSummary: {
        participantsCaption: "Current response volume across the organization.",
        locationsCaption: "Distinct reporting sites included in the executive summary.",
      },
      domainPages: {
        "clinical-risk-index": {
          statLabel: "Overall Index",
          primaryTitle: "Domain Breakdown",
          primaryDescription:
            "Risk concentration by age group based on the current organization snapshot.",
          secondaryTitle: "Overall Index Gauge",
          secondaryDescription:
            "Higher score means lower clinical risk and better resilience capacity.",
          detailTitle: "Key Indicators",
          detailItems: [
            {
              title: "Burnout exposure",
              description:
                "Track teams with elevated workload strain and emotional exhaustion signals.",
            },
            {
              title: "Recovery confidence",
              description:
                "Use satisfaction movement to spot where support systems are improving recovery.",
            },
            {
              title: "Escalation watch",
              description:
                "Pair high-risk counts with location trends to prioritize early intervention.",
            },
          ],
        },
        "psychological-safety": {
          statLabel: "Safety Score",
          primaryTitle: "Department Rankings",
          primaryDescription:
            "Departments ranked by satisfaction as a proxy for trust and interpersonal safety.",
          secondaryTitle: "Fear/Blame Intensity Breakdown",
          secondaryDescription:
            "A simplified distribution of pressure signals across current reporting groups.",
          detailTitle: "Psychological Safety Signals",
          detailItems: [
            {
              title: "Trust & openness",
              description:
                "Strong psychological safety shows up where teams feel safe to speak candidly.",
            },
            {
              title: "Learning climate",
              description:
                "Monitor whether mistakes are treated as learning moments instead of blame events.",
            },
            {
              title: "Interpersonal safety",
              description:
                "Use department rankings to spot where everyday interactions still feel risky.",
            },
          ],
        },
        "workload-efficiency": {
          statLabel: "Efficiency Score",
          primaryTitle: "Workload vs Satisfaction by Department",
          primaryDescription:
            "A minimal comparison of demand pressure against perceived satisfaction.",
          secondaryTitle: "Satisfaction Dimensions",
          secondaryDescription:
            "The three practical dimensions used in the source organization dashboard.",
          detailTitle: "Satisfaction Dimensions",
          detailItems: [
            {
              title: "Coworker Satisfaction",
              description: "Quality of relationships and team dynamics.",
            },
            {
              title: "Personal Satisfaction",
              description: "Career development and personal fulfillment.",
            },
            {
              title: "Workplace Satisfaction",
              description:
                "Work environment quality and access to the right resources.",
            },
          ],
        },
        "leadership-alignment": {
          statLabel: "Leadership Score",
          primaryTitle: "Leadership Score by Gender",
          primaryDescription:
            "Perception of leadership effectiveness across gender groups.",
          secondaryTitle: "Leadership Score by Department",
          secondaryDescription:
            "A department-level view of leadership effectiveness and alignment.",
          detailTitle: "Leadership Dimensions",
          detailItems: [
            {
              title: "Vision & Strategy",
              description: "Clear organizational direction and strategic alignment.",
            },
            {
              title: "Trust & Credibility",
              description: "Employee confidence in leadership decisions and integrity.",
            },
            {
              title: "Engagement & Communication",
              description: "Transparent and frequent organizational communication.",
            },
          ],
        },
        "satisfaction-engagement": {
          statLabel: "Overall Satisfaction",
          primaryTitle: "Satisfaction Subdomains",
          primaryDescription:
            "The same three satisfaction themes highlighted in the source dashboard.",
          secondaryTitle: "Stream summary (3 Or More Participants)",
          secondaryDescription:
            "A stream-level snapshot sized to the current mock organization view.",
          detailTitle: "About This Index",
          detailItems: [
            {
              title: "What We Measure",
              description:
                "The Satisfaction & Engagement Index reflects relationships, fulfillment, and workplace experience.",
            },
            {
              title: "Why It Matters",
              description:
                "High satisfaction correlates with stronger retention, productivity, and healthier teams.",
            },
            {
              title: "How To Use It",
              description:
                "Combine stream and function summaries to spot where engagement support should start.",
            },
          ],
        },
      },
      emailInvitations: {
        loginTitle: "Email Invitations Access Login",
        loginDescription:
          "This route keeps the same gated access concept as the source organization dashboard.",
        username: "Username",
        password: "Password",
        usernamePlaceholder: "Enter organization username",
        passwordPlaceholder: "Enter access password",
        unlock: "Unlock Email Invitations",
        title: "Invitation Analytics Coming Soon",
        description: (tenantName) =>
          `Invitation send rates, open rates, and campaign completion metrics will appear here once the invitation tracking backend is active for ${tenantName}.`,
        uploadTab: "Upload",
        sendTab: "Send",
        monitorTab: "Monitor",
        uploadTitle: "Upload Employee List",
        uploadDescription:
          "The upload workflow will be available once the invitation backend is active.",
        uploadBody:
          "Connection to the invitation delivery system is pending. All uploaded data is held locally and is not yet transmitted. No analytics will appear until the backend endpoint is live.",
        sendTitle: "Send Survey Invitations",
        sendDescription:
          "Campaign management will be available after the invitation backend is activated.",
        sendBody:
          "Campaign create, schedule, and send controls are not yet wired to backend services. Any campaign interactions are placeholders only.",
        monitorDescription:
          "Real-time completion tracking will appear here after backend activation.",
        monitorBody:
          "Completion rates, open rates, and per-campaign progress bars require a live invitation tracking backend. No fabricated data is displayed.",
      },
      reportsPage: {
        chip: "Reports",
        title: "Reporting access is now protected and ready for future exports.",
        description:
          "This page establishes the secured report surface for tenant dashboards without exposing platform administration, publishing, or team-management systems.",
        cards: [
          {
            title: "Protected runtime reports",
            description:
              "Reports are only reachable from an authenticated tenant session and are blocked immediately on logout or expiry.",
          },
          {
            title: "Session expiry aware",
            description:
              "Stale sessions are invalidated server-side so report access cannot continue on expired or mismatched cookies.",
          },
          {
            title: "Scoped to one owner account",
            description:
              "The current implementation intentionally keeps report access limited to the single tenant dashboard owner.",
          },
        ],
      },
      settingsPage: {
        chip: "Limited Settings",
        title: "Dashboard owner account",
        email: "Email",
        username: "Username",
        passwordTitle: "Password management",
        passwordDescription:
          "Change the dashboard owner password without involving a super admin reset.",
        passwordSubmit: "Save New Password",
      },
      changePasswordPage: {
        title: "Change password",
        description:
          "Use your current password to set a new dashboard password before continuing.",
        submitLabel: "Update Password",
      },
    },
  },
  ar: {
    dashboard: {
      navigation: {
        "executive-summary": {
          name: "الملخص التنفيذي",
          description: "إحصاءات استبيان المؤسسة وإشارات الرفاهية على مستوى الإدارة.",
        },
        "clinical-risk-index": {
          name: "مؤشر المخاطر السريرية",
          description:
            "تفصيل مؤشرات الاحتراق والقلق والاكتئاب عبر مؤسستك.",
        },
        "psychological-safety": {
          name: "السلامة النفسية",
          headerTitle: "مؤشر السلامة النفسية",
          description:
            "تقييم ثقة الموظفين والتواصل المفتوح والسلامة بين الأفراد.",
        },
        "workload-efficiency": {
          name: "عبء العمل والكفاءة",
          description:
            "تحليل إدارة عبء العمل ورضا الموظفين عبر المؤسسة.",
        },
        "leadership-alignment": {
          name: "القيادة والمواءمة",
          description:
            "تحليل فاعلية القيادة والمواءمة التنظيمية عبر الفئات المختلفة.",
        },
        "satisfaction-engagement": {
          name: "الرضا والمشاركة",
          description:
            "قياس رضا الموظفين عن الزملاء والتحقق الذاتي وبيئة العمل.",
        },
        "email-invitations": {
          name: "دعوات البريد الإلكتروني",
          description:
            "رفع قائمة الموظفين وإرسال دعوات الاستبيان ومتابعة حالة الإكمال.",
        },
        reports: {
          name: "التقارير",
          description: "واجهات تقارير محمية للملخصات القابلة للتنزيل والمراجعة.",
        },
        settings: {
          name: "الإعدادات",
          description: "إعدادات محدودة لحساب مالك لوحة التحكم الوحيد.",
        },
        "change-password": {
          name: "تغيير كلمة المرور",
          description: "تحديث كلمة مرور مالك اللوحة قبل استئناف الوصول.",
        },
        employees: {
          name: "الموظفين",
          headerTitle: "إدارة الموظفين",
          description: "إدارة موظفي المستأجر.",
        },
reimbursements: {
           name: "المطالبات",
           headerTitle: "إدارة المطالبات",
           description: "مراجعة وإدارة مطالبات الموظفين.",
         },
       },
      shell: {
        badge: "لوحة المؤسسة",
        organizationDashboard: "لوحة المؤسسة",
        access: "الوصول",
        signedIn: "تم تسجيل الدخول",
        collapse: "تصغير",
        expand: "توسيع",
        close: "إغلاق",
        openNavigation: "فتح تنقل لوحة التحكم",
        closeNavigation: "إغلاق تنقل لوحة التحكم",
      },
      home: {
        chip: "الرئيسية",
        titleFallback: "لوحة المستأجر",
        description:
          "أصبح الوصول الآمن مفعّلًا الآن للوحات المعلومات والتحليلات والتقارير والصادرات المستقبلية، بينما تبقى مسارات الاستبيان العامة خارج حدود المصادقة.",
        signedIn: "تم تسجيل الدخول",
        cards: {
          analyticsSummaryTitle: "ملخص سريع للتحليلات",
          analyticsSummaryDescription:
            "المقاييس التنفيذية أدناه أصبحت محمية الآن بدورة جلسة المستأجر وطبقة الوسيط.",
          identityTitle: "الهوية الموثقة",
          identityDescription:
            "تتم استعادة هوية مالك اللوحة الحالي بعد التحديث وإعادة استخدامها عبر المسارات وواجهات البرمجة المحمية.",
          isolationTitle: "عزل الجلسة",
          isolationDescription:
            "تظل ملفات تعريف الارتباط وسجلات جلسات المستأجر معزولة عن مصادقة المشرف العام.",
        },
      },
      shared: {
        loadingDashboardData: "جارٍ تحميل بيانات لوحة التحكم...",
        loadingExecutiveSummary: "جارٍ تحميل الملخص التنفيذي...",
        analyticsUnavailableTitle: "التحليلات غير متاحة",
        analyticsUnavailableDescription: "تعذر تحميل لوحة التحكم في الوقت الحالي.",
        retry: "إعادة المحاولة",
        recovery: "الاستعادة",
        participants: "المشاركون",
        locations: "المواقع",
        filters: "الفلاتر",
        active: "نشطة",
        allData: "كل البيانات",
        scoped: "محددة",
        global: "عامة",
        currentResponseVolume: "حجم الاستجابات الحالي عبر المؤسسة.",
        distinctReportingSites: "مواقع التقارير المختلفة المضمنة في الملخص التنفيذي.",
        customDrillDown: "تم تجهيز عرض تفصيلي مخصص لهذا المنظور.",
        organizationWideView: "عرض على مستوى المؤسسة بدون فلاتر مطبقة.",
        summaryStatistics: "إحصاءات موجزة",
        currentParticipationForDomain: "المشاركة الحالية لهذا العرض.",
        totalParticipants: "إجمالي المشاركين",
        acrossAllDepartments: "عبر جميع الأقسام في مجموعة البيانات الحالية.",
        higherIsHealthier: "الرقم الأعلى أفضل",
        noResponsesForFilters: "لا توجد استجابات مطابقة للفلاتر الحالية.",
        riskScore: "درجة المخاطر",
        bestPerformingLocation: "أفضل موقع أداءً",
        participantsCountCaption: (count, risk) => `${count} مشارك - ${risk}% مخاطر`,
        responsesCountCaption: (count, risk) => `${count} استجابة - ${risk}% مخاطر`,
        satisfactionWithResponses: (satisfaction, responses) =>
          `${satisfaction}% رضا مع ${responses} استجابات.`,
        mostExposedDepartment: "القسم الأكثر تعرضًا",
        highestRiskDepartmentDescription: (department, risk) =>
          `${department} يحمل حاليًا أعلى متوسط لدرجة المخاطر عند ${risk}%.`,
        riskStatusCaption: (label) => `حالة ${label} بناءً على درجة الرضا الحالية.`,
        highRiskResponsesCaption: (count) =>
          `${count} استجابات عالية المخاطر تم رصدها حاليًا في هذا المجال.`,
        eligibleResponsesCaption:
          "الاستجابات المؤهلة التي تساهم حاليًا في هذه اللقطة.",
        fearCandorUnavailableTitle: "ضغط الخوف أو الصراحة - غير متاح",
        fearCandorUnavailableDescription:
          "سيظهر هنا تفصيل ضغط الخوف أو الصراحة بمجرد أن يوفّر النظام الخلفي درجات السلامة النفسية على مستوى المجالات الفرعية. لا يتم عرض أي قيم مصطنعة.",
        subdomainBreakdownUnavailable:
          "سيظهر هنا تفصيل الرضا على مستوى المجالات الفرعية بمجرد أن يوفّر النظام الخلفي هذه الدرجات. لا يتم عرض أي قيم مصطنعة.",
        functionSummaryTitle: "ملخص الوظائف (3 مشاركين أو أكثر)",
        functionSummaryDescription:
          "عرض على مستوى الوظائف باستخدام نفس حد المشاركين في لوحة المصدر.",
        riskLabel: "المخاطر",
        satisfactionLabel: "الرضا",
        workloadLabel: "عبء العمل",
        statusLegendTitle: "دليل الحالات",
        statusLegendDescription:
          "دليل مبسط لتفسير الحالات المستخدمة عبر لوحة التحكم.",
        statusRanges: {
          thriving: "75% فأكثر",
          stable: "من 65% إلى 74%",
          watchlist: "من 55% إلى 64%",
          atRisk: "أقل من 55%",
        },
        statusLabels: {
          thriving: "مزدهر",
          stable: "مستقر",
          watchlist: "تحت المراقبة",
          atRisk: "معرض للخطر",
        },
        unavailableSoon: "قريبًا",
        noQuestionsPrimary: "أساسي",
        noQuestionsFollowUp: "متابعة",
        currentView: "العرض الحالي",
        monitorTitle: "متابعة حالة الإكمال",
        futureFeature: "ميزة مستقبلية",
      },
      filtersPanel: {
        title: "الفلاتر",
        select: "اختر",
        selectStream: "اختر المسار",
        selectLocation: "اختر الموقع",
        selectFunction: "اختر الوظيفة",
        selectDepartment: "اختر القسم",
        selectAge: "اختر العمر",
        selectGender: "اختر الجنس",
        allStreams: "كل المسارات",
        allLocations: "كل المواقع",
        allFunctions: "كل الوظائف",
        allDepartments: "كل الأقسام",
        allAges: "كل الأعمار",
        allGenders: "كل الأجناس",
        updating: "جارٍ التحديث...",
        reset: "إعادة تعيين",
        apply: "تطبيق",
        pills: {
          stream: "المسار",
          location: "الموقع",
          function: "الوظيفة",
          department: "القسم",
          age: "العمر",
          gender: "الجنس",
        },
      },
      executiveSummary: {
        participantsCaption: "حجم الاستجابات الحالي عبر المؤسسة.",
        locationsCaption: "مواقع التقارير المختلفة المضمنة في الملخص التنفيذي.",
      },
      domainPages: {
        "clinical-risk-index": {
          statLabel: "المؤشر العام",
          primaryTitle: "تفصيل المجال",
          primaryDescription:
            "تركيز المخاطر حسب الفئة العمرية بناءً على اللقطة الحالية للمؤسسة.",
          secondaryTitle: "مقياس المؤشر العام",
          secondaryDescription:
            "ارتفاع الدرجة يعني انخفاض المخاطر السريرية وتحسن القدرة على الصمود.",
          detailTitle: "المؤشرات الرئيسية",
          detailItems: [
            {
              title: "التعرض للاحتراق",
              description:
                "تتبع الفرق التي تظهر لديها مؤشرات ضغط العمل والإرهاق العاطفي.",
            },
            {
              title: "الثقة في التعافي",
              description:
                "استخدم حركة الرضا لرصد أماكن تحسن أنظمة الدعم في التعافي.",
            },
            {
              title: "مراقبة التصعيد",
              description:
                "اربط أعداد المخاطر العالية باتجاهات المواقع لتحديد الأولويات مبكرًا.",
            },
          ],
        },
        "psychological-safety": {
          statLabel: "درجة السلامة",
          primaryTitle: "ترتيب الأقسام",
          primaryDescription:
            "ترتيب الأقسام حسب الرضا كمؤشر على الثقة والسلامة بين الأفراد.",
          secondaryTitle: "تفصيل شدة الخوف أو اللوم",
          secondaryDescription:
            "توزيع مبسط لإشارات الضغط عبر مجموعات التقارير الحالية.",
          detailTitle: "إشارات السلامة النفسية",
          detailItems: [
            {
              title: "الثقة والانفتاح",
              description:
                "تظهر السلامة النفسية القوية في الفرق التي تشعر بالأمان للتحدث بصراحة.",
            },
            {
              title: "بيئة التعلم",
              description:
                "راقب ما إذا كانت الأخطاء تُعامل كفرص للتعلم بدلًا من كونها مواقف لوم.",
            },
            {
              title: "السلامة بين الأفراد",
              description:
                "استخدم ترتيب الأقسام لرصد الأماكن التي ما زالت فيها التفاعلات اليومية محفوفة بالمخاطر.",
            },
          ],
        },
        "workload-efficiency": {
          statLabel: "درجة الكفاءة",
          primaryTitle: "عبء العمل مقابل الرضا حسب القسم",
          primaryDescription:
            "مقارنة مبسطة بين ضغط الطلب ومستوى الرضا المتصور.",
          secondaryTitle: "أبعاد الرضا",
          secondaryDescription:
            "الأبعاد العملية الثلاثة المستخدمة في لوحة المؤسسة المصدر.",
          detailTitle: "أبعاد الرضا",
          detailItems: [
            {
              title: "الرضا عن الزملاء",
              description: "جودة العلاقات وديناميكيات الفريق.",
            },
            {
              title: "الرضا الشخصي",
              description: "التطور المهني والتحقق الذاتي.",
            },
            {
              title: "الرضا عن بيئة العمل",
              description: "جودة البيئة وتوفر الموارد المناسبة.",
            },
          ],
        },
        "leadership-alignment": {
          statLabel: "درجة القيادة",
          primaryTitle: "درجة القيادة حسب الجنس",
          primaryDescription:
            "تصور فاعلية القيادة عبر مجموعات الجنس المختلفة.",
          secondaryTitle: "درجة القيادة حسب القسم",
          secondaryDescription:
            "عرض على مستوى الأقسام لفاعلية القيادة والمواءمة.",
          detailTitle: "أبعاد القيادة",
          detailItems: [
            {
              title: "الرؤية والاستراتيجية",
              description: "اتجاه تنظيمي واضح ومواءمة استراتيجية.",
            },
            {
              title: "الثقة والمصداقية",
              description: "ثقة الموظفين في القرارات والنزاهة القيادية.",
            },
            {
              title: "المشاركة والتواصل",
              description: "تواصل تنظيمي شفاف ومتكرر.",
            },
          ],
        },
        "satisfaction-engagement": {
          statLabel: "الرضا العام",
          primaryTitle: "المجالات الفرعية للرضا",
          primaryDescription:
            "نفس موضوعات الرضا الثلاثة المميزة في لوحة المصدر.",
          secondaryTitle: "ملخص المسارات (3 مشاركين أو أكثر)",
          secondaryDescription:
            "لقطة على مستوى المسارات بحجم مناسب للمنظمة الحالية.",
          detailTitle: "حول هذا المؤشر",
          detailItems: [
            {
              title: "ما الذي نقيسه",
              description:
                "يعكس مؤشر الرضا والمشاركة العلاقات والتحقق الذاتي وتجربة مكان العمل.",
            },
            {
              title: "لماذا يهم",
              description:
                "يرتبط الرضا العالي باحتفاظ أقوى وإنتاجية أفضل وفرق أكثر صحة.",
            },
            {
              title: "كيفية الاستخدام",
              description:
                "ادمج ملخصات المسارات والوظائف لتحديد نقطة بداية دعم المشاركة.",
            },
          ],
        },
      },
      emailInvitations: {
        loginTitle: "تسجيل دخول دعوات البريد الإلكتروني",
        loginDescription:
          "يحافظ هذا المسار على نفس مفهوم الوصول المقيد الموجود في لوحة المؤسسة المصدر.",
        username: "اسم المستخدم",
        password: "كلمة المرور",
        usernamePlaceholder: "أدخل اسم مستخدم المؤسسة",
        passwordPlaceholder: "أدخل كلمة مرور الوصول",
        unlock: "فتح دعوات البريد الإلكتروني",
        title: "تحليلات الدعوات قريبًا",
        description: (tenantName) =>
          `ستظهر هنا معدلات الإرسال والفتح وإكمال الحملات بمجرد تفعيل نظام تتبع الدعوات لـ ${tenantName}.`,
        uploadTab: "رفع",
        sendTab: "إرسال",
        monitorTab: "متابعة",
        uploadTitle: "رفع قائمة الموظفين",
        uploadDescription:
          "ستتوفر آلية الرفع بمجرد تفعيل النظام الخلفي للدعوات.",
        uploadBody:
          "الاتصال بنظام إرسال الدعوات لا يزال قيد الانتظار. جميع البيانات المرفوعة تبقى محليًا ولا يتم إرسالها بعد. لن تظهر أي تحليلات حتى يصبح المسار الخلفي مباشرًا.",
        sendTitle: "إرسال دعوات الاستبيان",
        sendDescription:
          "ستتوفر إدارة الحملات بعد تفعيل النظام الخلفي للدعوات.",
        sendBody:
          "عناصر إنشاء الحملات وجدولتها وإرسالها ليست موصولة بعد بخدمات الخلفية. أي تفاعل هنا هو مجرد عنصر نائب.",
        monitorDescription:
          "سيظهر تتبع الإكمال اللحظي هنا بعد تفعيل الخلفية.",
        monitorBody:
          "تحتاج معدلات الإكمال والفتح وأشرطة تقدم الحملات إلى نظام تتبع دعوات مباشر. لا يتم عرض أي بيانات مصطنعة.",
      },
      reportsPage: {
        chip: "التقارير",
        title: "أصبح الوصول إلى التقارير محميًا وجاهزًا للصادرات المستقبلية.",
        description:
          "تنشئ هذه الصفحة سطح التقارير الآمن للوحات المستأجر دون كشف أنظمة إدارة المنصة أو النشر أو إدارة الفرق.",
        cards: [
          {
            title: "تقارير تشغيل محمية",
            description:
              "لا يمكن الوصول إلى التقارير إلا من جلسة مستأجر موثقة ويتم حظرها فورًا عند تسجيل الخروج أو انتهاء الصلاحية.",
          },
          {
            title: "واعية بانتهاء الجلسة",
            description:
              "يتم إبطال الجلسات القديمة على مستوى الخادم حتى لا يستمر الوصول إلى التقارير عبر ملفات تعريف ارتباط منتهية أو غير متطابقة.",
          },
          {
            title: "محصورة بحساب مالك واحد",
            description:
              "التنفيذ الحالي يقصر الوصول إلى التقارير عمدًا على مالك لوحة المستأجر الواحد.",
          },
        ],
      },
      settingsPage: {
        chip: "إعدادات محدودة",
        title: "حساب مالك لوحة التحكم",
        email: "البريد الإلكتروني",
        username: "اسم المستخدم",
        passwordTitle: "إدارة كلمة المرور",
        passwordDescription:
          "غيّر كلمة مرور مالك اللوحة دون الحاجة إلى إعادة تعيين من المشرف العام.",
        passwordSubmit: "حفظ كلمة المرور الجديدة",
      },
      changePasswordPage: {
        title: "تغيير كلمة المرور",
        description:
          "استخدم كلمة المرور الحالية لتعيين كلمة مرور جديدة قبل المتابعة.",
        submitLabel: "تحديث كلمة المرور",
      },
    },
  },
};
