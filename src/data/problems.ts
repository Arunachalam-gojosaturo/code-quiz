import { Problem, Difficulty, Language, LanguageTrack } from '../types';

export const PROBLEMS_DATABASE: Problem[] = [
  // =========================================================================
  // PYTHON PROBLEMS (EASY - 10 MARKS EACH)
  // =========================================================================
  {
    id: 'py-easy-1',
    title: 'Even Numbers Range Filter',
    difficulty: 'easy',
    language: 'python',
    category: 'Logic & Range Bound',
    marksValue: 10,
    description: 'The function calculate_even_sum(n) is intended to calculate the sum of all positive even integers up to and including n. For input n = 6, it returns 6 instead of 12 because the loop boundary excludes n.',
    buggyCode: `def calculate_even_sum(n):
    total = 0
    # BUG: Range excludes n when n is an even upper bound
    for i in range(1, n):
        if i % 2 == 0:
            total += i
    return total

print(calculate_even_sum(6))  # Expected: 12, Actual: 6`,
    fixedCode: `def calculate_even_sum(n):
    total = 0
    for i in range(1, n + 1):
        if i % 2 == 0:
            total += i
    return total

print(calculate_even_sum(6))`,
    lineWithBug: 4,
    buggyLineContent: '    for i in range(1, n):',
    acceptedFixes: [
      'for i in range(1, n + 1):',
      'for i in range(1, n+1):',
      'for i in range(2, n + 1, 2):',
      'for i in range(2, n+1, 2):',
      'range(1, n + 1)',
      'range(1, n+1)'
    ],
    explanation: 'In Python, range(start, stop) excludes the stop value. To include n, use range(1, n + 1).',
    testCases: [
      { input: '6', expectedOutput: '12', description: 'Even number boundary 6' },
      { input: '10', expectedOutput: '30', description: 'Even number boundary 10' }
    ],
    hints: [
      'Check the upper limit of the range() function.',
      'Remember that Python range is non-inclusive at the upper boundary.'
    ]
  },
  {
    id: 'py-easy-2',
    title: 'Palindrome Step Slicing',
    difficulty: 'easy',
    language: 'python',
    category: 'String Manipulation',
    marksValue: 10,
    description: 'The function is_palindrome(text) checks if a string reads the same forwards and backwards. A typo in the slice step skips characters, incorrectly reporting palindromes as false.',
    buggyCode: `def is_palindrome(text):
    cleaned = ''.join(c.lower() for c in text if c.isalnum())
    # BUG: Step size is -2 instead of -1
    reversed_text = cleaned[::-2]
    return cleaned == reversed_text

print(is_palindrome("racecar"))  # Expected: True, Actual: False`,
    fixedCode: `def is_palindrome(text):
    cleaned = ''.join(c.lower() for c in text if c.isalnum())
    reversed_text = cleaned[::-1]
    return cleaned == reversed_text

print(is_palindrome("racecar"))`,
    lineWithBug: 4,
    buggyLineContent: '    reversed_text = cleaned[::-2]',
    acceptedFixes: [
      'reversed_text = cleaned[::-1]',
      'cleaned[::-1]',
      'return cleaned == cleaned[::-1]'
    ],
    explanation: 'Python slice syntax [::-1] reverses the whole string. Using [::-2] skips every second character.',
    testCases: [
      { input: '"racecar"', expectedOutput: 'True' },
      { input: '"hello"', expectedOutput: 'False' }
    ],
    hints: ['Look closely at the slice step in cleaned[::-2].']
  },
  {
    id: 'py-easy-3',
    title: 'Product Accumulator Initialization',
    difficulty: 'easy',
    language: 'python',
    category: 'Arithmetic & Loops',
    marksValue: 10,
    description: 'The function calculate_product(numbers) calculates the multiplication product of a list of numbers. Because product is initialized to 0 instead of 1, the result is always 0.',
    buggyCode: `def calculate_product(numbers):
    # BUG: Initializing product to 0 makes all results 0
    product = 0
    for num in numbers:
        product *= num
    return product

print(calculate_product([2, 3, 4]))  # Expected: 24, Actual: 0`,
    fixedCode: `def calculate_product(numbers):
    product = 1
    for num in numbers:
        product *= num
    return product

print(calculate_product([2, 3, 4]))`,
    lineWithBug: 3,
    buggyLineContent: '    product = 0',
    acceptedFixes: [
      'product = 1',
      'product = 1;',
      'product=1'
    ],
    explanation: 'Multiplication accumulators must be initialized to 1 (the multiplicative identity), not 0.',
    testCases: [
      { input: '[2, 3, 4]', expectedOutput: '24' },
      { input: '[5, 5]', expectedOutput: '25' }
    ],
    hints: ['Multiplication identity is 1. Change product = 0 to product = 1.']
  },
  {
    id: 'py-easy-4',
    title: 'Dictionary Safe Key Lookup',
    difficulty: 'easy',
    language: 'python',
    category: 'Dictionary Access',
    marksValue: 10,
    description: 'The function get_user_role(user) crashes with a KeyError when the role key is missing. It should safely default to "guest".',
    buggyCode: `def get_user_role(user):
    # BUG: Direct key lookup raises KeyError if 'role' is absent
    role = user['role']
    return role.lower()

print(get_user_role({"name": "Alice"}))`,
    fixedCode: `def get_user_role(user):
    role = user.get('role', 'guest')
    return role.lower()

print(get_user_role({"name": "Alice"}))`,
    lineWithBug: 3,
    buggyLineContent: "    role = user['role']",
    acceptedFixes: [
      "role = user.get('role', 'guest')",
      'role = user.get("role", "guest")',
      "user.get('role', 'guest')",
      'user.get("role", "guest")'
    ],
    explanation: 'Direct indexing user["role"] raises KeyError if missing. Use dict.get(key, default) for a safe fallback.',
    testCases: [
      { input: '{"name": "Alice"}', expectedOutput: 'guest' }
    ],
    hints: ['Use dict.get(key, default) instead of direct indexing.']
  },
  {
    id: 'py-easy-5',
    title: 'List Last Element Access',
    difficulty: 'easy',
    language: 'python',
    category: 'Array Indexing',
    marksValue: 10,
    description: 'The function get_last_element(arr) attempts to return the last item, but indexing arr[len(arr)] triggers IndexError: list index out of range.',
    buggyCode: `def get_last_element(arr):
    # BUG: len(arr) is one past the last valid 0-based index
    return arr[len(arr)]

print(get_last_element([10, 20, 30]))  # IndexError!`,
    fixedCode: `def get_last_element(arr):
    return arr[-1]

print(get_last_element([10, 20, 30]))`,
    lineWithBug: 3,
    buggyLineContent: '    return arr[len(arr)]',
    acceptedFixes: [
      'return arr[-1]',
      'return arr[len(arr) - 1]',
      'return arr[len(arr)-1]',
      'arr[-1]',
      'arr[len(arr) - 1]'
    ],
    explanation: 'Python lists are 0-indexed, so the final element is at index len(arr) - 1 or accessible via arr[-1].',
    testCases: [
      { input: '[10, 20, 30]', expectedOutput: '30' }
    ],
    hints: ['In Python, you can use arr[-1] or arr[len(arr) - 1].']
  },
  {
    id: 'py-easy-6',
    title: 'Safe Division Zero Guard',
    difficulty: 'easy',
    language: 'python',
    category: 'Arithmetic & Validation',
    marksValue: 10,
    description: 'The function safe_divide(a, b) crashes with ZeroDivisionError when divisor b is 0. It should return 0 in that case.',
    buggyCode: `def safe_divide(a, b):
    # BUG: No zero check before division
    return a / b

print(safe_divide(10, 0))  # ZeroDivisionError!`,
    fixedCode: `def safe_divide(a, b):
    if b == 0:
        return 0
    return a / b

print(safe_divide(10, 0))`,
    lineWithBug: 3,
    buggyLineContent: '    return a / b',
    acceptedFixes: [
      'if b == 0: return 0\n    return a / b',
      'return a / b if b != 0 else 0',
      'if b == 0: return 0',
      'return a / b if b else 0'
    ],
    explanation: 'Check if the denominator is zero before performing division to prevent ZeroDivisionError.',
    testCases: [
      { input: '10, 0', expectedOutput: '0' },
      { input: '10, 2', expectedOutput: '5.0' }
    ],
    hints: ['Add an if check: if b == 0: return 0']
  },
  {
    id: 'py-easy-7',
    title: 'Accumulator Loop Initialization',
    difficulty: 'easy',
    language: 'python',
    category: 'Basic Logic',
    marksValue: 10,
    description: 'The function sum_positive(numbers) initializes total to 100 instead of 0, making the calculated sum 100 units higher than the correct value.',
    buggyCode: `def sum_positive(numbers):
    # BUG: total initialized to 100 instead of 0
    total = 100
    for n in numbers:
        if n > 0:
            total += n
    return total

print(sum_positive([5, 10]))  # Expected: 15, Actual: 115`,
    fixedCode: `def sum_positive(numbers):
    total = 0
    for n in numbers:
        if n > 0:
            total += n
    return total

print(sum_positive([5, 10]))`,
    lineWithBug: 3,
    buggyLineContent: '    total = 100',
    acceptedFixes: [
      'total = 0',
      'total = 0;'
    ],
    explanation: 'Sum accumulators must start at 0 so they do not add arbitrary offsets.',
    testCases: [
      { input: '[5, 10]', expectedOutput: '15' }
    ],
    hints: ['Set the initial value of total to 0.']
  },
  {
    id: 'py-easy-8',
    title: 'String Whitespace Stripping',
    difficulty: 'easy',
    language: 'python',
    category: 'Strings',
    marksValue: 10,
    description: 'The function clean_input(text) leaves surrounding whitespace intact because it forgets to invoke text.strip().',
    buggyCode: `def clean_input(text):
    # BUG: Returns raw unstripped text
    return text

print(repr(clean_input("  hello world  ")))  # Expected: 'hello world'`,
    fixedCode: `def clean_input(text):
    return text.strip()

print(repr(clean_input("  hello world  ")))`,
    lineWithBug: 3,
    buggyLineContent: '    return text',
    acceptedFixes: [
      'return text.strip()',
      'text.strip()'
    ],
    explanation: 'The str.strip() method removes leading and trailing whitespace.',
    testCases: [
      { input: '"  hello world  "', expectedOutput: "'hello world'" }
    ],
    hints: ['Use text.strip() to trim leading and trailing spaces.']
  },
  {
    id: 'py-easy-9',
    title: 'String to Integer Conversion',
    difficulty: 'easy',
    language: 'python',
    category: 'Types & Casting',
    marksValue: 10,
    description: 'The function add_string_numbers(s1, s2) performs string concatenation instead of integer addition because values are not converted to int.',
    buggyCode: `def add_string_numbers(s1, s2):
    # BUG: String concatenation instead of integer addition
    return s1 + s2

print(add_string_numbers("5", "10"))  # Expected: 15, Actual: "510"`,
    fixedCode: `def add_string_numbers(s1, s2):
    return int(s1) + int(s2)

print(add_string_numbers("5", "10"))`,
    lineWithBug: 3,
    buggyLineContent: '    return s1 + s2',
    acceptedFixes: [
      'return int(s1) + int(s2)',
      'int(s1) + int(s2)'
    ],
    explanation: 'Convert strings to integers using int() before addition to prevent string concatenation.',
    testCases: [
      { input: '"5", "10"', expectedOutput: '15' }
    ],
    hints: ['Wrap both variables with int(): int(s1) + int(s2)']
  },
  {
    id: 'py-easy-10',
    title: 'Max Element Search Boundary',
    difficulty: 'easy',
    language: 'python',
    category: 'Array Traversal',
    marksValue: 10,
    description: 'The function find_max(arr) initializes max_val to 0, which fails completely when the input contains only negative integers (e.g. [-5, -2, -9]).',
    buggyCode: `def find_max(arr):
    # BUG: Initializing to 0 fails for all-negative arrays
    max_val = 0
    for num in arr:
        if num > max_val:
            max_val = num
    return max_val

print(find_max([-5, -2, -9]))  # Expected: -2, Actual: 0`,
    fixedCode: `def find_max(arr):
    max_val = arr[0]
    for num in arr:
        if num > max_val:
            max_val = num
    return max_val

print(find_max([-5, -2, -9]))`,
    lineWithBug: 3,
    buggyLineContent: '    max_val = 0',
    acceptedFixes: [
      'max_val = arr[0]',
      'max_val = float("-inf")',
      'return max(arr)'
    ],
    explanation: 'Initialize the maximum accumulator to the first element arr[0] or -infinity to handle negative arrays correctly.',
    testCases: [
      { input: '[-5, -2, -9]', expectedOutput: '-2' }
    ],
    hints: ['Initialize max_val to arr[0] instead of 0.']
  },

  // =========================================================================
  // PYTHON PROBLEMS (INTERMEDIATE - 20 MARKS EACH)
  // =========================================================================
  {
    id: 'py-med-1',
    title: 'Matrix 2D Shallow Reference Duplication',
    difficulty: 'intermediate',
    language: 'python',
    category: 'Object References & Memory',
    marksValue: 20,
    description: 'The function create_grid(rows, cols) creates a 2D matrix. Due to list multiplication [row] * rows, all rows in the grid reference the same underlying list in memory. Updating one cell mutates every row.',
    buggyCode: `def create_grid(rows, cols):
    # BUG: Shallow list repetition creates identical row references
    grid = [[0] * cols] * rows
    grid[0][0] = 1
    return grid

grid = create_grid(3, 3)
print(grid) # Expected: [[1, 0, 0], [0, 0, 0], [0, 0, 0]], Actual: [[1, 0, 0], [1, 0, 0], [1, 0, 0]]`,
    fixedCode: `def create_grid(rows, cols):
    grid = [[0] * cols for _ in range(rows)]
    grid[0][0] = 1
    return grid

grid = create_grid(3, 3)
print(grid)`,
    lineWithBug: 3,
    buggyLineContent: '    grid = [[0] * cols] * rows',
    acceptedFixes: [
      'grid = [[0] * cols for _ in range(rows)]',
      'grid = [[0 for _ in range(cols)] for _ in range(rows)]',
      'grid = [[0] * cols for i in range(rows)]',
      '[[0] * cols for _ in range(rows)]',
      '[[0 for _ in range(cols)] for _ in range(rows)]'
    ],
    explanation: 'Multiplying a list containing a mutable sublist (* rows) creates references to the same row object. Use a list comprehension to allocate separate row instances.',
    testCases: [
      { input: '3, 3', expectedOutput: '[[1, 0, 0], [0, 0, 0], [0, 0, 0]]' }
    ],
    hints: ['Use a list comprehension: [[0] * cols for _ in range(rows)]']
  },
  {
    id: 'py-med-2',
    title: 'Closure Late Binding in Lambda Loops',
    difficulty: 'intermediate',
    language: 'python',
    category: 'Closures & Scopes',
    marksValue: 20,
    description: 'The function create_multipliers(n) generates multiplier functions using lambdas. Due to late binding, the loop variable i is looked up when called, causing all functions to multiply by the final value.',
    buggyCode: `def create_multipliers(n):
    multipliers = []
    for i in range(n):
        # BUG: Late binding makes lambda look up 'i' at call time
        multipliers.append(lambda x: x * i)
    return multipliers

funcs = create_multipliers(3)
print([f(10) for f in funcs])  # Expected: [0, 10, 20], Actual: [20, 20, 20]`,
    fixedCode: `def create_multipliers(n):
    multipliers = []
    for i in range(n):
        multipliers.append(lambda x, i=i: x * i)
    return multipliers

funcs = create_multipliers(3)
print([f(10) for f in funcs])`,
    lineWithBug: 5,
    buggyLineContent: '        multipliers.append(lambda x: x * i)',
    acceptedFixes: [
      'multipliers.append(lambda x, i=i: x * i)',
      'multipliers.append(lambda x, i=i: x*i)',
      'lambda x, i=i: x * i',
      'lambda x, i=i: x*i'
    ],
    explanation: 'Python closures bind variables by name at call time. Binding the loop variable as a default argument (lambda x, i=i: x * i) captures the value of i at definition time.',
    testCases: [
      { input: '3, x=10', expectedOutput: '[0, 10, 20]' }
    ],
    hints: ['Capture the loop variable inside the lambda signature: lambda x, i=i: x * i']
  },
  {
    id: 'py-med-3',
    title: 'Generator Exhaustion on Multiple Iterations',
    difficulty: 'intermediate',
    language: 'python',
    category: 'Iterators & Generators',
    marksValue: 20,
    description: 'The function analyze_numbers(gen) attempts to calculate the sum and length of a generator expression, but exhausts the generator on the first sum() pass, leaving it empty.',
    buggyCode: `def analyze_numbers(numbers_gen):
    # BUG: Iterating a generator exhausts it, cannot be traversed twice
    total = sum(numbers_gen)
    count = len(list(numbers_gen))
    return total / count if count else 0

gen = (x * 2 for x in [1, 2, 3, 4])
print(analyze_numbers(gen))  # Expected: 5.0, Actual: 0 (ZeroDivisionError)`,
    fixedCode: `def analyze_numbers(numbers_gen):
    nums = list(numbers_gen)
    total = sum(nums)
    count = len(nums)
    return total / count if count else 0

gen = (x * 2 for x in [1, 2, 3, 4])
print(analyze_numbers(gen))`,
    lineWithBug: 3,
    buggyLineContent: '    total = sum(numbers_gen)',
    acceptedFixes: [
      'nums = list(numbers_gen)',
      'nums = list(numbers_gen); total = sum(nums)',
      'numbers = list(numbers_gen)'
    ],
    explanation: 'Generators in Python are single-pass iterators. Materializing into a list (list(numbers_gen)) allows multiple traversals for sum and length.',
    testCases: [
      { input: '(x * 2 for x in [1, 2, 3, 4])', expectedOutput: '5.0' }
    ],
    hints: ['Convert the generator to a list first: nums = list(numbers_gen)']
  },
  {
    id: 'py-med-4',
    title: 'Dictionary Mutation During Iteration',
    difficulty: 'intermediate',
    language: 'python',
    category: 'Data Structures & Iteration',
    marksValue: 20,
    description: 'The function remove_inactive_users(users) modifies a dictionary while iterating over it directly, raising RuntimeError: dictionary changed size during iteration.',
    buggyCode: `def remove_inactive_users(users):
    # BUG: Modifying dict while iterating over keys
    for user, is_active in users.items():
        if not is_active:
            del users[user]
    return users

data = {"alice": True, "bob": False, "charlie": False}
print(remove_inactive_users(data))`,
    fixedCode: `def remove_inactive_users(users):
    for user, is_active in list(users.items()):
        if not is_active:
            del users[user]
    return users

data = {"alice": True, "bob": False, "charlie": False}
print(remove_inactive_users(data))`,
    lineWithBug: 3,
    buggyLineContent: '    for user, is_active in users.items():',
    acceptedFixes: [
      'for user, is_active in list(users.items()):',
      'for user in list(users.keys()):',
      'users = {k: v for k, v in users.items() if v}',
      'list(users.items())'
    ],
    explanation: 'Python prohibits mutating a dictionary during active iteration. Create a snapshot list of items using list(users.items()).',
    testCases: [
      { input: '{"alice": True, "bob": False}', expectedOutput: '{"alice": True}' }
    ],
    hints: ['Wrap users.items() in list() to iterate over a copy: list(users.items())']
  },
  {
    id: 'py-med-5',
    title: 'Class Variable vs Instance Variable Shadowing',
    difficulty: 'intermediate',
    language: 'python',
    category: 'Object Oriented Programming',
    marksValue: 20,
    description: 'The ShoppingCart class defines items on the class level instead of inside __init__, so all customer cart instances share the same items list.',
    buggyCode: `class ShoppingCart:
    # BUG: Class attribute shared across all instances
    items = []
    
    def add_item(self, item):
        self.items.append(item)

cart1 = ShoppingCart()
cart1.add_item("Book")
cart2 = ShoppingCart()
print(cart2.items)  # Expected: [], Actual: ['Book']`,
    fixedCode: `class ShoppingCart:
    def __init__(self):
        self.items = []
    
    def add_item(self, item):
        self.items.append(item)

cart1 = ShoppingCart()
cart1.add_item("Book")
cart2 = ShoppingCart()
print(cart2.items)`,
    lineWithBug: 3,
    buggyLineContent: '    items = []',
    acceptedFixes: [
      'def __init__(self):\n        self.items = []',
      'def __init__(self): self.items = []',
      'self.items = []'
    ],
    explanation: 'Define instance variables inside __init__ (self.items = []) so each object has its own separate list in memory.',
    testCases: [
      { input: 'cart1.add("Book"), check cart2', expectedOutput: '[]' }
    ],
    hints: ['Initialize self.items = [] inside an __init__(self) constructor.']
  },

  // =========================================================================
  // PYTHON PROBLEMS (HARD - STEP-BY-STEP STEP EVALUATION - 100 TOTAL MARKS)
  // =========================================================================
  {
    id: 'py-hard-1',
    title: 'Asyncio Coroutine Unawaited Race & Shared Event Loop Deadlock',
    difficulty: 'hard',
    language: 'python',
    category: 'Asynchronous Concurrency & GIL',
    marksValue: 100,
    stepRubric: [
      { stepName: 'Identify Unscheduled Coroutine', maxMarks: 25, keywords: ['create_task', 'gather', 'task'], description: 'Detects that coroutine objects are not scheduled as tasks.' },
      { stepName: 'Apply asyncio Task Wrapper', maxMarks: 25, keywords: ['asyncio.create_task', 'create_task', 'fetch_payload'], description: 'Wraps coroutine invocations with asyncio.create_task().' },
      { stepName: 'Concurrent Awaiting with Gather', maxMarks: 25, keywords: ['asyncio.gather', 'gather', '*tasks', '*results'], description: 'Uses asyncio.gather to await all futures simultaneously.' },
      { stepName: 'Syntax & Event Loop Integrity', maxMarks: 25, keywords: ['return', 'await', 'async'], description: 'Ensures correct async function return type and loop execution.' }
    ],
    description: 'In this async worker pipeline, dispatch_all invokes an async coroutine without awaiting it or passing it to asyncio.create_task(), triggering a RuntimeWarning and leaving pending futures uncollected in the event loop.',
    buggyCode: `import asyncio

async def fetch_payload(task_id):
    await asyncio.sleep(0.01)
    return f"Payload-{task_id}"

async def dispatch_all(task_ids):
    results = []
    for tid in task_ids:
        # BUG: Coroutine is called but not scheduled with create_task or awaited
        coro = fetch_payload(tid)
        results.append(coro)
    return await asyncio.gather(*results)

print(asyncio.run(dispatch_all([101, 102])))`,
    fixedCode: `import asyncio

async def fetch_payload(task_id):
    await asyncio.sleep(0.01)
    return f"Payload-{task_id}"

async def dispatch_all(task_ids):
    tasks = [asyncio.create_task(fetch_payload(tid)) for tid in task_ids]
    return await asyncio.gather(*tasks)

print(asyncio.run(dispatch_all([101, 102])))`,
    lineWithBug: 11,
    buggyLineContent: '        coro = fetch_payload(tid)',
    acceptedFixes: [
      'tasks = [asyncio.create_task(fetch_payload(tid)) for tid in task_ids]',
      'tasks = [fetch_payload(tid) for tid in task_ids]',
      'results.append(asyncio.create_task(fetch_payload(tid)))',
      'asyncio.create_task(fetch_payload(tid))'
    ],
    explanation: 'In Python asyncio, calling an async def returns a coroutine object. You must either pass the coroutines to asyncio.gather or wrap them as Task objects with asyncio.create_task.',
    testCases: [
      { input: '[101, 102]', expectedOutput: "['Payload-101', 'Payload-102']" }
    ],
    hints: ['Wrap coroutines with asyncio.create_task() or pass coroutines directly to gather.']
  },

  // =========================================================================
  // C++ PROBLEMS (EASY - 10 MARKS EACH)
  // =========================================================================
  {
    id: 'cpp-easy-1',
    title: 'Off-By-One Array Loop Boundary',
    difficulty: 'easy',
    language: 'cpp',
    category: 'Bounds Checking',
    marksValue: 10,
    description: 'The C++ function printElements accesses beyond the allocated array bound due to an invalid loop condition (<= instead of <), triggering out-of-bounds access.',
    buggyCode: `#include <iostream>
#include <vector>

void printElements(const std::vector<int>& arr) {
    // BUG: Loop condition causes out-of-bounds access on last iteration
    for (size_t i = 0; i <= arr.size(); ++i) {
        std::cout << arr[i] << " ";
    }
    std::cout << "\\n";
}

int main() {
    std::vector<int> numbers = {10, 20, 30};
    printElements(numbers);
    return 0;
}`,
    fixedCode: `#include <iostream>
#include <vector>

void printElements(const std::vector<int>& arr) {
    for (size_t i = 0; i < arr.size(); ++i) {
        std::cout << arr[i] << " ";
    }
    std::cout << "\\n";
}

int main() {
    std::vector<int> numbers = {10, 20, 30};
    printElements(numbers);
    return 0;
}`,
    lineWithBug: 6,
    buggyLineContent: '    for (size_t i = 0; i <= arr.size(); ++i) {',
    acceptedFixes: [
      'for (size_t i = 0; i < arr.size(); ++i) {',
      'for (size_t i = 0; i < arr.size(); i++) {',
      'for (int i = 0; i < arr.size(); ++i) {',
      'for (int i = 0; i < arr.size(); i++) {',
      'i < arr.size()'
    ],
    explanation: 'Vector indices range from 0 to size() - 1. Using i <= arr.size() accesses arr[arr.size()], which is out of bounds.',
    testCases: [
      { input: '{10, 20, 30}', expectedOutput: '10 20 30 ' }
    ],
    hints: ['Check the loop comparison operator (<= vs <).']
  },
  {
    id: 'cpp-easy-2',
    title: 'Pass By Value vs Pass By Reference',
    difficulty: 'easy',
    language: 'cpp',
    category: 'Pointers & References',
    marksValue: 10,
    description: 'The swapValues function attempts to swap two integer variables, but it passes them by value, leaving the original caller variables unmodified.',
    buggyCode: `#include <iostream>

// BUG: Parameters are passed by value, local copies are swapped instead
void swapValues(int a, int b) {
    int temp = a;
    a = b;
    b = temp;
}

int main() {
    int x = 5, y = 10;
    swapValues(x, y);
    std::cout << "x=" << x << ", y=" << y << "\\n";
    return 0;
}`,
    fixedCode: `#include <iostream>

void swapValues(int &a, int &b) {
    int temp = a;
    a = b;
    b = temp;
}

int main() {
    int x = 5, y = 10;
    swapValues(x, y);
    std::cout << "x=" << x << ", y=" << y << "\\n";
    return 0;
}`,
    lineWithBug: 4,
    buggyLineContent: 'void swapValues(int a, int b) {',
    acceptedFixes: [
      'void swapValues(int &a, int &b) {',
      'void swapValues(int& a, int& b) {',
      'void swapValues(int & a, int & b) {',
      'int &a, int &b',
      'int& a, int& b'
    ],
    explanation: 'In C++, passing by value creates copies of arguments. Passing by reference (&) allows modifying the caller variables directly.',
    testCases: [
      { input: 'x=5, y=10', expectedOutput: 'x=10, y=5' }
    ],
    hints: ['Add reference symbols (&) to function parameters.']
  },
  {
    id: 'cpp-easy-3',
    title: 'Memory Leak on Dynamic Array Deallocation',
    difficulty: 'easy',
    language: 'cpp',
    category: 'Memory Management',
    marksValue: 10,
    description: 'The function processBuffer allocates a dynamic integer array with new[] but uses scalar delete instead of array delete[], causing memory leaks.',
    buggyCode: `#include <iostream>

void processBuffer(int size) {
    int* buffer = new int[size];
    for(int i = 0; i < size; ++i) buffer[i] = i * 2;
    
    // BUG: Scalar delete used for array allocated with new[]
    delete buffer;
}

int main() {
    processBuffer(100);
    std::cout << "Buffer processed\\n";
    return 0;
}`,
    fixedCode: `#include <iostream>

void processBuffer(int size) {
    int* buffer = new int[size];
    for(int i = 0; i < size; ++i) buffer[i] = i * 2;
    
    delete[] buffer;
}

int main() {
    processBuffer(100);
    std::cout << "Buffer processed\\n";
    return 0;
}`,
    lineWithBug: 8,
    buggyLineContent: '    delete buffer;',
    acceptedFixes: [
      'delete[] buffer;',
      'delete [] buffer;',
      'delete[] buffer',
      'delete [] buffer'
    ],
    explanation: 'In C++, memory allocated with new[] must be deallocated using delete[] to ensure proper cleanup.',
    testCases: [
      { input: 'size=100', expectedOutput: 'Buffer processed' }
    ],
    hints: ['Check the deallocation operator for arrays in C++ (delete[]).']
  },
  {
    id: 'cpp-easy-4',
    title: 'Dangling Pointer Returning Stack Address',
    difficulty: 'easy',
    language: 'cpp',
    category: 'Pointers & Lifetime',
    marksValue: 10,
    description: 'The function getMultiplier returns a pointer to a local stack variable that is destroyed when the function exits.',
    buggyCode: `#include <iostream>

int* getMultiplier() {
    // BUG: Returning address of local stack variable
    int factor = 42;
    return &factor;
}

int main() {
    int* p = getMultiplier();
    std::cout << "Factor: " << *p << "\\n";
    return 0;
}`,
    fixedCode: `#include <iostream>

int getMultiplier() {
    int factor = 42;
    return factor;
}

int main() {
    int p = getMultiplier();
    std::cout << "Factor: " << p << "\\n";
    return 0;
}`,
    lineWithBug: 3,
    buggyLineContent: 'int* getMultiplier() {',
    acceptedFixes: [
      'int getMultiplier() {',
      'static int factor = 42; return &factor;',
      'int getMultiplier()'
    ],
    explanation: 'Stack variables are destroyed when their function returns. Returning by value (int) avoids dangling pointers.',
    testCases: [
      { input: 'invoke getMultiplier', expectedOutput: 'Factor: 42' }
    ],
    hints: ['Return by value (int) instead of pointer to local variable.']
  },
  {
    id: 'cpp-easy-5',
    title: 'Uninitialized Accumulator Variable',
    difficulty: 'easy',
    language: 'cpp',
    category: 'Variables & State',
    marksValue: 10,
    description: 'The function computeTotal leaves total uninitialized with garbage stack memory, causing unpredictable results.',
    buggyCode: `#include <iostream>
#include <vector>

int computeTotal(const std::vector<int>& items) {
    // BUG: total is uninitialized garbage value
    int total;
    for (int n : items) total += n;
    return total;
}

int main() {
    std::cout << computeTotal({10, 20, 30}) << "\\n";
    return 0;
}`,
    fixedCode: `#include <iostream>
#include <vector>

int computeTotal(const std::vector<int>& items) {
    int total = 0;
    for (int n : items) total += n;
    return total;
}

int main() {
    std::cout << computeTotal({10, 20, 30}) << "\\n";
    return 0;
}`,
    lineWithBug: 6,
    buggyLineContent: '    int total;',
    acceptedFixes: [
      'int total = 0;',
      'int total{0};',
      'int total = 0'
    ],
    explanation: 'Local primitive variables in C++ are not default-initialized. Always initialize numeric accumulators to 0.',
    testCases: [
      { input: '{10, 20, 30}', expectedOutput: '60' }
    ],
    hints: ['Initialize total = 0;']
  },

  // =========================================================================
  // C++ PROBLEMS (INTERMEDIATE - 20 MARKS EACH)
  // =========================================================================
  {
    id: 'cpp-med-1',
    title: 'Vector Iterator Invalidation During Erase',
    difficulty: 'intermediate',
    language: 'cpp',
    category: 'STL Containers & Iterators',
    marksValue: 20,
    description: 'The C++ function removeEvenNumbers iterates through a std::vector and removes even values. However, erase() invalidates the iterator, causing undefined behavior on ++it.',
    buggyCode: `#include <iostream>
#include <vector>

void removeEvenNumbers(std::vector<int>& vec) {
    // BUG: erase() invalidates 'it', and ++it causes undefined behavior
    for (auto it = vec.begin(); it != vec.end(); ++it) {
        if (*it % 2 == 0) {
            vec.erase(it);
        }
    }
}

int main() {
    std::vector<int> data = {1, 2, 2, 3, 4, 5};
    removeEvenNumbers(data);
    for (int n : data) std::cout << n << " ";
    std::cout << "\\n";
    return 0;
}`,
    fixedCode: `#include <iostream>
#include <vector>

void removeEvenNumbers(std::vector<int>& vec) {
    for (auto it = vec.begin(); it != vec.end(); ) {
        if (*it % 2 == 0) {
            it = vec.erase(it);
        } else {
            ++it;
        }
    }
}

int main() {
    std::vector<int> data = {1, 2, 2, 3, 4, 5};
    removeEvenNumbers(data);
    for (int n : data) std::cout << n << " ";
    std::cout << "\\n";
    return 0;
}`,
    lineWithBug: 8,
    buggyLineContent: '            vec.erase(it);',
    acceptedFixes: [
      'it = vec.erase(it);',
      'it = vec.erase(it)',
      'vec.erase(std::remove_if(vec.begin(), vec.end(), [](int n){ return n % 2 == 0; }), vec.end());'
    ],
    explanation: 'std::vector::erase returns a new valid iterator pointing to the element following the removed one. Assign it = vec.erase(it).',
    testCases: [
      { input: '{1, 2, 2, 3, 4, 5}', expectedOutput: '1 3 5 ' }
    ],
    hints: ['Assign the return value of vec.erase(it) back to the iterator: it = vec.erase(it)']
  },
  {
    id: 'cpp-med-2',
    title: 'Missing Virtual Destructor in Polymorphic Base',
    difficulty: 'intermediate',
    language: 'cpp',
    category: 'Object Oriented & Memory',
    marksValue: 20,
    description: 'A polymorphic hierarchy allocates dynamic memory in Derived. Because Base does not declare a virtual destructor, deleting through a Base* leaks the Derived resources.',
    buggyCode: `#include <iostream>

class Base {
public:
    Base() { std::cout << "Base Constructed\\n"; }
    // BUG: Missing virtual destructor prevents Derived destructor from running
    ~Base() { std::cout << "Base Destroyed\\n"; }
};

class Derived : public Base {
private:
    int* data;
public:
    Derived() : data(new int[100]) { std::cout << "Derived Constructed\\n"; }
    ~Derived() {
        delete[] data;
        std::cout << "Derived Destroyed\\n";
    }
};

int main() {
    Base* ptr = new Derived();
    delete ptr;
    return 0;
}`,
    fixedCode: `#include <iostream>

class Base {
public:
    Base() { std::cout << "Base Constructed\\n"; }
    virtual ~Base() { std::cout << "Base Destroyed\\n"; }
};

class Derived : public Base {
private:
    int* data;
public:
    Derived() : data(new int[100]) { std::cout << "Derived Constructed\\n"; }
    ~Derived() {
        delete[] data;
        std::cout << "Derived Destroyed\\n";
    }
};

int main() {
    Base* ptr = new Derived();
    delete ptr;
    return 0;
}`,
    lineWithBug: 7,
    buggyLineContent: '    ~Base() { std::cout << "Base Destroyed\\n"; }',
    acceptedFixes: [
      'virtual ~Base() { std::cout << "Base Destroyed\\n"; }',
      'virtual ~Base() = default;',
      'virtual ~Base();',
      'virtual ~Base()'
    ],
    explanation: 'When deleting a derived class object through a base pointer, the base destructor must be virtual for proper polymorphic destruction.',
    testCases: [
      { input: 'Base* ptr = new Derived(); delete ptr;', expectedOutput: 'Derived Destroyed\nBase Destroyed' }
    ],
    hints: ['Add the virtual keyword to the base class destructor.']
  },

  // =========================================================================
  // C++ PROBLEMS (HARD - STEP-BY-STEP STEP EVALUATION - 100 TOTAL MARKS)
  // =========================================================================
  {
    id: 'cpp-hard-1',
    title: 'Lock-Free Treiber Stack ABA Pointer Race & Use-After-Free',
    difficulty: 'hard',
    language: 'cpp',
    category: 'Advanced Concurrency & Memory Model',
    marksValue: 100,
    stepRubric: [
      { stepName: 'Identify ABA Concurrency Hazard', maxMarks: 25, keywords: ['aba', 'tagged', 'hazard', 'epoch'], description: 'Recognizes the classic pointer-reuse ABA hazard in CAS operations.' },
      { stepName: 'Introduce Monotonic Version Tag / Tagged Pointer', maxMarks: 25, keywords: ['taggednode', 'taggedpointer', 'tag', 'version'], description: 'Replaces raw pointer with TaggedNode struct containing monotonic counter.' },
      { stepName: 'Correct Double-Word Atomic CAS', maxMarks: 25, keywords: ['compare_exchange_weak', 'head.load', 'memory_order'], description: 'Executes atomic CAS comparing both pointer and tag.' },
      { stepName: 'Memory Ordering Guarantees', maxMarks: 25, keywords: ['memory_order_release', 'memory_order_acquire', 'memory_order_relaxed'], description: 'Applies correct memory order acquire/release fences.' }
    ],
    description: 'This lock-free stack suffers from the ABA problem. In pop(), thread 1 loads head pointer. Other threads pop and free that node, allocate a new node at the same address, causing thread 1 CAS to succeed with corrupted next pointer.',
    buggyCode: `#include <iostream>
#include <atomic>
#include <thread>
#include <vector>

template <typename T>
class LockFreeStack {
private:
    struct Node {
        T data;
        Node* next;
        Node(const T& val) : data(val), next(nullptr) {}
    };

    // BUG: Raw pointer CAS without version tag or hazard pointer causes ABA corruption
    std::atomic<Node*> head{nullptr};

public:
    void push(const T& val) {
        Node* new_node = new Node(val);
        new_node->next = head.load(std::memory_order_relaxed);
        while (!head.compare_exchange_weak(new_node->next, new_node,
                                          std::memory_order_release,
                                          std::memory_order_relaxed));
    }

    bool pop(T& result) {
        Node* old_head = head.load(std::memory_order_acquire);
        while (old_head != nullptr) {
            Node* next_node = old_head->next;
            if (head.compare_exchange_weak(old_head, next_node,
                                          std::memory_order_release,
                                          std::memory_order_relaxed)) {
                result = old_head->data;
                delete old_head;
                return true;
            }
        }
        return false;
    }
};

int main() {
    LockFreeStack<int> stack;
    stack.push(42);
    int val;
    if (stack.pop(val)) {
        std::cout << "Popped: " << val << "\\n";
    }
    return 0;
}`,
    fixedCode: `#include <iostream>
#include <atomic>
#include <thread>
#include <vector>

template <typename T>
class LockFreeStack {
private:
    struct Node;
    struct TaggedNode {
        Node* ptr;
        uintptr_t tag;
    };
    
    struct Node {
        T data;
        TaggedNode next;
        Node(const T& val) : data(val), next{nullptr, 0} {}
    };

    std::atomic<TaggedNode> head{TaggedNode{nullptr, 0}};

public:
    void push(const T& val) {
        Node* new_node = new Node(val);
        TaggedNode current_head = head.load(std::memory_order_relaxed);
        do {
            new_node->next = current_head;
        } while (!head.compare_exchange_weak(
            current_head, 
            TaggedNode{new_node, current_head.tag + 1},
            std::memory_order_release, 
            std::memory_order_relaxed));
    }

    bool pop(T& result) {
        TaggedNode current_head = head.load(std::memory_order_acquire);
        while (current_head.ptr != nullptr) {
            TaggedNode next_node = current_head.ptr->next;
            if (head.compare_exchange_weak(
                current_head, 
                TaggedNode{next_node.ptr, current_head.tag + 1},
                std::memory_order_acquire, 
                std::memory_order_relaxed)) {
                result = current_head.ptr->data;
                delete current_head.ptr;
                return true;
            }
        }
        return false;
    }
};

int main() {
    LockFreeStack<int> stack;
    stack.push(42);
    int val;
    if (stack.pop(val)) {
        std::cout << "Popped: " << val << "\\n";
    }
    return 0;
}`,
    lineWithBug: 16,
    buggyLineContent: '    std::atomic<Node*> head{nullptr};',
    acceptedFixes: [
      'std::atomic<TaggedNode> head{TaggedNode{nullptr, 0}};',
      'std::atomic<TaggedPointer> head;',
      'TaggedNode',
      'TaggedPointer',
      'version counter',
      'hazard pointer',
      'epoch based reclamation',
      'tag + 1'
    ],
    explanation: 'The ABA problem occurs in lock-free structures when an address is recycled. Use a Tagged Pointer with a monotonic version tag or hazard pointers.',
    testCases: [
      { input: 'push(42), pop()', expectedOutput: 'Popped: 42' }
    ],
    hints: [
      'Identify the lock-free ABA hazard: pointer reuse in CAS.',
      'Use TaggedNode / TaggedPointer with version counters to detect ABA node recycling.'
    ]
  },

  // =========================================================================
  // JAVA PROBLEMS (EASY - 10 MARKS EACH)
  // =========================================================================
  {
    id: 'java-easy-1',
    title: 'String Reference Equality (== vs .equals())',
    difficulty: 'easy',
    language: 'java',
    category: 'Object Comparison',
    marksValue: 10,
    description: 'The Java method authenticate checks password equality using == instead of .equals(), causing authentication to fail for new String instances.',
    buggyCode: `public class Authenticator {
    public static boolean authenticate(String input, String expected) {
        // BUG: Reference comparison (==) instead of value comparison
        return input == expected;
    }

    public static void main(String[] args) {
        String entered = new String("secret123");
        String stored = "secret123";
        System.out.println(authenticate(entered, stored)); // Expected: true, Actual: false
    }
}`,
    fixedCode: `public class Authenticator {
    public static boolean authenticate(String input, String expected) {
        return input.equals(expected);
    }

    public static void main(String[] args) {
        String entered = new String("secret123");
        String stored = "secret123";
        System.out.println(authenticate(entered, stored));
    }
}`,
    lineWithBug: 4,
    buggyLineContent: '        return input == expected;',
    acceptedFixes: [
      'return input.equals(expected);',
      'return expected.equals(input);',
      'return input != null && input.equals(expected);',
      'input.equals(expected)'
    ],
    explanation: 'In Java, the == operator checks reference memory address equality, while .equals() compares character values.',
    testCases: [
      { input: 'entered="secret123", stored="secret123"', expectedOutput: 'true' }
    ],
    hints: ['Use the .equals() method to compare string contents in Java.']
  },
  {
    id: 'java-easy-2',
    title: 'Integer Division Truncation',
    difficulty: 'easy',
    language: 'java',
    category: 'Arithmetic & Types',
    marksValue: 10,
    description: 'The calculateAverage method computes the average of two integers. Because both are ints, integer division discards the decimal fraction.',
    buggyCode: `public class MathHelper {
    public static double calculateAverage(int a, int b) {
        // BUG: Integer division happens before assigning to double
        double average = (a + b) / 2;
        return average;
    }

    public static void main(String[] args) {
        System.out.println(calculateAverage(5, 4)); // Expected: 4.5, Actual: 4.0
    }
}`,
    fixedCode: `public class MathHelper {
    public static double calculateAverage(int a, int b) {
        double average = (a + b) / 2.0;
        return average;
    }

    public static void main(String[] args) {
        System.out.println(calculateAverage(5, 4));
    }
}`,
    lineWithBug: 4,
    buggyLineContent: '        double average = (a + b) / 2;',
    acceptedFixes: [
      'double average = (a + b) / 2.0;',
      'double average = (double)(a + b) / 2;',
      'double average = (double)(a + b) / 2.0;',
      'double average = ((double) a + b) / 2;',
      '(a + b) / 2.0',
      '(double)(a + b) / 2'
    ],
    explanation: 'Dividing two integers in Java produces an integer result. Dividing by 2.0 preserves floating-point precision.',
    testCases: [
      { input: '5, 4', expectedOutput: '4.5' }
    ],
    hints: ['Divide by 2.0 instead of 2.']
  },
  {
    id: 'java-easy-3',
    title: 'Null Pointer Dereference Check Order',
    difficulty: 'easy',
    language: 'java',
    category: 'Null Safety',
    marksValue: 10,
    description: 'The method getTrimmedLength evaluates .length() before checking if the string is null, triggering NullPointerException.',
    buggyCode: `public class StringValidator {
    public static int getTrimmedLength(String text) {
        // BUG: Checking length before null check causes NullPointerException
        if (text.trim().length() == 0 || text == null) {
            return 0;
        }
        return text.trim().length();
    }

    public static void main(String[] args) {
        System.out.println(getTrimmedLength(null)); // Throws NullPointerException!
    }
}`,
    fixedCode: `public class StringValidator {
    public static int getTrimmedLength(String text) {
        if (text == null || text.trim().length() == 0) {
            return 0;
        }
        return text.trim().length();
    }

    public static void main(String[] args) {
        System.out.println(getTrimmedLength(null));
    }
}`,
    lineWithBug: 4,
    buggyLineContent: '        if (text.trim().length() == 0 || text == null) {',
    acceptedFixes: [
      'if (text == null || text.trim().length() == 0) {',
      'if (text == null || text.trim().isEmpty()) {',
      'text == null || text.trim().length() == 0',
      'text == null || text.trim().isEmpty()'
    ],
    explanation: 'Short-circuit evaluation requires checking text == null first before invoking methods on text.',
    testCases: [
      { input: 'null', expectedOutput: '0' },
      { input: '"  hello  "', expectedOutput: '5' }
    ],
    hints: ['Place text == null first in the boolean expression.']
  },
  {
    id: 'java-easy-4',
    title: 'Array Index Boundary Off-By-One',
    difficulty: 'easy',
    language: 'java',
    category: 'Arrays & Loops',
    marksValue: 10,
    description: 'The printAllElements method iterates with index <= items.length, throwing ArrayIndexOutOfBoundsException.',
    buggyCode: `public class ArrayPrinter {
    public static void printAll(int[] items) {
        // BUG: Using <= items.length throws ArrayIndexOutOfBoundsException
        for (int i = 0; i <= items.length; i++) {
            System.out.print(items[i] + " ");
        }
    }

    public static void main(String[] args) {
        printAll(new int[]{1, 2, 3});
    }
}`,
    fixedCode: `public class ArrayPrinter {
    public static void printAll(int[] items) {
        for (int i = 0; i < items.length; i++) {
            System.out.print(items[i] + " ");
        }
    }

    public static void main(String[] args) {
        printAll(new int[]{1, 2, 3});
    }
}`,
    lineWithBug: 4,
    buggyLineContent: '        for (int i = 0; i <= items.length; i++) {',
    acceptedFixes: [
      'for (int i = 0; i < items.length; i++) {',
      'for (int i = 0; i < items.length; ++i) {',
      'i < items.length'
    ],
    explanation: 'Java arrays are 0-indexed up to length - 1. Loop with i < items.length.',
    testCases: [
      { input: '{1, 2, 3}', expectedOutput: '1 2 3 ' }
    ],
    hints: ['Change <= items.length to < items.length.']
  },
  {
    id: 'java-easy-5',
    title: 'Uninitialized Local Variable Accumulator',
    difficulty: 'easy',
    language: 'java',
    category: 'Variables & Scope',
    marksValue: 10,
    description: 'The sumArray method declares total without initializing it, causing a compiler error: variable total might not have been initialized.',
    buggyCode: `public class Calculator {
    public static int sumArray(int[] numbers) {
        // BUG: Local variable total is not initialized
        int total;
        for (int n : numbers) {
            total += n;
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(sumArray(new int[]{10, 20}));
    }
}`,
    fixedCode: `public class Calculator {
    public static int sumArray(int[] numbers) {
        int total = 0;
        for (int n : numbers) {
            total += n;
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(sumArray(new int[]{10, 20}));
    }
}`,
    lineWithBug: 4,
    buggyLineContent: '        int total;',
    acceptedFixes: [
      'int total = 0;',
      'int total = 0'
    ],
    explanation: 'Local variables in Java are not assigned default values and must be initialized before use.',
    testCases: [
      { input: '{10, 20}', expectedOutput: '30' }
    ],
    hints: ['Initialize total = 0;']
  },

  // =========================================================================
  // JAVA PROBLEMS (INTERMEDIATE - 20 MARKS EACH)
  // =========================================================================
  {
    id: 'java-med-1',
    title: 'ConcurrentModificationException in Collection Loop',
    difficulty: 'intermediate',
    language: 'java',
    category: 'Concurrency & Collections',
    marksValue: 20,
    description: 'The filterExpired method iterates over an ArrayList using a for-each loop while calling list.remove(), throwing ConcurrentModificationException.',
    buggyCode: `import java.util.*;

public class InventoryManager {
    public static void filterExpired(List<String> items) {
        // BUG: Modifying ArrayList during enhanced for-loop throws ConcurrentModificationException
        for (String item : items) {
            if (item.startsWith("EXPIRED_")) {
                items.remove(item);
            }
        }
    }

    public static void main(String[] args) {
        List<String> list = new ArrayList<>(Arrays.asList("EXPIRED_A", "FRESH_B", "EXPIRED_C"));
        filterExpired(list);
        System.out.println(list);
    }
}`,
    fixedCode: `import java.util.*;

public class InventoryManager {
    public static void filterExpired(List<String> items) {
        items.removeIf(item -> item.startsWith("EXPIRED_"));
    }

    public static void main(String[] args) {
        List<String> list = new ArrayList<>(Arrays.asList("EXPIRED_A", "FRESH_B", "EXPIRED_C"));
        filterExpired(list);
        System.out.println(list);
    }
}`,
    lineWithBug: 6,
    buggyLineContent: '        for (String item : items) {',
    acceptedFixes: [
      'items.removeIf(item -> item.startsWith("EXPIRED_"));',
      'items.removeIf(item -> item.startsWith("EXPIRED_"))',
      'Iterator<String> it = items.iterator(); while (it.hasNext()) { if (it.next().startsWith("EXPIRED_")) it.remove(); }',
      'items.removeIf'
    ],
    explanation: 'Modifying a collection during an enhanced for-loop triggers ConcurrentModificationException. Use Collection.removeIf(predicate).',
    testCases: [
      { input: '["EXPIRED_A", "FRESH_B", "EXPIRED_C"]', expectedOutput: '[FRESH_B]' }
    ],
    hints: ['Use list.removeIf(...) or an explicit Iterator with it.remove().']
  },
  {
    id: 'java-med-2',
    title: 'Autoboxing Cache Range Mismatch with ==',
    difficulty: 'intermediate',
    language: 'java',
    category: 'Autoboxing & Wrapper Types',
    marksValue: 20,
    description: 'The compareScores method checks equality of two Integer wrapper objects using ==. For values outside -128..127, == compares references instead of int values.',
    buggyCode: `public class ScoreChecker {
    public static boolean hasEqualScore(Integer score1, Integer score2) {
        // BUG: == on Integer wrapper fails for values outside the Byte cache (-128..127)
        return score1 == score2;
    }

    public static void main(String[] args) {
        Integer a = 1000;
        Integer b = 1000;
        System.out.println(hasEqualScore(a, b)); // Expected: true, Actual: false
    }
}`,
    fixedCode: `import java.util.Objects;

public class ScoreChecker {
    public static boolean hasEqualScore(Integer score1, Integer score2) {
        return Objects.equals(score1, score2);
    }

    public static void main(String[] args) {
        Integer a = 1000;
        Integer b = 1000;
        System.out.println(hasEqualScore(a, b));
    }
}`,
    lineWithBug: 4,
    buggyLineContent: '        return score1 == score2;',
    acceptedFixes: [
      'return Objects.equals(score1, score2);',
      'return score1.equals(score2);',
      'return score1.intValue() == score2.intValue();',
      'score1.equals(score2)',
      'Objects.equals(score1, score2)'
    ],
    explanation: 'Java caches Integer objects only between -128 and 127. Values outside this require .equals() or unboxing to int.',
    testCases: [
      { input: '1000, 1000', expectedOutput: 'true' }
    ],
    hints: ['Use score1.equals(score2) or Objects.equals(score1, score2).']
  },

  // =========================================================================
  // JAVA PROBLEMS (HARD - STEP-BY-STEP STEP EVALUATION - 100 TOTAL MARKS)
  // =========================================================================
  {
    id: 'java-hard-1',
    title: 'Double-Checked Locking Volatile Visibility Hazard',
    difficulty: 'hard',
    language: 'java',
    category: 'JVM Memory Model & Concurrency',
    marksValue: 100,
    stepRubric: [
      { stepName: 'Identify Instruction Reordering Hazard', maxMarks: 25, keywords: ['volatile', 'visibility', 'reorder', 'happens-before'], description: 'Identifies lack of volatile keyword causing CPU instruction reordering.' },
      { stepName: 'Apply volatile Field Modifier', maxMarks: 25, keywords: ['private static volatile', 'volatile ConnectionPool', 'volatile'], description: 'Declares instance variable with volatile modifier.' },
      { stepName: 'Maintain Thread-Safe Synchronized Block', maxMarks: 25, keywords: ['synchronized', 'ConnectionPool.class', 'getInstance'], description: 'Preserves synchronized class lock on double check.' },
      { stepName: 'Preserve Singleton Lazy Instantiation', maxMarks: 25, keywords: ['instance == null', 'new ConnectionPool()', 'return instance'], description: 'Safely instantiates and returns the shared singleton.' }
    ],
    description: 'In this Singleton with double-checked locking, the instance field is missing volatile. Due to CPU instruction reordering, another thread can observe a partially constructed non-null instance.',
    buggyCode: `public class ConnectionPool {
    // BUG: Missing volatile allows instruction reordering exposing uninitialized object
    private static ConnectionPool instance;

    private ConnectionPool() {
    }

    public static ConnectionPool getInstance() {
        if (instance == null) {
            synchronized (ConnectionPool.class) {
                if (instance == null) {
                    instance = new ConnectionPool();
                }
            }
        }
        return instance;
    }
}`,
    fixedCode: `public class ConnectionPool {
    private static volatile ConnectionPool instance;

    private ConnectionPool() {
    }

    public static ConnectionPool getInstance() {
        if (instance == null) {
            synchronized (ConnectionPool.class) {
                if (instance == null) {
                    instance = new ConnectionPool();
                }
            }
        }
        return instance;
    }
}`,
    lineWithBug: 3,
    buggyLineContent: '    private static ConnectionPool instance;',
    acceptedFixes: [
      'private static volatile ConnectionPool instance;',
      'volatile ConnectionPool instance',
      'private static volatile ConnectionPool instance = null;'
    ],
    explanation: 'In Java Double-Checked Locking, the instance variable MUST be declared volatile to prevent instruction reordering.',
    testCases: [
      { input: 'getInstance() across threads', expectedOutput: 'Safe Singleton Instance' }
    ],
    hints: [
      'Remember the Java Memory Model requirements for double-checked locking: what keyword prevents CPU instruction reordering?'
    ]
  }
];

