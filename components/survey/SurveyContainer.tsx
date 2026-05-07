"use client";

import { useState, useMemo, useContext } from 'react';
import { RuntimeContext } from '../../runtime/context/RuntimeContext';
import { TenantRuntimeConfig } from '../../runtime/contracts/runtime';
import { QuestionRenderer } from './QuestionRenderer';

type Question = TenantRuntimeConfig['scannerVersion']['categories'][0]['subdomains'][0]['questions'][0];
type FollowUpRule = TenantRuntimeConfig['scannerVersion']['categories'][0]['subdomains'][0]['followUpRules'][0];

function LoadingState() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <p className="text-lg">Loading survey...</p>
    </div>
  );
}

function ThankYouState() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Thank You!</h1>
      <p className="text-gray-600">Your survey has been submitted successfully.</p>
    </div>
  );
}

export function SurveyContainer() {
  const { config, loading } = useContext(RuntimeContext);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Loading or no config - show loading view
  if (loading || !config) {
    return <LoadingState />;
  }

  // Submitted - show thank you view
  if (submitted) {
    return <ThankYouState />;
  }

  const allQuestions = useMemo(() => {
    const questions: Question[] = [];
    const followUpRules: FollowUpRule[] = [];
    
    config.scannerVersion.categories.forEach(category => {
      category.subdomains.forEach(subdomain => {
        questions.push(...subdomain.questions);
        followUpRules.push(...subdomain.followUpRules);
      });
    });
    
    return { questions, followUpRules };
  }, [config]);

  const visibleQuestionIds = useMemo(() => {
    const visible = new Set<string>();
    const triggerMap = new Map<string, FollowUpRule[]>();
    
    allQuestions.followUpRules.forEach(rule => {
      if (!triggerMap.has(rule.triggerQuestionId)) {
        triggerMap.set(rule.triggerQuestionId, []);
      }
      triggerMap.get(rule.triggerQuestionId)!.push(rule);
    });

    allQuestions.questions.forEach(q => {
      if (!q.isFollowUp) {
        visible.add(q.id);
      }
    });

    const triggerQuestionIds = Array.from(triggerMap.keys());
    triggerQuestionIds.forEach(qid => {
      const answer = responses[qid];
      if (answer !== undefined) {
        const rules = triggerMap.get(qid) || [];
        rules.forEach(rule => {
          if (answer === rule.triggerAnswerIndex) {
            rule.followUpQuestionIds.forEach(fqid => visible.add(fqid));
          }
        });
      }
    });

    return visible;
  }, [allQuestions, responses]);

  const handleAnswer = (questionId: string, answerIndex: number) => {
    setResponses(prev => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const submission = {
        tenantId: config.tenant.id,
        scannerVersionId: config.scannerVersion.id,
        responses: Object.entries(responses).map(([questionId, answerIndex]) => ({
          questionId,
          answerIndex,
          answeredAt: new Date().toISOString(),
        })),
        completionState: {
          status: 'completed' as const,
          completedAt: new Date().toISOString(),
          totalQuestions: allQuestions.questions.length,
          answeredQuestions: Object.keys(responses).length,
        },
        metadata: {
          userAgent: navigator.userAgent,
          ipAddress: 'client-ip',
          sessionId: crypto.randomUUID(),
        },
      };
      
      await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });
      
      setSubmitted(true);
    } catch (err) {
      console.error('Submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(responses).length;
  const totalCount = allQuestions.questions.length;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{config.tenant.name} Survey</h1>
        <span className="text-sm text-gray-500">
          {answeredCount} / {totalCount} answered
        </span>
      </div>
      
      {config.scannerVersion.categories.map(category => (
        <div key={category.id} className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{category.label}</h2>
          
          {category.subdomains.map(subdomain => (
            <div key={subdomain.id} className="mb-6">
              <h3 className="text-lg font-medium mb-3">{subdomain.label}</h3>
              
              {subdomain.questions
                .filter(q => visibleQuestionIds.has(q.id))
                .map(question => (
                  <div key={question.id} className="mb-4 p-4 border rounded">
                    <QuestionRenderer
                      question={question}
                      selectedAnswer={responses[question.id] ?? null}
                      onSelect={(idx) => handleAnswer(question.id, idx)}
                    />
                  </div>
                ))}
            </div>
          ))}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || answeredCount === 0}
        className="btn-primary mt-6"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Survey'}
      </button>
    </div>
  );
}