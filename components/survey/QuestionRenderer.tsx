"use client";

import type { ScannerQuestion } from "@/runtime/contracts/scannerVersion";

interface QuestionRendererProps {
  question: ScannerQuestion;
  selectedAnswerId: string | null;
  onSelect: (answerId: string, answerScore: number) => void;
}

export function QuestionRenderer({ question, selectedAnswerId, onSelect }: QuestionRendererProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">{question.questionText}</h3>
      <div className="grid gap-2">
        {question.answers.map((answer) => (
          <label key={answer.id} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name={question.id}
              checked={selectedAnswerId === answer.id}
              onChange={() => onSelect(answer.id, answer.score)}
              className="radio"
            />
            <span>{answer.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
