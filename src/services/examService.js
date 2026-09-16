// PDF Exam & Test Case Generation Service
// Extracts text from uploaded PDF question papers, synthesizes test cases, progressive hints, and manages exam sessions
import { getConfig } from './configService.js';

const EXAM_STORAGE_KEY = 'fullcode_active_exam_session';
const EXAM_HISTORY_KEY = 'fullcode_exam_history';

// ─── Browser PDF Text Extraction Engine ─────────────────────────────────────

let pdfjsLibLoaded = null;

/**
 * Dynamically loads PDF.js from a fast, trusted CDN if not already loaded
 */
async function loadPdfJs() {
  if (pdfjsLibLoaded) return pdfjsLibLoaded;
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    pdfjsLibLoaded = window.pdfjsLib;
    return pdfjsLibLoaded;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfjsLibLoaded = window.pdfjsLib;
        resolve(pdfjsLibLoaded);
      } catch (err) {
        reject(err);
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js engine from CDN'));
    document.head.appendChild(script);
  });
}

/**
 * Fallback binary text stream scanner if PDF.js is unavailable (e.g. offline)
 */
function fallbackExtractPdfText(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binaryString = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binaryString += String.fromCharCode.apply(null, chunk);
  }

  // Look for text strings inside PDF stream markers: (Text) Tj or [ (Text) ] TJ
  const textBlocks = [];
  const tjRegex = /\(([^)]+)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(binaryString)) !== null) {
    if (match[1] && match[1].trim()) {
      textBlocks.push(match[1]);
    }
  }

  const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(binaryString)) !== null) {
    const inner = match[1];
    const subMatches = inner.match(/\(([^)]+)\)/g);
    if (subMatches) {
      const extracted = subMatches.map((s) => s.slice(1, -1)).join(' ');
      if (extracted.trim()) textBlocks.push(extracted);
    }
  }

  if (textBlocks.length > 0) {
    return textBlocks.join('\n');
  }

  // If no streams matched, extract printable ASCII sequences >= 4 chars
  const asciiMatches = binaryString.match(/[A-Za-z0-9 .,;:!?'"()\-\n\r\t]{4,}/g) || [];
  return asciiMatches.join('\n');
}

/**
 * Extract clean textual content from an uploaded PDF File object
 * @param {File} file - PDF File from input element
 * @returns {Promise<{ text: string, pageCount: number, fileName: string }>}
 */
export async function extractTextFromPdf(file) {
  if (!file) throw new Error('No PDF file provided.');

  const arrayBuffer = await file.arrayBuffer();

  try {
    const pdfjs = await loadPdfJs();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const pageCount = pdfDoc.numPages;

    let fullText = '';
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items.map((item) => item.str);
      fullText += `\n--- Page ${pageNum} ---\n` + pageStrings.join(' ') + '\n';
    }

    return {
      text: fullText.trim(),
      pageCount,
      fileName: file.name,
    };
  } catch (pdfErr) {
    console.warn('PDF.js text extraction failed or blocked, attempting fallback scanner:', pdfErr);
    const fallbackText = fallbackExtractPdfText(arrayBuffer);
    if (fallbackText && fallbackText.length > 40) {
      return {
        text: fallbackText,
        pageCount: 1,
        fileName: file.name,
      };
    }
    throw new Error('Unable to extract text from PDF. The PDF may be scanned as an image or encrypted.');
  }
}

// ─── AI Question & Test Case Synthesizer ────────────────────────────────────

/**
 * Analyzes question text and synthesizes a complete structured question object with test cases and hints
 */
export async function parseExamFromText(rawText, userOptions = {}) {
  const title = userOptions.title || 'Computer Science Examination';
  const config = getConfig();

  // If real AI (Claude) is active and key is provided, use high-fidelity LLM parsing
  if (!config.mockAI && config.claudeApiKey) {
    try {
      return await realAiParseExam(rawText, title, config);
    } catch (err) {
      console.warn('Real AI parse failed, falling back to built-in intelligent engine:', err);
    }
  }

  // Built-in intelligent parser & test cases generator (zero API key needed)
  return intelligentParseExam(rawText, title);
}

/**
 * High-accuracy built-in intelligent exam decomposition engine
 */
