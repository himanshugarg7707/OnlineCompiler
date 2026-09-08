// ─── Code Templates Library ──────────────────────────────────────────────
// Curated DSA templates organized by category, available in Java, Python, and C++.

export const TEMPLATE_CATEGORIES = [
  { id: 'arrays', name: 'Arrays', icon: '📊' },
  { id: 'sorting', name: 'Sorting', icon: '🔀' },
  { id: 'searching', name: 'Searching', icon: '🔍' },
  { id: 'linkedlist', name: 'Linked List', icon: '🔗' },
  { id: 'stackqueue', name: 'Stack & Queue', icon: '📚' },
  { id: 'trees', name: 'Trees', icon: '🌳' },
  { id: 'graphs', name: 'Graphs', icon: '🗺️' },
  { id: 'dp', name: 'Dynamic Programming', icon: '🧠' },
  { id: 'strings', name: 'Strings', icon: '🔤' },
  { id: 'math', name: 'Math', icon: '🧮' },
];

export const CODE_TEMPLATES = [
  // ─── Arrays ─────────────────────────────────────────────────────────
  {
    id: 'two-pointer',
    title: 'Two Pointer Technique',
    category: 'arrays',
    difficulty: 'Easy',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    description: 'Use two pointers from both ends to find pairs summing to a target.',
    languages: {
      java: `import java.util.Arrays;

public class TwoPointer {
    public static int[] twoSum(int[] arr, int target) {
        Arrays.sort(arr);
        int left = 0, right = arr.length - 1;
        while (left < right) {
            int sum = arr[left] + arr[right];
            if (sum == target) return new int[]{arr[left], arr[right]};
            else if (sum < target) left++;
            else right--;
        }
        return new int[]{};
    }

    public static void main(String[] args) {
        int[] arr = {2, 7, 11, 15};
        int[] result = twoSum(arr, 9);
        System.out.println("Pair: " + result[0] + ", " + result[1]);
    }
}`,
      python: `def two_sum(arr, target):
    arr.sort()
    left, right = 0, len(arr) - 1
    while left < right:
        s = arr[left] + arr[right]
        if s == target:
            return (arr[left], arr[right])
        elif s < target:
            left += 1
        else:
            right -= 1
    return None

arr = [2, 7, 11, 15]
print("Pair:", two_sum(arr, 9))`,
      cpp: `#include <iostream>
#include <algorithm>
using namespace std;

pair<int,int> twoSum(int arr[], int n, int target) {
    sort(arr, arr + n);
    int left = 0, right = n - 1;
    while (left < right) {
        int sum = arr[left] + arr[right];
        if (sum == target) return {arr[left], arr[right]};
        else if (sum < target) left++;
        else right--;
    }
    return {-1, -1};
}

int main() {
    int arr[] = {2, 7, 11, 15};
    auto [a, b] = twoSum(arr, 4, 9);
    cout << "Pair: " << a << ", " << b << endl;
    return 0;
}`,
    },
  },
  {
    id: 'sliding-window',
    title: 'Sliding Window',
    category: 'arrays',
    difficulty: 'Medium',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    description: 'Find maximum sum subarray of fixed size k using a sliding window.',
    languages: {
      java: `public class SlidingWindow {
    public static int maxSumSubarray(int[] arr, int k) {
        int maxSum = 0, windowSum = 0;
        for (int i = 0; i < k; i++) windowSum += arr[i];
        maxSum = windowSum;
        for (int i = k; i < arr.length; i++) {
            windowSum += arr[i] - arr[i - k];
            maxSum = Math.max(maxSum, windowSum);
        }
        return maxSum;
    }

    public static void main(String[] args) {
        int[] arr = {1, 4, 2, 10, 23, 3, 1, 0, 20};
        System.out.println("Max Sum (k=4): " + maxSumSubarray(arr, 4));
    }
}`,
      python: `def max_sum_subarray(arr, k):
    window_sum = sum(arr[:k])
    max_sum = window_sum
    for i in range(k, len(arr)):
        window_sum += arr[i] - arr[i - k]
        max_sum = max(max_sum, window_sum)
    return max_sum

arr = [1, 4, 2, 10, 23, 3, 1, 0, 20]
print("Max Sum (k=4):", max_sum_subarray(arr, 4))`,
      cpp: `#include <iostream>
#include <algorithm>
using namespace std;

int maxSumSubarray(int arr[], int n, int k) {
    int windowSum = 0;
    for (int i = 0; i < k; i++) windowSum += arr[i];
    int maxSum = windowSum;
    for (int i = k; i < n; i++) {
        windowSum += arr[i] - arr[i - k];
        maxSum = max(maxSum, windowSum);
    }
    return maxSum;
}

int main() {
    int arr[] = {1, 4, 2, 10, 23, 3, 1, 0, 20};
    cout << "Max Sum (k=4): " << maxSumSubarray(arr, 9, 4) << endl;
    return 0;
}`,
    },
  },
  {
    id: 'kadane',
    title: "Kadane's Algorithm",
    category: 'arrays',
    difficulty: 'Medium',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    description: 'Find the maximum sum contiguous subarray.',
    languages: {
      java: `public class Kadane {
    public static int maxSubarraySum(int[] arr) {
        int maxSoFar = arr[0], maxEndingHere = arr[0];
        for (int i = 1; i < arr.length; i++) {
            maxEndingHere = Math.max(arr[i], maxEndingHere + arr[i]);
            maxSoFar = Math.max(maxSoFar, maxEndingHere);
        }
        return maxSoFar;
    }

    public static void main(String[] args) {
        int[] arr = {-2, -3, 4, -1, -2, 1, 5, -3};
        System.out.println("Max Subarray Sum: " + maxSubarraySum(arr));
    }
}`,
      python: `def max_subarray_sum(arr):
    max_so_far = max_ending_here = arr[0]
    for x in arr[1:]:
        max_ending_here = max(x, max_ending_here + x)
        max_so_far = max(max_so_far, max_ending_here)
    return max_so_far

arr = [-2, -3, 4, -1, -2, 1, 5, -3]
print("Max Subarray Sum:", max_subarray_sum(arr))`,
      cpp: `#include <iostream>
#include <algorithm>
using namespace std;

int maxSubarraySum(int arr[], int n) {
    int maxSoFar = arr[0], maxEndingHere = arr[0];
    for (int i = 1; i < n; i++) {
        maxEndingHere = max(arr[i], maxEndingHere + arr[i]);
        maxSoFar = max(maxSoFar, maxEndingHere);
    }
    return maxSoFar;
}

int main() {
    int arr[] = {-2, -3, 4, -1, -2, 1, 5, -3};
    cout << "Max Subarray Sum: " << maxSubarraySum(arr, 8) << endl;
    return 0;
}`,
    },
  },

  // ─── Sorting ────────────────────────────────────────────────────────
  {
    id: 'bubble-sort',
    title: 'Bubble Sort',
    category: 'sorting',
    difficulty: 'Easy',
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
    description: 'Repeatedly swap adjacent elements if they are in wrong order.',
    languages: {
      java: `import java.util.Arrays;

public class BubbleSort {
    public static void bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                    swapped = true;
                }
            }
            if (!swapped) break; // Optimization: stop if already sorted
        }
    }

    public static void main(String[] args) {
        int[] arr = {64, 34, 25, 12, 22, 11, 90};
        bubbleSort(arr);
        System.out.println("Sorted: " + Arrays.toString(arr));
    }
}`,
      python: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        swapped = False
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break

arr = [64, 34, 25, 12, 22, 11, 90]
bubble_sort(arr)
print("Sorted:", arr)`,
      cpp: `#include <iostream>
using namespace std;

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        bool swapped = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;
    }
}

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(arr) / sizeof(arr[0]);
    bubbleSort(arr, n);
    cout << "Sorted: ";
    for (int i = 0; i < n; i++) cout << arr[i] << " ";
    return 0;
}`,
    },
  },
  {
    id: 'merge-sort',
    title: 'Merge Sort',
    category: 'sorting',
    difficulty: 'Medium',
    timeComplexity: 'O(n log n)',
    spaceComplexity: 'O(n)',
    description: 'Divide-and-conquer: split array, sort halves, merge them back.',
    languages: {
      java: `import java.util.Arrays;

