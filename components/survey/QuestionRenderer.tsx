"use client";

import { TenantRuntimeConfig } from '../../runtime/contracts/runtime';

type Question = TenantRuntimeConfig['scannerVersion']['categories'][0]['subdomains'][0]['questions'][0];

interface QuestionRendererProps {
  question: Question;
  selectedAnswer: number | null;
  onSelect: (index: number) => void;
}

export function QuestionRenderer({ question, selectedAnswer, onSelect }: QuestionRendererProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">{question.questionText}</h3>
      <div className="grid gap-2">
        {question.options.map((option, index) => (
          <label key={index} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={question.id}
              checked={selectedAnswer === index}
              onChange={() => onSelect(index)}
              className="radio"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}