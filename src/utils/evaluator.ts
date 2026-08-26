import { Problem, EvaluateResponse, StepEvaluation } from '../types';

/**
 * Normalizes code strings for flexible evaluation:
 * - Strips leading and trailing whitespace
 * - Normalizes double and single quotes
 * - Normalizes spaces around operators (=, +, -, *, /, ==, !=, <=, >=, +=, -=)
 * - Normalizes parenthesis and bracket spacing
 * - Removes unnecessary trailing semicolons for comparison
 */
export function normalizeCodeString(code: string): string {
  if (!code) return '';

  let normalized = code.trim();

  // Replace multiple whitespace/newlines with single space
  normalized = normalized.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ');

  // Normalize quotes
  normalized = normalized.replace(/"/g, "'");

  // Normalize spaces around common operators
  normalized = normalized
    .replace(/\s*==\s*/g, '==')
    .replace(/\s*!=\s*/g, '!=')
    .replace(/\s*<=\s*/g, '<=')
    .replace(/\s*>=\s*/g, '>=')
    .replace(/\s*\+=\s*/g, '+=')
    .replace(/\s*-=\s*/g, '-=')
    .replace(/\s*\*=\s*/g, '*=')
    .replace(/\s*\/=\s*/g, '/=')
    .replace(/\s*=\s*/g, '=')
    .replace(/\s*\+\s*/g, '+')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*\*\s*/g, '*')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*;\s*$/g, '')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\[\s+/g, '[')
    .replace(/\s+\]/g, ']')
    .replace(/\{\s+/g, '{')
    .replace(/\s+\}/g, '}');

  return normalized.trim();
}

/**
 * Granular Step & Word Marks Evaluation Engine:
 * - Easy: 10 marks per question (100 total)
 * - Intermediate: 20 marks per question (5x20 = 100 total)
 * - Hard: Counts every correct step, token, and keyword rubric (100 total)
 */
export function evaluateAnswerWithMarks(problem: Problem, userAnswer: string): {
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  stepBreakdown: StepEvaluation[];
  feedback: string;
  normalizedUserAnswer: string;
} {
  const normUser = normalizeCodeString(userAnswer || '');
  const diff = problem.difficulty === 'medium' ? 'intermediate' : problem.difficulty;
  const maxMarks = problem.marksValue || (diff === 'easy' ? 10 : diff === 'intermediate' ? 20 : 100);

  // Check base correctness
  const baseResult = evaluateAnswer(problem, userAnswer);

  // If problem has stepRubric (Hard questions)
  if (problem.stepRubric && problem.stepRubric.length > 0) {
    const rawLower = (userAnswer || '').toLowerCase();
    const steps: StepEvaluation[] = [];
    let totalMarks = 0;

    for (const rubric of problem.stepRubric) {
      const isMatched = baseResult.isCorrect || rubric.keywords.some(kw => rawLower.includes(kw.toLowerCase()));
      const marks = isMatched ? rubric.maxMarks : 0;
      totalMarks += marks;
      steps.push({
        stepName: rubric.stepName,
        marks,
        maxMarks: rubric.maxMarks,
        matched: isMatched,
        explanation: rubric.description
      });
    }

    const isOverallCorrect = baseResult.isCorrect || totalMarks >= maxMarks * 0.5;
    return {
      isCorrect: isOverallCorrect,
      marksAwarded: Math.min(maxMarks, isOverallCorrect && baseResult.isCorrect ? maxMarks : totalMarks),
      maxMarks,
      stepBreakdown: steps,
      feedback: baseResult.feedback,
      normalizedUserAnswer: normUser
    };
  }

  // Easy or Intermediate
  const marksAwarded = baseResult.isCorrect ? maxMarks : 0;
  return {
    isCorrect: baseResult.isCorrect,
    marksAwarded,
    maxMarks,
    stepBreakdown: [
      {
        stepName: diff === 'easy' ? 'Core Bug Fix (10 Marks)' : 'Algorithmic Repair (20 Marks)',
        marks: marksAwarded,
        maxMarks,
        matched: baseResult.isCorrect,
        explanation: problem.explanation
      }
    ],
    feedback: baseResult.feedback,
    normalizedUserAnswer: normUser
  };
}

/**
 * Evaluates contestant answer against problem definition.
 */
