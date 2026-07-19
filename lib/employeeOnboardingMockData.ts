export interface ImportHistoryEntry {
  id: string;
  filename: string;
  uploadedAt: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdCount: number;
  status: "completed" | "partial" | "failed";
}

export interface OnboardingOverview {
  employeesImported: number;
  employeesCreated: number;
  invitationsSent: number;
  pendingRegistration: number;
  registeredEmployees: number;
  expiredInvitations: number;
}

export interface EmployeeOnboardingRecord {
  id: string;
  employeeCode: string;
  email: string;
  name: string | null;
  invitationStatus: "not_invited" | "pending" | "registered" | "expired" | "cancelled";
  invitedAt: string | null;
  expiresAt: string | null;
}

export interface ImportValidationRow {
  row: number;
  employeeCode: string;
  email: string;
  name: string;
  errors: string[];
  valid: boolean;
}

export interface ImportScenario {
  label: string;
  overview: OnboardingOverview;
  pendingInvitations: EmployeeOnboardingRecord[];
  notInvited: EmployeeOnboardingRecord[];
  registered: EmployeeOnboardingRecord[];
  expired: EmployeeOnboardingRecord[];
  cancelled: EmployeeOnboardingRecord[];
  importHistory: ImportHistoryEntry[];
  validationResult?: {
    total: number;
    valid: number;
    errors: number;
    rows: ImportValidationRow[];
  };
}

const NOW = "2026-07-18T12:00:00.000Z";