// ---------------------------------------------------------------------------
// Smart Question Selection & Randomization Engine
// ---------------------------------------------------------------------------

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Retrieve problems strictly tailored to the participant's chosen language track and difficulty.
 * - EASY: Exactly 10 questions (10 marks each = 100/100)
 * - INTERMEDIATE: Exactly 5 questions (20 marks each = 100/100)
 * - HARD: Concurrency and multi-step questions with step-by-step scoring
 */
export function getProblems(difficulty: Difficulty, languageTrack: LanguageTrack = 'all'): Problem[] {
  const normalizedDifficulty: Difficulty = 
    difficulty === 'medium' ? 'intermediate' : 
    difficulty === 'master' ? 'hard' : difficulty;

  let pool = PROBLEMS_DATABASE.filter(p => {
    const pDiff = p.difficulty === 'medium' ? 'intermediate' : p.difficulty;
    return pDiff === normalizedDifficulty;
  });

  let selected: Problem[] = [];

  if (languageTrack !== 'all') {
    const trackPool = shuffleArray(pool.filter(p => p.language === languageTrack));
    // If not enough questions in pure track, fallback to entire pool
    if (normalizedDifficulty === 'easy') {
      if (trackPool.length >= 10) {
        selected = trackPool.slice(0, 10);
      } else {
        const remaining = shuffleArray(pool.filter(p => p.language !== languageTrack));
        selected = [...trackPool, ...remaining].slice(0, 10);
      }
    } else if (normalizedDifficulty === 'intermediate') {
      if (trackPool.length >= 5) {
        selected = trackPool.slice(0, 5);
      } else {
        const remaining = shuffleArray(pool.filter(p => p.language !== languageTrack));
        selected = [...trackPool, ...remaining].slice(0, 5);
      }
    } else {
      selected = trackPool.length > 0 ? trackPool.slice(0, 5) : shuffleArray(pool).slice(0, 5);
    }
  } else {
    // Polyglot / Mixed Track: Balanced sampling across all 3 languages
    const py = shuffleArray(pool.filter(p => p.language === 'python'));
    const cpp = shuffleArray(pool.filter(p => p.language === 'cpp'));
    const java = shuffleArray(pool.filter(p => p.language === 'java'));

    const balancedList: Problem[] = [];
    const maxLen = Math.max(py.length, cpp.length, java.length);
    for (let i = 0; i < maxLen; i++) {
      if (py[i]) balancedList.push(py[i]);
      if (cpp[i]) balancedList.push(cpp[i]);
      if (java[i]) balancedList.push(java[i]);
    }

    if (normalizedDifficulty === 'easy') {
      selected = shuffleArray(balancedList).slice(0, 10);
    } else if (normalizedDifficulty === 'intermediate') {
      selected = shuffleArray(balancedList).slice(0, 5);
    } else {
      selected = shuffleArray(balancedList).slice(0, 5);
    }
  }

  return selected;
}

export function getProblemsByDifficulty(difficulty: Difficulty): Problem[] {
  const normalizedDifficulty: Difficulty = 
    difficulty === 'medium' ? 'intermediate' : 
    difficulty === 'master' ? 'hard' : difficulty;
  return shuffleArray(PROBLEMS_DATABASE.filter(p => {
    const pDiff = p.difficulty === 'medium' ? 'intermediate' : p.difficulty;
    return pDiff === normalizedDifficulty;
  }));
}

export function getProblemById(id: string): Problem | undefined {
  return PROBLEMS_DATABASE.find(p => p.id === id);
}
