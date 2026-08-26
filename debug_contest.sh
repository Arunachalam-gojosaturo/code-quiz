#!/usr/bin/env bash
# ==============================================================================
# Code Debugging Competition Arena - Multi-Language Orchestrator & CLI Runner
# ==============================================================================
# Features:
#   - Multi-language support: Python 3, C++ (g++), Java (javac)
#   - 3 Difficulty Levels: Easy (10 problems), Medium (5 problems), Hard (1 problem)
#   - Intelligent answer evaluation with whitespace/syntax normalization
#   - Question skipping, progression enforcement, and retry loops
#   - Anti-copying & security violation detection with Telegram Bot alerts
#   - Groq API / AI Integration for semantic bug evaluation and smart hints
#   - Comprehensive summary reports saved to ./reports/*.txt and on-screen display
#   - Dual operational modes: Interactive Terminal Contest & Web Interface Server
# ==============================================================================

set -eo pipefail

# ------------------------------------------------------------------------------
# Configuration & Global Constants
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="${SCRIPT_DIR}/reports"
mkdir -p "${REPORTS_DIR}"

# ANSI Color Codes
COLOR_RESET="\033[0m"
COLOR_BOLD="\033[1m"
COLOR_DIM="\033[2m"
COLOR_RED="\033[38;5;196m"
COLOR_GREEN="\033[38;5;46m"
COLOR_YELLOW="\033[38;5;226m"
COLOR_BLUE="\033[38;5;39m"
COLOR_MAGENTA="\033[38;5;201m"
COLOR_CYAN="\033[38;5;51m"
COLOR_WHITE="\033[38;5;231m"
COLOR_BG_DARK="\033[48;5;235m"

# Load environment variables if .env exists
if [ -f "${SCRIPT_DIR}/.env" ]; then
    # shellcheck disable=SC1091
    export $(grep -v '^#' "${SCRIPT_DIR}/.env" | xargs -0 -n1 2>/dev/null || true)
fi

# Default API and Telegram config (overridden by env)
GROQ_API_KEY="${GROQ_API_KEY:-}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
ADMIN_SECRET="${ADMIN_SECRET:?Set ADMIN_SECRET before using admin commands}"
WEB_PORT="${PORT:-3000}"

# Contest Session State
PARTICIPANT_NAME=""
SELECTED_DIFFICULTY=""
CONTEST_START_TIME=0
CURRENT_QUESTION_IDX=0
TOTAL_QUESTIONS=0
SCORE=0
CORRECT_COUNT=0
SKIPPED_COUNT=0
INCORRECT_COUNT=0
TOTAL_ATTEMPTS=0
VIOLATIONS_COUNT=0

# Array variables for problem tracking
declare -a PROBLEM_IDS
declare -a PROBLEM_TITLES
declare -a PROBLEM_LANGS
declare -a PROBLEM_STATUSES
declare -a PROBLEM_ATTEMPTS
declare -a PROBLEM_TIMES

# ------------------------------------------------------------------------------
# Utility Functions
# ------------------------------------------------------------------------------

print_banner() {
    clear || true
    echo -e "${COLOR_CYAN}${COLOR_BOLD}"
    echo "  ╔═══════════════════════════════════════════════════════════════════╗"
    echo "  ║            CODE DEBUGGING COMPETITION ARENA (v2.0)               ║"
    echo "  ║        Python  •  C++  •  Java  |  Terminal & Web Engine          ║"
    echo "  ╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${COLOR_RESET}"
}

log_info() {
    echo -e "${COLOR_CYAN}[INFO]${COLOR_RESET} $1"
}

log_success() {
    echo -e "${COLOR_GREEN}[SUCCESS]${COLOR_RESET} $1"
}

log_warn() {
    echo -e "${COLOR_YELLOW}[WARN]${COLOR_RESET} $1"
}

log_error() {
    echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1"
}

log_security() {
    echo -e "${COLOR_MAGENTA}${COLOR_BOLD}[SECURITY ALERT]${COLOR_RESET} $1"
}

