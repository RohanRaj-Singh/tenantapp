# Scanner Hierarchy

Superseded for active `tenantapp` runtime work by:

- `docs/contracts/canonical-scanner-contract.md`
- `docs/contracts/scanner-version-system.md`

This file remains a legacy audit snapshot from the older OQEP structure.

## Scope

This document is derived from the current implemented scanner behavior in `backend/` and `frontend/`.

Primary sources:

- `backend/src/app/modules/question/question.interface.ts`
- `backend/src/app/modules/question/question.model.ts`
- `backend/src/app/modules/question/question.service.ts`
- `backend/src/app/modules/survey/survey.interface.ts`
- `backend/src/app/modules/survey/survey.model.ts`
- `backend/src/app/modules/survey/survey.service.ts`
- `backend/question.json`
- `frontend/src/typesAndIntefaces/question.ts`
- `frontend/src/typesAndIntefaces/survey/SurveyResponseAndBody.ts`
- `frontend/src/components/landing/surveyQuestions/SurveyFlow.tsx`
- `frontend/src/components/landing/surveyQuestions/NewSurveyFlow.tsx`
- `frontend/src/components/questions/QuestionForm.tsx`
- `frontend/src/data/question.json`

## Actual Implemented Hierarchy

The current runtime scanner hierarchy is:

```text
dashboardDomain
-> domain
-> question
-> ordered answer options
```

There is no separate persisted `Category` entity and no separate persisted `Subdomain` entity.

- `dashboardDomain` is the top-level reporting bucket used by survey scoring and dashboard aggregation.
- `domain` behaves as the subdomain label.
- `question` is the atomic scored unit.
- `options` is an ordered array of four answer labels.

## Question Contract

Current backend question structure:

```ts
type TQuestion = {
  id: string;
  question: string;
  options: string[];
  domain:
    | "Personal Wellbeing"
    | "Burnout"
    | "Workload & Efficiency"
    | "Workplace Satisfaction"
    | "Leadership & Alignment"
    | "Coworker Relationships"
    | "Psych. Safety"
    | "Depression Risk"
    | "Anxiety Risk"
    | "Mental Health Risk"
    | "Burnout Risk"
    | "Fairness & Recognition"
    | "Burnout Intensity"
    | "Depression Severity"
    | "Anxiety Severity"
    | "Anxiety Symptom"
    | "Health Impact"
    | "Root Cause Intensity"
    | "Fear/Blame Intensity"
    | "Trust Refinement";
  weight: number;
  isInverted: boolean;
  isFollowUp: boolean;
  dashboardDomain:
    | "Clinical Risk Index"
    | "Psychological Safety Index"
    | "Workload & Efficiency"
    | "Leadership & Alignment"
    | "Satisfaction & Engagement";
  dashboardDomainMaxPossibleScore: number;
  dashboardDomainWeight: number;
  isDeleted: boolean;
};
```

Important runtime constraints:

- `options.length` must be exactly `4`.
- `id` is generated as `Q${count + 1}` in the backend service.
- `dashboardDomainMaxPossibleScore` and `dashboardDomainWeight` are populated automatically by backend service rules, not trusted from client payload.
- `isInverted` is persisted but currently not used by runtime scoring.
- `isDeleted` is soft-delete state and excluded from active question queries.

## Answer Structure

There is no separate answer entity.

Each question stores:

```ts
options: [string, string, string, string]
```

Runtime storage and submission use answer index, not answer object:

```ts
type SurveyResponse = {
  question: ObjectId;
  answerIndex: number;
  score: number;
};
```

Current system implications:

- Answer options do not carry explicit score fields.
- Answer options do not carry explicit polarity fields.
- Answer order is the scoring contract.
- Changing option order changes scoring behavior.
- Changing option labels does not change scoring behavior by itself.

## Survey Storage Contract

Current survey persistence shape:

```ts
type Survey = {
  organizationId: string;
  user: {
    organizationId: string;
    stream: string;
    function: string;
    department: string;
    gender: string;
    age: string;
    seniorityLevel: string;
    location: string;
  };
  questions: ObjectId[];
  followUpQuestions: ObjectId[];
  responses: Array<{
    question: ObjectId;
    answerIndex: number;
    score: number;
  }>;
  highRiskCount: number;
  domainRisks: Array<{
    domain: string;
    riskCount: number;
  }>;
  status: "in-progress" | "completed";
  completedAt?: Date;
};
```

