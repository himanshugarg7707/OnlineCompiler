// ─── Practice Questions Data ──────────────────────────────────────────────
// Organized by language with hints for each question.

export const PRACTICE_LANGUAGES = [
  { id: 'python', name: 'Python', icon: '🐍', langId: 71 },
  { id: 'java', name: 'Java', icon: '☕', langId: 62 },
  { id: 'c', name: 'C', icon: '⚙️', langId: 50 },
  { id: 'cpp', name: 'C++', icon: '🔧', langId: 54 },
  { id: 'sql', name: 'MySQL', icon: '🗄️', langId: 82 },
  { id: 'javascript', name: 'JavaScript', icon: '🟨', langId: 63 },
];

export const PRACTICE_QUESTIONS = {
  python: [
    {
      id: 1,
      title: 'Check Prime Number',
      description: 'Write a program to check whether a number is prime.',
      difficulty: 'Easy',
      hint: 'A prime number is only divisible by 1 and itself. Loop from 2 to √n and check if any number divides n evenly. If none do, it\'s prime.',
      starterCode: `# Check whether a number is prime
n = int(input("Enter a number: "))

# Start here
`,
    },
    {
      id: 2,
      title: 'Factorial Using Loop',
      description: 'Write a program to find the factorial of a number using a loop.',
      difficulty: 'Easy',
      hint: 'Initialize result = 1, then multiply result by every integer from 1 to n in a for loop. factorial(5) = 1×2×3×4×5 = 120.',
      starterCode: `# Find factorial using a loop
n = int(input("Enter a number: "))

# Start here
`,
    },
    {
      id: 3,
      title: 'Reverse a String',
      description: 'Write a program to reverse a string without using slicing.',
      difficulty: 'Easy',
      hint: 'Build a new string by iterating the original from the last character to the first using a for loop with range(len(s)-1, -1, -1), or use a while loop.',
      starterCode: `# Reverse a string without slicing
s = input("Enter a string: ")

# Start here
`,
    },
    {
      id: 4,
      title: 'Largest & Smallest in List',
      description: 'Write a program to find the largest and smallest element in a list.',
      difficulty: 'Easy',
      hint: 'Initialize max_val and min_val to the first element. Iterate through the list and compare each element, updating max_val and min_val accordingly.',
      starterCode: `# Find largest and smallest element in a list
lst = list(map(int, input("Enter numbers separated by space: ").split()))

# Start here
`,
    },
    {
      id: 5,
      title: 'Remove Duplicates',
      description: 'Write a program to remove duplicate elements from a list.',
      difficulty: 'Easy',
      hint: 'Use a set to track seen elements. Iterate through the list and add each element to a new list only if it hasn\'t been seen before.',
      starterCode: `# Remove duplicates from a list
lst = list(map(int, input("Enter numbers separated by space: ").split()))

# Start here
`,
    },
    {
      id: 6,
      title: 'Character Frequency',
      description: 'Write a program to count the frequency of each character in a string.',
      difficulty: 'Easy',
      hint: 'Use a dictionary. For each character in the string, if it\'s already a key, increment its value; otherwise, add it with value 1.',
      starterCode: `# Count frequency of each character
s = input("Enter a string: ")

# Start here
`,
    },
    {
      id: 7,
      title: 'Palindrome Check',
      description: 'Write a program to check whether a string is a palindrome.',
      difficulty: 'Easy',
      hint: 'Compare the string with its reverse. You can reverse it character by character or use two pointers (one from start, one from end) moving toward the center.',
      starterCode: `# Check if string is a palindrome
s = input("Enter a string: ")

# Start here
`,
    },
    {
      id: 8,
      title: 'Second Largest Element',
      description: 'Write a program to find the second-largest element in a list.',
      difficulty: 'Medium',
      hint: 'Track two variables: largest and second_largest. Iterate through the list — if current > largest, update second_largest = largest, then largest = current.',
      starterCode: `# Find second largest element
lst = list(map(int, input("Enter numbers separated by space: ").split()))

# Start here
`,
    },
    {
      id: 9,
      title: 'Sort Without Built-in',
      description: 'Write a program to sort a list without using the built-in sort() method.',
      difficulty: 'Medium',
      hint: 'Implement Bubble Sort: use two nested loops. In the inner loop, compare adjacent elements and swap them if they\'re in the wrong order. Repeat until no swaps occur.',
      starterCode: `# Sort list without sort()
lst = list(map(int, input("Enter numbers separated by space: ").split()))

# Start here
`,
    },
    {
      id: 10,
      title: 'Merge Two Dictionaries',
      description: 'Write a program to merge two dictionaries.',
      difficulty: 'Easy',
      hint: 'Use the {**dict1, **dict2} unpacking syntax, or use dict1.update(dict2) to merge. Note that duplicate keys will use values from the second dictionary.',
      starterCode: `# Merge two dictionaries
dict1 = {"a": 1, "b": 2}
dict2 = {"c": 3, "d": 4}

# Start here
`,
    },
    {
      id: 11,
      title: 'Common Elements',
      description: 'Write a program to find common elements between two lists.',
      difficulty: 'Easy',
      hint: 'Convert both lists to sets and use set intersection: set1 & set2, or iterate through one list and check if each element exists in the other.',
      starterCode: `# Find common elements between two lists
list1 = [1, 2, 3, 4, 5]
list2 = [4, 5, 6, 7, 8]

# Start here
`,
    },
    {
      id: 12,
      title: 'Fibonacci Series',
      description: 'Write a function that returns Fibonacci numbers up to n terms.',
      difficulty: 'Medium',
      hint: 'Start with a=0, b=1. In a loop, compute next = a + b, then shift: a = b, b = next. Store or print each value.',
      starterCode: `# Fibonacci numbers up to n terms
n = int(input("Enter number of terms: "))

# Start here
`,
    },
    {
      id: 13,
      title: 'Vowels & Consonants Count',
      description: 'Write a program to count vowels and consonants in a string.',
      difficulty: 'Easy',
      hint: 'Define a set of vowels "aeiouAEIOU". Iterate through the string: if character is a vowel increment vowel_count, else if it\'s an alphabet letter increment consonant_count.',
      starterCode: `# Count vowels and consonants
s = input("Enter a string: ")

# Start here
`,
    },
    {
      id: 14,
      title: 'Sum of Nested List',
      description: 'Write a program to find the sum of all elements in a nested list.',
      difficulty: 'Medium',
      hint: 'Use recursion: if an element is a list, recursively sum its elements; if it\'s a number, add it to the total.',
      starterCode: `# Sum of all elements in a nested list
nested = [[1, 2, 3], [4, 5], [6, [7, 8]]]

# Start here
`,
    },
    {
      id: 15,
      title: 'Transpose a Matrix',
      description: 'Write a program to transpose a matrix.',
      difficulty: 'Medium',
      hint: 'For a matrix with r rows and c columns, the transpose has c rows and r columns. Element at [i][j] in original goes to [j][i] in the transpose.',
      starterCode: `# Transpose a matrix
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

# Start here
`,
    },
    {
      id: 16,
      title: 'Find Duplicates',
      description: 'Write a program to find all duplicate values in a list.',
      difficulty: 'Easy',
      hint: 'Use a dictionary or Counter to count occurrences, then filter elements that appear more than once.',
      starterCode: `# Find all duplicate values
lst = [1, 2, 3, 2, 4, 5, 1, 6, 3]

# Start here
`,
    },
    {
      id: 17,
      title: 'Student Dictionary & Topper',
      description: 'Write a program using a dictionary to store student names and marks and find the topper.',
      difficulty: 'Medium',
      hint: 'Create a dict like {"Alice": 90, "Bob": 85}. Use max() with key=students.get to find the key with the highest value.',
      starterCode: `# Store student names/marks and find topper
students = {}
n = int(input("How many students? "))

# Start here
`,
    },
    {
      id: 18,
      title: 'Read File & Count',
      description: 'Write a program to read a text file and count its lines, words, and characters.',
      difficulty: 'Medium',
      hint: 'Open the file with open(). Use readlines() for line count, split() each line for word count, and len() of each line for character count.',
      starterCode: `# Read a text file and count lines, words, characters
# Note: Create a sample text for demonstration
sample_text = """Hello World
This is a sample text file.
It has multiple lines."""

# Start here (use sample_text as if it were file content)
`,
    },
    {
      id: 19,
      title: 'Exception Handling',
      description: 'Write a program to demonstrate exception handling for division by zero and invalid input.',
      difficulty: 'Easy',
      hint: 'Use try-except blocks. Catch ZeroDivisionError for division by zero and ValueError for invalid input. Use finally for cleanup.',
      starterCode: `# Exception handling demo
# Start here
`,
    },
    {
      id: 20,
      title: 'Student Class',
      description: 'Write a program to implement a simple class Student with attributes, constructor, and a method to display details.',
      difficulty: 'Medium',
      hint: 'Define a class with __init__(self, name, age, marks). Add a display() method that prints all attributes. Create an instance and call display().',
      starterCode: `# Student class implementation
# Start here
`,
    },
  ],

  java: [
    {
      id: 1,
      title: 'Check Prime Number',
      description: 'Write a program to check whether a number is prime.',
      difficulty: 'Easy',
      hint: 'Loop from 2 to Math.sqrt(n). If n % i == 0 for any i, it\'s not prime. Use Scanner to read input.',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Start here
        
    }
}`,
    },
    {
      id: 2,
      title: 'Factorial Using Loop',
      description: 'Write a program to calculate factorial using a loop.',
      difficulty: 'Easy',
      hint: 'Use a long variable to store the result (factorials grow quickly). Multiply in a for loop from 1 to n.',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Start here
        
    }
}`,
    },
    {
      id: 3,
      title: 'Reverse an Integer',
      description: 'Write a program to reverse an integer.',
      difficulty: 'Easy',
      hint: 'Extract digits using % 10, build reversed number by multiplying by 10 and adding the digit. Loop while n > 0.',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Start here
        
    }
}`,
    },
    {
      id: 4,
      title: 'Palindrome String',
      description: 'Write a program to check whether a string is a palindrome.',
      difficulty: 'Easy',
      hint: 'Use two pointers: left starting at 0, right at str.length()-1. Compare characters moving inward. Or use StringBuilder.reverse().',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine();
        // Start here
        
    }
}`,
    },
    {
      id: 5,
      title: 'Largest in Array',
      description: 'Write a program to find the largest element in an array.',
      difficulty: 'Easy',
      hint: 'Set max = arr[0]. Iterate through the array, if arr[i] > max then max = arr[i].',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
        // Start here
        
    }
}`,
    },
    {
      id: 6,
      title: 'Second Largest in Array',
      description: 'Write a program to find the second-largest element in an array.',
      difficulty: 'Medium',
      hint: 'Track first and second largest. If current > first, update second = first, first = current. If current > second and current != first, update second.',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
        // Start here
        
    }
}`,
    },
    {
      id: 7,
      title: 'Sort Without Arrays.sort()',
      description: 'Write a program to sort an array without using Arrays.sort().',
      difficulty: 'Medium',
      hint: 'Implement Bubble Sort: nested loops, compare arr[j] > arr[j+1], swap using a temp variable.',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
        // Start here
        
    }
}`,
    },
    {
      id: 8,
      title: 'Remove Duplicates from Array',
      description: 'Write a program to remove duplicate elements from an integer array.',
      difficulty: 'Medium',
      hint: 'Use a LinkedHashSet<Integer> to maintain insertion order while removing duplicates. Or use a boolean[] if range is known.',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 2, 4, 5, 1, 6, 3};
        // Start here
        
    }
}`,
    },
    {
      id: 9,
      title: 'Element Frequency',
      description: 'Write a program to count the frequency of each element in an array.',
      difficulty: 'Easy',
      hint: 'Use a HashMap<Integer, Integer>. For each element, use map.getOrDefault(element, 0) + 1 to count.',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 2, 4, 5, 1, 6, 3, 2};
        // Start here
        
    }
}`,
    },
    {
      id: 10,
      title: 'Matrix Addition',
      description: 'Write a program to perform matrix addition.',
      difficulty: 'Easy',
      hint: 'For matrices A and B of same dimensions, result[i][j] = A[i][j] + B[i][j]. Use nested for loops.',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        int[][] a = {{1, 2}, {3, 4}};
        int[][] b = {{5, 6}, {7, 8}};
        // Start here
        
    }
}`,
    },
    {
      id: 11,
      title: 'Transpose Matrix',
      description: 'Write a program to transpose a matrix.',
      difficulty: 'Medium',
      hint: 'Create a new matrix where result[j][i] = original[i][j]. The rows become columns and vice versa.',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        int[][] matrix = {{1, 2, 3}, {4, 5, 6}};
        // Start here
        
    }
}`,
    },
    {
      id: 12,
      title: 'Linear Search',
      description: 'Write a program to implement linear search.',
      difficulty: 'Easy',
      hint: 'Iterate through the array comparing each element with the target. Return the index when found, or -1 if not found.',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        int[] arr = {5, 3, 8, 1, 9, 2, 7};
        int target = 9;
        // Start here
        
    }
}`,
    },
    {
      id: 13,
      title: 'Binary Search',
      description: 'Write a program to implement binary search.',
      difficulty: 'Medium',
      hint: 'Array must be sorted. Use low, high, mid pointers. If arr[mid] == target, found. If target < arr[mid], search left half; else search right half.',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        int[] arr = {1, 3, 5, 7, 9, 11, 13};
        int target = 7;
        // Start here
        
    }
}`,
    },
    {
      id: 14,
      title: 'Fibonacci Series',
      description: 'Write a method to generate the Fibonacci series.',
      difficulty: 'Easy',
      hint: 'Start with a=0, b=1. In each iteration: print a, compute next = a+b, then a=b, b=next.',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Start here
        
    }
}`,
    },
    {
      id: 15,
      title: 'Method Overloading',
      description: 'Write a program demonstrating method overloading.',
      difficulty: 'Medium',
      hint: 'Create multiple methods with the same name but different parameter types or counts. e.g., add(int, int) and add(double, double) and add(int, int, int).',
      starterCode: `import java.util.*;

class Main {
    // Start here — define overloaded methods
    
    public static void main(String[] args) {
        // Call your overloaded methods here
        
    }
}`,
    },
    {
      id: 16,
      title: 'Inheritance with super',
      description: 'Write a program demonstrating inheritance using super and extends.',
      difficulty: 'Medium',
      hint: 'Create a parent class (e.g., Animal) with a method. Create a child class (e.g., Dog) that extends it and overrides the method, calling super.method() inside.',
      starterCode: `// Demonstrate inheritance
// Start here

class Main {
    public static void main(String[] args) {
        // Create objects and demonstrate inheritance
        
    }
}`,
    },
    {
      id: 17,
      title: 'Abstract Class Shape',
      description: 'Create an abstract class Shape and implement area calculation in subclasses.',
      difficulty: 'Medium',
      hint: 'Declare abstract double area() in Shape. Create Circle and Rectangle subclasses that implement area() with their formulas (πr² and l×w).',
      starterCode: `// Abstract class Shape with area calculation
// Start here

class Main {
    public static void main(String[] args) {
        // Create shapes and print areas
        
    }
}`,
    },
    {
      id: 18,
      title: 'Interface Printable',
      description: 'Create an interface Printable and implement it in two classes.',
      difficulty: 'Medium',
      hint: 'Define interface Printable { void print(); }. Implement it in classes like Book and Magazine, each providing their own print() implementation.',
      starterCode: `// Interface Printable
// Start here

class Main {
    public static void main(String[] args) {
        // Demonstrate interface usage
        
    }
}`,
    },
    {
      id: 19,
      title: 'Singly Linked List',
      description: 'Implement a singly linked list with insertion and traversal.',
      difficulty: 'Hard',
      hint: 'Create a Node class with data and next fields. Create a LinkedList class with head pointer, insertAtEnd() method (traverse to last node), and display() method.',
      starterCode: `// Singly Linked List implementation
// Start here

class Main {
    public static void main(String[] args) {
        // Create linked list and test operations
        
    }
}`,
    },
    {
      id: 20,
      title: 'Iterator with ArrayList',
      description: 'Use Iterator to traverse and print all elements of an ArrayList.',
      difficulty: 'Easy',
      hint: 'Create an ArrayList, add elements. Get an Iterator using list.iterator(). Use while(it.hasNext()) and it.next() to traverse.',
      starterCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        ArrayList<String> list = new ArrayList<>();
        list.add("Alice");
        list.add("Bob");
        list.add("Charlie");
        // Start here — use Iterator
        
    }
}`,
    },
  ],

  c: [
    {
      id: 1, title: 'Check Prime Number', description: 'Write a program to check whether a number is prime.', difficulty: 'Easy',
      hint: 'Loop from 2 to sqrt(n) using math.h. If n % i == 0, not prime. Include <math.h> for sqrt().',
      starterCode: `#include <stdio.h>\n#include <math.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 2, title: 'Factorial Using Loop', description: 'Write a program to calculate factorial using a loop.', difficulty: 'Easy',
      hint: 'Use a long long variable for result. Multiply in a for loop from 1 to n.',
      starterCode: `#include <stdio.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 3, title: 'Reverse Array with Pointers', description: 'Write a program to reverse an array using pointers.', difficulty: 'Medium',
      hint: 'Use two pointers: one at start, one at end. Swap values they point to and move them toward the center.',
      starterCode: `#include <stdio.h>\n\nint main() {\n    int arr[] = {1, 2, 3, 4, 5};\n    int n = sizeof(arr) / sizeof(arr[0]);\n    // Start here — use pointers to reverse\n    \n    return 0;\n}`,
    },
    {
      id: 4, title: 'Max & Min of Array', description: 'Write a program to find the maximum and minimum element of an array.', difficulty: 'Easy',
      hint: 'Initialize max and min to arr[0]. Loop through comparing each element.',
      starterCode: `#include <stdio.h>\n\nint main() {\n    int arr[] = {12, 5, 8, 1, 19, 3};\n    int n = sizeof(arr) / sizeof(arr[0]);\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 5, title: 'Second Largest', description: 'Write a program to find the second-largest element of an array.', difficulty: 'Medium',
      hint: 'Track first and second. If current > first: second=first, first=current. Else if current > second and current != first: second=current.',
      starterCode: `#include <stdio.h>\n\nint main() {\n    int arr[] = {12, 5, 8, 1, 19, 3};\n    int n = sizeof(arr) / sizeof(arr[0]);\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 6, title: 'Reverse String with Pointers', description: 'Write a program to reverse a string using pointers.', difficulty: 'Medium',
      hint: 'Use strlen() to find length. Set two char pointers (start and end), swap and move inward.',
      starterCode: `#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char str[100];\n    scanf("%s", str);\n    // Start here — reverse using pointers\n    \n    return 0;\n}`,
    },
    {
      id: 7, title: 'Swap Using Pointers', description: 'Write a program to swap two numbers using pointers.', difficulty: 'Easy',
      hint: 'Create a swap function that takes int *a, int *b. Use a temp variable: temp = *a; *a = *b; *b = temp;',
      starterCode: `#include <stdio.h>\n\nvoid swap(int *a, int *b) {\n    // Start here\n}\n\nint main() {\n    int x = 10, y = 20;\n    printf("Before: x=%d, y=%d\\n", x, y);\n    swap(&x, &y);\n    printf("After: x=%d, y=%d\\n", x, y);\n    return 0;\n}`,
    },
    {
      id: 8, title: 'Sum with Pointer Arithmetic', description: 'Write a program to calculate the sum of array elements using pointer arithmetic.', difficulty: 'Medium',
      hint: 'Set a pointer to the first element. Use *(ptr + i) to access elements and add them up.',
      starterCode: `#include <stdio.h>\n\nint main() {\n    int arr[] = {10, 20, 30, 40, 50};\n    int n = sizeof(arr) / sizeof(arr[0]);\n    // Start here — use pointer arithmetic\n    \n    return 0;\n}`,
    },
    {
      id: 9, title: 'Count Vowels', description: 'Write a program to count vowels in a string.', difficulty: 'Easy',
      hint: 'Iterate through each character. Check if it matches a, e, i, o, u (both cases). Increment counter.',
      starterCode: `#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char str[100];\n    scanf("%[^\\n]", str);\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 10, title: 'String Palindrome', description: 'Write a program to check whether a string is a palindrome.', difficulty: 'Easy',
      hint: 'Compare str[i] with str[len-1-i] for i from 0 to len/2. If all match, it\'s a palindrome.',
      starterCode: `#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char str[100];\n    scanf("%s", str);\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 11, title: 'Bubble Sort', description: 'Write a program to sort an array using bubble sort.', difficulty: 'Medium',
      hint: 'Two nested loops. Inner loop compares adjacent elements arr[j] and arr[j+1], swaps if out of order.',
      starterCode: `#include <stdio.h>\n\nint main() {\n    int arr[] = {64, 34, 25, 12, 22, 11, 90};\n    int n = sizeof(arr) / sizeof(arr[0]);\n    // Start here — bubble sort\n    \n    return 0;\n}`,
    },
    {
      id: 12, title: 'Linear Search', description: 'Write a program to search for an element using linear search.', difficulty: 'Easy',
      hint: 'Loop through array, compare each element with target. Return index if found.',
      starterCode: `#include <stdio.h>\n\nint main() {\n    int arr[] = {5, 3, 8, 1, 9, 2};\n    int target = 9;\n    int n = sizeof(arr) / sizeof(arr[0]);\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 13, title: 'Binary Search', description: 'Write a program to search for an element using binary search.', difficulty: 'Medium',
      hint: 'Array must be sorted. Use low=0, high=n-1, mid=(low+high)/2. Compare arr[mid] with target and narrow the range.',
      starterCode: `#include <stdio.h>\n\nint main() {\n    int arr[] = {1, 3, 5, 7, 9, 11, 13};\n    int target = 7;\n    int n = sizeof(arr) / sizeof(arr[0]);\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 14, title: 'Recursive Fibonacci', description: 'Write a recursive function to calculate Fibonacci numbers.', difficulty: 'Medium',
      hint: 'Base cases: fib(0)=0, fib(1)=1. Recursive case: fib(n) = fib(n-1) + fib(n-2).',
      starterCode: `#include <stdio.h>\n\n// Start here — define recursive fibonacci function\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    // Print fibonacci series\n    \n    return 0;\n}`,
    },
    {
      id: 15, title: 'Recursive Factorial', description: 'Write a recursive function to calculate factorial.', difficulty: 'Easy',
      hint: 'Base case: factorial(0) = 1. Recursive: factorial(n) = n * factorial(n-1).',
      starterCode: `#include <stdio.h>\n\n// Start here — define recursive factorial function\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    // Call and print factorial\n    \n    return 0;\n}`,
    },
    {
      id: 16, title: 'Student Structure', description: 'Define a structure Student containing name, roll number, and marks, then display its data.', difficulty: 'Easy',
      hint: 'Use struct Student { char name[50]; int roll; float marks; }; Access members with dot operator.',
      starterCode: `#include <stdio.h>\n\n// Start here — define Student struct\n\nint main() {\n    // Create student and display data\n    \n    return 0;\n}`,
    },
    {
      id: 17, title: 'Array of Structures', description: 'Write a program to store and display records using an array of structures.', difficulty: 'Medium',
      hint: 'Declare struct Student students[5]. Use a loop to fill data and another loop to display all records.',
      starterCode: `#include <stdio.h>\n\nstruct Student {\n    char name[50];\n    int roll;\n    float marks;\n};\n\nint main() {\n    int n = 3;\n    struct Student students[3];\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 18, title: 'Dynamic Memory (malloc)', description: 'Write a program to dynamically allocate memory for n integers using malloc().', difficulty: 'Medium',
      hint: 'Use int *arr = (int *)malloc(n * sizeof(int)). Always check if arr != NULL. Free memory with free(arr) at the end.',
      starterCode: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    // Start here — use malloc\n    \n    return 0;\n}`,
    },
    {
      id: 19, title: 'Pointer to Pointer', description: 'Write a program to demonstrate the difference between a pointer and a pointer to pointer.', difficulty: 'Medium',
      hint: 'int x = 10; int *p = &x; int **pp = &p; *p gives x, **pp also gives x. Print addresses and values at each level.',
      starterCode: `#include <stdio.h>\n\nint main() {\n    int x = 42;\n    // Start here — create pointer and pointer-to-pointer\n    \n    return 0;\n}`,
    },
    {
      id: 20, title: 'Singly Linked List', description: 'Write a program to implement a singly linked list with insertion and traversal.', difficulty: 'Hard',
      hint: 'Define struct Node { int data; struct Node *next; }. For insertion at end: traverse to last node, set last->next = newNode. For traversal: follow next pointers.',
      starterCode: `#include <stdio.h>\n#include <stdlib.h>\n\nstruct Node {\n    int data;\n    struct Node *next;\n};\n\n// Start here — implement insert and display functions\n\nint main() {\n    // Create linked list and test\n    \n    return 0;\n}`,
    },
  ],

  cpp: [
    {
      id: 1, title: 'Check Prime Number', description: 'Write a program to check whether a number is prime.', difficulty: 'Easy',
      hint: 'Loop from 2 to sqrt(n). If n % i == 0, not prime. Use <cmath> for sqrt().',
      starterCode: `#include <iostream>\n#include <cmath>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 2, title: 'Factorial Using Loop', description: 'Write a program to calculate factorial using a loop.', difficulty: 'Easy',
      hint: 'Use long long for result. Multiply from 1 to n.',
      starterCode: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 3, title: 'Reverse a String', description: 'Write a program to reverse a string.', difficulty: 'Easy',
      hint: 'Use two indices (left=0, right=s.length()-1). Swap characters and move inward. Or build a new reversed string.',
      starterCode: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string s;\n    getline(cin, s);\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 4, title: 'Largest & Second Largest', description: 'Write a program to find the largest and second-largest element in a vector.', difficulty: 'Medium',
      hint: 'Track first and second. Iterate the vector: if v[i] > first → second=first, first=v[i]; else if v[i] > second → second=v[i].',
      starterCode: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<int> v = {12, 5, 8, 1, 19, 3, 15};\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 5, title: 'Remove Duplicates', description: 'Write a program to remove duplicate elements from a vector.', difficulty: 'Medium',
      hint: 'Use an unordered_set to track seen elements. Push to a new vector only if not seen before.',
      starterCode: `#include <iostream>\n#include <vector>\n#include <unordered_set>\nusing namespace std;\n\nint main() {\n    vector<int> v = {1, 2, 3, 2, 4, 5, 1};\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 6, title: 'Frequency with unordered_map', description: 'Write a program to count the frequency of elements using unordered_map.', difficulty: 'Easy',
      hint: 'unordered_map<int, int> freq; for each element: freq[element]++. Then iterate the map to print.',
      starterCode: `#include <iostream>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    int arr[] = {1, 2, 3, 2, 4, 5, 1, 3, 2};\n    int n = sizeof(arr) / sizeof(arr[0]);\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 7, title: 'Palindrome String', description: 'Write a program to check whether a string is a palindrome.', difficulty: 'Easy',
      hint: 'Compare s[i] with s[s.length()-1-i]. Or reverse the string and compare with original.',
      starterCode: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string s;\n    cin >> s;\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 8, title: 'Sort Without sort()', description: 'Write a program to sort a vector without using sort().', difficulty: 'Medium',
      hint: 'Implement selection sort or bubble sort. For bubble sort: nested loops, compare v[j] > v[j+1], swap.',
      starterCode: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<int> v = {64, 34, 25, 12, 22, 11};\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 9, title: 'Linear Search', description: 'Write a program to implement linear search.', difficulty: 'Easy',
      hint: 'Loop through vector, compare each element with target. Return index if found.',
      starterCode: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<int> v = {5, 3, 8, 1, 9, 2};\n    int target = 9;\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 10, title: 'Binary Search', description: 'Write a program to implement binary search.', difficulty: 'Medium',
      hint: 'Vector must be sorted. low=0, high=v.size()-1, mid=(low+high)/2. Compare and narrow range.',
      starterCode: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<int> v = {1, 3, 5, 7, 9, 11, 13};\n    int target = 7;\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 11, title: 'Matrix Addition', description: 'Write a program to add two matrices.', difficulty: 'Easy',
      hint: 'result[i][j] = A[i][j] + B[i][j]. Use nested loops.',
      starterCode: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a[2][2] = {{1, 2}, {3, 4}};\n    int b[2][2] = {{5, 6}, {7, 8}};\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 12, title: 'Transpose Matrix', description: 'Write a program to transpose a matrix.', difficulty: 'Medium',
      hint: 'result[j][i] = original[i][j]. Rows become columns.',
      starterCode: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int matrix[2][3] = {{1, 2, 3}, {4, 5, 6}};\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 13, title: 'Student Class', description: 'Create a class Student with private data members and public getter/setter methods.', difficulty: 'Medium',
      hint: 'Use private: string name; int age; public: void setName(string n), string getName(). Encapsulation principle.',
      starterCode: `#include <iostream>\n#include <string>\nusing namespace std;\n\n// Start here — define Student class\n\nint main() {\n    // Create Student object and use getters/setters\n    \n    return 0;\n}`,
    },
    {
      id: 14, title: 'Constructor Overloading', description: 'Demonstrate constructor overloading using a C++ class.', difficulty: 'Medium',
      hint: 'Define multiple constructors with different parameters: default constructor, parameterized with one arg, and with all args.',
      starterCode: `#include <iostream>\nusing namespace std;\n\n// Start here — class with overloaded constructors\n\nint main() {\n    // Create objects using different constructors\n    \n    return 0;\n}`,
    },
    {
      id: 15, title: 'Inheritance', description: 'Demonstrate inheritance using a base class and derived class.', difficulty: 'Medium',
      hint: 'class Animal { public: void speak(); }; class Dog : public Animal { public: void speak(); }; The derived class inherits from the base.',
      starterCode: `#include <iostream>\nusing namespace std;\n\n// Start here — base and derived class\n\nint main() {\n    // Demonstrate inheritance\n    \n    return 0;\n}`,
    },
    {
      id: 16, title: 'Function Overloading', description: 'Demonstrate function overloading with at least three functions.', difficulty: 'Easy',
      hint: 'Create functions with same name but different parameter types/counts: add(int, int), add(double, double), add(int, int, int).',
      starterCode: `#include <iostream>\nusing namespace std;\n\n// Start here — overloaded functions\n\nint main() {\n    // Call overloaded functions\n    \n    return 0;\n}`,
    },
    {
      id: 17, title: 'Virtual Functions', description: 'Demonstrate runtime polymorphism using virtual functions.', difficulty: 'Hard',
      hint: 'Use virtual keyword in base class method. Create a base pointer pointing to derived object. The derived version of the method is called at runtime.',
      starterCode: `#include <iostream>\nusing namespace std;\n\n// Start here — base with virtual function, derived override\n\nint main() {\n    // Use base class pointer for polymorphism\n    \n    return 0;\n}`,
    },
    {
      id: 18, title: 'Stack Using Class', description: 'Implement a stack using a class.', difficulty: 'Hard',
      hint: 'Use an array or vector internally. Implement push(), pop(), peek(), isEmpty(). Track top index.',
      starterCode: `#include <iostream>\nusing namespace std;\n\n// Start here — Stack class\n\nint main() {\n    // Test stack operations\n    \n    return 0;\n}`,
    },
    {
      id: 19, title: 'Queue Using STL', description: 'Implement a queue using STL queue.', difficulty: 'Easy',
      hint: '#include <queue>. Use queue<int> q; q.push(), q.front(), q.pop(), q.empty().',
      starterCode: `#include <iostream>\n#include <queue>\nusing namespace std;\n\nint main() {\n    queue<int> q;\n    // Start here\n    \n    return 0;\n}`,
    },
    {
      id: 20, title: 'Singly Linked List', description: 'Implement a singly linked list using a Node class.', difficulty: 'Hard',
      hint: 'struct Node { int data; Node* next; }. Create insert and display functions. Traverse using while(current != nullptr).',
      starterCode: `#include <iostream>\nusing namespace std;\n\nstruct Node {\n    int data;\n    Node* next;\n};\n\n// Start here — implement linked list functions\n\nint main() {\n    // Test linked list\n    \n    return 0;\n}`,
    },
  ],

  sql: [
    {
      id: 1, title: 'Create Database & Table', description: 'Create a database named College and a table Students with id, name, age, and marks.', difficulty: 'Easy',
      hint: 'CREATE DATABASE College; USE College; CREATE TABLE Students (id INT PRIMARY KEY, name VARCHAR(50), age INT, marks FLOAT);',
      starterCode: `-- Create database and table\n-- Start here\n`,
    },
    {
      id: 2, title: 'Insert Records', description: 'Insert five student records into the Students table.', difficulty: 'Easy',
      hint: 'INSERT INTO Students (id, name, age, marks) VALUES (1, "Alice", 20, 85.5); Repeat for 5 records.',
      starterCode: `-- First create the table\nCREATE TABLE IF NOT EXISTS Students (\n    id INT PRIMARY KEY,\n    name VARCHAR(50),\n    age INT,\n    marks FLOAT\n);\n\n-- Start here — Insert 5 records\n`,
    },
    {
      id: 3, title: 'Display All Records', description: 'Display all records from the Students table.', difficulty: 'Easy',
      hint: 'SELECT * FROM Students; The * selects all columns.',
      starterCode: `-- Display all records\n-- Start here\n`,
    },
    {
      id: 4, title: 'Filter by Marks', description: 'Display students whose marks are greater than 80.', difficulty: 'Easy',
      hint: 'SELECT * FROM Students WHERE marks > 80;',
      starterCode: `-- Students with marks > 80\n-- Start here\n`,
    },
    {
      id: 5, title: 'Aggregate Functions', description: 'Find the maximum, minimum, and average marks.', difficulty: 'Easy',
      hint: 'SELECT MAX(marks), MIN(marks), AVG(marks) FROM Students;',
      starterCode: `-- Max, Min, Average marks\n-- Start here\n`,
    },
    {
      id: 6, title: 'Second Highest Marks', description: 'Find the second-highest marks using a subquery.', difficulty: 'Medium',
      hint: 'SELECT MAX(marks) FROM Students WHERE marks < (SELECT MAX(marks) FROM Students);',
      starterCode: `-- Second highest marks\n-- Start here\n`,
    },
    {
      id: 7, title: 'Count Students', description: 'Count the total number of students.', difficulty: 'Easy',
      hint: 'SELECT COUNT(*) AS total_students FROM Students;',
      starterCode: `-- Count total students\n-- Start here\n`,
    },
    {
      id: 8, title: 'Sort by Marks', description: 'Sort students by marks in descending order.', difficulty: 'Easy',
      hint: 'SELECT * FROM Students ORDER BY marks DESC;',
      starterCode: `-- Sort by marks descending\n-- Start here\n`,
    },
    {
      id: 9, title: 'Update Record', description: 'Update the marks of a specific student.', difficulty: 'Easy',
      hint: 'UPDATE Students SET marks = 95 WHERE id = 1; Always include a WHERE clause!',
      starterCode: `-- Update marks of a specific student\n-- Start here\n`,
    },
    {
      id: 10, title: 'Delete Records', description: 'Delete students whose marks are below 35.', difficulty: 'Easy',
      hint: 'DELETE FROM Students WHERE marks < 35;',
      starterCode: `-- Delete students with marks < 35\n-- Start here\n`,
    },
    {
      id: 11, title: 'LIKE Pattern Match', description: "Find students whose names start with the letter 'A'.", difficulty: 'Easy',
      hint: "SELECT * FROM Students WHERE name LIKE 'A%'; The % is a wildcard for any characters.",
      starterCode: `-- Names starting with 'A'\n-- Start here\n`,
    },
    {
      id: 12, title: 'GROUP BY', description: 'Use GROUP BY to count students by age.', difficulty: 'Medium',
      hint: 'SELECT age, COUNT(*) AS count FROM Students GROUP BY age;',
      starterCode: `-- Group by age\n-- Start here\n`,
    },
    {
      id: 13, title: 'HAVING Clause', description: 'Use HAVING to display groups having more than two students.', difficulty: 'Medium',
      hint: 'SELECT age, COUNT(*) AS count FROM Students GROUP BY age HAVING COUNT(*) > 2; HAVING filters groups, WHERE filters rows.',
      starterCode: `-- Having clause with group filter\n-- Start here\n`,
    },
    {
      id: 14, title: 'INNER JOIN', description: 'Create two related tables and perform an INNER JOIN.', difficulty: 'Medium',
      hint: 'SELECT s.name, c.course_name FROM Students s INNER JOIN Courses c ON s.id = c.student_id;',
      starterCode: `-- Create two tables and perform INNER JOIN\n-- Start here\n`,
    },
    {
      id: 15, title: 'LEFT JOIN', description: 'Perform a LEFT JOIN between two related tables.', difficulty: 'Medium',
      hint: 'LEFT JOIN returns all rows from the left table, and matched rows from the right table. Unmatched rows get NULL.',
      starterCode: `-- LEFT JOIN example\n-- Start here\n`,
    },
    {
      id: 16, title: 'Subquery - Above Average', description: 'Write a query using a subquery to find students scoring above the average.', difficulty: 'Medium',
      hint: 'SELECT * FROM Students WHERE marks > (SELECT AVG(marks) FROM Students);',
      starterCode: `-- Students above average marks\n-- Start here\n`,
    },
    {
      id: 17, title: 'Create View', description: 'Create a view showing student names and marks.', difficulty: 'Medium',
      hint: 'CREATE VIEW StudentMarks AS SELECT name, marks FROM Students; Then SELECT * FROM StudentMarks;',
      starterCode: `-- Create and use a view\n-- Start here\n`,
    },
    {
      id: 18, title: 'Create Index', description: 'Create an index on a frequently searched column and explain its purpose.', difficulty: 'Medium',
      hint: 'CREATE INDEX idx_marks ON Students(marks); Indexes speed up searches but slow down inserts/updates.',
      starterCode: `-- Create an index\n-- Start here\n`,
    },
    {
      id: 19, title: 'Transaction', description: 'Write a transaction using START TRANSACTION, COMMIT, and ROLLBACK.', difficulty: 'Hard',
      hint: 'START TRANSACTION; UPDATE...; IF error THEN ROLLBACK; ELSE COMMIT; Transactions ensure data integrity.',
      starterCode: `-- Transaction example\n-- Start here\n`,
    },
    {
      id: 20, title: 'Stored Procedure', description: "Create a stored procedure that accepts a student ID and returns that student's details.", difficulty: 'Hard',
      hint: 'DELIMITER // CREATE PROCEDURE GetStudent(IN sid INT) BEGIN SELECT * FROM Students WHERE id = sid; END // DELIMITER ;',
      starterCode: `-- Stored procedure\n-- Start here\n`,
    },
  ],

  javascript: [
    {
      id: 1, title: 'Check Prime Number', description: 'Write a program to check whether a number is prime.', difficulty: 'Easy',
      hint: 'Loop from 2 to Math.sqrt(n). If n % i === 0, not prime. Handle edge cases for n <= 1.',
      starterCode: `// Check whether a number is prime\nconst n = 17;\n\n// Start here\n`,
    },
    {
      id: 2, title: 'Factorial Function', description: 'Write a function to calculate factorial.', difficulty: 'Easy',
      hint: 'function factorial(n) { if (n <= 1) return 1; return n * factorial(n-1); } Or use a loop.',
      starterCode: `// Calculate factorial\n// Start here\n`,
    },
    {
      id: 3, title: 'Reverse a String', description: 'Write a function to reverse a string.', difficulty: 'Easy',
      hint: 'Split into array with split(""), reverse with reverse(), join back with join(""). Or use a for loop from the end.',
      starterCode: `// Reverse a string\nconst str = "Hello World";\n\n// Start here\n`,
    },
    {
      id: 4, title: 'Palindrome Check', description: 'Write a program to check whether a string is a palindrome.', difficulty: 'Easy',
      hint: 'Convert to lowercase, compare with its reverse. Or use two pointers from both ends.',
      starterCode: `// Palindrome check\nconst str = "racecar";\n\n// Start here\n`,
    },
    {
      id: 5, title: 'Largest & Smallest', description: 'Find the largest and smallest number in an array.', difficulty: 'Easy',
      hint: 'Use Math.max(...arr) and Math.min(...arr). Or initialize with arr[0] and loop.',
      starterCode: `// Find largest and smallest\nconst arr = [12, 5, 8, 1, 19, 3];\n\n// Start here\n`,
    },
    {
      id: 6, title: 'Second Largest', description: 'Find the second-largest number in an array.', difficulty: 'Medium',
      hint: 'Sort descending and take index 1, or track first and second while iterating.',
      starterCode: `// Second largest number\nconst arr = [12, 5, 8, 1, 19, 3];\n\n// Start here\n`,
    },
    {
      id: 7, title: 'Remove Duplicates', description: 'Remove duplicate values from an array.', difficulty: 'Easy',
      hint: 'Use [...new Set(arr)] for a one-liner. Or use filter with indexOf.',
      starterCode: `// Remove duplicates\nconst arr = [1, 2, 3, 2, 4, 5, 1, 6, 3];\n\n// Start here\n`,
    },
    {
      id: 8, title: 'Element Frequency', description: 'Count the frequency of elements in an array using an object or Map.', difficulty: 'Easy',
      hint: 'const freq = {}; arr.forEach(el => freq[el] = (freq[el] || 0) + 1);',
      starterCode: `// Count frequency of elements\nconst arr = [1, 2, 3, 2, 4, 5, 1, 3, 2];\n\n// Start here\n`,
    },
    {
      id: 9, title: 'Sort Without sort()', description: 'Sort an array without using sort().', difficulty: 'Medium',
      hint: 'Implement bubble sort: nested loops, compare arr[j] > arr[j+1], swap using destructuring [a,b] = [b,a].',
      starterCode: `// Sort without sort()\nconst arr = [64, 34, 25, 12, 22, 11, 90];\n\n// Start here\n`,
    },
    {
      id: 10, title: 'Common Elements', description: 'Find common elements between two arrays.', difficulty: 'Easy',
      hint: 'Use filter: arr1.filter(x => arr2.includes(x)). Or use Set for better performance.',
      starterCode: `// Common elements\nconst arr1 = [1, 2, 3, 4, 5];\nconst arr2 = [4, 5, 6, 7, 8];\n\n// Start here\n`,
    },
    {
      id: 11, title: 'Fibonacci Series', description: 'Write a function to generate the Fibonacci series.', difficulty: 'Medium',
      hint: 'Start a=0, b=1. Loop n times: push a, compute next=a+b, shift a=b, b=next.',
      starterCode: `// Fibonacci series\nconst n = 10;\n\n// Start here\n`,
    },
    {
      id: 12, title: 'Count Vowels', description: 'Write a program to count vowels in a string.', difficulty: 'Easy',
      hint: 'Match against "aeiouAEIOU" or use regex: str.match(/[aeiou]/gi).length.',
      starterCode: `// Count vowels\nconst str = "Hello World";\n\n// Start here\n`,
    },
    {
      id: 13, title: 'map/filter/reduce', description: 'Use map(), filter(), and reduce() on an array of numbers.', difficulty: 'Medium',
      hint: 'map: transform each element. filter: keep elements matching condition. reduce: accumulate to single value. Chain them!',
      starterCode: `// Use map, filter, and reduce\nconst numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];\n\n// Start here\n// Example: find sum of squares of even numbers\n`,
    },
    {
      id: 14, title: 'Student Object', description: 'Create an object representing a student and write a function to display its details.', difficulty: 'Easy',
      hint: 'const student = { name: "Alice", age: 20, marks: 85 }; Use Object.entries() or for...in to display.',
      starterCode: `// Student object\n// Start here\n`,
    },
    {
      id: 15, title: 'Destructuring', description: 'Write a program using destructuring assignment with an object and an array.', difficulty: 'Easy',
      hint: 'Object: const { name, age } = student; Array: const [first, second, ...rest] = arr; Useful for clean code.',
      starterCode: `// Destructuring assignment\nconst student = { name: "Alice", age: 20, grade: "A" };\nconst scores = [95, 87, 92, 78, 88];\n\n// Start here\n`,
    },
    {
      id: 16, title: 'Async/Await Fetch', description: 'Write an asynchronous function using async/await that fetches data from an API.', difficulty: 'Medium',
      hint: 'async function fetchData() { const response = await fetch(url); const data = await response.json(); return data; }',
      starterCode: `// Async/await fetch\nasync function fetchUsers() {\n    // Start here — fetch from https://jsonplaceholder.typicode.com/users\n}\n\nfetchUsers();\n`,
    },
    {
      id: 17, title: 'Simple Promise', description: 'Create a simple Promise that resolves after a specified delay.', difficulty: 'Medium',
      hint: 'return new Promise((resolve) => { setTimeout(() => resolve("Done!"), delay); });',
      starterCode: `// Promise with delay\nfunction wait(ms) {\n    // Start here\n}\n\nwait(2000).then(msg => console.log(msg));\n`,
    },
    {
      id: 18, title: 'Event Listener', description: 'Add an event listener to a button and change a webpage element when it is clicked.', difficulty: 'Medium',
      hint: 'document.getElementById("btn").addEventListener("click", () => { element.textContent = "Clicked!"; });',
      starterCode: `// Event listener (run in browser)\n// HTML: <button id="myBtn">Click Me</button>\n// HTML: <p id="output">Original text</p>\n\n// Start here\n`,
    },
    {
      id: 19, title: 'Form Validation', description: 'Create a form and use JavaScript to validate that required fields are not empty.', difficulty: 'Medium',
      hint: 'Get input value with .value.trim(). If empty, show error message and return false to prevent submission.',
      starterCode: `// Form validation (run in browser)\n// Assume HTML form with id="myForm", inputs with ids: "name", "email"\n\n// Start here\n`,
    },
    {
      id: 20, title: 'To-Do List', description: 'Implement a simple to-do list using DOM manipulation.', difficulty: 'Hard',
      hint: 'Create li elements with document.createElement("li"). Append to ul with appendChild(). Add delete button to each item.',
      starterCode: `// To-do list with DOM manipulation (run in browser)\n// HTML: <input id="taskInput"> <button id="addBtn">Add</button> <ul id="taskList"></ul>\n\n// Start here\n`,
    },
  ],
};

export function getQuestionsForLanguage(langId) {
  return PRACTICE_QUESTIONS[langId] || [];
}

export function getLanguageInfo(langId) {
  return PRACTICE_LANGUAGES.find((l) => l.id === langId);
}
