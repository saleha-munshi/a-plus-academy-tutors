import { useState } from 'react';
import { Test, TestResult } from '../types';
import { api } from '../services/api';

interface TestRunnerProps {
  test: Test;
  onComplete: (result: TestResult) => void;
}

export default function TestRunner({ test, onComplete }: TestRunnerProps) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(test.questions.length).fill(null)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = answers.every((a) => a !== null);

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await api.post<TestResult>('/test-results', {
        testId: test.id,
        answers: answers as number[],
      });
      onComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="test-runner">
      <h2>{test.title}</h2>

      {test.questions.map((question, qIndex) => (
        <div key={question.id} className="question">
          <p>
            {qIndex + 1}. {question.questionText}
          </p>
          <div className="options">
            {question.options.map((option, oIndex) => (
              <label key={oIndex} className="option">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={answers[qIndex] === oIndex}
                  onChange={() => handleSelect(qIndex, oIndex)}
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="error">{error}</p>}

      <button onClick={handleSubmit} disabled={!allAnswered || submitting}>
        {submitting ? 'Submitting...' : 'Submit test'}
      </button>
    </div>
  );
}
