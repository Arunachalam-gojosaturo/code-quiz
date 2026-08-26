import { MotivationalQuote } from '../types';

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  {
    id: 'quote-1',
    quote: "Talk is cheap. Show me the code.",
    author: "Linus Torvalds",
    role: "Creator of Linux & Git"
  },
  {
    id: 'quote-2',
    quote: "The most damaging phrase in the language is: 'It's always been done that way.'",
    author: "Grace Hopper",
    role: "Pioneer of Computer Programming & Compiler Inventor"
  },
  {
    id: 'quote-3',
    quote: "Debugging is twice as hard as writing the code in the first place. Therefore, if you write the code as cleverly as possible, you are, by definition, not smart enough to debug it.",
    author: "Brian W. Kernighan",
    role: "Co-creator of C & UNIX"
  },
  {
    id: 'quote-4',
    quote: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
    author: "Martin Fowler",
    role: "Author of Refactoring"
  },
  {
    id: 'quote-5',
    quote: "First, solve the problem. Then, write the code.",
    author: "John Johnson",
    role: "Software Architect"
  },
  {
    id: 'quote-6',
    quote: "Simplicity is prerequisite for reliability.",
    author: "Edsger W. Dijkstra",
    role: "Turing Award Laureate & Graph Theory Pioneer"
  },
  {
    id: 'quote-7',
    quote: "Premature optimization is the root of all evil in programming.",
    author: "Donald E. Knuth",
    role: "Author of The Art of Computer Programming"
  },
  {
    id: 'quote-8',
    quote: "The only way to learn a new programming language is by writing programs in it.",
    author: "Dennis Ritchie",
    role: "Creator of C & Unix Co-founder"
  },
  {
    id: 'quote-9',
    quote: "There is no software without bugs, only software whose bugs have not yet been discovered.",
    author: "Government Thirumagal Mills College Debugging Motto",
    role: "GTMC Computer Science Dept."
  },
  {
    id: 'quote-10',
    quote: "Make it work, make it right, make it fast.",
    author: "Kent Beck",
    role: "Creator of Extreme Programming & TDD"
  },
  {
    id: 'quote-11',
    quote: "Programs must be written for people to read, and only incidentally for machines to execute.",
    author: "Harold Abelson",
    role: "MIT Professor & Author of SICP"
  },
  {
    id: 'quote-12',
    quote: "The function of good software is to make the complex appear to be simple.",
    author: "Grady Booch",
    role: "Co-developer of UML"
  }
];

export function getRandomQuote(): MotivationalQuote {
  const index = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[index];
}