function intelligentParseExam(rawText, defaultTitle) {
  // Normalize text
  const clean = rawText
    .replace(/\r\n/g, '\n')
    .replace(/--- Page \d+ ---/g, '')
    .trim();

  // Look for question splits: "Question 1", "Problem 1", "Q1.", "1.", "Task 1", etc.
  const questionHeaderRegex = /(?:^|\n)(?:Question|Problem|Task|Q\.?|Part)\s*(\d+)[:.\s-]|(?:^|\n)(\d+)\.\s+(?=[A-Z])/gi;
  const splits = [];
  let lastIndex = 0;
  let match;

  while ((match = questionHeaderRegex.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      splits.push({
        start: match.index,
        header: match[0].trim(),
        num: match[1] || match[2],
      });
    }
    lastIndex = match.index;
  }

  const rawQuestions = [];
  if (splits.length >= 2) {
    for (let i = 0; i < splits.length; i++) {
      const start = splits[i].start;
      const end = i < splits.length - 1 ? splits[i + 1].start : clean.length;
      const block = clean.slice(start, end).trim();
      if (block.length > 20) {
        rawQuestions.push({
          raw: block,
          num: splits[i].num || String(i + 1),
        });
      }
    }
  } else {
    // If no numbered splits found, split by double newlines or sentences, or treat as 1-2 major problems
    const blocks = clean.split(/\n\s*\n/).filter((b) => b.trim().length > 30);
    if (blocks.length > 0) {
      blocks.forEach((blk, idx) => {
        rawQuestions.push({ raw: blk.trim(), num: String(idx + 1) });
      });
    } else {
      rawQuestions.push({ raw: clean, num: '1' });
    }
  }

  // Synthesize each question into structured test case format
  const structuredQuestions = rawQuestions.slice(0, 6).map((item, index) => {
    return synthesizeQuestionData(item.raw, index + 1);
  });

  return {
    id: 'exam_' + Date.now(),
    title: defaultTitle,
    createdAt: new Date().toISOString(),
    totalQuestions: structuredQuestions.length,
    durationMinutes: userOptionsDuration(structuredQuestions.length),
    questions: structuredQuestions,
  };
}

function userOptionsDuration(questionCount) {
  if (questionCount <= 1) return 20;
  if (questionCount <= 2) return 35;
  if (questionCount <= 3) return 45;
  return 60;
}

/**
 * Strips theory, code blocks, irrelevant paragraphs from raw PDF text
 * Returns only the clean problem requirement sentence(s)
 */
