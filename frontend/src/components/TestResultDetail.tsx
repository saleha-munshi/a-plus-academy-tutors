import { Test, TestResult, UserProfile } from '../types';

interface TestResultDetailProps {
  result: TestResult;
  test: Test;
  student: UserProfile;
  onClose: () => void;
}

const formatGradeLevel = (gl: string) => (gl === 'a-level' ? 'A Level' : 'GCSE');

export default function TestResultDetail({ result, test, student, onClose }: TestResultDetailProps) {
  const scoreColour = result.score >= 80 ? 'score-high' : result.score >= 60 ? 'score-mid' : 'score-low';

  return (
    <div className="test-result-detail">
      <button className="back-btn" onClick={onClose}>
        ← Back to results
      </button>

      <h2>{test.title}</h2>
      <p className="result-meta">
        <strong>{student.name}</strong>
        {' · '}
        {formatGradeLevel(test.gradeLevel)} / {test.subject} / {test.topic}
        {' · '}
        {new Date(result.completedAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </p>

      <div className={`result-score-banner ${scoreColour}`}>
        <span className="score-percent">{result.score}%</span>
        <span className="score-fraction">
          {result.correctCount} / {result.totalQuestions} correct
        </span>
      </div>

      <div className="questions-breakdown">
        {test.questions.map((q, i) => {
          const studentIdx = result.answers[i];
          const correctIdx = q.correctAnswerIndex!;
          const isCorrect = studentIdx === correctIdx;

          return (
            <div key={q.id} className={`question-result ${isCorrect ? 'q-correct' : 'q-incorrect'}`}>
              <p className="question-text">
                <span className="result-icon">{isCorrect ? '✓' : '✗'}</span>
                {i + 1}. {q.questionText}
              </p>
              <ul className="answer-list">
                {q.options.map((option, oIdx) => {
                  const isStudentPick = oIdx === studentIdx;
                  const isCorrectOption = oIdx === correctIdx;
                  let cls = 'answer-option';
                  if (isCorrectOption) cls += ' answer-correct';
                  if (isStudentPick && !isCorrect) cls += ' answer-wrong';

                  return (
                    <li key={oIdx} className={cls}>
                      {option}
                      {isCorrectOption && !isStudentPick && (
                        <span className="answer-tag">correct answer</span>
                      )}
                      {isStudentPick && !isCorrect && (
                        <span className="answer-tag">student's answer</span>
                      )}
                      {isStudentPick && isCorrect && (
                        <span className="answer-tag">✓</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
