// Agent display configuration — system prompts live in chat-tutors/app/agent.py
export const AGENTS = {
  'js-core': {
    id: 'js-core',
    name: 'Alex',
    description: 'JavaScript ES6+, closures, prototipos y DOM',
    icon: '⚡',
    color: '#F7DF1E',
    colorText: '#1a1a00',
    specialty: ['ES6+', 'Closures', 'DOM', 'Array methods'],
  },
  'typescript': {
    id: 'typescript',
    name: 'Tyler',
    description: 'TypeScript, tipos, generics y decorators',
    icon: '🔷',
    color: '#3178C6',
    colorText: '#ffffff',
    specialty: ['Types', 'Generics', 'Interfaces', 'tsconfig'],
  },
  'async-js': {
    id: 'async-js',
    name: 'Sam',
    description: 'Promises, async/await y Event Loop',
    icon: '🔄',
    color: '#10B981',
    colorText: '#ffffff',
    specialty: ['Promises', 'async/await', 'Event Loop', 'Workers'],
  },
  'react': {
    id: 'react',
    name: 'Maya',
    description: 'React, hooks, estado y rendimiento',
    icon: '⚛️',
    color: '#61DAFB',
    colorText: '#1a1a1a',
    specialty: ['Hooks', 'Context', 'State', 'Performance'],
  },
  'node-backend': {
    id: 'node-backend',
    name: 'Noel',
    description: 'Node.js, Express y APIs REST',
    icon: '🟢',
    color: '#339933',
    colorText: '#ffffff',
    specialty: ['Node.js', 'Express', 'REST APIs', 'Auth'],
  },
  'algorithms': {
    id: 'algorithms',
    name: 'Vera',
    description: 'Algoritmos, DSA y complejidad Big O',
    icon: '🧮',
    color: '#8B5CF6',
    colorText: '#ffffff',
    specialty: ['Arrays', 'Trees', 'Graphs', 'Big O'],
  },
};

export const AGENTS_LIST = Object.values(AGENTS);

export const DEFAULT_AGENT_ID = 'js-core';

export function getAgent(agentId) {
  return AGENTS[agentId] ?? AGENTS[DEFAULT_AGENT_ID];
}
