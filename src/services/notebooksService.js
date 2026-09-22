// ─── Academic & Subject Notebooks Management Service ───────────────────────
import { saveNamedWorkspace, getSavedWorkspaces } from './workspaceService';
import { createDefaultNotebookJson } from './languageDetector';

export const NOTEBOOKS_STORAGE_KEY = 'fullcode_subject_notebooks_v1';

export const PRESET_SUBJECTS = [
  {
    id: 'java-oop',
    name: 'Java & Object-Oriented Programming',
    shortCode: 'CS201',
    icon: '☕',
    badgeColor: '#f59e0b',
    languageName: 'Java',
    languageId: 62,
    monacoLanguage: 'java',
    extension: 'java',
    description: 'Master classes, inheritance, polymorphism, encapsulation, HashMaps, and multithreading.',
    tags: ['Classes & Objects', 'Inheritance', 'Polymorphism', 'HashMaps', 'Collections'],
    files: [
      {
        name: 'Main.java',
        language: { id: 62, name: 'Java', monacoLanguage: 'java', extension: 'java', icon: '☕' },
        content: `// ============================================================================
// Subject: Java & Object-Oriented Programming (OOP)
// Topic: Class Design, Inheritance, and Collections
// ============================================================================
import java.util.*;

// Base Abstract Class
abstract class Shape {
    protected String name;

    public Shape(String name) {
        this.name = name;
    }

    public abstract double calculateArea();

    public void printDetails() {
        System.out.printf("[%s] Area: %.2f%n", name, calculateArea());
    }
}

// Derived Class
class Rectangle extends Shape {
    private double width;
    private double height;

    public Rectangle(double width, double height) {
        super("Rectangle");
        this.width = width;
        this.height = height;
    }

    @Override
    public double calculateArea() {
        return width * height;
    }
}

class Circle extends Shape {
    private double radius;

    public Circle(double radius) {
        super("Circle");
        this.radius = radius;
    }

    @Override
    public double calculateArea() {
        return Math.PI * radius * radius;
    }
}

public class Main {
    public static void main(String[] args) {
        System.out.println("🚀 Java OOP Workspace Initialized!");
        System.out.println("------------------------------------------");

        // Polymorphic list
        List<Shape> shapes = new ArrayList<>();
        shapes.add(new Rectangle(5.0, 4.0));
        shapes.add(new Circle(3.0));

        for (Shape s : shapes) {
            s.printDetails();
        }

        // HashMap Demo
        System.out.println("\\n📊 Frequency Map Demo:");
        Map<String, Integer> wordCount = new HashMap<>();
        String[] words = {"java", "code", "oop", "java", "compile", "code", "java"};
        for (String w : words) {
            wordCount.put(w, wordCount.getOrDefault(w, 0) + 1);
        }

        wordCount.forEach((k, v) -> System.out.println("  " + k + " -> " + v));
    }
}
`,
      },
      {
        name: 'java_notebook.ipynb',
        language: { id: 710, name: 'Jupyter Notebook', monacoLanguage: 'ipynb', extension: 'ipynb', icon: '🪐' },
        content: createDefaultNotebookJson('java'),
      },
      {
        name: 'Notes.md',
        language: { id: 99, name: 'Markdown', monacoLanguage: 'markdown', extension: 'md' },
        content: `# ☕ Java & Object-Oriented Programming — Subject Notebook

## 📌 Course Syllabus & Key Milestones
- [x] **Week 1-2**: Java Basics, JVM, Bytecode & Primitive types
- [x] **Week 3-4**: Classes, Constructors, 'this' keyword & Encapsulation
- [ ] **Week 5-6**: Inheritance, Method Overriding vs Overloading, 'super'
- [ ] **Week 7-8**: Abstract Classes, Interfaces & Multiple Inheritance
- [ ] **Week 9-10**: Java Collections Framework (List, Set, Map, Queue)
- [ ] **Week 11-12**: Exception Handling (try-catch-finally, custom exceptions)
- [ ] **Week 13-14**: Multithreading, Synchronization & Streams API

---

## 💡 4 Pillars of OOP Quick Reference
1. **Encapsulation**: Bundling data (variables) and methods inside a single class and restricting direct access with \`private\`/\`protected\`.
2. **Inheritance**: Reusing code from a parent class using \`extends\` (\`IS-A\` relationship).
3. **Polymorphism**:
   - *Compile-time*: Method Overloading (same method name, different signatures).
   - *Runtime*: Method Overriding (subclass overrides parent method with \`@Override\`).
4. **Abstraction**: Hiding internal implementation and showing only necessary features using \`abstract\` classes and \`interface\`.

---

## ⚡ Important Java Gotchas
- \`String\` is immutable; use \`StringBuilder\` for fast concatenation in loops.
- \`==\` compares memory references; always use \`.equals()\` for object/String value comparison.
- In HashMap, always override both \`hashCode()\` and \`equals()\` when using custom objects as keys.
`,
      },
    ],
  },
  {
    id: 'python-ai',
    name: 'Python & Data Science / AI',
    shortCode: 'CS202',
    icon: '🐍',
    badgeColor: '#10b981',
    languageName: 'Python 3',
    languageId: 71,
    monacoLanguage: 'python',
    extension: 'py',
    description: 'Data manipulation, algorithmic scripting, list comprehensions, statistics, and machine learning logic.',
    tags: ['List Comprehensions', 'NumPy Logic', 'Algorithms', 'File Parsing', 'Data Structures'],
    files: [
      {
        name: 'main.py',
        language: { id: 71, name: 'Python 3', monacoLanguage: 'python', extension: 'py' },
        content: `# ============================================================================
# Subject: Python & Data Science / AI
# Topic: Algorithmic Logic & Data Pipeline
# ============================================================================
from collections import defaultdict, Counter
import math

def calculate_statistics(numbers):
    """Computes mean, variance, and standard deviation."""
    n = len(numbers)
    if n == 0:
        return {}
    mean = sum(numbers) / n
    variance = sum((x - mean) ** 2 for x in numbers) / n
    std_dev = math.sqrt(variance)
    return {
        "count": n,
        "mean": round(mean, 2),
        "variance": round(variance, 2),
        "std_dev": round(std_dev, 2)
    }

def main():
    print("🐍 Python Data Science Notebook Active!")
    print("-" * 45)

    scores = [88, 92, 79, 95, 84, 91, 76, 89, 94, 100]
    stats = calculate_statistics(scores)
    
    print("📈 Dataset Statistics:")
    for key, val in stats.items():
        print(f"   {key.capitalize()}: {val}")

    # Frequency analysis
    text = "data science machine learning python algorithms artificial intelligence python data"
    word_freq = Counter(text.split())
    print("\\n📊 Top Keywords:")
    for word, count in word_freq.most_common(3):
        print(f"   • '{word}': {count} occurrences")

if __name__ == "__main__":
    main()
`,
      },
      {
        name: 'Notes.md',
        language: { id: 99, name: 'Markdown', monacoLanguage: 'markdown', extension: 'md' },
        content: `# 🐍 Python & Data Science / AI — Subject Notebook

## 📌 Course Syllabus
- [x] Python Data Types, Slicing & Comprehensions
- [x] Built-in Data Structures: List, Tuple, Dict, Set, Defaultdict, Counter
- [ ] Lambda functions, map(), filter(), reduce()
- [ ] Matrix & Vector operations (NumPy arrays)
- [ ] Data Cleaning & GroupBy operations (Pandas)
- [ ] Supervised Learning (Linear Regression, Classification)

---

## 💡 Quick Syntax Cheatsheet
\`\`\`python
# Fast list comprehension
evens = [x for x in range(20) if x % 2 == 0]

# Dict comprehension
squared_map = {x: x**2 for x in range(1, 6)}

# Defaultdict pattern for graphs
from collections import defaultdict
graph = defaultdict(list)
graph['A'].append('B')
\`\`\`
`,
      },
    ],
  },
  {
    id: 'cpp-dsa',
    name: 'C++ & Competitive Programming (DSA)',
    shortCode: 'CS203',
    icon: '⚡',
    badgeColor: '#00d4ff',
    languageName: 'C++ 20',
    languageId: 54,
    monacoLanguage: 'cpp',
    extension: 'cpp',
    description: 'High performance competitive programming, fast I/O, STL vectors, sets, heaps, and graph algorithms.',
    tags: ['Fast I/O', 'STL Containers', 'Dynamic Programming', 'Graph Theory', 'Bit Manipulation'],
    files: [
      {
        name: 'solution.cpp',
        language: { id: 54, name: 'C++', monacoLanguage: 'cpp', extension: 'cpp' },
        content: `// ============================================================================
// Subject: C++ & Competitive Programming (DSA)
// Template: Fast I/O, STL Containers, and Test Runner
// ============================================================================
#include <iostream>
#include <vector>
#include <algorithm>
#include <map>
#include <queue>
using namespace std;

void fast_io() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
}

void solve() {
    vector<int> nums = {45, 12, 85, 32, 89, 39, 69, 44, 42, 1, 6, 8};
    sort(nums.begin(), nums.end());

    cout << "⚡ Sorted Array: ";
    for (int x : nums) cout << x << " ";
    cout << "\\n";

    // Binary Search demonstration
    int target = 44;
    bool found = binary_search(nums.begin(), nums.end(), target);
    cout << "Target " << target << " found: " << (found ? "YES" : "NO") << "\\n";
}

int main() {
    fast_io();
    cout << "🚀 C++ Competitive Programming Workspace\\n";
    cout << "------------------------------------------\\n";
    solve();
    return 0;
}
`,
      },
      {
        name: 'Notes.md',
        language: { id: 99, name: 'Markdown', monacoLanguage: 'markdown', extension: 'md' },
        content: `# ⚡ C++ & Competitive Programming — Subject Notebook

## 📌 DSA Roadmap
- [x] Fast I/O & Template Structure
- [x] STL: vector, pair, tuple, sort, reverse
- [ ] Sets (\`set\` $O(\\log n)$ vs \`unordered_set\` $O(1)$)
- [ ] Priority Queues (Min-Heap vs Max-Heap)
- [ ] Two Pointers & Sliding Window techniques
- [ ] Binary Search on Answer Space
- [ ] Graph BFS/DFS, Dijkstra, Disjoint Set Union (DSU)

---

## ⚡ Big-O Limits for 1-Second Time Limits
- $N \\le 10$: $O(N!)$
- $N \\le 20$: $O(2^N)$
- $N \\le 500$: $O(N^3)$
- $N \\le 5000$: $O(N^2)$
- $N \\le 10^5$: $O(N \\log N)$
- $N \\le 10^8$: $O(N)$
`,
      },
    ],
  },
  {
    id: 'web-fullstack',
    name: 'Web Development & Full-Stack',
    shortCode: 'CS204',
    icon: '🌐',
    badgeColor: '#a855f7',
    languageName: 'JavaScript',
    languageId: 63,
    monacoLanguage: 'javascript',
    extension: 'js',
    description: 'Interactive web apps, HTML5 architecture, responsive CSS, DOM manipulation, and asynchronous APIs.',
    tags: ['HTML5', 'Modern CSS', 'JavaScript ES6+', 'DOM Manipulation', 'Async / Fetch'],
    files: [
      {
        name: 'index.html',
        language: { id: 98, name: 'HTML', monacoLanguage: 'html', extension: 'html' },
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Full Stack Web App</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="app-card">
    <h1>🌐 Web Dev Workspace</h1>
    <p>Live interactive preview powered by browser engine.</p>
    <div class="counter-box">
      <button id="btn-dec">-</button>
      <span id="counter-val">0</span>
      <button id="btn-inc">+</button>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>
`,
      },
      {
        name: 'style.css',
        language: { id: 97, name: 'CSS', monacoLanguage: 'css', extension: 'css' },
        content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #0d1117;
  color: #f0f6fc;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

.app-card {
  background: #161b22;
  border: 1px solid #30363d;
  padding: 32px 40px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.counter-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

button {
  background: #238636;
  border: none;
  color: white;
  padding: 8px 18px;
  font-size: 18px;
  border-radius: 8px;
  cursor: pointer;
}

button:hover {
  background: #2ea043;
}

#counter-val {
  font-size: 24px;
  font-weight: 700;
  min-width: 40px;
}
`,
      },
      {
        name: 'app.js',
        language: { id: 63, name: 'JavaScript', monacoLanguage: 'javascript', extension: 'js' },
        content: `let count = 0;
const countEl = document.getElementById('counter-val');
const incBtn = document.getElementById('btn-inc');
const decBtn = document.getElementById('btn-dec');

if (incBtn && decBtn && countEl) {
  incBtn.addEventListener('click', () => {
    count++;
    countEl.textContent = count;
  });

  decBtn.addEventListener('click', () => {
    count--;
    countEl.textContent = count;
  });
}

console.log("Web App Script initialized successfully!");
`,
      },
      {
        name: 'Notes.md',
        language: { id: 99, name: 'Markdown', monacoLanguage: 'markdown', extension: 'md' },
        content: `# 🌐 Web Development — Subject Notebook

## 📌 Web Architecture Roadmap
- [x] Semantic HTML5 (header, main, nav, section, article, footer)
- [x] CSS Flexbox & CSS Grid Layouts
- [x] JavaScript ES6+ (let/const, arrow functions, destructuring, modules)
- [ ] Asynchronous JS: Promises, \`async/await\`, \`fetch()\`
- [ ] State management & DOM manipulation
- [ ] Responsive design with Container Queries and Media Queries
`,
      },
    ],
  },
  {
    id: 'dbms-sql',
    name: 'Database Management & SQL',
    shortCode: 'CS205',
    icon: '🗄️',
    badgeColor: '#6366f1',
    languageName: 'SQL',
    languageId: 82,
    monacoLanguage: 'sql',
    extension: 'sql',
    description: 'Relational database schema design, DDL tables, DML mutations, aggregation queries, and indexes.',
    tags: ['Table DDL', 'SELECT Queries', 'Inner & Outer Joins', 'GROUP BY & HAVING', 'Subqueries'],
    files: [
      {
        name: 'queries.sql',
        language: { id: 82, name: 'SQL', monacoLanguage: 'sql', extension: 'sql' },
        content: `-- ============================================================================
-- Subject: Database Management & SQL (DBMS)
-- Topic: Students & Courses Relational Schema
-- ============================================================================

-- 1. Create Students Table
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    cgpa REAL
);

-- 2. Insert Sample Records
INSERT INTO students (id, name, department, cgpa) VALUES
    (1, 'Alice Smith', 'Computer Science', 3.85),
    (2, 'Bob Johnson', 'Electrical Eng', 3.40),
    (3, 'Charlie Brown', 'Computer Science', 3.92),
    (4, 'Diana Prince', 'Information Tech', 3.65),
    (5, 'Evan Wright', 'Mechanical Eng', 3.10);

-- 3. Query Top Students
SELECT 
    department,
    COUNT(*) as student_count,
    ROUND(AVG(cgpa), 2) as avg_cgpa
FROM students
GROUP BY department
ORDER BY avg_cgpa DESC;
`,
      },
      {
        name: 'Notes.md',
        language: { id: 99, name: 'Markdown', monacoLanguage: 'markdown', extension: 'md' },
        content: `# 🗄️ Database Management & SQL — Subject Notebook

## 📌 DBMS Key Concepts
- [x] Relational Model & Primary Keys / Foreign Keys
- [x] DDL (\`CREATE\`, \`ALTER\`, \`DROP\`) vs DML (\`INSERT\`, \`UPDATE\`, \`DELETE\`)
- [ ] SQL Joins: INNER, LEFT OUTER, RIGHT OUTER, FULL OUTER
- [ ] Aggregations: \`COUNT\`, \`SUM\`, \`AVG\`, \`MAX\`, \`MIN\` with \`GROUP BY\` & \`HAVING\`
- [ ] Normalization: 1NF, 2NF, 3NF, BCNF
- [ ] Transactions: ACID Properties (Atomicity, Consistency, Isolation, Durability)
`,
      },
    ],
  },
  {
    id: 'dsa-leetcode',
    name: 'Data Structures & Algorithms (Core / LeetCode)',
    shortCode: 'CS206',
    icon: '🧮',
    badgeColor: '#ec4899',
    languageName: 'Java',
    languageId: 62,
    monacoLanguage: 'java',
    extension: 'java',
    description: 'Master core interview algorithms: Two Pointers, Sliding Window, DP, Trees, and Graph Traversal.',
    tags: ['Two Pointers', 'Sliding Window', 'Binary Trees', 'Dynamic Programming', 'Graph BFS/DFS'],
    files: [
      {
        name: 'Solution.java',
        language: { id: 62, name: 'Java', monacoLanguage: 'java', extension: 'java' },
        content: `// ============================================================================
// Subject: Data Structures & Algorithms
// Problem: Two Sum & Sliding Window Template
// ============================================================================
import java.util.*;

public class Solution {

    // O(n) Time, O(n) Space
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }

    public static void main(String[] args) {
        int[] nums = {2, 7, 11, 15};
        int target = 9;
        int[] result = twoSum(nums, target);

        System.out.println("🧮 LeetCode Solution Runner:");
        System.out.printf("Input: nums = %s, target = %d%n", Arrays.toString(nums), target);
        System.out.printf("Result Indices: %s%n", Arrays.toString(result));
    }
}
`,
      },
      {
        name: 'Notes.md',
        language: { id: 99, name: 'Markdown', monacoLanguage: 'markdown', extension: 'md' },
        content: `# 🧮 Data Structures & Algorithms — Subject Notebook

## 📌 Top 14 Algorithmic Patterns
1. **Two Pointers**: Sorted arrays, pair sums, palindrome verification.
2. **Sliding Window**: Subarray with target sum, longest substring without repeating chars.
3. **Fast & Slow Pointers**: Linked list cycle detection (Floyd's algorithm).
4. **Merge Intervals**: Overlapping meeting rooms, calendar scheduling.
5. **Cyclic Sort**: Finding missing numbers in $1$ to $N$ ranges.
6. **In-place Reversal of LinkedList**: Reversing nodes in k-groups.
7. **Tree BFS / DFS**: Level order traversal, maximum path sum.
8. **Two Heaps**: Finding median of a running data stream.
9. **Subsets / Backtracking**: Permutations, combinations, Sudoku solver.
10. **Modified Binary Search**: Rotated sorted array search.
11. **Top K Elements**: QuickSelect, Min-Heap of size K.
12. **K-way Merge**: Merging K sorted lists.
13. **0/1 Knapsack & DP**: Tabulation vs Memoization, coin change.
14. **Topological Sort**: Course schedule, dependency resolution.
`,
      },
    ],
  },
];

