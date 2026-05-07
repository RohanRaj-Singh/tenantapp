import { SurveySubmission } from '../contracts/surveySubmission';

export async function submitSurvey(submission: SurveySubmission): Promise<{ success: boolean; submissionId?: string }> {
  const response = await fetch('/api/survey/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    throw new Error('Failed to submit survey');
  }

  return response.json();
}