public class MergeSort {
    public static void mergeSort(int[] arr, int left, int right) {
        if (left < right) {
            int mid = left + (right - left) / 2;
            mergeSort(arr, left, mid);
            mergeSort(arr, mid + 1, right);
            merge(arr, left, mid, right);
        }
    }

    private static void merge(int[] arr, int left, int mid, int right) {
        int n1 = mid - left + 1, n2 = right - mid;
        int[] L = new int[n1], R = new int[n2];
        System.arraycopy(arr, left, L, 0, n1);
        System.arraycopy(arr, mid + 1, R, 0, n2);
        int i = 0, j = 0, k = left;
        while (i < n1 && j < n2)
            arr[k++] = (L[i] <= R[j]) ? L[i++] : R[j++];
        while (i < n1) arr[k++] = L[i++];
        while (j < n2) arr[k++] = R[j++];
    }

    public static void main(String[] args) {
        int[] arr = {38, 27, 43, 3, 9, 82, 10};
        mergeSort(arr, 0, arr.length - 1);
        System.out.println("Sorted: " + Arrays.toString(arr));
    }
}`,
      python: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result

arr = [38, 27, 43, 3, 9, 82, 10]
print("Sorted:", merge_sort(arr))`,
      cpp: `#include <iostream>
using namespace std;

void merge(int arr[], int left, int mid, int right) {
    int n1 = mid - left + 1, n2 = right - mid;
    int L[n1], R[n2];
    for (int i = 0; i < n1; i++) L[i] = arr[left + i];
    for (int j = 0; j < n2; j++) R[j] = arr[mid + 1 + j];
    int i = 0, j = 0, k = left;
    while (i < n1 && j < n2) arr[k++] = (L[i] <= R[j]) ? L[i++] : R[j++];
    while (i < n1) arr[k++] = L[i++];
    while (j < n2) arr[k++] = R[j++];
}

void mergeSort(int arr[], int left, int right) {
    if (left < right) {
        int mid = left + (right - left) / 2;
        mergeSort(arr, left, mid);
        mergeSort(arr, mid + 1, right);
        merge(arr, left, mid, right);
    }
}

int main() {
    int arr[] = {38, 27, 43, 3, 9, 82, 10};
    int n = sizeof(arr) / sizeof(arr[0]);
    mergeSort(arr, 0, n - 1);
    cout << "Sorted: ";
    for (int i = 0; i < n; i++) cout << arr[i] << " ";
    return 0;
}`,
    },
  },
  {
    id: 'quick-sort',
    title: 'Quick Sort',
    category: 'sorting',
    difficulty: 'Medium',
    timeComplexity: 'O(n log n)',
    spaceComplexity: 'O(log n)',
    description: 'Pick a pivot, partition around it, recursively sort partitions.',
    languages: {
      java: `import java.util.Arrays;

public class QuickSort {
    public static void quickSort(int[] arr, int low, int high) {
        if (low < high) {
            int pi = partition(arr, low, high);
            quickSort(arr, low, pi - 1);
            quickSort(arr, pi + 1, high);
        }
    }

    private static int partition(int[] arr, int low, int high) {
        int pivot = arr[high], i = low - 1;
        for (int j = low; j < high; j++) {
            if (arr[j] < pivot) {
                i++;
                int temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
            }
        }
        int temp = arr[i + 1]; arr[i + 1] = arr[high]; arr[high] = temp;
        return i + 1;
    }

    public static void main(String[] args) {
        int[] arr = {10, 7, 8, 9, 1, 5};
        quickSort(arr, 0, arr.length - 1);
        System.out.println("Sorted: " + Arrays.toString(arr));
    }
}`,
      python: `def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[-1]
    left = [x for x in arr[:-1] if x <= pivot]
    right = [x for x in arr[:-1] if x > pivot]
    return quick_sort(left) + [pivot] + quick_sort(right)

arr = [10, 7, 8, 9, 1, 5]
print("Sorted:", quick_sort(arr))`,
      cpp: `#include <iostream>
using namespace std;

int partition(int arr[], int low, int high) {
    int pivot = arr[high], i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) swap(arr[++i], arr[j]);
    }
    swap(arr[i + 1], arr[high]);
    return i + 1;
}

void quickSort(int arr[], int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

int main() {
    int arr[] = {10, 7, 8, 9, 1, 5};
    int n = sizeof(arr) / sizeof(arr[0]);
    quickSort(arr, 0, n - 1);
    cout << "Sorted: ";
    for (int i = 0; i < n; i++) cout << arr[i] << " ";
    return 0;
}`,
    },
  },

  // ─── Searching ──────────────────────────────────────────────────────
  {
    id: 'binary-search',
    title: 'Binary Search',
    category: 'searching',
    difficulty: 'Easy',
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
    description: 'Search a sorted array by halving the search space each step.',
    languages: {
      java: `public class BinarySearch {
    public static int binarySearch(int[] arr, int target) {
        int low = 0, high = arr.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] arr = {2, 3, 4, 10, 40};
        int idx = binarySearch(arr, 10);
        System.out.println("Found at index: " + idx);
    }
}`,
      python: `def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

arr = [2, 3, 4, 10, 40]
print("Found at index:", binary_search(arr, 10))`,
      cpp: `#include <iostream>
using namespace std;

int binarySearch(int arr[], int n, int target) {
    int low = 0, high = n - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    int arr[] = {2, 3, 4, 10, 40};
    cout << "Found at index: " << binarySearch(arr, 5, 10) << endl;
    return 0;
}`,
    },
  },

  // ─── Linked List ────────────────────────────────────────────────────
  {
    id: 'reverse-linked-list',
    title: 'Reverse Linked List',
    category: 'linkedlist',
    difficulty: 'Easy',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    description: 'Reverse a singly linked list iteratively.',
    languages: {
      java: `public class ReverseLinkedList {
    static class Node {
        int data;
        Node next;
        Node(int d) { data = d; next = null; }
    }

    public static Node reverse(Node head) {
        Node prev = null, curr = head;
        while (curr != null) {
            Node nextTemp = curr.next;
            curr.next = prev;
            prev = curr;
            curr = nextTemp;
        }
        return prev;
    }

    public static void printList(Node head) {
        while (head != null) {
            System.out.print(head.data + " -> ");
            head = head.next;
        }
        System.out.println("null");
    }

    public static void main(String[] args) {
        Node head = new Node(1);
        head.next = new Node(2);
        head.next.next = new Node(3);
        head.next.next.next = new Node(4);
        System.out.print("Original: "); printList(head);
        head = reverse(head);
        System.out.print("Reversed: "); printList(head);
    }
}`,
      python: `class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

def reverse(head):
    prev, curr = None, head
    while curr:
        next_temp = curr.next
        curr.next = prev
        prev = curr
        curr = next_temp
    return prev

def print_list(head):
    while head:
        print(head.data, end=" -> ")
        head = head.next
    print("None")

head = Node(1)
head.next = Node(2)
head.next.next = Node(3)
head.next.next.next = Node(4)
print("Original: ", end=""); print_list(head)
head = reverse(head)
print("Reversed: ", end=""); print_list(head)`,
      cpp: `#include <iostream>
using namespace std;

struct Node {
    int data;
    Node* next;
    Node(int d) : data(d), next(nullptr) {}
};

Node* reverse(Node* head) {
    Node* prev = nullptr;
    Node* curr = head;
    while (curr) {
        Node* nextTemp = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nextTemp;
    }
    return prev;
}

void printList(Node* head) {
    while (head) {
        cout << head->data << " -> ";
        head = head->next;
    }
    cout << "null" << endl;
}

int main() {
    Node* head = new Node(1);
    head->next = new Node(2);
    head->next->next = new Node(3);
    head->next->next->next = new Node(4);
    cout << "Original: "; printList(head);
    head = reverse(head);
    cout << "Reversed: "; printList(head);
    return 0;
}`,
    },
  },
  {
    id: 'detect-cycle',
    title: 'Detect Cycle (Floyd)',
    category: 'linkedlist',
    difficulty: 'Medium',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    description: "Use Floyd's tortoise-and-hare algorithm to detect a cycle.",
    languages: {
      java: `public class DetectCycle {
    static class Node {
        int data;
        Node next;
        Node(int d) { data = d; next = null; }
    }

    public static boolean hasCycle(Node head) {
        Node slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }

    public static void main(String[] args) {
        Node head = new Node(1);
        head.next = new Node(2);
        head.next.next = new Node(3);
        head.next.next.next = head.next; // Creates cycle
        System.out.println("Has cycle: " + hasCycle(head));
    }
}`,
      python: `class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False

head = Node(1)
head.next = Node(2)
head.next.next = Node(3)
head.next.next.next = head.next  # Creates cycle
print("Has cycle:", has_cycle(head))`,
      cpp: `#include <iostream>
using namespace std;

struct Node {
    int data;
    Node* next;
    Node(int d) : data(d), next(nullptr) {}
};

bool hasCycle(Node* head) {
    Node* slow = head;
    Node* fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}

int main() {
    Node* head = new Node(1);
    head->next = new Node(2);
    head->next->next = new Node(3);
    head->next->next->next = head->next; // Creates cycle
    cout << "Has cycle: " << (hasCycle(head) ? "true" : "false") << endl;
    return 0;
}`,
    },
  },

  // ─── Stack & Queue ──────────────────────────────────────────────────
  {
    id: 'balanced-parentheses',
    title: 'Balanced Parentheses',
    category: 'stackqueue',
    difficulty: 'Easy',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    description: 'Check if brackets are balanced using a stack.',
    languages: {
      java: `import java.util.Stack;

public class BalancedParentheses {
    public static boolean isBalanced(String expr) {
        Stack<Character> stack = new Stack<>();
        for (char ch : expr.toCharArray()) {
            if (ch == '(' || ch == '{' || ch == '[') {
                stack.push(ch);
            } else if (ch == ')' || ch == '}' || ch == ']') {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if ((ch == ')' && top != '(') ||
                    (ch == '}' && top != '{') ||
                    (ch == ']' && top != '[')) return false;
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        System.out.println("{[()]} -> " + isBalanced("{[()]}"));
        System.out.println("{[(])} -> " + isBalanced("{[(])}"));
    }
}`,
      python: `def is_balanced(expr):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for ch in expr:
        if ch in '({[':
            stack.append(ch)
        elif ch in ')}]':
            if not stack or stack[-1] != mapping[ch]:
                return False
            stack.pop()
    return len(stack) == 0

print("{[()]} ->", is_balanced("{[()]}"))
print("{[(])} ->", is_balanced("{[(])}"))`,
      cpp: `#include <iostream>
#include <stack>
using namespace std;

bool isBalanced(string expr) {
    stack<char> s;
    for (char ch : expr) {
        if (ch == '(' || ch == '{' || ch == '[') s.push(ch);
        else if (ch == ')' || ch == '}' || ch == ']') {
            if (s.empty()) return false;
            char top = s.top(); s.pop();
            if ((ch == ')' && top != '(') ||
                (ch == '}' && top != '{') ||
                (ch == ']' && top != '[')) return false;
        }
    }
    return s.empty();
}

int main() {
    cout << "{[()]} -> " << (isBalanced("{[()]}") ? "true" : "false") << endl;
    cout << "{[(])} -> " << (isBalanced("{[(])}") ? "true" : "false") << endl;
    return 0;
}`,
    },
  },

  // ─── Trees ──────────────────────────────────────────────────────────
  {
    id: 'bst-insert-search',
    title: 'BST Insert & Search',
    category: 'trees',
    difficulty: 'Easy',
    timeComplexity: 'O(log n) avg',
    spaceComplexity: 'O(n)',
    description: 'Insert and search in a Binary Search Tree.',
    languages: {
      java: `public class BST {
    static class Node {
        int key;
        Node left, right;
        Node(int k) { key = k; left = right = null; }
    }

    static Node insert(Node root, int key) {
        if (root == null) return new Node(key);
        if (key < root.key) root.left = insert(root.left, key);
        else if (key > root.key) root.right = insert(root.right, key);
        return root;
    }

    static boolean search(Node root, int key) {
        if (root == null) return false;
        if (root.key == key) return true;
        return key < root.key ? search(root.left, key) : search(root.right, key);
    }

    static void inorder(Node root) {
        if (root != null) {
            inorder(root.left);
            System.out.print(root.key + " ");
            inorder(root.right);
        }
    }

    public static void main(String[] args) {
        Node root = null;
        int[] keys = {50, 30, 70, 20, 40, 60, 80};
        for (int k : keys) root = insert(root, k);
        System.out.print("Inorder: "); inorder(root);
        System.out.println("\\nSearch 40: " + search(root, 40));
    }
}`,
      python: `class Node:
    def __init__(self, key):
        self.key = key
        self.left = self.right = None

def insert(root, key):
    if root is None:
        return Node(key)
    if key < root.key:
        root.left = insert(root.left, key)
    elif key > root.key:
        root.right = insert(root.right, key)
    return root

def search(root, key):
    if root is None:
        return False
    if root.key == key:
        return True
    return search(root.left, key) if key < root.key else search(root.right, key)

def inorder(root):
    if root:
        inorder(root.left)
        print(root.key, end=" ")
        inorder(root.right)

root = None
for k in [50, 30, 70, 20, 40, 60, 80]:
    root = insert(root, k)
print("Inorder: ", end=""); inorder(root)
print("\\nSearch 40:", search(root, 40))`,
      cpp: `#include <iostream>
using namespace std;

struct Node {
    int key;
    Node *left, *right;
    Node(int k) : key(k), left(nullptr), right(nullptr) {}
};

Node* insert(Node* root, int key) {
    if (!root) return new Node(key);
    if (key < root->key) root->left = insert(root->left, key);
    else if (key > root->key) root->right = insert(root->right, key);
    return root;
}

bool search(Node* root, int key) {
    if (!root) return false;
    if (root->key == key) return true;
    return key < root->key ? search(root->left, key) : search(root->right, key);
}

void inorder(Node* root) {
    if (root) {
        inorder(root->left);
        cout << root->key << " ";
        inorder(root->right);
    }
}

int main() {
    Node* root = nullptr;
    int keys[] = {50, 30, 70, 20, 40, 60, 80};
    for (int k : keys) root = insert(root, k);
    cout << "Inorder: "; inorder(root);
    cout << "\\nSearch 40: " << (search(root, 40) ? "true" : "false") << endl;
    return 0;
}`,
    },
  },
  {
    id: 'level-order-bfs',
    title: 'Level Order Traversal (BFS)',
    category: 'trees',
    difficulty: 'Medium',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    description: 'Traverse a binary tree level by level using a queue.',
    languages: {
      java: `import java.util.*;

public class LevelOrder {
    static class Node {
        int data;
        Node left, right;
        Node(int d) { data = d; }
    }

    public static List<List<Integer>> levelOrder(Node root) {
        List<List<Integer>> result = new ArrayList<>();
        if (root == null) return result;
        Queue<Node> queue = new LinkedList<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            int size = queue.size();
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                Node curr = queue.poll();
                level.add(curr.data);
                if (curr.left != null) queue.add(curr.left);
                if (curr.right != null) queue.add(curr.right);
            }
            result.add(level);
        }
        return result;
    }

    public static void main(String[] args) {
        Node root = new Node(1);
        root.left = new Node(2);
        root.right = new Node(3);
        root.left.left = new Node(4);
        root.left.right = new Node(5);
        System.out.println("Level Order: " + levelOrder(root));
    }
}`,
      python: `from collections import deque

class Node:
    def __init__(self, data):
        self.data = data
        self.left = self.right = None

def level_order(root):
    if not root:
        return []
    result = []
    queue = deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.data)
            if node.left: queue.append(node.left)
            if node.right: queue.append(node.right)
        result.append(level)
    return result

root = Node(1)
root.left = Node(2)
root.right = Node(3)
root.left.left = Node(4)
root.left.right = Node(5)
print("Level Order:", level_order(root))`,
      cpp: `#include <iostream>
#include <queue>
#include <vector>
using namespace std;

struct Node {
    int data;
    Node *left, *right;
    Node(int d) : data(d), left(nullptr), right(nullptr) {}
};

vector<vector<int>> levelOrder(Node* root) {
    vector<vector<int>> result;
    if (!root) return result;
    queue<Node*> q;
    q.push(root);
    while (!q.empty()) {
        int size = q.size();
        vector<int> level;
        for (int i = 0; i < size; i++) {
            Node* curr = q.front(); q.pop();
            level.push_back(curr->data);
            if (curr->left) q.push(curr->left);
            if (curr->right) q.push(curr->right);
        }
        result.push_back(level);
    }
    return result;
}

int main() {
    Node* root = new Node(1);
    root->left = new Node(2);
    root->right = new Node(3);
    root->left->left = new Node(4);
    root->left->right = new Node(5);
    auto levels = levelOrder(root);
    cout << "Level Order:" << endl;
    for (auto& lvl : levels) {
        for (int x : lvl) cout << x << " ";
        cout << endl;
    }
    return 0;
}`,
    },
  },

  // ─── Graphs ─────────────────────────────────────────────────────────
  {
    id: 'graph-bfs',
    title: 'Graph BFS',
    category: 'graphs',
    difficulty: 'Medium',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    description: 'Breadth-first search traversal of a graph using adjacency list.',
    languages: {
      java: `import java.util.*;

public class GraphBFS {
    public static void bfs(Map<Integer, List<Integer>> graph, int start) {
        Set<Integer> visited = new HashSet<>();
        Queue<Integer> queue = new LinkedList<>();
        visited.add(start);
        queue.add(start);
        while (!queue.isEmpty()) {
            int node = queue.poll();
            System.out.print(node + " ");
            for (int neighbor : graph.getOrDefault(node, Collections.emptyList())) {
                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);
                    queue.add(neighbor);
                }
            }
        }
    }

    public static void main(String[] args) {
        Map<Integer, List<Integer>> graph = new HashMap<>();
        graph.put(0, Arrays.asList(1, 2));
        graph.put(1, Arrays.asList(2));
        graph.put(2, Arrays.asList(0, 3));
        graph.put(3, Arrays.asList(3));
        System.out.print("BFS from 2: ");
        bfs(graph, 2);
    }
}`,
      python: `from collections import deque

def bfs(graph, start):
    visited = set([start])
    queue = deque([start])
    result = []
    while queue:
        node = queue.popleft()
        result.append(node)
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return result

graph = {0: [1, 2], 1: [2], 2: [0, 3], 3: [3]}
print("BFS from 2:", bfs(graph, 2))`,
      cpp: `#include <iostream>
#include <queue>
#include <unordered_set>
#include <unordered_map>
#include <vector>
using namespace std;

void bfs(unordered_map<int, vector<int>>& graph, int start) {
    unordered_set<int> visited;
    queue<int> q;
    visited.insert(start);
    q.push(start);
    while (!q.empty()) {
        int node = q.front(); q.pop();
        cout << node << " ";
        for (int neighbor : graph[node]) {
            if (visited.find(neighbor) == visited.end()) {
                visited.insert(neighbor);
                q.push(neighbor);
            }
        }
    }
}

int main() {
    unordered_map<int, vector<int>> graph;
    graph[0] = {1, 2};
    graph[1] = {2};
    graph[2] = {0, 3};
    graph[3] = {3};
    cout << "BFS from 2: ";
    bfs(graph, 2);
    return 0;
}`,
    },
  },
  {
    id: 'graph-dfs',
    title: 'Graph DFS',
    category: 'graphs',
    difficulty: 'Medium',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    description: 'Depth-first search traversal of a graph using recursion.',
    languages: {
      java: `import java.util.*;

public class GraphDFS {
    public static void dfs(Map<Integer, List<Integer>> graph, int node, Set<Integer> visited) {
        if (visited.contains(node)) return;
        visited.add(node);
        System.out.print(node + " ");
        for (int neighbor : graph.getOrDefault(node, Collections.emptyList())) {
            dfs(graph, neighbor, visited);
        }
    }

    public static void main(String[] args) {
        Map<Integer, List<Integer>> graph = new HashMap<>();
        graph.put(0, Arrays.asList(1, 2));
        graph.put(1, Arrays.asList(2));
        graph.put(2, Arrays.asList(0, 3));
        graph.put(3, Arrays.asList(3));
        System.out.print("DFS from 2: ");
        dfs(graph, 2, new HashSet<>());
    }
}`,
      python: `def dfs(graph, node, visited=None):
    if visited is None:
        visited = set()
    if node in visited:
        return []
    visited.add(node)
    result = [node]
    for neighbor in graph.get(node, []):
        result.extend(dfs(graph, neighbor, visited))
    return result

graph = {0: [1, 2], 1: [2], 2: [0, 3], 3: [3]}
print("DFS from 2:", dfs(graph, 2))`,
      cpp: `#include <iostream>
#include <unordered_set>
#include <unordered_map>
#include <vector>
using namespace std;

void dfs(unordered_map<int, vector<int>>& graph, int node, unordered_set<int>& visited) {
    if (visited.count(node)) return;
    visited.insert(node);
    cout << node << " ";
    for (int neighbor : graph[node]) {
        dfs(graph, neighbor, visited);
    }
}

int main() {
    unordered_map<int, vector<int>> graph;
    graph[0] = {1, 2};
    graph[1] = {2};
    graph[2] = {0, 3};
    graph[3] = {3};
    unordered_set<int> visited;
    cout << "DFS from 2: ";
    dfs(graph, 2, visited);
    return 0;
}`,
    },
  },

  // ─── Dynamic Programming ───────────────────────────────────────────
  {
    id: 'fibonacci-memo',
    title: 'Fibonacci (Memoization)',
    category: 'dp',
    difficulty: 'Easy',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    description: 'Compute Fibonacci numbers using top-down memoization.',
    languages: {
      java: `import java.util.HashMap;
import java.util.Map;

public class FibonacciMemo {
    static Map<Integer, Long> memo = new HashMap<>();

    public static long fib(int n) {
        if (n <= 1) return n;
        if (memo.containsKey(n)) return memo.get(n);
        long result = fib(n - 1) + fib(n - 2);
        memo.put(n, result);
        return result;
    }

    public static void main(String[] args) {
        for (int i = 0; i <= 10; i++) {
            System.out.print(fib(i) + " ");
        }
    }
}`,
      python: `from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

for i in range(11):
    print(fib(i), end=" ")`,
      cpp: `#include <iostream>
#include <unordered_map>
using namespace std;

unordered_map<int, long long> memo;

long long fib(int n) {
    if (n <= 1) return n;
    if (memo.count(n)) return memo[n];
    return memo[n] = fib(n - 1) + fib(n - 2);
}

int main() {
    for (int i = 0; i <= 10; i++)
        cout << fib(i) << " ";
    return 0;
}`,
    },
  },
  {
    id: 'knapsack-01',
    title: '0/1 Knapsack',
    category: 'dp',
    difficulty: 'Hard',
    timeComplexity: 'O(n × W)',
    spaceComplexity: 'O(n × W)',
    description: 'Select items with maximum value without exceeding weight capacity.',
    languages: {
      java: `public class Knapsack {
    public static int knapsack(int[] weights, int[] values, int W) {
        int n = weights.length;
        int[][] dp = new int[n + 1][W + 1];
        for (int i = 1; i <= n; i++) {
            for (int w = 0; w <= W; w++) {
                dp[i][w] = dp[i - 1][w];
                if (weights[i - 1] <= w) {
                    dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
                }
            }
        }
        return dp[n][W];
    }

    public static void main(String[] args) {
        int[] weights = {1, 3, 4, 5};
        int[] values = {1, 4, 5, 7};
        System.out.println("Max Value: " + knapsack(weights, values, 7));
    }
}`,
      python: `def knapsack(weights, values, W):
    n = len(weights)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(W + 1):
            dp[i][w] = dp[i - 1][w]
            if weights[i - 1] <= w:
                dp[i][w] = max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1])
    return dp[n][W]

weights = [1, 3, 4, 5]
values = [1, 4, 5, 7]
print("Max Value:", knapsack(weights, values, 7))`,
      cpp: `#include <iostream>
#include <algorithm>
using namespace std;

int knapsack(int weights[], int values[], int n, int W) {
    int dp[n + 1][W + 1];
    for (int i = 0; i <= n; i++)
        for (int w = 0; w <= W; w++)
            dp[i][w] = 0;
    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= W; w++) {
            dp[i][w] = dp[i - 1][w];
            if (weights[i - 1] <= w)
                dp[i][w] = max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
        }
    }
    return dp[n][W];
}

int main() {
    int weights[] = {1, 3, 4, 5};
    int values[] = {1, 4, 5, 7};
    cout << "Max Value: " << knapsack(weights, values, 4, 7) << endl;
    return 0;
}`,
    },
  },
  {
    id: 'lcs',
    title: 'Longest Common Subsequence',
    category: 'dp',
    difficulty: 'Medium',
    timeComplexity: 'O(m × n)',
    spaceComplexity: 'O(m × n)',
    description: 'Find the length of the longest common subsequence of two strings.',
    languages: {
      java: `public class LCS {
    public static int lcs(String s1, String s2) {
        int m = s1.length(), n = s2.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (s1.charAt(i - 1) == s2.charAt(j - 1))
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                else
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        return dp[m][n];
    }

    public static void main(String[] args) {
        System.out.println("LCS length: " + lcs("ABCBDAB", "BDCAB"));
    }
}`,
      python: `def lcs(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]

print("LCS length:", lcs("ABCBDAB", "BDCAB"))`,
      cpp: `#include <iostream>
#include <algorithm>
using namespace std;

int lcs(string s1, string s2) {
    int m = s1.size(), n = s2.size();
    int dp[m + 1][n + 1];
    for (int i = 0; i <= m; i++) dp[i][0] = 0;
    for (int j = 0; j <= n; j++) dp[0][j] = 0;
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            dp[i][j] = (s1[i-1] == s2[j-1]) ? dp[i-1][j-1] + 1 : max(dp[i-1][j], dp[i][j-1]);
    return dp[m][n];
}

int main() {
    cout << "LCS length: " << lcs("ABCBDAB", "BDCAB") << endl;
    return 0;
}`,
    },
  },

  // ─── Strings ────────────────────────────────────────────────────────
  {
    id: 'palindrome-check',
    title: 'Palindrome Check',
    category: 'strings',
    difficulty: 'Easy',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    description: 'Check if a string reads the same forwards and backwards.',
    languages: {
      java: `public class PalindromeCheck {
    public static boolean isPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            if (s.charAt(left) != s.charAt(right)) return false;
            left++;
            right--;
        }
        return true;
    }

    public static void main(String[] args) {
        System.out.println("racecar: " + isPalindrome("racecar"));
        System.out.println("hello: " + isPalindrome("hello"));
    }
}`,
      python: `def is_palindrome(s):
    return s == s[::-1]

print("racecar:", is_palindrome("racecar"))
print("hello:", is_palindrome("hello"))`,
      cpp: `#include <iostream>
#include <algorithm>
using namespace std;

bool isPalindrome(string s) {
    int left = 0, right = s.size() - 1;
    while (left < right) {
        if (s[left] != s[right]) return false;
        left++;
        right--;
    }
    return true;
}

int main() {
    cout << "racecar: " << (isPalindrome("racecar") ? "true" : "false") << endl;
    cout << "hello: " << (isPalindrome("hello") ? "true" : "false") << endl;
    return 0;
}`,
    },
  },
  {
    id: 'anagram-check',
    title: 'Anagram Check',
    category: 'strings',
    difficulty: 'Easy',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    description: 'Check if two strings are anagrams using character frequency counting.',
    languages: {
      java: `import java.util.Arrays;

public class AnagramCheck {
    public static boolean isAnagram(String s1, String s2) {
        if (s1.length() != s2.length()) return false;
        int[] count = new int[26];
        for (int i = 0; i < s1.length(); i++) {
            count[s1.charAt(i) - 'a']++;
            count[s2.charAt(i) - 'a']--;
        }
        for (int c : count) if (c != 0) return false;
        return true;
    }

    public static void main(String[] args) {
        System.out.println("listen, silent: " + isAnagram("listen", "silent"));
        System.out.println("hello, world: " + isAnagram("hello", "world"));
    }
}`,
      python: `from collections import Counter

def is_anagram(s1, s2):
    return Counter(s1) == Counter(s2)

print("listen, silent:", is_anagram("listen", "silent"))
print("hello, world:", is_anagram("hello", "world"))`,
      cpp: `#include <iostream>
#include <algorithm>
using namespace std;

bool isAnagram(string s1, string s2) {
    if (s1.size() != s2.size()) return false;
    int count[26] = {0};
    for (int i = 0; i < (int)s1.size(); i++) {
        count[s1[i] - 'a']++;
        count[s2[i] - 'a']--;
    }
    for (int c : count) if (c != 0) return false;
    return true;
}

int main() {
    cout << "listen, silent: " << (isAnagram("listen", "silent") ? "true" : "false") << endl;
    cout << "hello, world: " << (isAnagram("hello", "world") ? "true" : "false") << endl;
    return 0;
}`,
    },
  },

  // ─── Math ───────────────────────────────────────────────────────────
  {
    id: 'gcd-lcm',
    title: 'GCD & LCM',
    category: 'math',
    difficulty: 'Easy',
    timeComplexity: 'O(log min(a,b))',
    spaceComplexity: 'O(1)',
    description: 'Compute GCD using Euclidean algorithm and derive LCM.',
    languages: {
      java: `public class GCDLCM {
    public static int gcd(int a, int b) {
        while (b != 0) {
            int temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }

    public static int lcm(int a, int b) {
        return (a / gcd(a, b)) * b;
    }

    public static void main(String[] args) {
        System.out.println("GCD(12,8): " + gcd(12, 8));
        System.out.println("LCM(12,8): " + lcm(12, 8));
    }
}`,
      python: `def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

def lcm(a, b):
    return (a // gcd(a, b)) * b

print("GCD(12,8):", gcd(12, 8))
print("LCM(12,8):", lcm(12, 8))`,
      cpp: `#include <iostream>
using namespace std;

int gcd(int a, int b) {
    while (b) { int t = b; b = a % b; a = t; }
    return a;
}

int lcm(int a, int b) {
    return (a / gcd(a, b)) * b;
}

int main() {
    cout << "GCD(12,8): " << gcd(12, 8) << endl;
    cout << "LCM(12,8): " << lcm(12, 8) << endl;
    return 0;
}`,
    },
  },
  {
    id: 'sieve-eratosthenes',
    title: 'Sieve of Eratosthenes',
    category: 'math',
    difficulty: 'Medium',
    timeComplexity: 'O(n log log n)',
    spaceComplexity: 'O(n)',
    description: 'Find all prime numbers up to n efficiently.',
    languages: {
      java: `import java.util.Arrays;

public class SieveOfEratosthenes {
    public static boolean[] sieve(int n) {
        boolean[] isPrime = new boolean[n + 1];
        Arrays.fill(isPrime, true);
        isPrime[0] = isPrime[1] = false;
        for (int i = 2; i * i <= n; i++) {
            if (isPrime[i]) {
                for (int j = i * i; j <= n; j += i)
                    isPrime[j] = false;
            }
        }
        return isPrime;
    }

    public static void main(String[] args) {
        boolean[] primes = sieve(50);
        System.out.print("Primes up to 50: ");
        for (int i = 2; i <= 50; i++)
            if (primes[i]) System.out.print(i + " ");
    }
}`,
      python: `def sieve(n):
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    i = 2
    while i * i <= n:
        if is_prime[i]:
            for j in range(i * i, n + 1, i):
                is_prime[j] = False
        i += 1
    return [x for x in range(2, n + 1) if is_prime[x]]

print("Primes up to 50:", sieve(50))`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

vector<int> sieve(int n) {
    vector<bool> isPrime(n + 1, true);
    isPrime[0] = isPrime[1] = false;
    for (int i = 2; i * i <= n; i++)
        if (isPrime[i])
            for (int j = i * i; j <= n; j += i)
                isPrime[j] = false;
    vector<int> primes;
    for (int i = 2; i <= n; i++)
        if (isPrime[i]) primes.push_back(i);
    return primes;
}

int main() {
    auto primes = sieve(50);
    cout << "Primes up to 50: ";
    for (int p : primes) cout << p << " ";
    return 0;
}`,
    },
  },
  {
    id: 'prefix-sum',
    title: 'Prefix Sum Array',
    category: 'arrays',
    difficulty: 'Easy',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    description: 'Build prefix sum array for O(1) range sum queries.',
    languages: {
      java: `public class PrefixSum {
    public static int[] buildPrefixSum(int[] arr) {
        int[] prefix = new int[arr.length + 1];
        for (int i = 0; i < arr.length; i++)
            prefix[i + 1] = prefix[i] + arr[i];
        return prefix;
    }

    public static int rangeSum(int[] prefix, int l, int r) {
        return prefix[r + 1] - prefix[l];
    }

    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 4, 5};
        int[] prefix = buildPrefixSum(arr);
        System.out.println("Sum [1..3]: " + rangeSum(prefix, 1, 3)); // 2+3+4 = 9
    }
}`,
      python: `def build_prefix_sum(arr):
    prefix = [0] * (len(arr) + 1)
    for i in range(len(arr)):
        prefix[i + 1] = prefix[i] + arr[i]
    return prefix

def range_sum(prefix, l, r):
    return prefix[r + 1] - prefix[l]

arr = [1, 2, 3, 4, 5]
prefix = build_prefix_sum(arr)
print("Sum [1..3]:", range_sum(prefix, 1, 3))  # 2+3+4 = 9`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

vector<int> buildPrefixSum(vector<int>& arr) {
    vector<int> prefix(arr.size() + 1, 0);
    for (int i = 0; i < (int)arr.size(); i++)
        prefix[i + 1] = prefix[i] + arr[i];
    return prefix;
}

int rangeSum(vector<int>& prefix, int l, int r) {
    return prefix[r + 1] - prefix[l];
}

int main() {
    vector<int> arr = {1, 2, 3, 4, 5};
    auto prefix = buildPrefixSum(arr);
    cout << "Sum [1..3]: " << rangeSum(prefix, 1, 3) << endl; // 9
    return 0;
}`,
    },
  },
];