const scenarios: Record<string, ImportScenario> = {
  empty: {
    label: "No imports yet",
    overview: {
      employeesImported: 0,
      employeesCreated: 0,
      invitationsSent: 0,
      pendingRegistration: 0,
      registeredEmployees: 0,
      expiredInvitations: 0,
    },
    pendingInvitations: [],
    notInvited: [],
    registered: [],
    expired: [],
    cancelled: [],
    importHistory: [],
  },

  success: {
    label: "Successful import with active invitations",
    overview: {
      employeesImported: 168,
      employeesCreated: 155,
      invitationsSent: 132,
      pendingRegistration: 45,
      registeredEmployees: 87,
      expiredInvitations: 12,
    },
    pendingInvitations: [
      { id: "inv_001", employeeCode: "OMT-045", email: "hassan.alriyami@omantel.om", name: null, invitationStatus: "pending", invitedAt: "2026-07-15T10:00:00.000Z", expiresAt: "2026-07-29T10:00:00.000Z" },
      { id: "inv_002", employeeCode: "OMT-046", email: "majid.alsulaimi@omantel.om", name: null, invitationStatus: "pending", invitedAt: "2026-07-15T10:00:00.000Z", expiresAt: "2026-07-29T10:00:00.000Z" },
      { id: "inv_003", employeeCode: "OMT-047", email: "nadia.alhabsi@omantel.om", name: null, invitationStatus: "pending", invitedAt: "2026-07-16T08:30:00.000Z", expiresAt: "2026-07-30T08:30:00.000Z" },
      { id: "inv_004", employeeCode: "OQ-023", email: "yusuf.alblushi@oq.com", name: null, invitationStatus: "pending", invitedAt: "2026-07-16T08:30:00.000Z", expiresAt: "2026-07-30T08:30:00.000Z" },
      { id: "inv_005", employeeCode: "PDO-018", email: "latifa.albusaidi@pdo.co.om", name: null, invitationStatus: "pending", invitedAt: "2026-07-17T09:00:00.000Z", expiresAt: "2026-07-31T09:00:00.000Z" },
    ],
    notInvited: [
      { id: "emp_001", employeeCode: "OMT-048", email: "salim.alrawahi@omantel.om", name: "Salim Al Rawahi", invitationStatus: "not_invited", invitedAt: null, expiresAt: null },
      { id: "emp_002", employeeCode: "OMT-049", email: "amna.almuqhimi@omantel.om", name: "Amna Al Muqhimi", invitationStatus: "not_invited", invitedAt: null, expiresAt: null },
      { id: "emp_003", employeeCode: "OQ-024", email: "haitham.almahrooqi@oq.com", name: "Haitham Al Mahrooqi", invitationStatus: "not_invited", invitedAt: null, expiresAt: null },
    ],
    registered: [
      { id: "emp_004", employeeCode: "OMT-001", email: "ahmed.balushi@omantel.om", name: "Ahmed Al Balushi", invitationStatus: "registered", invitedAt: "2026-07-10T09:00:00.000Z", expiresAt: null },
      { id: "emp_005", employeeCode: "OMT-002", email: "mariam.siyabi@omantel.om", name: "Mariam Al Siyabi", invitationStatus: "registered", invitedAt: "2026-07-10T09:00:00.000Z", expiresAt: null },
      { id: "emp_006", employeeCode: "OQ-001", email: "said.hinai@oq.com", name: "Said Al Hinai", invitationStatus: "registered", invitedAt: "2026-07-11T10:00:00.000Z", expiresAt: null },
      { id: "emp_007", employeeCode: "OQ-002", email: "noor.zadjali@oq.com", name: "Noor Al Zadjali", invitationStatus: "registered", invitedAt: "2026-07-11T10:00:00.000Z", expiresAt: null },
      { id: "emp_008", employeeCode: "PDO-001", email: "fatma.riyami@pdo.co.om", name: "Fatma Al Riyami", invitationStatus: "registered", invitedAt: "2026-07-12T11:00:00.000Z", expiresAt: null },
    ],
    expired: [
      { id: "exp_001", employeeCode: "OMT-030", email: "ibrahim.albulushi@omantel.om", name: null, invitationStatus: "expired", invitedAt: "2026-06-01T10:00:00.000Z", expiresAt: "2026-06-15T10:00:00.000Z" },
      { id: "exp_002", employeeCode: "OQ-015", email: "mansour.alghafri@oq.com", name: null, invitationStatus: "expired", invitedAt: "2026-06-05T08:00:00.000Z", expiresAt: "2026-06-19T08:00:00.000Z" },
    ],
    cancelled: [
      { id: "cnl_001", employeeCode: "OMT-035", email: "khalfan.albusaidy@omantel.om", name: null, invitationStatus: "cancelled", invitedAt: "2026-06-20T09:00:00.000Z", expiresAt: null },
      { id: "cnl_002", employeeCode: "PDO-012", email: "salim.alhattali@pdo.co.om", name: null, invitationStatus: "cancelled", invitedAt: "2026-06-22T10:00:00.000Z", expiresAt: null },
    ],
    importHistory: [
      { id: "imp_003", filename: "q2-employees-2026.csv", uploadedAt: "2026-07-15T09:00:00.000Z", totalRows: 168, validRows: 155, errorRows: 13, createdCount: 155, status: "partial" },
      { id: "imp_002", filename: "onboarding-may.csv", uploadedAt: "2026-05-01T10:00:00.000Z", totalRows: 42, validRows: 42, errorRows: 0, createdCount: 42, status: "completed" },
      { id: "imp_001", filename: "initial-employees.csv", uploadedAt: "2026-04-15T08:00:00.000Z", totalRows: 200, validRows: 198, errorRows: 2, createdCount: 198, status: "completed" },
    ],
    validationResult: {
      total: 168,
      valid: 155,
      errors: 13,
      rows: [
        { row: 1, employeeCode: "OMT-045", email: "hassan.alriyami@omantel.om", name: "Hassan Al Riyami", errors: [], valid: true },
        { row: 2, employeeCode: "OMT-046", email: "majid.alsulaimi@omantel.om", name: "Majid Al Sulaimi", errors: [], valid: true },
        { row: 3, employeeCode: "OMT-047", email: "nadia.alhabsi@omantel.om", name: "Nadia Al Habsi", errors: [], valid: true },
        { row: 4, employeeCode: "OMT-048", email: "salim.alrawahi@omantel.om", name: "Salim Al Rawahi", errors: [], valid: true },
        { row: 5, employeeCode: "OMT-049", email: "amna.almuqhimi@omantel.om", name: "Amna Al Muqhimi", errors: [], valid: true },
        { row: 6, employeeCode: "OQ-023", email: "yusuf.alblushi@oq.com", name: "Yusuf Al Blushi", errors: [], valid: true },
        { row: 7, employeeCode: "OQ-024", email: "haitham.almahrooqi@oq.com", name: "Haitham Al Mahrooqi", errors: [], valid: true },
        { row: 8, employeeCode: "PDO-018", email: "latifa.albusaidi@pdo.co.om", name: "Latifa Al Busaidi", errors: [], valid: true },
        { row: 9, employeeCode: "INVALID-01", email: "not-an-email", name: "Bad Record", errors: ["Invalid email format"], valid: false },
        { row: 10, employeeCode: "", email: "missing@code.com", name: "No Code", errors: ["Employee code is required"], valid: false },
        { row: 11, employeeCode: "DUP-001", email: "duplicate@test.com", name: "Duplicate Code", errors: ["Employee code already exists"], valid: false },
        { row: 12, employeeCode: "DUP-002", email: "duplicate@test.com", name: "Also Duplicate", errors: ["Email already exists in system"], valid: false },
      ],
    },
  },
};

export function getOnboardingMockData(scenarioId: string): ImportScenario | null {
  return scenarios[scenarioId] ?? null;
}

export function getScenarioList(): { id: string; label: string }[] {
  return Object.entries(scenarios).map(([id, s]) => ({ id, label: s.label }));
}

export function getInvitationStatusColor(status: EmployeeOnboardingRecord["invitationStatus"]): string {
  switch (status) {
    case "not_invited": return "bg-slate-100 text-slate-600";
    case "pending": return "bg-amber-100 text-amber-700";
    case "registered": return "bg-emerald-100 text-emerald-700";
    case "expired": return "bg-red-100 text-red-700";
    case "cancelled": return "bg-slate-200 text-slate-500";
  }
}

export function getInvitationStatusLabel(status: EmployeeOnboardingRecord["invitationStatus"]): string {
  switch (status) {
    case "not_invited": return "Not Invited";
    case "pending": return "Pending";
    case "registered": return "Registered";
    case "expired": return "Expired";
    case "cancelled": return "Cancelled";
  }
}