function cleanDescriptionFromRaw(block) {
  let cleaned = block;

  // Remove code blocks (```...``` or indented code lines starting with common keywords)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/^\s*(#include|import |from |def |class |public |int main|void ).*$/gm, '');
  cleaned = cleaned.replace(/^\s*(cout|printf|System\.out|print\(|console\.log|return |if \(|for \(|while \().*$/gm, '');

  // Remove theory paragraphs: lines that are purely explanatory and don't describe a task
  // Theory markers: lines starting with "In computer science", "A ... is defined as", historical info, etc.
  const theoryPatterns = [
    /^(?:In computer science|In mathematics|In programming|A \w+ is (?:a|an|the|defined)|Note that|Recall that|The concept of|This is known as|As you know|It is important to|Theoretically|By definition)/i,
    /^(?:The following|The above|As shown|As discussed|As mentioned|For reference|For example,? consider)/i,
  ];
  const filteredLines = cleaned.split('\n').filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true; // keep blank lines for structure
    return !theoryPatterns.some((pat) => pat.test(trimmed));
  });
  cleaned = filteredLines.join('\n');

  // Remove sample I/O sections (they'll be extracted separately)
  cleaned = cleaned.replace(/(?:Sample|Example)\s*(?:Input|Test\s*Case)?\s*[:\d]*[\s\S]*?(?=(?:Constraints|Note|$))/gi, '');

  // Remove constraint sections (extracted separately)
  cleaned = cleaned.replace(/Constraints?[:\s]+[\s\S]*$/gi, '');

  // Remove input/output format sections (extracted separately)
  cleaned = cleaned.replace(/(?:Input|Output)\s*Format[:\s]+[^\n]+(?:\n[^\n]+)?/gi, '');

  // Remove question headers "Question 1:", "Problem 2." etc.
  cleaned = cleaned.replace(/^(?:Question|Problem|Task|Q\.?|Part)\s*\d+[:.\s-]*/gim, '');
  cleaned = cleaned.replace(/^\d+[:.\s-]+/gm, '');

  // Collapse multiple blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  // If nothing meaningful remains, return a minimal fallback
  if (!cleaned || cleaned.length < 10) {
    return block.split('\n').slice(0, 3).join('\n').trim();
  }

  return cleaned;
}

/**
 * Infers a concise "what to calculate" statement from the problem text
 */
function inferWhatToCalculate(block, archetype) {
  const lower = block.toLowerCase();

  // Try to find explicit task sentences ("Write a program to...", "Find the...", "Return the...")
  const taskPatterns = [
    /(?:write\s+a\s+(?:program|function|code)\s+(?:to|that|which)\s+)([^.]+\.)/i,
    /(?:find\s+(?:the|all|a)\s+)([^.]+\.)/i,
    /(?:return\s+(?:the|all|a)\s+)([^.]+\.)/i,
    /(?:determine\s+(?:whether|if|the)\s+)([^.]+\.)/i,
    /(?:compute\s+(?:the|a)\s+)([^.]+\.)/i,
    /(?:calculate\s+(?:the|a)\s+)([^.]+\.)/i,
    /(?:given\s+[^,]+,\s+)([^.]+\.)/i,
    /(?:print\s+(?:the|a)\s+)([^.]+\.)/i,
  ];

  for (const pat of taskPatterns) {
    const m = block.match(pat);
    if (m && m[0] && m[0].length > 15 && m[0].length < 200) {
      return m[0].charAt(0).toUpperCase() + m[0].slice(1);
    }
  }

  // Archetype-based fallback
  const archetypeDescriptions = {
    twosum: 'Find two numbers in the array that add up to the target sum, and return their indices.',
    string_palindrome: 'Determine whether the given string reads the same forwards and backwards.',
    math_numbers: 'Compute the mathematical result for the given integer input (e.g., factorial, prime check, GCD).',
    max_subarray: 'Find the contiguous subarray within the array that has the maximum sum, and return that sum.',
    search_sort: 'Sort the given data or search for the target element using an efficient algorithm.',
    generic_algo: 'Read the input, apply the required transformation/computation, and print the result.',
  };

  return archetypeDescriptions[archetype.type] || archetypeDescriptions.generic_algo;
}

/**
 * Extracts inputs, outputs, constraints, starter templates, and progressive hints from raw question block.
 * Produces a clean LeetCode-style structured question object.
 */
function synthesizeQuestionData(block, index) {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] || `Question ${index}`;
  const title = cleanTitle(firstLine, index);

  // Extract constraints if found
  const constraintMatch = block.match(/constraints?[:\s]+([^\n]+(?:\n[^\n]+)?)/i);
  const constraints = constraintMatch
    ? constraintMatch[1].trim()
    : '1 <= N <= 10^5\nAll inputs fit in standard 64-bit integer limits\nTime Limit: 2.0s | Memory: 256MB';

  // Extract sample input/output if written in text
  const extractedSamples = extractSamplesFromText(block);

  // Detect problem archetype (Array, String, Math, TwoSum, Palindrome, Fibonacci, Sorting, Stack, etc.)
  const archetype = detectProblemArchetype(block);

  // Build clean problem statement (strip theory/code)
  const problemStatement = cleanDescriptionFromRaw(block);

  // Infer "What to Calculate" — a concise 1-2 line goal
  const whatToCalculate = inferWhatToCalculate(block, archetype);

  // Build structured examples array from extracted samples
  const examples = extractedSamples.map((s, i) => ({
    id: i + 1,
    input: s.input,
    output: s.output,
    explanation: s.explanation || inferExampleExplanation(s, archetype, i),
  }));

  // If no examples were extracted, generate archetype-based examples
  if (examples.length === 0) {
    const archetypeExamples = getArchetypeExamples(archetype);
    archetypeExamples.forEach((ex, i) => {
      examples.push({
        id: i + 1,
        input: ex.input,
        output: ex.output,
        explanation: ex.explanation,
      });
    });
  }

  // Synthesize Test Cases: at least 2 sample visible test cases + 2 hidden evaluation test cases
  const testCases = extractedSamples.length >= 2
    ? buildTestCasesFromExtracted(extractedSamples, archetype)
    : buildTestCasesForArchetype(archetype, index);

  // Progressive 3-tier hints
  const hints = generateProgressiveHints(archetype, title);

  // Code Templates
  const starterCode = generateStarterCode(archetype);

  // Build a clean structured markdown description (LeetCode-style)
  const structuredDescription = buildStructuredDescription(problemStatement, whatToCalculate, examples, archetype);

  return {
    id: `q-${index}`,
    number: index,
    title,
    difficulty: archetype.difficulty || (index === 1 ? 'Easy' : index === 2 ? 'Medium' : 'Hard'),
    points: 25,
    description: structuredDescription,
    problemStatement,
    whatToCalculate,
    examples,
    inputFormat: archetype.inputFormat || 'Standard input via stdin.',
    outputFormat: archetype.outputFormat || 'Print the result to stdout.',
    constraints,
    testCases,
    hints,
    starterCode,
  };
}

/**
 * Infers an explanation for a sample I/O pair based on archetype
 */
function inferExampleExplanation(sample, archetype, idx) {
  if (archetype.type === 'twosum') {
    return `The pair of numbers at the returned indices sums to the target value.`;
  }
  if (archetype.type === 'string_palindrome') {
    return `Check if "${sample.input}" reads the same forwards and backwards → ${sample.output}.`;
  }
  if (archetype.type === 'math_numbers') {
    return `Apply the mathematical operation to input ${sample.input} to get ${sample.output}.`;
  }
  if (archetype.type === 'max_subarray') {
    return `The contiguous subarray with the largest sum produces ${sample.output}.`;
  }
  return `For the given input, the expected output is ${sample.output}.`;
}

/**
 * Returns archetype-specific sample examples when PDF has none
 */
function getArchetypeExamples(archetype) {
  if (archetype.type === 'twosum') {
    return [
      { input: '2 7 11 15\n9', output: '0 1', explanation: 'nums[0] + nums[1] = 2 + 7 = 9, so return indices [0, 1].' },
      { input: '3 2 4\n6', output: '1 2', explanation: 'nums[1] + nums[2] = 2 + 4 = 6, so return indices [1, 2].' },
    ];
  }
  if (archetype.type === 'string_palindrome') {
    return [
      { input: 'racecar', output: 'true', explanation: '"racecar" reversed is "racecar" — identical, so it is a palindrome.' },
      { input: 'hello', output: 'false', explanation: '"hello" reversed is "olleh" — not identical, so it is NOT a palindrome.' },
    ];
  }
  if (archetype.type === 'math_numbers') {
    return [
      { input: '5', output: '120', explanation: '5! = 5 × 4 × 3 × 2 × 1 = 120.' },
      { input: '0', output: '1', explanation: 'By definition, 0! = 1 (base case).' },
    ];
  }
  if (archetype.type === 'max_subarray') {
    return [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', output: '6', explanation: 'The subarray [4, -1, 2, 1] has the largest sum = 6.' },
      { input: '1\n1', output: '1', explanation: 'Single element array: the maximum subarray sum is the element itself.' },
    ];
  }
  return [
    { input: '5', output: '5', explanation: 'Basic test: process the input and produce the expected output.' },
  ];
}

/**
 * Builds a clean structured markdown description string (LeetCode-style)
 */
function buildStructuredDescription(problemStatement, whatToCalculate, examples) {
  let md = '';

  // What to Calculate (the core goal)
  md += `**🎯 What to Calculate:**\n${whatToCalculate}\n\n`;

  // Problem Statement
  if (problemStatement && problemStatement.length > 10) {
    md += `**📋 Problem Description:**\n${problemStatement}\n\n`;
  }

  // Examples
  if (examples.length > 0) {
    examples.forEach((ex) => {
      md += `**Example ${ex.id}:**\n`;
      md += `\`\`\`\nInput:  ${ex.input.replace(/\n/g, '\n        ')}\nOutput: ${ex.output}\n\`\`\`\n`;
      if (ex.explanation) {
        md += `**Explanation:** ${ex.explanation}\n`;
      }
      md += '\n';
    });
  }

  return md.trim();
}

function cleanTitle(line, index) {
  let cleaned = line
    .replace(/^(?:Question|Problem|Task|Q\.?|Part)\s*\d+[:.\s-]*/i, '')
    .replace(/^\d+[:.\s-]*/, '')
    .trim();
  if (!cleaned || cleaned.length < 4 || cleaned.length > 80) {
    return `Problem ${index}: Coding Challenge`;
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function extractSamplesFromText(text) {
  const samples = [];
  const pattern = /(?:Sample|Example)\s*(?:Input|Test\s*Case)?\s*[:\d]*\s*([\s\S]*?)(?:Sample|Example)?\s*Output\s*[:\d]*\s*([\s\S]*?)(?=(?:Sample|Example|Explanation|Constraints|Note|$))/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const input = match[1].replace(/Input:\s*/i, '').trim();
    const output = match[2].replace(/Output:\s*/i, '').trim();
    if (input && output) {
      // Try to extract explanation if present after the output
      const explanationMatch = text.slice(match.index + match[0].length).match(/^\s*Explanation\s*:?\s*([^\n]+(?:\n[^\n]+)?)/i);
      samples.push({
        input,
        output,
        explanation: explanationMatch ? explanationMatch[1].trim() : '',
      });
    }
  }
  return samples;
}

function detectProblemArchetype(text) {
  const lower = text.toLowerCase();

  if (lower.includes('two sum') || (lower.includes('target') && lower.includes('pair'))) {
    return {
      type: 'twosum',
      difficulty: 'Easy',
      inputFormat: 'Line 1: Space-separated integers representing the array\nLine 2: Target integer sum',
      outputFormat: 'Print the 0-indexed positions or values of the pair.',
    };
  }
  if (lower.includes('palindrome') || lower.includes('reverse string') || lower.includes('anagram')) {
    return {
      type: 'string_palindrome',
      difficulty: 'Easy',
      inputFormat: 'A single string on line 1.',
      outputFormat: 'Print "true" or "false" (or the reversed string).',
    };
  }
  if (lower.includes('fibonacci') || lower.includes('factorial') || lower.includes('prime') || lower.includes('gcd')) {
    return {
      type: 'math_numbers',
      difficulty: 'Easy',
      inputFormat: 'A single integer N.',
      outputFormat: 'Print the calculated integer result.',
    };
  }
  if (lower.includes('subsequence') || lower.includes('longest') || lower.includes('subarray') || lower.includes('maximum sum')) {
    return {
      type: 'max_subarray',
      difficulty: 'Medium',
      inputFormat: 'Line 1: Integer N (number of elements)\nLine 2: N space-separated integers',
      outputFormat: 'Print the maximum subarray sum.',
    };
  }
  if (lower.includes('sort') || lower.includes('merge') || lower.includes('kth largest') || lower.includes('binary search')) {
    return {
      type: 'search_sort',
      difficulty: 'Medium',
      inputFormat: 'Line 1: Array elements separated by spaces\nLine 2: Query target K',
      outputFormat: 'Print the sorted array or target index.',
    };
  }

  return {
    type: 'generic_algo',
    difficulty: 'Medium',
    inputFormat: 'Line 1: Input test data as described in the problem statement.',
    outputFormat: 'Print the computed answer to standard output.',
  };
}

function buildTestCasesFromExtracted(samples, archetype) {
  const cases = [];
  samples.forEach((s, i) => {
    cases.push({
      id: `tc-${i + 1}`,
      input: s.input,
      expectedOutput: s.output,
      explanation: s.explanation || `Sample test case ${i + 1} from the problem statement.`,
      isHidden: false,
    });
  });

  // Add 2 synthetic hidden test cases for robust exam grading
  if (archetype.type === 'twosum') {
    cases.push({
      id: `tc-${cases.length + 1}`,
      input: '1 5 8 11 14\n19',
      expectedOutput: '2 3',
      explanation: 'Hidden evaluation test case (large indices)',
      isHidden: true,
    });
    cases.push({
      id: `tc-${cases.length + 1}`,
      input: '3 3\n6',
      expectedOutput: '0 1',
      explanation: 'Hidden evaluation test case (duplicate values)',
      isHidden: true,
    });
  } else {
    cases.push({
      id: `tc-${cases.length + 1}`,
      input: '0',
      expectedOutput: '0',
      explanation: 'Hidden boundary test case (zero / base condition)',
      isHidden: true,
    });
    cases.push({
      id: `tc-${cases.length + 1}`,
      input: '100',
      expectedOutput: cases[0]?.expectedOutput || '100',
      explanation: 'Hidden scale test case',
      isHidden: true,
    });
  }

  return cases;
}

function buildTestCasesForArchetype(archetype) {
  if (archetype.type === 'twosum') {
    return [
      {
        id: `tc-1`,
        input: '2 7 11 15\n9',
        expectedOutput: '0 1',
        explanation: 'nums[0] + nums[1] == 9, return [0, 1]',
        isHidden: false,
      },
      {
        id: `tc-2`,
        input: '3 2 4\n6',
        expectedOutput: '1 2',
        explanation: 'nums[1] + nums[2] == 6',
        isHidden: false,
      },
      {
        id: `tc-3`,
        input: '3 3\n6',
        expectedOutput: '0 1',
        explanation: 'Hidden evaluation: Duplicate numbers with target sum',
        isHidden: true,
      },
      {
        id: `tc-4`,
        input: '1 2 3 4 5 6 7 8 9 10\n17',
        expectedOutput: '6 9',
        explanation: 'Hidden evaluation: Large array bounds',
        isHidden: true,
      },
    ];
  }

  if (archetype.type === 'string_palindrome') {
    return [
      {
        id: `tc-1`,
        input: 'racecar',
        expectedOutput: 'true',
        explanation: 'racecar reads the same backward as forward',
        isHidden: false,
      },
      {
        id: `tc-2`,
        input: 'hello',
        expectedOutput: 'false',
        explanation: 'hello reversed is olleh, not equal',
        isHidden: false,
      },
      {
        id: `tc-3`,
        input: 'a',
        expectedOutput: 'true',
        explanation: 'Hidden evaluation: Single character edge case',
        isHidden: true,
      },
      {
        id: `tc-4`,
        input: 'Was it a car or a cat I saw',
        expectedOutput: 'true',
        explanation: 'Hidden evaluation: Case and space insensitivity check',
        isHidden: true,
      },
    ];
  }

  if (archetype.type === 'math_numbers') {
    return [
      {
        id: `tc-1`,
        input: '5',
        expectedOutput: '120',
        explanation: 'Sample case: 5! = 5 * 4 * 3 * 2 * 1 = 120',
        isHidden: false,
      },
      {
        id: `tc-2`,
        input: '1',
        expectedOutput: '1',
        explanation: 'Sample base case: input 1',
        isHidden: false,
      },
      {
        id: `tc-3`,
        input: '0',
        expectedOutput: '1',
        explanation: 'Hidden evaluation: 0 factorial equals 1',
        isHidden: true,
      },
      {
        id: `tc-4`,
        input: '10',
        expectedOutput: '3628800',
        explanation: 'Hidden evaluation: Double-digit factorial',
        isHidden: true,
      },
    ];
  }

  if (archetype.type === 'max_subarray') {
    return [
      {
        id: `tc-1`,
        input: '9\n-2 1 -3 4 -1 2 1 -5 4',
        expectedOutput: '6',
        explanation: 'Subarray [4, -1, 2, 1] has the largest sum = 6',
        isHidden: false,
      },
      {
        id: `tc-2`,
        input: '1\n1',
        expectedOutput: '1',
        explanation: 'Single element array',
        isHidden: false,
      },
      {
        id: `tc-3`,
        input: '5\n5 4 -1 7 8',
        expectedOutput: '23',
        explanation: 'Hidden evaluation: All positive with 1 negative',
        isHidden: true,
      },
      {
        id: `tc-4`,
        input: '4\n-5 -2 -8 -1',
        expectedOutput: '-1',
        explanation: 'Hidden evaluation: All negative elements (must select least negative)',
        isHidden: true,
      },
    ];
  }

  // Generic fallback
  return [
    {
      id: `tc-1`,
      input: '5',
      expectedOutput: '5',
      explanation: 'Basic sample test case 1',
      isHidden: false,
    },
    {
      id: `tc-2`,
      input: '10',
      expectedOutput: '10',
      explanation: 'Basic sample test case 2',
      isHidden: false,
    },
    {
      id: `tc-3`,
      input: '0',
      expectedOutput: '0',
      explanation: 'Hidden evaluation: Zero boundary value',
      isHidden: true,
    },
    {
      id: `tc-4`,
      input: '100',
      expectedOutput: '100',
      explanation: 'Hidden evaluation: Upper bound test',
      isHidden: true,
    },
  ];
}

function generateProgressiveHints(archetype, title) {
  if (archetype.type === 'twosum') {
    return [
      {
        tier: 1,
        title: '💡 Hint 1: Core Intuition',
        content: 'Rather than checking every single pair with nested loops in O(N²) time, can you remember elements you have already seen?',
      },
      {
        tier: 2,
        title: '⚙️ Hint 2: Data Structure Strategy',
        content: 'Use a Hash Map / Dictionary where the key is the number and the value is its index. As you iterate through each number `x`, look up if `target - x` is already in the map in O(1) time.',
      },
      {
        tier: 3,
        title: '⚠️ Hint 3: Edge Cases & Traps',
        content: 'Watch out: Make sure you do not use the same element twice (e.g. if target is 6 and the number 3 is at index 0, make sure another 3 exists).',
      },
    ];
  }

  if (archetype.type === 'string_palindrome') {
    return [
      {
        tier: 1,
        title: '💡 Hint 1: Two Pointers Intuition',
        content: 'A palindrome reads the same backwards as forwards. Think of comparing characters from the outside inward toward the center.',
      },
      {
        tier: 2,
        title: '⚙️ Hint 2: Implementation Technique',
        content: 'Initialize `left = 0` and `right = s.length - 1`. While `left < right`, check if `s[left] === s[right]`. If mismatched, immediately return false.',
      },
      {
        tier: 3,
        title: '⚠️ Hint 3: Normalization & Edge Cases',
        content: 'Check whether the problem requires filtering out spaces and punctuation or converting all characters to lowercase beforehand (`s.toLowerCase()`).',
      },
    ];
  }

  if (archetype.type === 'max_subarray') {
    return [
      {
        tier: 1,
        title: '💡 Hint 1: Kadane’s Insight',
        content: 'At each index `i`, you have two choices: either extend the current running subarray sum by adding `arr[i]`, or start a fresh subarray at `arr[i]`.',
      },
      {
        tier: 2,
        title: '⚙️ Hint 2: Recurrence Formula',
        content: 'Keep track of `currentMax = max(arr[i], currentMax + arr[i])` and update `globalMax = max(globalMax, currentMax)`. This runs in O(N) time with O(1) memory.',
      },
      {
        tier: 3,
        title: '⚠️ Hint 3: All Negatives Trap',
        content: 'Do NOT initialize `globalMax = 0`! If all elements in the array are negative numbers, the maximum sum will be the least negative number (e.g. -1). Initialize with `arr[0]`.',
      },
    ];
  }

  // Generic progressive hints
  return [
    {
      tier: 1,
      title: '💡 Hint 1: High-Level Conceptual Intuition',
      content: `Read the question requirements carefully for "${title}". Break down the problem into inputs, transformation logic, and expected output format.`,
    },
    {
      tier: 2,
      title: '⚙️ Hint 2: Algorithmic Approach',
      content: 'Identify whether the problem involves sequential scanning, sorting, hash table lookup, or recursion. Write pseudocode before typing the full solution.',
    },
    {
      tier: 3,
      title: '⚠️ Hint 3: Corner Traps & Boundary Limits',
      content: 'Test extreme bounds: zero, single-element inputs, negative numbers, and very large values to prevent overflows or infinite loops.',
    },
  ];
}

function generateStarterCode(archetype) {
  if (archetype.type === 'twosum') {
    return {
      python: `# Write your solution below
import sys

def solve():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    nums = list(map(int, lines[0].split()))
    target = int(lines[1])
    
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            print(f"{seen[complement]} {i}")
            return
        seen[num] = i

if __name__ == '__main__':
    solve()
`,
      javascript: `// Write your solution below
const fs = require('fs');

function solve() {
  const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
  if (input.length < 2) return;
  
  const nums = input[0].trim().split(/\\s+/).map(Number);
  const target = Number(input[1]);
  
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      console.log(\`\${map.get(complement)} \${i}\`);
      return;
    }
    map.set(nums[i], i);
  }
}

solve();
`,
      cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
#include <sstream>

using namespace std;

int main() {
    string line;
    if (!getline(cin, line)) return 0;
    stringstream ss(line);
    vector<int> nums;
    int x;
    while (ss >> x) nums.push_back(x);
    
    int target;
    if (!(cin >> target)) return 0;
    
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (seen.find(complement) != seen.end()) {
            cout << seen[complement] << " " << i << endl;
            return 0;
        }
        seen[nums[i]] = i;
    }
    return 0;
}
`,
      java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        
        if (!sc.hasNextInt()) return;
        int target = sc.nextInt();
        
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int comp = target - nums[i];
            if (seen.containsKey(comp)) {
                System.out.println(seen.get(comp) + " " + i);
                return;
            }
            seen.put(nums[i], i);
        }
    }
}
`,
    };
  }

  return {
    python: `# Write your solution below
import sys

def solve():
    raw_input = sys.stdin.read().strip()
    if not raw_input:
        return
    # Process input and print answer
    print(raw_input)

if __name__ == '__main__':
    solve()
`,
    javascript: `// Write your solution below
const fs = require('fs');

function solve() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  if (!input) return;
  // Process input and print answer
  console.log(input);
}

solve();
`,
    cpp: `#include <iostream>
#include <string>

using namespace std;

int main() {
    string input;
    if (cin >> input) {
        cout << input << endl;
    }
    return 0;
}
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNext()) {
            System.out.println(sc.next());
        }
    }
}
`,
  };
}

// ─── Real Claude API Parser ─────────────────────────────────────────────────

async function realAiParseExam(rawText, title, config) {
  const prompt = `You are an expert coding contest problem author (like LeetCode / Codeforces). Parse the following exam/question paper text and extract ONLY the coding problems.

CRITICAL RULES:
- STRIP all theory, definitions, textbook explanations, and irrelevant code snippets.
- For each problem, produce a CLEAN, point-to-point problem statement.
- Each problem MUST include: clear "whatToCalculate" (1-2 sentence goal), structured examples with input/output/explanation.
- Generate at least 2 visible sample test cases and 2 hidden evaluation test cases per problem.
- Format like LeetCode: concise problem → examples → constraints. No fluff.

Text:
"""
${rawText.slice(0, 12000)}
"""

Return a valid JSON object matching this schema:
{
  "title": "${title}",
  "durationMinutes": 60,
  "questions": [
    {
      "number": 1,
      "title": "Concise Problem Title",
      "difficulty": "Easy" | "Medium" | "Hard",
      "whatToCalculate": "1-2 sentence clear goal of what the user must compute/return",
      "problemStatement": "Clean problem description WITHOUT theory. Only the task requirement.",
      "examples": [
        { "id": 1, "input": "sample input", "output": "expected output", "explanation": "Step-by-step why this output" }
      ],
      "inputFormat": "Exact input format description",
      "outputFormat": "Exact output format description",
      "constraints": "Constraints",
      "testCases": [
        { "id": "tc-1", "input": "input", "expectedOutput": "output", "explanation": "Why", "isHidden": false },
        { "id": "tc-3", "input": "edge input", "expectedOutput": "output", "explanation": "Edge case", "isHidden": true }
      ],
      "hints": [
        { "tier": 1, "title": "💡 Hint 1: Conceptual Intuition", "content": "..." },
        { "tier": 2, "title": "⚙️ Hint 2: Data Structure & Algorithm", "content": "..." },
        { "tier": 3, "title": "⚠️ Hint 3: Edge Cases & Optimization", "content": "..." }
      ]
    }
  ]
}
Return ONLY pure JSON. No markdown code fences. No explanatory text outside JSON.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.claudeApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Claude API returned status ${response.status}`);
  const result = await response.json();
  const text = result.content[0].text.trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(text);

  parsed.id = 'exam_' + Date.now();
  parsed.createdAt = new Date().toISOString();
  parsed.totalQuestions = parsed.questions.length;
  parsed.questions = parsed.questions.map((q, idx) => {
    const archetype = detectProblemArchetype(q.problemStatement || q.description || '');
    // Build structured description from AI-provided fields
    const examples = q.examples || [];
    const description = buildStructuredDescription(
      q.problemStatement || q.description || '',
      q.whatToCalculate || inferWhatToCalculate(q.problemStatement || '', archetype),
      examples,
      archetype
    );
    return {
      ...q,
      id: `q-${idx + 1}`,
      description,
      problemStatement: q.problemStatement || q.description || '',
      whatToCalculate: q.whatToCalculate || '',
      examples,
      starterCode: generateStarterCode(archetype),
    };
  });
  return parsed;
}