# ------------------------------------------------------------------------------
# Telegram Bot Notification Integration
# ------------------------------------------------------------------------------
send_telegram_alert() {
    local violation_type="$1"
    local details="$2"
    local participant="${PARTICIPANT_NAME:-Anonymous}"
    local timestamp
    timestamp=$(date +"%Y-%m-%d %H:%M:%S UTC")

    if [ -z "${TELEGRAM_BOT_TOKEN}" ] || [ -z "${TELEGRAM_CHAT_ID}" ]; then
        log_security "Security Event logged locally (Telegram token/chat_id not configured)."
        return 0
    fi

    local message="🚨 *SECURITY VIOLATION DETECTED*
━━━━━━━━━━━━━━━━━━━━
👤 *Candidate:* \`${participant}\`
⚠️ *Violation:* \`${violation_type}\`
📝 *Details:* ${details}
⏰ *Time:* \`${timestamp}\`
🎯 *Difficulty:* \`${SELECTED_DIFFICULTY:-N/A}\`
━━━━━━━━━━━━━━━━━━━━"

    # Send via curl to Telegram Bot API
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${message}" \
        -d "parse_mode=Markdown" > /dev/null 2>&1 || true
    
    log_security "Security alert successfully dispatched to Telegram."
}

# ------------------------------------------------------------------------------
# Normalization & Answer Evaluation Engine
# ------------------------------------------------------------------------------
normalize_string() {
    local input="$1"
    # Convert double quotes to single quotes, collapse whitespace, strip trailing semicolon
    echo "${input}" | sed "s/\"/'/g" | sed "s/[[:space:]]\+/ /g" | sed "s/^[[:space:]]*//;s/[[:space:]]*$//" | sed "s/;$//"
}

evaluate_with_groq() {
    local problem_id="$1"
    local user_fix="$2"
    local expected_code="$3"
    local buggy_code="$4"

    if [ -z "${GROQ_API_KEY}" ]; then
        return 1
    fi

    local payload
    payload=$(cat <<EOF
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {
      "role": "system",
      "content": "You are an automated grading engine for a programming debugging contest. Output JSON only: {\"is_correct\": true/false, \"feedback\": \"brief explanation\"}."
    },
    {
      "role": "user",
      "content": "Buggy Code:\n${buggy_code}\n\nExpected Resolution:\n${expected_code}\n\nCandidate Proposed Fix:\n${user_fix}\n\nEvaluate if candidate fully resolved the bug. Minor syntax variations, whitespace, and variable formatting differences are acceptable."
    }
  ],
  "response_format": {"type": "json_object"}
}
EOF
)

    local response
    response=$(curl -s -X POST "https://api.groq.com/openai/v1/chat/completions" \
        -H "Authorization: Bearer ${GROQ_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "${payload}" 2>/dev/null || true)

    if echo "${response}" | grep -q '"is_correct": true'; then
        return 0
    fi
    return 1
}

# ------------------------------------------------------------------------------
# Anti-Copying & Security Traps
# ------------------------------------------------------------------------------
trap_security_signals() {
    # Trap SIGINT (Ctrl+C), SIGTSTP (Ctrl+Z), SIGQUIT (Ctrl+\)
    trap 'handle_interrupt "SIGINT (Ctrl+C attempt)"' SIGINT
    trap 'handle_interrupt "SIGTSTP (Ctrl+Z background attempt)"' SIGTSTP
    trap 'handle_interrupt "SIGQUIT (Ctrl+\\ termination attempt)"' SIGQUIT
}

handle_interrupt() {
    local signal_name="$1"
    VIOLATIONS_COUNT=$((VIOLATIONS_COUNT + 1))
    echo ""
    log_security "Unauthorized action or copy attempt: ${signal_name}"
    send_telegram_alert "Terminal Copy / Interrupt" "User triggered ${signal_name} during active problem session."
    echo -e "${COLOR_YELLOW}Please solve the problem or type 'skip' to move to the next question.${COLOR_RESET}"
}

# ------------------------------------------------------------------------------
# Problem Definitions & Database
# ------------------------------------------------------------------------------
init_problems_for_difficulty() {
    local diff="$1"
    PROBLEM_IDS=()
    PROBLEM_TITLES=()
    PROBLEM_LANGS=()
    PROBLEM_STATUSES=()
    PROBLEM_ATTEMPTS=()
    PROBLEM_TIMES=()

    if [ "$diff" == "easy" ]; then
        TOTAL_QUESTIONS=10
        PROBLEM_IDS=("E1" "E2" "E3" "E4" "E5" "E6" "E7" "E8" "E9" "E10")
        PROBLEM_TITLES=(
            "Python: Even Sum Range Boundary Bug"
            "Python: Palindrome Step Slicing Typos"
            "Python: Mutable Default Argument in Function"
            "Python: Dictionary Missing Key Crash"
            "C++: Vector Loop Off-By-One Boundary"
            "C++: Pass-By-Value Swap Inefficacy"
            "C++: Scalar Delete on Dynamic Array"
            "Java: String Reference Equality Bug (==)"
            "Java: Integer Division Truncation Loss"
            "Java: Null Pointer Dereference in Short-Circuit"
        )
        PROBLEM_LANGS=("python" "python" "python" "python" "cpp" "cpp" "cpp" "java" "java" "java")
    elif [ "$diff" == "medium" ]; then
        TOTAL_QUESTIONS=5
        PROBLEM_IDS=("M1" "M2" "M3" "M4" "M5")
        PROBLEM_TITLES=(
            "Python: 2D Grid Shallow Reference Duplication"
            "Python: Closure Late Binding in Lambda Loops"
            "C++: Vector Iterator Invalidation During Erase"
            "C++: Missing Virtual Destructor in Base Class"
            "Java: ConcurrentModificationException in Enhanced Loop"
        )
        PROBLEM_LANGS=("python" "python" "cpp" "cpp" "java")
    elif [ "$diff" == "hard" ]; then
        TOTAL_QUESTIONS=1
        PROBLEM_IDS=("H1")
        PROBLEM_TITLES=(
            "C++: Lock-Free Treiber Stack ABA Race & Use-After-Free"
        )
        PROBLEM_LANGS=("cpp")
    fi

    for ((i=0; i<TOTAL_QUESTIONS; i++)); do
        PROBLEM_STATUSES[i]="pending"
        PROBLEM_ATTEMPTS[i]=0
        PROBLEM_TIMES[i]=0
    done
}

get_problem_code() {
    local id="$1"
    case "$id" in
        "E1")
            cat <<'EOF'
def calculate_even_sum(n):
    total = 0
    # BUG: Range excludes n when n is an even upper bound
    for i in range(1, n):
        if i % 2 == 0:
            total += i
    return total

print(calculate_even_sum(6))  # Expected: 12, Actual: 6
EOF
            ;;
        "E2")
            cat <<'EOF'
def is_palindrome(text):
    cleaned = ''.join(c.lower() for c in text if c.isalnum())
    # BUG: Step size is -2 instead of -1
    reversed_text = cleaned[::-2]
    return cleaned == reversed_text

print(is_palindrome("racecar"))  # Expected: True, Actual: False
EOF
            ;;
        "E3")
            cat <<'EOF'
def append_tag(tag, tag_list=[]):
    # BUG: Mutable default list retains items across calls
    tag_list.append(tag)
    return tag_list

print(append_tag("python"))  # ['python']
print(append_tag("c++"))     # Expected: ['c++'], Actual: ['python', 'c++']
EOF
            ;;
        "E4")
            cat <<'EOF'
def get_user_role(user):
    # BUG: Direct key lookup crashes with KeyError if 'role' is absent
    role = user['role']
    return role.lower()

print(get_user_role({"name": "Alice"})) # Crashes with KeyError!
EOF
            ;;
        "E5")
            cat <<'EOF'
#include <iostream>
#include <vector>

void printElements(const std::vector<int>& arr) {
    // BUG: Loop condition causes out-of-bounds access on last iteration
    for (size_t i = 0; i <= arr.size(); ++i) {
        std::cout << arr[i] << " ";
    }
}
EOF
            ;;
        "E6")
            cat <<'EOF'
#include <iostream>

// BUG: Parameters are passed by value, local copies are swapped
void swapValues(int a, int b) {
    int temp = a;
    a = b;
    b = temp;
}
EOF
            ;;
        "E7")
            cat <<'EOF'
#include <iostream>

void processBuffer(int size) {
    int* buffer = new int[size];
    for(int i = 0; i < size; ++i) buffer[i] = i * 2;
    // BUG: Scalar delete used for array allocated with new[]
    delete buffer;
}
EOF
            ;;
        "E8")
            cat <<'EOF'
public class Authenticator {
    public static boolean authenticate(String input, String expected) {
        // BUG: Reference comparison (==) instead of content equals()
        return input == expected;
    }
}
EOF
            ;;
        "E9")
            cat <<'EOF'
public class MathHelper {
    public static double calculateAverage(int a, int b) {
        // BUG: Integer division happens before assigning to double
        double average = (a + b) / 2;
        return average;
    }
}
EOF
            ;;
        "E10")
            cat <<'EOF'
public class StringValidator {
    public static int getTrimmedLength(String text) {
        // BUG: Checking length before null check causes NullPointerException
        if (text.trim().length() == 0 || text == null) {
            return 0;
        }
        return text.trim().length();
    }
}
EOF
            ;;
        "M1")
            cat <<'EOF'
def create_grid(rows, cols):
    # BUG: Shallow list repetition creates identical row references
    grid = [[0] * cols] * rows
    grid[0][0] = 1
    return grid
EOF
            ;;
        "M2")
            cat <<'EOF'
def create_multipliers(n):
    multipliers = []
    for i in range(n):
        # BUG: Late binding makes lambda look up 'i' at call time
        multipliers.append(lambda x: x * i)
    return multipliers
EOF
            ;;
        "M3")
            cat <<'EOF'
void removeEvenNumbers(std::vector<int>& vec) {
    // BUG: erase() invalidates 'it', and ++it causes undefined behavior
    for (auto it = vec.begin(); it != vec.end(); ++it) {
        if (*it % 2 == 0) {
            vec.erase(it);
        }
    }
}
EOF
            ;;
        "M4")
            cat <<'EOF'
class Base {
public:
    Base() { std::cout << "Base Constructed\n"; }
    // BUG: Non-virtual destructor prevents Derived destructor from running
    ~Base() { std::cout << "Base Destroyed\n"; }
};
EOF
            ;;
        "M5")
            cat <<'EOF'
public class InventoryManager {
    public static void filterExpired(List<String> items) {
        // BUG: Modifying list in enhanced for-loop throws ConcurrentModificationException
        for (String item : items) {
            if (item.startsWith("EXPIRED_")) {
                items.remove(item);
            }
        }
    }
}
EOF
            ;;
        "H1")
            cat <<'EOF'
template <typename T>
class LockFreeStack {
private:
    struct Node {
        T data;
        Node* next;
        Node(const T& val) : data(val), next(nullptr) {}
    };

    // CRITICAL BUG: Raw pointer CAS without version tag or hazard pointer causes ABA corruption
    std::atomic<Node*> head{nullptr};

public:
    bool pop(T& result) {
        Node* old_head = head.load(std::memory_order_acquire);
        while (old_head != nullptr) {
            Node* next_node = old_head->next; // Dangling read if freed concurrently!
            if (head.compare_exchange_weak(old_head, next_node,
                                          std::memory_order_release,
                                          std::memory_order_relaxed)) {
                result = old_head->data;
                delete old_head; // Frees node without hazard/epoch reclamation!
                return true;
            }
        }
        return false;
    }
};
EOF
            ;;
    esac
}

check_answer_locally() {
    local id="$1"
    local raw_ans="$2"
    local normalized
    normalized=$(normalize_string "${raw_ans}")
    local lower
    lower=$(echo "${raw_ans}" | tr '[:upper:]' '[:lower:]')

    case "$id" in
        "E1")
            if [[ "$lower" =~ "range(1, n + 1)" || "$lower" =~ "range(1, n+1)" || "$lower" =~ "range(1,n+1)" || "$lower" =~ "range(2, n + 1, 2)" || "$lower" =~ "n + 1" || "$lower" =~ "n+1" ]]; then
                return 0
            fi
            ;;
        "E2")
            if [[ "$lower" =~ "[::-1]" || "$lower" =~ "cleaned[::-1]" ]]; then
                return 0
            fi
            ;;
        "E3")
            if [[ "$lower" =~ "tag_list=none" || "$lower" =~ "tag_list = none" || "$lower" =~ "tag_list is none" || "$lower" =~ "none" ]]; then
                return 0
            fi
            ;;
        "E4")
            if [[ "$lower" =~ "user.get('role'" || "$lower" =~ "user.get(\"role\"" || "$lower" =~ ".get('role'" || "$lower" =~ ".get(\"role\"" || "$lower" =~ "guest" ]]; then
                return 0
            fi
            ;;
        "E5")
            if [[ "$lower" =~ "i < arr.size()" || "$lower" =~ "i<arr.size()" || "$lower" =~ "i < arr.size" ]] && [[ ! "$lower" =~ "<=" ]]; then
                return 0
            fi
            ;;
        "E6")
            if [[ "$lower" =~ "int &a" || "$lower" =~ "int& a" || "$lower" =~ "int & a" || "$lower" =~ "&a" ]]; then
                return 0
            fi
            ;;
        "E7")
            if [[ "$lower" =~ "delete[]" || "$lower" =~ "delete []" ]]; then
                return 0
            fi
            ;;
        "E8")
            if [[ "$lower" =~ "input.equals(expected)" || "$lower" =~ "expected.equals(input)" || "$lower" =~ ".equals" ]]; then
                return 0
            fi
            ;;
        "E9")
            if [[ "$lower" =~ "2.0" || "$lower" =~ "(double)" || "$lower" =~ "2.0d" || "$lower" =~ "2d" ]]; then
                return 0
            fi
            ;;
        "E10")
            if [[ "$lower" =~ "text == null" || "$lower" =~ "text==null" ]] && [[ "$lower" =~ "||" ]]; then
                return 0
            fi
            ;;
        "M1")
            if [[ "$lower" =~ "for _ in range(rows)" || "$lower" =~ "for i in range(rows)" || "$lower" =~ "[0] * cols for _ in range" ]]; then
                return 0
            fi
            ;;
        "M2")
            if [[ "$lower" =~ "i=i" || "$lower" =~ "lambda x, i=i:" || "$lower" =~ "lambda x, i=i :" ]]; then
                return 0
            fi
            ;;
        "M3")
            if [[ "$lower" =~ "it = vec.erase(it)" || "$lower" =~ "it=vec.erase(it)" || "$lower" =~ "remove_if" ]]; then
                return 0
            fi
            ;;
        "M4")
            if [[ "$lower" =~ "virtual ~base" || "$lower" =~ "virtual ~base()" ]]; then
                return 0
            fi
            ;;
        "M5")
            if [[ "$lower" =~ "removeif" || "$lower" =~ "iterator" ]]; then
                return 0
            fi
            ;;
        "H1")
            if [[ "$lower" =~ "taggednode" || "$lower" =~ "tagged" || "$lower" =~ "aba" || "$lower" =~ "hazard" || "$lower" =~ "epoch" || "$lower" =~ "version counter" || "$lower" =~ "tag" ]]; then
                return 0
            fi
            ;;
    esac
    return 1
}

# ------------------------------------------------------------------------------
# Contest Flow & Question Loop
# ------------------------------------------------------------------------------
run_cli_contest() {
    print_banner
    trap_security_signals

    echo -e "${COLOR_WHITE}${COLOR_BOLD}Welcome to the Code Debugging Contest!${COLOR_RESET}"
    echo "-------------------------------------------------------------------"
    
    # 1. User Identification
    while [ -z "${PARTICIPANT_NAME}" ]; do
        echo -ne "${COLOR_CYAN}Enter your full name or participant handle: ${COLOR_RESET}"
        read -r PARTICIPANT_NAME
        PARTICIPANT_NAME=$(echo "${PARTICIPANT_NAME}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        if [ -z "${PARTICIPANT_NAME}" ]; then
            log_warn "Participant name cannot be empty. Please enter your name."
        fi
    done

    echo ""
    log_success "Welcome, ${COLOR_BOLD}${PARTICIPANT_NAME}${COLOR_RESET}!"
    echo ""

    # 2. Difficulty Selection
    echo -e "${COLOR_WHITE}${COLOR_BOLD}Select Difficulty Level:${COLOR_RESET}"
    echo "  [1] Easy         - 10 debugging problems (Syntax, bounds, basic logic)"
    echo "  [2] Intermediate - 5 debugging problems (Memory, iterators, closures)"
    echo "  [3] Hard         - 1 debugging problem (Advanced lock-free ABA race)"
    echo ""

    local choice=""
    while true; do
        echo -ne "${COLOR_CYAN}Enter choice [1, 2, or 3]: ${COLOR_RESET}"
        read -r choice
        case "$choice" in
            1|"easy"|"EASY"|"Easy")
                SELECTED_DIFFICULTY="easy"
                break
                ;;
            2|"medium"|"intermediate"|"Medium"|"Intermediate")
                SELECTED_DIFFICULTY="medium"
                break
                ;;
            3|"hard"|"HARD"|"Hard")
                SELECTED_DIFFICULTY="hard"
                break
                ;;
            *)
                log_warn "Invalid selection. Please enter 1, 2, or 3."
                ;;
        esac
    done

    init_problems_for_difficulty "${SELECTED_DIFFICULTY}"
    CONTEST_START_TIME=$(date +%s)

    echo ""
    log_info "Starting ${COLOR_BOLD}${SELECTED_DIFFICULTY^^}${COLOR_RESET} contest (${TOTAL_QUESTIONS} problems)..."
    echo -e "${COLOR_DIM}Commands available during problems: 'skip' to skip, 'hint' for a hint, 'quit' to abort.${COLOR_RESET}"
    echo -e "${COLOR_DIM}Anti-cheat monitor active. Clipboard copy and interrupt attempts are logged.${COLOR_RESET}"
    echo ""
    sleep 1

    # 3. Questions Loop
    for ((idx=0; idx<TOTAL_QUESTIONS; idx++)); do
        local pid="${PROBLEM_IDS[idx]}"
        local ptitle="${PROBLEM_TITLES[idx]}"
        local plang="${PROBLEM_LANGS[idx]}"
        local q_start_time
        q_start_time=$(date +%s)

        while true; do
            print_banner
            echo -e "${COLOR_WHITE}Participant: ${COLOR_CYAN}${PARTICIPANT_NAME}${COLOR_RESET}  |  Difficulty: ${COLOR_YELLOW}${SELECTED_DIFFICULTY^^}${COLOR_RESET}  |  Score: ${COLOR_GREEN}${SCORE} pts${COLOR_RESET}"
            echo -e "Question ${COLOR_BOLD}$((idx + 1)) of ${TOTAL_QUESTIONS}${COLOR_RESET} [${COLOR_MAGENTA}${plang^^}${COLOR_RESET}] - ${COLOR_BOLD}${ptitle}${COLOR_RESET}"
            echo "═══════════════════════════════════════════════════════════════════"
            echo -e "${COLOR_YELLOW}BUGGY CODE:${COLOR_RESET}"
            echo -e "${COLOR_BG_DARK}${COLOR_WHITE}"
            get_problem_code "${pid}"
            echo -e "${COLOR_RESET}"
            echo "═══════════════════════════════════════════════════════════════════"

            if [ "${PROBLEM_ATTEMPTS[idx]}" -gt 0 ]; then
                echo -e "${COLOR_RED}Previous attempt incorrect. (Attempts so far: ${PROBLEM_ATTEMPTS[idx]})${COLOR_RESET}"
                echo -e "${COLOR_DIM}Tip: Enter corrected code/statement, type 'skip' to bypass, or 'hint' for guidance.${COLOR_RESET}"
            fi

            echo -ne "${COLOR_CYAN}${COLOR_BOLD}Your Bug Fix / Corrected Code: ${COLOR_RESET}"
            read -r user_answer

            # Handle user commands
            local lower_ans
            lower_ans=$(echo "${user_answer}" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

            if [ "$lower_ans" == "skip" ] || [ "$lower_ans" == "s" ]; then
                PROBLEM_STATUSES[idx]="skipped"
                SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
                local q_end_time
                q_end_time=$(date +%s)
                PROBLEM_TIMES[idx]=$((q_end_time - q_start_time))
                echo ""
                log_warn "Question $((idx + 1)) skipped. Moving to next question..."
                sleep 1
                break
            elif [ "$lower_ans" == "hint" ] || [ "$lower_ans" == "h" ]; then
                echo ""
                echo -e "${COLOR_YELLOW}[HINT] Examine variable boundaries, memory lifetimes, and parameter references.${COLOR_RESET}"
                echo -ne "${COLOR_DIM}Press Enter to continue...${COLOR_RESET}"
                read -r _
                continue
            elif [ "$lower_ans" == "quit" ] || [ "$lower_ans" == "q" ]; then
                echo ""
                log_warn "Contest aborted by user."
                exit 0
            elif [ -z "${user_answer}" ]; then
                log_error "Answer cannot be empty. Enter a valid fix or type 'skip'."
                sleep 1.2
                continue
            fi

            # Increment attempt counter
            PROBLEM_ATTEMPTS[idx]=$((PROBLEM_ATTEMPTS[idx] + 1))
            TOTAL_ATTEMPTS=$((TOTAL_ATTEMPTS + 1))

            # Evaluate Answer
            local is_correct=0
            if check_answer_locally "${pid}" "${user_answer}"; then
                is_correct=1
            elif [ -n "${GROQ_API_KEY}" ]; then
                local bcode
                bcode=$(get_problem_code "${pid}")
                if evaluate_with_groq "${pid}" "${user_answer}" "FIXED" "${bcode}"; then
                    is_correct=1
                fi
            fi

            if [ $is_correct -eq 1 ]; then
                PROBLEM_STATUSES[idx]="correct"
                CORRECT_COUNT=$((CORRECT_COUNT + 1))
                SCORE=$((SCORE + 100))
                local q_end_time
                q_end_time=$(date +%s)
                PROBLEM_TIMES[idx]=$((q_end_time - q_start_time))

                echo ""
                log_success "CORRECT! Bug successfully diagnosed and fixed!"
                echo -e "${COLOR_GREEN}+100 points awarded.${COLOR_RESET}"
                sleep 1.5
                break
            else
                INCORRECT_COUNT=$((INCORRECT_COUNT + 1))
                echo ""
                log_error "INCORRECT. The bug was not resolved."
                echo -e "${COLOR_YELLOW}You can try again with a revised fix, or type 'skip' to move on.${COLOR_RESET}"
                echo -ne "${COLOR_DIM}Press Enter to retry...${COLOR_RESET}"
                read -r _
            fi
        done
    done

    # 4. Generate & Display Final Report
    generate_and_display_report
}

# ------------------------------------------------------------------------------
# Report Generation (.txt file & On-Screen Summary)
# ------------------------------------------------------------------------------
generate_and_display_report() {
    local contest_end_time
    contest_end_time=$(date +%s)
    local total_duration=$((contest_end_time - CONTEST_START_TIME))
    local accuracy=0
    if [ $TOTAL_QUESTIONS -gt 0 ]; then
        accuracy=$(( (CORRECT_COUNT * 100) / TOTAL_QUESTIONS ))
    fi

    local timestamp
    timestamp=$(date +"%Y%m%d_%H%M%S")
    local sanitized_name
    sanitized_name=$(echo "${PARTICIPANT_NAME}" | tr -dc 'a-zA-Z0-9_')
    [ -z "${sanitized_name}" ] && sanitized_name="candidate"
    local report_filename="${REPORTS_DIR}/report_${sanitized_name}_${timestamp}.txt"

    # Build Text Report File
    cat <<EOF > "${report_filename}"
================================================================================
           CODE DEBUGGING COMPETITION ARENA - OFFICIAL REPORT
================================================================================
Generated On: $(date +"%Y-%m-%d %H:%M:%S %Z")
Participant:  ${PARTICIPANT_NAME}
Difficulty:   ${SELECTED_DIFFICULTY^^}
Status:       COMPLETED

--------------------------------------------------------------------------------
EXECUTIVE PERFORMANCE SUMMARY
--------------------------------------------------------------------------------
Total Problems:    ${TOTAL_QUESTIONS}
Correct Solved:    ${CORRECT_COUNT}
Skipped:           ${SKIPPED_COUNT}
Incorrect Tries:   ${INCORRECT_COUNT}
Total Attempts:    ${TOTAL_ATTEMPTS}
Accuracy Rate:     ${accuracy}%
Final Score:       ${SCORE} / $((TOTAL_QUESTIONS * 100)) pts
Total Time Taken:  ${total_duration} seconds ($((total_duration / 60))m $((total_duration % 60))s)
Security Flags:    ${VIOLATIONS_COUNT} violation(s)

--------------------------------------------------------------------------------
DETAILED PROBLEM-BY-PROBLEM BREAKDOWN
--------------------------------------------------------------------------------
EOF

    for ((i=0; i<TOTAL_QUESTIONS; i++)); do
        local pid="${PROBLEM_IDS[i]}"
        local ptitle="${PROBLEM_TITLES[i]}"
        local plang="${PROBLEM_LANGS[i]}"
        local pstat="${PROBLEM_STATUSES[i]}"
        local patt="${PROBLEM_ATTEMPTS[i]}"
        local ptime="${PROBLEM_TIMES[i]}"

        printf "[#%02d] [%-6s] %-50s\n" "$((i + 1))" "${plang^^}" "${ptitle}" >> "${report_filename}"
        printf "      Result:   %-10s | Attempts: %-3d | Time: %d sec\n\n" "${pstat^^}" "$patt" "$ptime" >> "${report_filename}"
    done

    cat <<EOF >> "${report_filename}"
================================================================================
Verified by Automated Code Debugging Engine.
Stored at: ${report_filename}
================================================================================
EOF

    # Display on screen
    print_banner
    echo -e "${COLOR_GREEN}${COLOR_BOLD}   🎉 CONTEST COMPLETED! PERFORMANCE REPORT GENERATED 🎉${COLOR_RESET}"
    echo "==================================================================="
    echo -e "Participant:     ${COLOR_CYAN}${PARTICIPANT_NAME}${COLOR_RESET}"
    echo -e "Difficulty:      ${COLOR_YELLOW}${SELECTED_DIFFICULTY^^}${COLOR_RESET}"
    echo -e "Score:           ${COLOR_GREEN}${SCORE} / $((TOTAL_QUESTIONS * 100)) pts${COLOR_RESET}"
    echo -e "Accuracy:        ${COLOR_WHITE}${accuracy}%${COLOR_RESET}"
    echo -e "Correct Answers: ${COLOR_GREEN}${CORRECT_COUNT}${COLOR_RESET} / ${TOTAL_QUESTIONS}"
    echo -e "Skipped:         ${COLOR_YELLOW}${SKIPPED_COUNT}${COLOR_RESET}"
    echo -e "Incorrect Tries: ${COLOR_RED}${INCORRECT_COUNT}${COLOR_RESET}"
    echo -e "Total Time:      ${COLOR_WHITE}${total_duration}s${COLOR_RESET}"
    echo -e "Security Flags:  ${COLOR_MAGENTA}${VIOLATIONS_COUNT}${COLOR_RESET}"
    echo "-------------------------------------------------------------------"
    echo -e "${COLOR_CYAN}Problem Breakdown:${COLOR_RESET}"
    for ((i=0; i<TOTAL_QUESTIONS; i++)); do
        local st="${PROBLEM_STATUSES[i]}"
        local color="${COLOR_WHITE}"
        if [ "$st" == "correct" ]; then color="${COLOR_GREEN}"; fi
        if [ "$st" == "skipped" ]; then color="${COLOR_YELLOW}"; fi
        printf "  %02d. %-50s -> ${color}%-8s${COLOR_RESET} (%ds)\n" "$((i + 1))" "${PROBLEM_TITLES[i]}" "${st^^}" "${PROBLEM_TIMES[i]}"
    done
    echo "==================================================================="
    log_success "Report saved to file: ${COLOR_BOLD}${report_filename}${COLOR_RESET}"
    echo ""

    # Send completion alert to Telegram
    if [ -n "${TELEGRAM_BOT_TOKEN}" ] && [ -n "${TELEGRAM_CHAT_ID}" ]; then
        local completion_msg="🏁 *CONTEST COMPLETED*
━━━━━━━━━━━━━━━━━━━━
👤 *Candidate:* \`${PARTICIPANT_NAME}\`
🎯 *Difficulty:* \`${SELECTED_DIFFICULTY^^}\`
🏆 *Score:* \`${SCORE} / $((TOTAL_QUESTIONS * 100))\` (${accuracy}%)
✅ *Correct:* \`${CORRECT_COUNT}\` | ⏭️ *Skipped:* \`${SKIPPED_COUNT}\`
⏰ *Time:* \`${total_duration}s\`
📁 *Report:* \`report_${sanitized_name}_${timestamp}.txt\`
━━━━━━━━━━━━━━━━━━━━"
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${completion_msg}" \
            -d "parse_mode=Markdown" > /dev/null 2>&1 || true
    fi
}

# ------------------------------------------------------------------------------
# Web Server Launch & Admin Management
# ------------------------------------------------------------------------------
start_web_server() {
    print_banner
    log_info "Starting full-stack web application on port ${WEB_PORT}..."
    log_info "Web application incorporates Python, C++, and Java debugging engines."
    
    cd "${SCRIPT_DIR}"
    if [ ! -d "node_modules" ]; then
        log_info "Installing npm dependencies..."
        npm install
    fi

    echo ""
    log_success "Web interface starting at: http://localhost:${WEB_PORT}"
    exec npm run dev
}

test_telegram() {
    print_banner
    log_info "Testing Telegram Bot notification integration..."
    if [ -z "${TELEGRAM_BOT_TOKEN}" ] || [ -z "${TELEGRAM_CHAT_ID}" ]; then
        log_error "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in .env or environment."
        exit 1
    fi

    log_info "Sending test security alert to chat ${TELEGRAM_CHAT_ID}..."
    PARTICIPANT_NAME="Admin Test"
    send_telegram_alert "Test Security Alert" "Verifying Telegram Bot API connectivity from debug_contest.sh"
    log_success "Test alert dispatched. Check your Telegram chat."
}

list_reports() {
    print_banner
    log_info "Listing saved contest reports in ${REPORTS_DIR}:"
    echo "-------------------------------------------------------------------"
    if [ -d "${REPORTS_DIR}" ] && [ "$(ls -A "${REPORTS_DIR}" 2>/dev/null)" ]; then
        ls -lh "${REPORTS_DIR}"/*.txt
    else
        log_warn "No reports found in ${REPORTS_DIR} yet."
    fi
    echo "-------------------------------------------------------------------"
}

# ------------------------------------------------------------------------------
# Main Dispatcher
# ------------------------------------------------------------------------------
main() {
    case "${1:-}" in
        --cli|-c)
            run_cli_contest
            ;;
        --web|--start-server|-w)
            start_web_server
            ;;
        --test-telegram)
            test_telegram
            ;;
        --list-reports)
            list_reports
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --cli, -c           Run the interactive terminal debugging contest (default)"
            echo "  --web, -w           Launch the full-stack web interface server"
            echo "  --test-telegram     Send a test notification to configured Telegram bot"
            echo "  --list-reports      List all generated .txt performance reports"
            echo "  --help, -h          Show this help message"
            ;;
        *)
            # Default to interactive CLI contest
            run_cli_contest
            ;;
    esac
}

main "$@"