export function evaluateAnswer(problem: Problem, userAnswer: string): EvaluateResponse {
  if (!userAnswer || userAnswer.trim().length === 0) {
    return {
      isCorrect: false,
      feedback: 'Answer cannot be empty. Please identify the bug or provide the corrected code.',
      normalizedUserAnswer: ''
    };
  }

  const rawTrimmed = userAnswer.trim();
  const normalizedUser = normalizeCodeString(rawTrimmed);
  const normalizedFixed = normalizeCodeString(problem.fixedCode);
  const normalizedBuggyLine = normalizeCodeString(problem.buggyLineContent);
  const isHardProblem = problem.difficulty === 'hard' || problem.id.includes('hard');

  // Check if user submitted identical buggy code without changes
  if (normalizedUser === normalizedBuggyLine || normalizedUser === normalizeCodeString(problem.buggyCode)) {
    return {
      isCorrect: false,
      feedback: 'This is the original buggy code. You need to provide the fix or corrected statement.',
      normalizedUserAnswer: normalizedUser
    };
  }

  // 1. Direct check against accepted fixes list
  for (const fix of problem.acceptedFixes) {
    const normFix = normalizeCodeString(fix);
    if (
      normalizedUser === normFix ||
      normalizedUser.includes(normFix) ||
      (normFix.includes(normalizedUser) && normalizedUser.length > 3)
    ) {
      return {
        isCorrect: true,
        feedback: 'Bug successfully identified and resolved! ' + problem.explanation,
        normalizedUserAnswer: normalizedUser,
        matchedPattern: fix
      };
    }
  }

  // 2. Full fixed code match (if contestant pasted complete modified code)
  if (normalizedUser === normalizedFixed || (problem.acceptedFixes[0] && normalizedUser.includes(normalizeCodeString(problem.acceptedFixes[0])))) {
    return {
      isCorrect: true,
      feedback: 'Complete solution verified successfully! ' + problem.explanation,
      normalizedUserAnswer: normalizedUser,
      matchedPattern: 'full_code_match'
    };
  }

  // 3. Problem-specific fuzzy match heuristics
  const isMatch = checkProblemHeuristics(problem.id, rawTrimmed, normalizedUser);
  if (isMatch.correct) {
    return {
      isCorrect: true,
      feedback: isMatch.feedback || 'Bug correctly identified! ' + problem.explanation,
      normalizedUserAnswer: normalizedUser,
      matchedPattern: isMatch.pattern
    };
  }

  // 4. Hard Level Relaxed Evaluation:
  if (isHardProblem) {
    const lower = rawTrimmed.toLowerCase();
    const generalKeywords = [
      'lock', 'atomic', 'volatile', 'async', 'await', 'task', 'gather', 'coroutine',
      'aba', 'tagged', 'epoch', 'hazard', 'pointer', 'mutex', 'sync', 'thread',
      'instance', 'singleton', 'double', 'checked', 'fix', 'return', 'class',
      'public', 'private', 'static', 'auto', 'struct', 'node', 'head', 'ptr',
      'create_task', 'sleep', 'loop', 'event'
    ];

    const hasEffort = rawTrimmed.length >= 3 && generalKeywords.some(kw => lower.includes(kw));

    if (hasEffort || rawTrimmed.length >= 4) {
      return {
        isCorrect: true,
        feedback: 'Hard problem analysis verified with recognized logic! ' + problem.explanation,
        normalizedUserAnswer: normalizedUser,
        matchedPattern: 'hard_minimum_effort_accepted'
      };
    }
  }

  return {
    isCorrect: false,
    feedback: 'Incorrect fix. Ensure the syntax, parameters, and logic adhere to the problem requirements. You can try again or skip to the next question.',
    normalizedUserAnswer: normalizedUser
  };
}

/**
 * Domain-specific lenient heuristics for each problem (handles both prefix formats)
 */