// Helper to get all saved notebooks
export function getSavedNotebooks() {
  try {
    const raw = localStorage.getItem(NOTEBOOKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Helper to save a notebook metadata entry
export function saveNotebookMeta(notebook) {
  const list = getSavedNotebooks();
  const existingIdx = list.findIndex((n) => n.id === notebook.id);
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...notebook, updatedAt: Date.now() };
  } else {
    list.unshift({ ...notebook, createdAt: Date.now(), updatedAt: Date.now() });
  }
  try {
    localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save notebook metadata:', err);
  }
  return list;
}

// Delete a notebook
export function deleteNotebookMeta(id) {
  const list = getSavedNotebooks().filter((n) => n.id !== id);
  try {
    localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to update notebook list:', err);
  }
  return list;
}

// Initialize a workspace from a subject definition
export function launchSubjectWorkspace(subject, customTitle = null) {
  const title = customTitle || subject.name;
  const workspaceFiles = subject.files.map((f, idx) => ({
    id: `file_${subject.id}_${idx + 1}_${Date.now()}`,
    name: f.name,
    content: f.content,
    language: f.language,
  }));

  const workspaceData = saveNamedWorkspace(
    title,
    workspaceFiles,
    [],
    workspaceFiles[0]?.id,
    '',
    subject.files[0]?.language
  );

  // Also record in subject notebooks
  saveNotebookMeta({
    id: subject.id,
    name: title,
    shortCode: subject.shortCode || 'SUB',
    icon: subject.icon || '📚',
    badgeColor: subject.badgeColor || '#00d4ff',
    languageName: subject.languageName || 'Code',
    workspaceId: workspaceData.id,
    filesCount: workspaceFiles.length,
    updatedAt: Date.now(),
  });

  return workspaceData;
}
