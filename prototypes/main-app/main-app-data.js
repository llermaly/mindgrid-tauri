    const { useState, useEffect, useRef, useCallback } = React;

    // ============ PRESETS ============
    const PRESETS = [
      {
        id: 'nextjs-shadcn',
        name: 'Next.js + shadcn/ui',
        description: 'Next.js 14 with App Router, TypeScript, Tailwind CSS, and shadcn/ui components',
        icon: 'N',
        color: '#000000',
        stack: ['Next.js 14', 'TypeScript', 'Tailwind CSS', 'shadcn/ui'],
        defaults: {
          model: 'claude-sonnet',
          permissionMode: 'auto',
          commitMode: 'checkpoint',
          runScript: 'npm run dev',
          foundations: [
            { name: 'CONTEXT.md', template: 'nextjs-context' },
            { name: 'PLAN.md', template: 'empty-plan' },
            { name: 'DECISIONS.md', template: 'empty-decisions' }
          ]
        }
      },
      {
        id: 'react-vite',
        name: 'React + Vite',
        description: 'Modern React with Vite, TypeScript, and Tailwind CSS',
        icon: 'Re',
        color: '#61dafb',
        stack: ['React 18', 'Vite', 'TypeScript', 'Tailwind CSS'],
        defaults: {
          model: 'claude-sonnet',
          permissionMode: 'auto',
          commitMode: 'checkpoint',
          runScript: 'npm run dev'
        }
      },
      {
        id: 'python-fastapi',
        name: 'Python FastAPI',
        description: 'FastAPI backend with SQLAlchemy and Pydantic',
        icon: 'Py',
        color: '#3776ab',
        stack: ['Python 3.11', 'FastAPI', 'SQLAlchemy', 'Pydantic'],
        defaults: {
          model: 'claude-sonnet',
          permissionMode: 'auto',
          commitMode: 'checkpoint',
          runScript: 'uvicorn main:app --reload'
        }
      },
      {
        id: 'custom',
        name: 'Custom Project',
        description: 'Start from scratch with full configuration control',
        icon: '*',
        color: '#6b7280',
        stack: [],
        defaults: {
          model: 'claude-sonnet',
          permissionMode: 'approve',
          commitMode: 'manual'
        }
      }
    ];

    const MODELS = [
      { id: 'claude-opus', name: 'Claude Opus', description: 'Most capable, best for complex tasks', color: '#f97316' },
      { id: 'claude-sonnet', name: 'Claude Sonnet', description: 'Balanced performance and speed', color: '#8b5cf6' },
      { id: 'claude-haiku', name: 'Claude Haiku', description: 'Fastest, good for simple tasks', color: '#22c55e' },
      { id: 'gpt-4', name: 'GPT-4', description: 'OpenAI flagship model', color: '#10b981' },
      { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google AI model', color: '#3b82f6' }
    ];

    const AGENT_TYPES = [
      { id: 'research', name: 'Research', icon: 'R', description: 'Explores codebase, answers questions, writes docs' },
      { id: 'coding', name: 'Coding', icon: 'C', description: 'Implements features, fixes bugs, refactors code' },
      { id: 'review', name: 'Review', icon: 'V', description: 'Reviews changes before commit, suggests improvements' }
    ];

    // ============ DUMMY DATA ============
    const DUMMY_PROJECTS = [
      {
        id: 1,
        name: 'MyApp',
        path: '/Users/dev/projects/myapp',
        preset: 'nextjs-shadcn',
        sessions: [
          { id: 1, name: 'Auth Implementation', status: 'running', agents: ['coding'] },
          { id: 2, name: 'Dashboard Charts', status: 'waiting', agents: ['research'] },
          { id: 3, name: 'API Refactor', status: 'idle', agents: ['coding', 'review'] }
        ],
        lastOpened: '2 hours ago',
        isDetached: false,
        github: {
          repo: 'username/myapp',
          branch: 'feature/auth',
          defaultBranch: 'main',
          lastCommit: { message: 'Add login form component', hash: 'a1b2c3d', time: '2 hours ago' },
          uncommittedChanges: 3,
          aheadBehind: { ahead: 2, behind: 0 },
          commits: [
            { hash: 'a1b2c3d', message: 'Add login form component', time: '2 hours ago', author: 'claude', isCheckpoint: true },
            { hash: 'b2c3d4e', message: 'Setup NextAuth.js configuration', time: '3 hours ago', author: 'claude', isCheckpoint: true },
            { hash: 'c3d4e5f', message: 'Add user model and types', time: '4 hours ago', author: 'you', isCheckpoint: false },
            { hash: 'd4e5f6g', message: 'Initial auth setup', time: '5 hours ago', author: 'claude', isCheckpoint: true }
          ],
          diff: {
            filesChanged: 5,
            additions: 127,
            deletions: 23
          }
        },
        chatHistory: [
          { id: 1, sessionName: 'Auth Implementation', message: 'Implement user authentication with NextAuth.js', time: '2 hours ago', agent: 'coding' },
          { id: 2, sessionName: 'Auth Implementation', message: 'Added Google and GitHub OAuth providers', time: '1 hour ago', agent: 'coding' },
          { id: 3, sessionName: 'Dashboard Charts', message: 'Research best charting libraries for React', time: '45 min ago', agent: 'research' }
        ],
        stats: { totalSessions: 12, totalMessages: 156, filesModified: 34 }
      },
      {
        id: 2,
        name: 'Backend API',
        path: '/Users/dev/projects/backend-api',
        preset: 'python-fastapi',
        sessions: [
          { id: 4, name: 'User Service', status: 'completed', agents: ['coding'] }
        ],
        lastOpened: 'Yesterday',
        isDetached: true,
        github: {
          repo: 'username/backend-api',
          branch: 'main',
          defaultBranch: 'main',
          lastCommit: { message: 'Fix user validation endpoint', hash: 'e5f6g7h', time: 'Yesterday' },
          uncommittedChanges: 0,
          aheadBehind: { ahead: 0, behind: 0 }
        },
        chatHistory: [
          { id: 4, sessionName: 'User Service', message: 'Create CRUD endpoints for user management', time: 'Yesterday', agent: 'coding' },
          { id: 5, sessionName: 'User Service', message: 'Added input validation with Pydantic', time: 'Yesterday', agent: 'coding' }
        ],
        stats: { totalSessions: 5, totalMessages: 43, filesModified: 12 }
      },
      {
        id: 3,
        name: 'Mobile App',
        path: '/Users/dev/projects/mobile',
        preset: 'react-vite',
        sessions: [],
        lastOpened: '3 days ago',
        isDetached: false,
        github: {
          repo: 'username/mobile-app',
          branch: 'develop',
          defaultBranch: 'main',
          lastCommit: { message: 'Initial project setup', hash: 'i8j9k0l', time: '3 days ago' },
          uncommittedChanges: 0,
          aheadBehind: { ahead: 1, behind: 3 }
        },
        chatHistory: [],
        stats: { totalSessions: 0, totalMessages: 0, filesModified: 0 }
      }
    ];

    