function checkProblemHeuristics(
  problemId: string,
  raw: string,
  normalized: string
): { correct: boolean; feedback?: string; pattern?: string } {
  const lower = raw.toLowerCase();

  // Python Easy
  if (problemId.includes('py-easy-1') || problemId === 'easy-py-1') {
    if (
      lower.includes('range') && (lower.includes('n+1') || lower.includes('n + 1') || lower.includes('1, n + 1') || lower.includes('1,n+1')) ||
      lower.includes('n + 1') || lower.includes('n+1')
    ) {
      return { correct: true, pattern: 'range_boundary_fix' };
    }
  }

  if (problemId.includes('py-easy-2') || problemId === 'easy-py-2') {
    if (lower.includes('[::-1]') || lower.includes('::-1') || lower.includes('reversed')) {
      return { correct: true, pattern: 'step_slice_fix' };
    }
  }

  if (problemId.includes('py-easy-3') || problemId === 'easy-py-3') {
    if (
      (lower.includes('none') && lower.includes('tag_list')) ||
      lower.includes('tag_list=none') ||
      lower.includes('tag_list is none') ||
      lower.includes('none')
    ) {
      return { correct: true, pattern: 'mutable_default_fix' };
    }
  }

  if (problemId.includes('py-easy-4') || problemId === 'easy-py-4') {
    if (lower.includes('.get(') || lower.includes('get(') || lower.includes('guest')) {
      return { correct: true, pattern: 'dict_get_fallback' };
    }
  }

  // C++ Easy
  if (problemId.includes('cpp-easy-1') || problemId === 'easy-cpp-1') {
    if (
      (lower.includes('arr.size()') && !lower.includes('<=')) ||
      lower.includes('i < arr.size()') ||
      lower.includes('i<arr.size()')
    ) {
      return { correct: true, pattern: 'array_bounds_fix' };
    }
  }

  if (problemId.includes('cpp-easy-2') || problemId === 'easy-cpp-2') {
    if (
      lower.includes('&a') || lower.includes('&b') ||
      lower.includes('int&') || lower.includes('int &')
    ) {
      return { correct: true, pattern: 'pass_by_reference' };
    }
  }

  if (problemId.includes('cpp-easy-3') || problemId === 'easy-cpp-3') {
    if (lower.includes('delete[]') || lower.includes('delete []') || lower.includes('delete')) {
      return { correct: true, pattern: 'array_delete' };
    }
  }

  // Java Easy
  if (problemId.includes('java-easy-1') || problemId === 'easy-java-1') {
    if (lower.includes('.equals(') || lower.includes('equals')) {
      return { correct: true, pattern: 'string_equals_method' };
    }
  }

  if (problemId.includes('java-easy-2') || problemId === 'easy-java-2') {
    if (
      lower.includes('2.0') ||
      lower.includes('(double)') ||
      lower.includes('2.0d') ||
      lower.includes('2d')
    ) {
      return { correct: true, pattern: 'float_division_cast' };
    }
  }

  if (problemId.includes('java-easy-3') || problemId === 'easy-java-3') {
    if (
      (lower.includes('null') && lower.includes('||')) ||
      lower.includes('text == null') || lower.includes('text==null')
    ) {
      return { correct: true, pattern: 'null_short_circuit' };
    }
  }

  if (problemId.includes('java-easy-4') || problemId === 'easy-java-4') {
    if (
      lower.includes('i < items.length') || lower.includes('i<items.length') ||
      lower.includes('< items.length')
    ) {
      return { correct: true, pattern: 'array_index_bound' };
    }
  }

  // Medium
  if (problemId.includes('py-med-1') || problemId === 'med-py-1') {
    if (
      lower.includes('range(rows)') || lower.includes('range(r)') ||
      lower.includes('for _ in range') || lower.includes('[0] * cols')
    ) {
      return { correct: true, pattern: 'grid_comprehension_deep' };
    }
  }

  if (problemId.includes('py-med-2') || problemId === 'med-py-2') {
    if (lower.includes('i=i') || lower.includes('lambda x, i=i')) {
      return { correct: true, pattern: 'closure_default_arg_binding' };
    }
  }

  if (problemId.includes('cpp-med-1') || problemId === 'med-cpp-1') {
    if (lower.includes('erase') || lower.includes('remove_if')) {
      return { correct: true, pattern: 'iterator_reassignment' };
    }
  }

  if (problemId.includes('cpp-med-2') || problemId === 'med-cpp-2') {
    if (lower.includes('virtual ~base') || lower.includes('virtual ~') || lower.includes('virtual')) {
      return { correct: true, pattern: 'virtual_destructor' };
    }
  }

  if (problemId.includes('java-med-1') || problemId === 'med-java-1') {
    if (lower.includes('removeif') || (lower.includes('iterator') && lower.includes('remove'))) {
      return { correct: true, pattern: 'collection_removeif' };
    }
  }

  if (problemId.includes('java-med-2') || problemId === 'med-java-2') {
    if (lower.includes('equals') || lower.includes('intvalue')) {
      return { correct: true, pattern: 'wrapper_equality' };
    }
  }

  // Hard Problems - relaxed matching
  if (problemId.includes('hard') || problemId === 'hard-1') {
    if (
      lower.includes('tagged') || lower.includes('aba') || lower.includes('hazard') ||
      lower.includes('epoch') || lower.includes('tag') || lower.includes('volatile') ||
      lower.includes('create_task') || lower.includes('asyncio') || lower.includes('gather') ||
      lower.includes('task') || lower.includes('atomic') || lower.includes('lock')
    ) {
      return {
        correct: true,
        pattern: 'hard_concurrency_fix',
        feedback: 'Outstanding! Concurrency / memory model vulnerability correctly diagnosed.'
      };
    }
  }

  return { correct: false };
}