## Seeded Runtime Inventory

Current seeded scanner inventory in `backend/question.json`:

- Total questions: `33`
- Main questions: `25`
- Follow-up questions: `8`
- Dashboard domains: `5`

### Dashboard Domain to Domain Mapping

| Dashboard domain | Domain labels currently used | Main question ids | Follow-up ids |
| --- | --- | --- | --- |
| `Satisfaction & Engagement` | `Personal Wellbeing`, `Workplace Satisfaction`, `Coworker Relationships`, `Fairness & Recognition` | `Q1`, `Q3`, `Q4`, `Q8`, `Q10`, `Q11`, `Q12`, `Q13`, `Q25` | `Q30` (`Health Impact`) |
| `Clinical Risk Index` | `Burnout`, `Depression Risk`, `Anxiety Risk`, `Mental Health Risk` | `Q2`, `Q20`, `Q21`, `Q22`, `Q23`, `Q24` | `Q26` (`Burnout`), `Q27` (`Depression Severity`), `Q28` (`Anxiety Severity`), `Q29` (`Anxiety Symptom`) |
| `Workload & Efficiency` | `Workload & Efficiency` | `Q5`, `Q6`, `Q7` | `Q31` (`Root Cause Intensity`) |
| `Leadership & Alignment` | `Leadership & Alignment` | `Q9` | none |
| `Psychological Safety Index` | `Psych. Safety` | `Q14`, `Q15`, `Q16`, `Q17`, `Q18`, `Q19` | `Q32` (`Fear/Blame Intensity`), `Q33` (`Trust Refinement`) |

### Domain Counts

| Domain | Question count |
| --- | ---: |
| `Psych. Safety` | 6 |
| `Burnout` | 3 |
| `Personal Wellbeing` | 3 |
| `Coworker Relationships` | 3 |
| `Workload & Efficiency` | 3 |
| `Workplace Satisfaction` | 2 |
| `Anxiety Risk` | 2 |
| `Leadership & Alignment` | 1 |
| `Depression Risk` | 1 |
| `Mental Health Risk` | 1 |
| `Fairness & Recognition` | 1 |
| `Depression Severity` | 1 |
| `Anxiety Severity` | 1 |
| `Anxiety Symptom` | 1 |
| `Health Impact` | 1 |
| `Root Cause Intensity` | 1 |
| `Fear/Blame Intensity` | 1 |
| `Trust Refinement` | 1 |

## Ordering and Numbering

Implemented ordering behavior:

- Questions are generated with string ids like `Q1`, `Q2`, `Q3`.
- Main question selection is fetched sorted by `id: 1`.
- Follow-up selection is fetched sorted by `id: 1`.
- Survey progression uses the persisted `survey.questions` order first, then `survey.followUpQuestions`.

Numbering is operationally important because:

- It determines question presentation order.
- It determines follow-up order.
- It is currently the only durable sequencing field.

Numbering is not directly used in score calculation formulas.

## Frontend Runtime Flow

Current frontend scan flow:

```text
question payload
-> render question text and four options
-> user chooses an option string
-> frontend resolves answerIndex using options.indexOf(selectedOption)
-> frontend submits { questionId, answerIndex }
-> backend computes score and next question
```

Frontend does not compute authoritative score.

## Discovered Drift Between Frontend and Backend Seeds

`frontend/src/data/question.json` is not a safe source of truth.

Confirmed domain mismatches exist for the same question ids, including:

- `Q5`
- `Q7`
- `Q23`
- `Q25`
- `Q27`
- `Q28`
- `Q29`
- `Q30`

Current authoritative scanner structure is the backend question model and backend question data, not the frontend seed file.

## Structural Risks

- `domain` is functioning as subdomain, but the model does not name it that way.
- There is no explicit category table or subdomain table.
- Option order is the real answer contract, but that rule is implicit.
- Frontend contains a question seed that diverges from backend seed data.
- `isInverted` is exposed in data contracts but not part of effective runtime scoring.

## DB Boundary Notes

For database implementation, the current runtime behavior requires these boundaries:

- Persist immutable scanner versions as ordered question lists.
- Persist answer option order as part of the question contract.
- Persist `dashboardDomain` and `domain` on each versioned question.
- Treat follow-up questions as first-class questions with `isFollowUp: true`.
- Do not rely on frontend seed files as canonical scanner data.