// ─── Socratic AI Exam Mentor ────────────────────────────────────────────────

export async function askExamAiAssistant(question, userCode, userQuery, language = 'python') {
  const config = getConfig();

  // If real Claude is available
  if (!config.mockAI && config.claudeApiKey) {
    try {
      const prompt = `You are a proctored Coding Exam AI Mentor. 
The student is taking a timed test.
Question: "${question.title}"
Description: ${question.description}
Current Student Code (${language}):
\`\`\`
${userCode || '(empty)'}
\`\`\`
Student's Question / Query:
"${userQuery}"

Guidelines:
1. DO NOT write the complete final solution or give copy-pasteable answers.
2. Be Socratic: explain the error, clarify confusing test cases, or provide structural hints.
3. Keep answers concise, clear, and encouraging. Use markdown.`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.claudeApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.content[0].text;
      }
    } catch (e) {
      console.warn('Real AI assistant call failed, using tutor logic:', e);
    }
  }

  // Built-in intelligent Socratic mentor
  return new Promise((resolve) => {
    setTimeout(() => {
      const qLower = userQuery.toLowerCase();
      if (qLower.includes('hint') || qLower.includes('how to start') || qLower.includes('approach')) {
        const hint = question.hints?.[0]?.content || 'Break the problem down into reading inputs and writing the transformation.';
        resolve(`### 💡 Socratic Hint\n\n${hint}\n\n*Try writing the pseudocode first before writing the complete function.*`);
      } else if (qLower.includes('error') || qLower.includes('fail') || qLower.includes('test case')) {
        resolve(`### 🔍 Debugging Guidance\n\nWhen a test case fails:\n1. Check the **expected output format** vs your **print output** (e.g. trailing newlines or extra prompt strings).\n2. Are you handling edge cases like single-element inputs or zero?\n3. Check standard input parsing with \`sys.stdin.read()\` or \`Scanner\`.`);
      } else if (qLower.includes('complexity') || qLower.includes('time limit')) {
        resolve(`### ⚡ Performance Tip\n\nTo pass large hidden test cases:\n- Avoid nested loops that result in $O(N^2)$ when $N \\ge 10^5$.\n- Utilize Hash Sets or Dictionaries for $O(1)$ lookups.`);
      } else {
        resolve(`### 🤖 Exam Assistant\n\nI am here to guide your thinking without giving away the full answer during the test.\n\n**Key checkpoint:** Focus on the problem constraints: \n\`${question.constraints?.split('\n')[0] || '1 <= N <= 10^5'}\`\n\nWhat step of the logic are you currently stuck on?`);
      }
    }, 450);
  });
}

