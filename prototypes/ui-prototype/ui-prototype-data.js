    const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;

    // ============ LAYOUT CONTEXT ============
    const LayoutContext = createContext();
    function useLayout() {
      return useContext(LayoutContext);
    }

    // ============ CONSTANTS ============
    const AGENT_TYPES = {
      research: { icon: 'research', name: 'Research', color: 'text-green-400', description: 'Explores codebase, answers questions' },
      coding: { icon: 'coding', name: 'Coding', color: 'text-blue-400', description: 'Implements features, fixes bugs' },
      review: { icon: 'review', name: 'Review', color: 'text-orange-400', description: 'Reviews changes before commit' }
    };

    const MODELS = [
      { id: "claude-opus", name: "Claude Opus", color: "#f97316" },
      { id: "claude-sonnet", name: "Claude Sonnet", color: "#8b5cf6" },
      { id: "gpt-4", name: "GPT-4", color: "#22c55e" },
      { id: "gemini", name: "Gemini Pro", color: "#3b82f6" }
    ];

    // ============ MESSAGE TYPES ============
    const MESSAGE_TYPES = {
      user: { icon: 'user', label: 'User', color: 'text-blue-400', bg: 'bg-blue-500/10' },
      thinking: { icon: 'thinking', label: 'Thinking', color: 'text-purple-400', bg: 'bg-purple-500/10' },
      text: { icon: 'text', label: 'Response', color: 'text-neutral-300', bg: 'bg-neutral-800/50' },
      code: { icon: 'code', label: 'Code', color: 'text-green-400', bg: 'bg-green-500/10' },
      diff: { icon: 'diff', label: 'Diff', color: 'text-orange-400', bg: 'bg-orange-500/10' },
      tool_call: { icon: 'tool', label: 'Tool', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
      tool_result: { icon: 'result', label: 'Result', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
      error: { icon: 'error', label: 'Error', color: 'text-red-400', bg: 'bg-red-500/10' }
    };

    // ============ DUMMY DATA ============
    const DUMMY_SESSION = {
      id: 1,
      name: "Auth Implementation",
      project: "MyApp",
      branch: "feature/auth-implementation",
      baseBranch: "main",
      agents: {
        research: {
          status: "idle",
          model: "claude-sonnet",
          contextUsed: 34,
          thinkingMode: true,
          messages: [
            { id: 'r1', type: 'user', content: "What auth libraries are commonly used with Next.js?", timestamp: '10:30 AM' },
            { id: 'r2', type: 'thinking', content: "The user is asking about authentication options for Next.js. I should consider the most popular libraries, their pros/cons, and make a recommendation based on their stack (Next.js + shadcn).", timestamp: '10:30 AM', collapsed: true },
            { id: 'r3', type: 'tool_call', tool: 'web_search', input: 'Next.js authentication libraries 2024 comparison', timestamp: '10:30 AM' },
            { id: 'r4', type: 'tool_result', tool: 'web_search', content: 'Found 5 relevant results about Next.js auth...', timestamp: '10:30 AM', collapsed: true },
            { id: 'r5', type: 'text', content: "For Next.js authentication, the most popular options are:\n\n1. **NextAuth.js** - Most widely used, supports OAuth, email, credentials\n2. **Clerk** - Managed solution with great DX\n3. **Auth0** - Enterprise-grade, feature-rich\n4. **Supabase Auth** - Good if using Supabase\n\nBased on your stack (Next.js + shadcn), I recommend **NextAuth.js** for flexibility and full control.", timestamp: '10:31 AM' }
          ]
        },
        coding: {
          status: "coding",
          model: "claude-opus",
          contextUsed: 67,
          thinkingMode: true,
          messages: [
            { id: 'c1', type: 'user', content: "Implement NextAuth.js with Google and credentials providers", timestamp: '10:35 AM' },
            { id: 'c2', type: 'thinking', content: "I need to:\n1. Install next-auth package\n2. Create the API route for NextAuth\n3. Configure Google and Credentials providers\n4. Set up environment variables\n5. Create a login page component\n\nLet me start with the installation and API route.", timestamp: '10:35 AM', collapsed: false },
            { id: 'c3', type: 'tool_call', tool: 'terminal', input: 'npm install next-auth', timestamp: '10:35 AM' },
            { id: 'c4', type: 'tool_result', tool: 'terminal', content: 'added 25 packages in 3.2s', timestamp: '10:35 AM' },
            { id: 'c5', type: 'text', content: "I'll create the NextAuth configuration with both providers.", timestamp: '10:36 AM' },
            { id: 'c6', type: 'tool_call', tool: 'file_write', input: 'src/app/api/auth/[...nextauth]/route.ts', timestamp: '10:36 AM' },
            { id: 'c7', type: 'diff', file: 'src/app/api/auth/[...nextauth]/route.ts', content: `@@ -0,0 +1,35 @@
+import NextAuth from 'next-auth'
+import GoogleProvider from 'next-auth/providers/google'
+import CredentialsProvider from 'next-auth/providers/credentials'
+
+export const authOptions = {
+  providers: [
+    GoogleProvider({
+      clientId: process.env.GOOGLE_CLIENT_ID!,
+      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
+    }),
+    CredentialsProvider({
+      name: 'credentials',
+      credentials: {
+        email: { label: 'Email', type: 'email' },
+        password: { label: 'Password', type: 'password' }
+      },
+      async authorize(credentials) {
+        // TODO: Validate against your database
+        return null
+      }
+    })
+  ],
+  pages: {
+    signIn: '/login',
+  }
+}
+
+const handler = NextAuth(authOptions)
+export { handler as GET, handler as POST }`, timestamp: '10:36 AM', additions: 35, deletions: 0 },
            { id: 'c8', type: 'text', content: "Now I'll create the login page with a form component.", timestamp: '10:37 AM' },
            { id: 'c9', type: 'tool_call', tool: 'file_write', input: 'src/app/login/page.tsx', timestamp: '10:37 AM' },
            { id: 'c10', type: 'diff', file: 'src/app/login/page.tsx', content: `@@ -0,0 +1,45 @@
+import { LoginForm } from '@/components/auth/LoginForm'
+
+export default function LoginPage() {
+  return (
+    <div className="min-h-screen flex items-center justify-center">
+      <div className="w-full max-w-md p-8">
+        <h1 className="text-2xl font-bold mb-6">Sign In</h1>
+        <LoginForm />
+      </div>
+    </div>
+  )
+}`, timestamp: '10:37 AM', additions: 45, deletions: 0 },
            { id: 'c11', type: 'code', language: 'typescript', file: 'src/components/auth/LoginForm.tsx', content: `'use client'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginForm() {
  return (
    <div className="space-y-4">
      <Button
        onClick={() => signIn('google')}
        className="w-full"
        variant="outline"
      >
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <form className="space-y-3">
        <Input type="email" placeholder="Email" />
        <Input type="password" placeholder="Password" />
        <Button type="submit" className="w-full">
          Sign In
        </Button>
      </form>
    </div>
  )
}`, timestamp: '10:38 AM' }
          ]
        },
        review: {
          status: "idle",
          model: "claude-sonnet",
          contextUsed: 0,
          thinkingMode: false,
          messages: []
        }
      },
      foundations: {
        activeFile: "CLAUDE.md",
        files: {
          "CLAUDE.md": "# MyApp Project Context\n\n## Stack\n- Next.js 14 (App Router)\n- TypeScript\n- Tailwind CSS + shadcn/ui\n- Prisma + PostgreSQL\n\n## Current Focus\nImplementing user authentication\n\n## Conventions\n- Use server components by default\n- Colocate components with pages\n- Use Zod for validation",
          "progress.txt": "=== Session 4 (2024-12-06 14:32) ===\nAgent: Coding\nTask: Implement Google OAuth provider\nStatus: Completed\nChanges:\n- Added GoogleProvider to auth.ts\n- Created callback route\n- Updated env.example\nNext: Create login UI component\n\n=== Session 3 (2024-12-06 12:15) ===\nAgent: Research\nTask: Compare auth libraries\nStatus: Completed\nDecision: NextAuth.js",
          "features.json": "[\n  { \"id\": 1, \"name\": \"User can sign up with email\", \"passes\": true },\n  { \"id\": 2, \"name\": \"User can login with Google\", \"passes\": true },\n  { \"id\": 3, \"name\": \"User can logout\", \"passes\": false },\n  { \"id\": 4, \"name\": \"Protected routes redirect\", \"passes\": false },\n  { \"id\": 5, \"name\": \"Session persists on refresh\", \"passes\": false }\n]",
          "init.sh": "#!/bin/bash\n# Project setup script\n\necho \"Starting development environment...\"\nnpm install\nnpx prisma generate\nnpm run dev &\necho \"Server running at http://localhost:3000\""
        },
        sessions: [
          { id: 4, agent: "coding", task: "Implement Google OAuth", status: "completed", time: "14:32" },
          { id: 3, agent: "research", task: "Compare auth libraries", status: "completed", time: "12:15" },
          { id: 2, agent: "coding", task: "Setup NextAuth.js", status: "completed", time: "10:45" },
          { id: 1, agent: "coding", task: "Initialize project", status: "completed", time: "09:00" }
        ],
        features: { total: 12, passing: 5 }
      },
      git: {
        status: "uncommitted",
        changedFiles: [
          { path: "src/app/api/auth/[...nextauth]/route.ts", status: "added", additions: 45, deletions: 0 },
          { path: "src/app/login/page.tsx", status: "added", additions: 78, deletions: 0 },
          { path: "src/components/auth/LoginForm.tsx", status: "added", additions: 92, deletions: 0 },
          { path: "package.json", status: "modified", additions: 3, deletions: 1 }
        ],
        commits: [
          { hash: "a1b2c3d", message: "Initial project setup", author: "You", time: "2 hours ago" }
        ]
      },
      browser: { url: "http://localhost:3000/login", status: "ready" },
      terminal: [
        "$ npm run dev",
        "> myapp@0.1.0 dev",
        "> next dev",
        "",
        "▲ Next.js 14.0.4",
        "- Local: http://localhost:3000",
        "- Ready in 2.3s",
        "",
        "○ Compiling /login ...",
        "✓ Compiled /login in 892ms"
      ]
    };

    const DUMMY_SESSIONS = [
      DUMMY_SESSION,
      {
        id: 2,
        name: "Dashboard Charts",
        project: "MyApp",
        branch: "feature/dashboard-charts",
        baseBranch: "main",
        agents: {
          research: { status: "waiting", model: "claude-sonnet", contextUsed: 12, thinkingMode: true, messages: [
            { role: "user", content: "What charting libraries work well with React?" }
          ] },
          coding: { status: "idle", model: "claude-sonnet", contextUsed: 0, thinkingMode: true, messages: [] },
          review: { status: "idle", model: "claude-sonnet", contextUsed: 0, thinkingMode: false, messages: [] }
        },
        foundations: {
          activeFile: "PLAN.md",
          files: {
            "PLAN.md": "# Dashboard Charts\n\n## Goals\n- Add analytics dashboard\n- Interactive charts\n- Real-time updates",
            "CONTEXT.md": "# Context\n\nUsing Recharts for visualization",
            "DECISIONS.md": "# Decisions\n\n(none yet)"
          }
        },
        git: { status: "clean", changedFiles: [], commits: [] },
        browser: { url: "http://localhost:3000/dashboard", status: "ready" },
        terminal: ["$ npm run dev", "Ready on http://localhost:3000"]
      },
      {
        id: 3,
        name: "API Refactor",
        project: "MyApp",
        branch: "feature/api-refactor",
        baseBranch: "main",
        agents: {
          research: { status: "idle", model: "claude-sonnet", contextUsed: 0, thinkingMode: true, messages: [] },
          coding: { status: "idle", model: "claude-sonnet", contextUsed: 0, thinkingMode: true, messages: [] },
          review: { status: "idle", model: "claude-sonnet", contextUsed: 0, thinkingMode: false, messages: [] }
        },
        foundations: {
          activeFile: "PLAN.md",
          files: {
            "PLAN.md": "# API Refactor\n\n## Goals\n- Migrate to tRPC\n- Add type safety\n- Improve error handling",
            "CONTEXT.md": "# Context\n\nRefactoring REST API to tRPC",
            "DECISIONS.md": "# Decisions\n\n(none yet)"
          }
        },
        git: { status: "clean", changedFiles: [], commits: [] },
        browser: { url: "http://localhost:3000/api", status: "idle" },
        terminal: ["$ npm run dev", "Ready on http://localhost:3000"]
      }
    ];

    
