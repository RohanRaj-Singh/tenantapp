import type { RuntimeScannerVersion, ScannerAnswerOption, ScannerQuestion } from "../contracts/scannerVersion";

function answer(id: string, order: number, label: string, score: number): ScannerAnswerOption {
  return { id, order, label, score };
}

function question(
  id: string,
  order: number,
  questionText: string,
  weight: number,
  kind: ScannerQuestion["kind"],
  answers: ScannerAnswerOption[],
  helpText?: string,
): ScannerQuestion {
  return {
    id,
    order,
    questionText,
    weight,
    kind,
    answers,
    helpText,
  };
}

const tenantABurnoutQuestionId = "94b8b612-c6ad-40c5-a5be-f9bbf6000001";
const tenantABurnoutFollowUpQuestionId = "94b8b612-c6ad-40c5-a5be-f9bbf6000002";
const tenantAPsychSafetyQuestionId = "94b8b612-c6ad-40c5-a5be-f9bbf6000003";
const tenantAPsychSafetyFollowUpQuestionId = "94b8b612-c6ad-40c5-a5be-f9bbf6000004";

export const tenantAScannerVersion: RuntimeScannerVersion = {
  id: "3f9ec4f0-219c-4e5e-9640-9d6f2aa90101",
  version: "2026.05.10",
  publishedAt: "2026-05-10T00:00:00.000Z",
  isActive: true,
  categories: [
    {
      id: "1af0c4c9-a711-4c06-b688-4e78014e1001",
      order: 1,
      label: "Satisfaction & Engagement",
      description: "Primary wellbeing and team-connection indicators.",
      weight: 100,
      subdomains: [
        {
          id: "1af0c4c9-a711-4c06-b688-4e78014e1101",
          order: 1,
          label: "Personal Wellbeing",
          description: "Self-reported resilience and wellbeing prompts.",
          weight: 50,
          questions: [
            question(
              "1af0c4c9-a711-4c06-b688-4e78014e1201",
              1,
              "How often have you felt calm and peaceful during the last two weeks?",
              2,
              "primary",
              [
                answer("1af0c4c9-a711-4c06-b688-4e78014e1301", 1, "Never", -2),
                answer("1af0c4c9-a711-4c06-b688-4e78014e1302", 2, "Rarely", -1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e1303", 3, "Often", 1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e1304", 4, "Always", 2),
              ],
            ),
            question(
              "1af0c4c9-a711-4c06-b688-4e78014e1202",
              2,
              "To what extent do you feel you can recover after a demanding work week?",
              3,
              "primary",
              [
                answer("1af0c4c9-a711-4c06-b688-4e78014e1311", 1, "Not at all", -2),
                answer("1af0c4c9-a711-4c06-b688-4e78014e1312", 2, "Slightly", -1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e1313", 3, "Moderately", 0),
                answer("1af0c4c9-a711-4c06-b688-4e78014e1314", 4, "Mostly", 1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e1315", 5, "Completely", 2),
              ],
            ),
          ],
        },
        {
          id: "1af0c4c9-a711-4c06-b688-4e78014e1102",
          order: 2,
          label: "Coworker Relationships",
          description: "Signals about support and coordination across peers.",
          weight: 50,
          questions: [
            question(
              "1af0c4c9-a711-4c06-b688-4e78014e1203",
              1,
              "I can rely on coworkers when I need support with my work.",
              2,
              "primary",
              [
                answer("1af0c4c9-a711-4c06-b688-4e78014e1321", 1, "Strongly disagree", -2),
                answer("1af0c4c9-a711-4c06-b688-4e78014e1322", 2, "Disagree", -1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e1323", 3, "Neutral", 0),
                answer("1af0c4c9-a711-4c06-b688-4e78014e1324", 4, "Agree", 1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e1325", 5, "Strongly agree", 2),
              ],
            ),
          ],
        },
      ],
    },
    {
      id: "1af0c4c9-a711-4c06-b688-4e78014e1002",
      order: 2,
      label: "Clinical Risk Index",
      description: "Early indicators of burnout and distress.",
      weight: 100,
      subdomains: [
        {
          id: "1af0c4c9-a711-4c06-b688-4e78014e2101",
          order: 1,
          label: "Burnout",
          description: "Energy depletion and emotional fatigue signals.",
          weight: 50,
          questions: [
            question(
              tenantABurnoutQuestionId,
              1,
              "How often do you feel emotionally drained from your work?",
              4,
              "primary",
              [
                answer("1af0c4c9-a711-4c06-b688-4e78014e2301", 1, "Nearly every day", -2),
                answer("1af0c4c9-a711-4c06-b688-4e78014e2302", 2, "More than half the days", -1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e2303", 3, "Several days", 0),
                answer("1af0c4c9-a711-4c06-b688-4e78014e2304", 4, "Rarely", 1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e2305", 5, "Not at all", 2),
              ],
            ),
            question(
              tenantABurnoutFollowUpQuestionId,
              90,
              "Which workplace factor contributes most when that drained feeling is strongest?",
              1,
              "follow-up",
              [
                answer("1af0c4c9-a711-4c06-b688-4e78014e2311", 1, "Unmanageable workload", -1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e2312", 2, "Insufficient staffing", -1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e2313", 3, "Limited recovery time", 0),
                answer("1af0c4c9-a711-4c06-b688-4e78014e2314", 4, "Other workplace factors", 1),
              ],
              "Diagnostic follow-up only. This answer is not part of primary scoring.",
            ),
          ],
        },
        {
          id: "1af0c4c9-a711-4c06-b688-4e78014e2102",
          order: 2,
          label: "Anxiety Load",
          description: "Daily stress activation prompts.",
          weight: 50,
          questions: [
            question(
              "1af0c4c9-a711-4c06-b688-4e78014e2201",
              1,
              "How often do you find it difficult to relax after work responsibilities end?",
              3,
              "primary",
              [
                answer("1af0c4c9-a711-4c06-b688-4e78014e2321", 1, "Always", -2),
                answer("1af0c4c9-a711-4c06-b688-4e78014e2322", 2, "Often", -1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e2323", 3, "Sometimes", 1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e2324", 4, "Never", 2),
              ],
            ),
          ],
        },
      ],
    },
    {
      id: "1af0c4c9-a711-4c06-b688-4e78014e1003",
      order: 3,
      label: "Workload & Efficiency",
      description: "Signals about resource sufficiency and capacity.",
      weight: 100,
      subdomains: [
        {
          id: "1af0c4c9-a711-4c06-b688-4e78014e3101",
          order: 1,
          label: "Capacity & Resources",
          description: "Short-form operational feasibility questions.",
          weight: 100,
          questions: [
            question(
              "1af0c4c9-a711-4c06-b688-4e78014e3201",
              1,
              "Do you usually have the time and resources you need to complete your work safely?",
              2,
              "primary",
              [
                answer("1af0c4c9-a711-4c06-b688-4e78014e3301", 1, "No", -1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e3302", 2, "Sometimes", 0),
                answer("1af0c4c9-a711-4c06-b688-4e78014e3303", 3, "Yes", 1),
              ],
            ),
          ],
        },
      ],
    },
    {
      id: "1af0c4c9-a711-4c06-b688-4e78014e1004",
      order: 4,
      label: "Leadership & Alignment",
      description: "Clarity of direction and role alignment.",
      weight: 100,
      subdomains: [
        {
          id: "1af0c4c9-a711-4c06-b688-4e78014e4101",
          order: 1,
          label: "Directional Clarity",
          description: "Single-item alignment checkpoint.",
          weight: 100,
          questions: [
            question(
              "1af0c4c9-a711-4c06-b688-4e78014e4201",
              1,
              "Do you understand how your current work connects to your team's goals?",
              2,
              "primary",
              [
                answer("1af0c4c9-a711-4c06-b688-4e78014e4301", 1, "No", -1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e4302", 2, "Yes", 1),
              ],
            ),
          ],
        },
      ],
    },
    {
      id: "1af0c4c9-a711-4c06-b688-4e78014e1005",
      order: 5,
      label: "Psychological Safety Index",
      description: "Team-level safety and voice conditions.",
      weight: 100,
      subdomains: [
        {
          id: "1af0c4c9-a711-4c06-b688-4e78014e5101",
          order: 1,
          label: "Speak-Up Safety",
          description: "Signals about candor and interpersonal safety.",
          weight: 100,
          questions: [
            question(
              tenantAPsychSafetyQuestionId,
              1,
              "If I raise a concern on my team, I believe it will be taken seriously.",
              3,
              "primary",
              [
                answer("1af0c4c9-a711-4c06-b688-4e78014e5301", 1, "Strongly disagree", -2),
                answer("1af0c4c9-a711-4c06-b688-4e78014e5302", 2, "Disagree", -1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e5303", 3, "Neutral", 0),
                answer("1af0c4c9-a711-4c06-b688-4e78014e5304", 4, "Agree", 1),
                answer("1af0c4c9-a711-4c06-b688-4e78014e5305", 5, "Strongly agree", 2),
              ],
            ),
            question(
              tenantAPsychSafetyFollowUpQuestionId,
              90,
              "When a concern feels serious, how likely are you to use a formal reporting path?",
              1,
              "follow-up",
              [
                answer("1af0c4c9-a711-4c06-b688-4e78014e5311", 1, "I would avoid raising it", -2),
                answer("1af0c4c9-a711-4c06-b688-4e78014e5312", 2, "I would raise it informally only", 0),
                answer("1af0c4c9-a711-4c06-b688-4e78014e5313", 3, "I would use a formal reporting route", 2),
              ],
              "Diagnostic follow-up only. This answer is not part of primary scoring.",
            ),
          ],
        },
      ],
    },
  ],
  followUpTriggers: [
    {
      id: "1af0c4c9-a711-4c06-b688-4e78014e9001",
      triggerQuestionId: tenantABurnoutQuestionId,
      triggerAnswerScores: [-2, -1],
      followUpQuestionIds: [tenantABurnoutFollowUpQuestionId],
    },
    {
      id: "1af0c4c9-a711-4c06-b688-4e78014e9002",
      triggerQuestionId: tenantAPsychSafetyQuestionId,
      triggerAnswerScores: [-2],
      followUpQuestionIds: [tenantAPsychSafetyFollowUpQuestionId],
    },
  ],
};

const tenantBOperationalLoadQuestionId = "40a7f940-5ea4-4520-a57c-9381f1000001";
const tenantBOperationalLoadFollowUpId = "40a7f940-5ea4-4520-a57c-9381f1000002";

export const tenantBScannerVersion: RuntimeScannerVersion = {
  id: "3f9ec4f0-219c-4e5e-9640-9d6f2aa90202",
  version: "2026.05.10",
  publishedAt: "2026-05-10T00:00:00.000Z",
  isActive: true,
  categories: [
    {
      id: "40a7f940-5ea4-4520-a57c-9381f1100001",
      order: 1,
      label: "Workplace Experience",
      description: "Tenant-specific experience measures.",
      weight: 100,
      subdomains: [
        {
          id: "40a7f940-5ea4-4520-a57c-9381f1110001",
          order: 1,
          label: "Manager Support",
          description: "Short-form manager support prompts.",
          weight: 60,
          questions: [
            question(
              "40a7f940-5ea4-4520-a57c-9381f1120001",
              1,
              "My manager helps remove blockers that prevent me from doing my best work.",
              2,
              "primary",
              [
                answer("40a7f940-5ea4-4520-a57c-9381f1130001", 1, "Strongly disagree", -2),
                answer("40a7f940-5ea4-4520-a57c-9381f1130002", 2, "Disagree", -1),
                answer("40a7f940-5ea4-4520-a57c-9381f1130003", 3, "Neutral", 0),
                answer("40a7f940-5ea4-4520-a57c-9381f1130004", 4, "Agree", 1),
                answer("40a7f940-5ea4-4520-a57c-9381f1130005", 5, "Strongly agree", 2),
              ],
            ),
            question(
              "40a7f940-5ea4-4520-a57c-9381f1120002",
              2,
              "I receive recognition for meaningful contributions to team outcomes.",
              2,
              "primary",
              [
                answer("40a7f940-5ea4-4520-a57c-9381f1130011", 1, "Rarely", -1),
                answer("40a7f940-5ea4-4520-a57c-9381f1130012", 2, "Sometimes", 0),
                answer("40a7f940-5ea4-4520-a57c-9381f1130013", 3, "Often", 1),
              ],
            ),
          ],
        },
      ],
    },
    {
      id: "40a7f940-5ea4-4520-a57c-9381f1100002",
      order: 2,
      label: "Operational Pressure",
      description: "Tenant-specific workload indicators.",
      weight: 100,
      subdomains: [
        {
          id: "40a7f940-5ea4-4520-a57c-9381f1110002",
          order: 1,
          label: "Workload Signals",
          description: "Binary and short-form pressure checks.",
          weight: 100,
          questions: [
            question(
              tenantBOperationalLoadQuestionId,
              1,
              "Did workload pressure prevent you from completing important work this week?",
              3,
              "primary",
              [
                answer("40a7f940-5ea4-4520-a57c-9381f1130021", 1, "Yes", -1),
                answer("40a7f940-5ea4-4520-a57c-9381f1130022", 2, "No", 1),
              ],
            ),
            question(
              tenantBOperationalLoadFollowUpId,
              90,
              "When workload pressure spikes, what usually causes the biggest delay?",
              1,
              "follow-up",
              [
                answer("40a7f940-5ea4-4520-a57c-9381f1130031", 1, "Too many competing priorities", -1),
                answer("40a7f940-5ea4-4520-a57c-9381f1130032", 2, "Not enough people or cover", 0),
                answer("40a7f940-5ea4-4520-a57c-9381f1130033", 3, "Systems or process friction", 1),
              ],
              "Diagnostic follow-up only. This answer is not part of primary scoring.",
            ),
          ],
        },
      ],
    },
    {
      id: "40a7f940-5ea4-4520-a57c-9381f1100003",
      order: 3,
      label: "Voice & Safety",
      description: "Tenant-specific team candor indicators.",
      weight: 100,
      subdomains: [
        {
          id: "40a7f940-5ea4-4520-a57c-9381f1110003",
          order: 1,
          label: "Speak-Up Climate",
          description: "Three-option psychological safety checks.",
          weight: 100,
          questions: [
            question(
              "40a7f940-5ea4-4520-a57c-9381f1120003",
              1,
              "People on my team respond constructively when concerns are raised.",
              2,
              "primary",
              [
                answer("40a7f940-5ea4-4520-a57c-9381f1130041", 1, "Rarely", -1),
                answer("40a7f940-5ea4-4520-a57c-9381f1130042", 2, "Sometimes", 0),
                answer("40a7f940-5ea4-4520-a57c-9381f1130043", 3, "Usually", 1),
              ],
            ),
          ],
        },
      ],
    },
  ],
  followUpTriggers: [
    {
      id: "40a7f940-5ea4-4520-a57c-9381f1190001",
      triggerQuestionId: tenantBOperationalLoadQuestionId,
      triggerAnswerScores: [-1],
      followUpQuestionIds: [tenantBOperationalLoadFollowUpId],
    },
  ],
};

const tenantCBelongingQuestionId = "77e17294-3059-46fe-9468-b3377b000001";
const tenantCBelongingFollowUpId = "77e17294-3059-46fe-9468-b3377b000002";
const tenantCClarityQuestionId = "77e17294-3059-46fe-9468-b3377b000003";
const tenantCOrphanFollowUpId = "77e17294-3059-46fe-9468-b3377b000004";

export const tenantCScannerVersion: RuntimeScannerVersion = {
  id: "3f9ec4f0-219c-4e5e-9640-9d6f2aa90303",
  version: "2026.05.10",
  publishedAt: "2026-05-10T00:00:00.000Z",
  isActive: true,
  categories: [
    {
      id: "77e17294-3059-46fe-9468-b3377b100001",
      order: 1,
      label: "Engagement Foundations",
      description: "Lean scanner variant with safe filtering behavior.",
      weight: 100,
      subdomains: [
        {
          id: "77e17294-3059-46fe-9468-b3377b110001",
          order: 1,
          label: "Belonging",
          description: "Connection and belonging prompts.",
          weight: 50,
          questions: [
            question(
              tenantCBelongingQuestionId,
              1,
              "I feel a sense of belonging in my work environment.",
              2,
              "primary",
              [
                answer("77e17294-3059-46fe-9468-b3377b130001", 1, "Strongly disagree", -2),
                answer("77e17294-3059-46fe-9468-b3377b130002", 2, "Disagree", -1),
                answer("77e17294-3059-46fe-9468-b3377b130003", 3, "Agree", 1),
                answer("77e17294-3059-46fe-9468-b3377b130004", 4, "Strongly agree", 2),
              ],
            ),
            question(
              tenantCBelongingFollowUpId,
              90,
              "If belonging feels low, where is that felt most strongly?",
              1,
              "follow-up",
              [
                answer("77e17294-3059-46fe-9468-b3377b131001", 1, "Within my immediate team", -1),
                answer("77e17294-3059-46fe-9468-b3377b131002", 2, "Across departments", 0),
                answer("77e17294-3059-46fe-9468-b3377b131003", 3, "In organization-wide communication", 1),
              ],
              "Diagnostic follow-up only. This answer is not part of primary scoring.",
            ),
          ],
        },
        {
          id: "77e17294-3059-46fe-9468-b3377b110002",
          order: 2,
          label: "Clarity",
          description: "Includes intentionally imperfect runtime data for safety verification.",
          weight: 50,
          questions: [
            question(
              tenantCClarityQuestionId,
              1,
              "I know where to go when priorities conflict.",
              2,
              "primary",
              [
                answer("77e17294-3059-46fe-9468-b3377b132001", 1, "No", -1),
                answer("77e17294-3059-46fe-9468-b3377b132001", 2, "Sometimes", 0),
                answer("77e17294-3059-46fe-9468-b3377b132003", 3, "Yes", 1),
              ],
            ),
            question(
              tenantCOrphanFollowUpId,
              95,
              "If priorities still feel unclear, which layer needs the most clarification?",
              1,
              "follow-up",
              [
                answer("77e17294-3059-46fe-9468-b3377b133001", 1, "Team level", 0),
                answer("77e17294-3059-46fe-9468-b3377b133002", 2, "Function level", 1),
              ],
            ),
          ],
        },
      ],
    },
    {
      id: "77e17294-3059-46fe-9468-b3377b100002",
      order: 2,
      label: "Empty Category Shell",
      description: "Intentionally empty to verify safe handling.",
      weight: 100,
      subdomains: [],
    },
  ],
  followUpTriggers: [
    {
      id: "77e17294-3059-46fe-9468-b3377b190001",
      triggerQuestionId: tenantCBelongingQuestionId,
      triggerAnswerScores: [-2, -1],
      followUpQuestionIds: [tenantCBelongingFollowUpId],
    },
    {
      id: "77e17294-3059-46fe-9468-b3377b190002",
      triggerQuestionId: "77e17294-3059-46fe-9468-b3377b999998",
      triggerAnswerScores: [-2],
      followUpQuestionIds: ["77e17294-3059-46fe-9468-b3377b999999"],
    },
  ],
};

export const tenantDScannerVersion: RuntimeScannerVersion = {
  id: "3f9ec4f0-219c-4e5e-9640-9d6f2aa90404",
  version: "2026.05.10",
  publishedAt: "2026-05-10T00:00:00.000Z",
  isActive: true,
  categories: [
    {
      id: "d7f3d16f-77fb-4523-a894-7d77c8100001",
      order: 1,
      label: "Minimum Viable Scanner",
      description: "Smallest valid scanner runtime configuration.",
      weight: 100,
      subdomains: [
        {
          id: "d7f3d16f-77fb-4523-a894-7d77c8110001",
          order: 1,
          label: "Readiness",
          description: "Binary readiness checkpoint.",
          weight: 100,
          questions: [
            question(
              "d7f3d16f-77fb-4523-a894-7d77c8120001",
              1,
              "Are you ready to complete a short wellbeing check-in today?",
              1,
              "primary",
              [
                answer("d7f3d16f-77fb-4523-a894-7d77c8130001", 1, "Not today", -1),
                answer("d7f3d16f-77fb-4523-a894-7d77c8130002", 2, "Yes", 1),
              ],
            ),
          ],
        },
      ],
    },
  ],
  followUpTriggers: [],
};
