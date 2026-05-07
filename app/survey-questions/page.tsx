"use client";

import { useContext, useState, useMemo } from 'react';
import Link from 'next/link';
import { MoveLeft } from 'lucide-react';
import { RuntimeContext } from '@/runtime/context/RuntimeContext';

type Question = {
  id: string;
  questionText: string;
  options: string[];
  weight: number;
  polarity: 'positive' | 'negative';
};

export default function SurveyQuestionsPage() {
  const context = useContext(RuntimeContext);
  const config = context?.config ?? null;
  const primaryColor = config?.branding?.primaryColor || '#f58220';
  
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!config) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading survey...</p>
      </div>
    );
  }

  const allQuestions = useMemo(() => {
    const questions: Question[] = [];
    config.scannerVersion.categories.forEach((category) => {
      category.subdomains.forEach((subdomain) => {
        subdomain.questions.forEach((q) => {
          questions.push({
            id: q.id,
            questionText: q.questionText,
            options: q.options,
            weight: q.weight,
            polarity: q.polarity,
          });
        });
      });
    });
    return questions;
  }, [config]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const currentQuestion = allQuestions[currentQuestionIndex];

  const progress = allQuestions.length > 0 ? ((currentQuestionIndex + 1) / allQuestions.length) * 100 : 0;

  const handleNext = () => {
    if (!currentAnswer) return;
    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer(null);
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-50 pt-20">
        <div className="w-full max-w-4xl min-h-[30vh] mx-auto">
          <div className="rounded-xl bg-white py-8 md:py-24 text-center shadow-lg">
            <div 
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mb-4 text-2xl font-bold text-gray-800">Thank You!</h1>
            <p className="text-gray-600">
              Your wellbeing survey has been completed successfully. We appreciate you taking the time to share your thoughts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-50 p-4 pt-28">
      <div className="mb-6 flex w-full items-center justify-between gap-4 lg:px-36">
        <Link href="/" className="z-10 flex items-center justify-center text-gray-700 lg:hidden">
          <MoveLeft className="mx-2 h-4 w-4" /> Home
        </Link>
        <Link href="/" className="z-10 hidden items-center justify-center text-gray-700 lg:flex">
          <MoveLeft className="mx-2 h-4 w-4" /> Back to Home
        </Link>

        <div className="mb-6 hidden w-2/3 lg:block">
          <div className="mb-1 flex justify-between text-sm text-gray-600">
            <span>
              Completed {currentQuestionIndex + 1} of {allQuestions.length || 0}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-200">
            <div
              className="h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: primaryColor }}
            />
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center">
        <div className="my-4 rounded-xl md:p-6">
          <div className="mx-auto mb-6 min-w-60 md:max-w-5xl">
            <div className="mx-auto mb-6 block w-full lg:hidden">
              <div className="mb-1 flex justify-between text-sm text-gray-600">
                <span>
                  Completed {currentQuestionIndex + 1} of {allQuestions.length || 0}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-200">
                <div
                  className="h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, backgroundColor: primaryColor }}
                />
              </div>
            </div>

            <h1 className="text-md mx-auto mb-4 max-w-3xl py-4 text-center font-bold text-black md:max-w-5xl md:py-8 md:text-2xl">
              {currentQuestion?.questionText}
            </h1>

            <div className="mt-4 flex flex-col gap-4 space-y-2 rounded-lg bg-white px-4 py-8 text-gray-800 shadow-lg md:px-8 md:py-12 md:text-lg">
              {currentQuestion?.options.map((option, index) => (
                <label
                  key={index}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-all hover:bg-gray-50 ${
                    currentAnswer === option ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={option}
                    checked={currentAnswer === option}
                    onChange={() => setCurrentAnswer(option)}
                    className="h-4 w-4"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="z-10 mt-6 flex justify-end">
            <button
              onClick={handleNext}
              disabled={!currentAnswer}
              className={`inline-flex items-center justify-center gap-3 rounded-full border border-white px-7 py-2 text-xs font-medium transition-all duration-300 hover:scale-105 md:text-lg ${
                currentAnswer
                  ? 'text-white hover:opacity-90'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
              }`}
              style={{ backgroundColor: currentAnswer ? primaryColor : undefined }}
            >
              Next
              <MoveLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}