// ─── Exam State & Anti-Cheat Session Storage ────────────────────────────────

export function saveActiveExam(session) {
  try {
    localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to save exam session:', e);
  }
}

export function loadActiveExam() {
  try {
    const raw = localStorage.getItem(EXAM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearActiveExam() {
  try {
    localStorage.removeItem(EXAM_STORAGE_KEY);
  } catch {}
}

export function recordExamResult(result) {
  try {
    const existing = JSON.parse(localStorage.getItem(EXAM_HISTORY_KEY) || '[]');
    existing.unshift(result);
    localStorage.setItem(EXAM_HISTORY_KEY, JSON.stringify(existing.slice(0, 20)));
  } catch {}
}

// ─── Built-in Demo Sample Question Papers ───────────────────────────────────

export function getSampleQuestionPapers() {
  return [
    {
      id: 'sample-dsa',
      title: 'Midterm Examination: Data Structures & Algorithms',
      description: 'Standard university-level exam paper covering Two Sum, Maximum Subarray, and Palindrome Validation with progressive test suites.',
      durationMinutes: 45,
      rawText: `Midterm Examination: Data Structures & Algorithms
Department of Computer Science

Question 1: Target Pair Sum (Two Sum)
Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.
Assume each input has exactly one solution, and you may not use the same element twice.
Input Format:
Line 1: Space-separated integers
Line 2: Target integer
Output Format:
Space-separated indices (0-indexed)
Sample Input:
2 7 11 15
9
Sample Output:
0 1
Constraints:
2 <= nums.length <= 10^5
-10^9 <= nums[i] <= 10^9

Question 2: Maximum Subarray Problem (Kadane's Algorithm)
Given an integer array nums, find the subarray with the largest sum, and return its sum.
Input Format:
Line 1: Number of elements N
Line 2: N space-separated integers
Sample Input:
9
-2 1 -3 4 -1 2 1 -5 4
Sample Output:
6
Explanation: The subarray [4, -1, 2, 1] has the largest sum = 6.
Constraints:
1 <= nums.length <= 10^5
-10^4 <= nums[i] <= 10^4

Question 3: Valid Palindrome Checker
Write a program that determines whether an input string is a valid palindrome, reading the same forwards and backwards.
Input Format:
A single string
Sample Input:
racecar
Sample Output:
true
Constraints:
1 <= s.length <= 2 * 10^5`,
    },
    {
      id: 'sample-python',
      title: 'Python Core & Algorithms Assessment',
      description: 'Practical coding test evaluating fundamental arithmetic operations, string transformations, and array logic.',
      durationMinutes: 30,
      rawText: `Python Core & Algorithms Assessment
Coding Lab Test

Question 1: Factorial Calculation
Write a program to compute the factorial of a given non-negative integer N.
Sample Input:
5
Sample Output:
120
Constraints:
0 <= N <= 12

Question 2: Two Sum Pair
Find indices of two numbers that add up to target.
Sample Input:
3 2 4
6
Sample Output:
1 2`,
    },
  ];
}
