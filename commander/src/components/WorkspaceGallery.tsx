import React, { useState } from 'react'
import { Sparkles, Layout, Layers, Grid3x3, Package } from 'lucide-react'

type ConceptId = 'constellation' | 'fluid-bento' | 'layers' | 'pods' | 'overview'

interface Concept {
  id: ConceptId
  name: string
  tagline: string
  icon: React.ReactNode
  color: string
  description: string
  pros: string[]
  cons: string[]
}

const concepts: Concept[] = [
  {
    id: 'constellation',
    name: 'Constellation Mode',
    tagline: 'Panels float as interconnected nodes that intelligently cluster',
    icon: <Sparkles className="h-6 w-6" />,
    color: 'from-purple-500 to-pink-500',
    description: 'Panels appear as floating cards with magnetic attraction. Semantic clustering keeps related panels together, with visual connections showing data flow between panels. Zoom levels let you focus close-up or zoom out for overview.',
    pros: [
      'Ultra-flexible positioning',
      'Visual relationships between panels',
      'Natural focus/overview transitions',
      'Organic workspace feel'
    ],
    cons: [
      'Higher complexity to implement',
      'Might feel chaotic initially',
      'Learning curve for new users'
    ]
  },
  {
    id: 'fluid-bento',
    name: 'Fluid Bento Box',
    tagline: 'Adaptive grid that reshapes based on content priority and usage',
    icon: <Grid3x3 className="h-6 w-6" />,
    color: 'from-blue-500 to-cyan-500',
    description: 'Smart grid that auto-adjusts cell sizes based on active panel, content type, and user patterns. Terminal shrinks when idle, Browser expands when previewing. Smooth animations as panels reflow. Drag edges to resize, grid intelligently adapts.',
    pros: [
      'Balances structure with flexibility',
      'Space-efficient design',
      'Polished, professional feel',
      'Predictable behavior'
    ],
    cons: [
      'Auto-resizing might surprise users initially',
      'Requires good animation tuning',
      'May need user preferences'
    ]
  },
  {
    id: 'layers',
    name: 'Workflow Layers',
    tagline: 'Panels exist on depth layers you peel through',
    icon: <Layers className="h-6 w-6" />,
    color: 'from-green-500 to-emerald-500',
    description: 'Multi-layer workspace with Front (active agents), Mid (context panels), and Back (system panels) layers. Swipe gestures to peel layers. Glass morphism to see through layers. Beautiful 3D cascade when revealing all.',
    pros: [
      'Solves visibility problem elegantly',
      'Beautiful depth effects',
      'Gesture-friendly',
      'Clear mental model'
    ],
    cons: [
      '3D might feel gimmicky to some',
      'New interaction paradigm',
      'Complexity in implementation'
    ]
  },
  {
    id: 'pods',
    name: 'Workspace Pods',
    tagline: 'Mini-applications that group related panels into cohesive units',
    icon: <Package className="h-6 w-6" />,
    color: 'from-orange-500 to-red-500',
    description: 'Self-contained pods like Agent Pod (Research + Coding + Review), Context Pod (Foundations + Git), Preview Pod (Browser + Terminal). Pods can be docked, floating (PiP), minimized, or linked. Elegant carousel/dashboard view.',
    pros: [
      'Reduces cognitive load',
      'Optimal internal layouts',
      'Great for multi-monitor',
      'Clear organization'
    ],
    cons: [
      'Less granular control',
      'Might feel constrained',
      'Not as flexible'
    ]
  }
]

export function WorkspaceGallery() {
  const [selectedConcept, setSelectedConcept] = useState<ConceptId>('overview')

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Header */}
      <div className="px-8 py-6 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Claude Workspace Gallery
          </h1>
          <p className="text-neutral-400">
            Reimagining workflow interfaces — explore four creative concepts for the next-generation workspace
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {selectedConcept === 'overview' ? (
            <div>
              {/* Overview Introduction */}
              <div className="mb-12 text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-800/50 border border-neutral-700 mb-6">
                  <Layout className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm text-neutral-300">Interactive Prototype Gallery</span>
                </div>
                <h2 className="text-2xl font-semibold mb-4">The Challenge</h2>
                <p className="text-neutral-400 text-lg leading-relaxed">
                  The current workflow system feels too rigid — panels locked into predetermined positions with preset-based layouts.
                  We need something more organic, flexible, and delightful. Here are four creative concepts that reimagine
                  how panels can work together.
                </p>
              </div>

              {/* Concept Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {concepts.map((concept) => (
                  <button
                    key={concept.id}
                    onClick={() => setSelectedConcept(concept.id)}
                    className="group relative overflow-hidden rounded-2xl border-2 border-neutral-800 bg-neutral-900/50 hover:border-neutral-600 transition-all duration-300 p-8 text-left"
                  >
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${concept.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${concept.color} mb-4`}>
                      <div className="text-white">
                        {concept.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold mb-2 group-hover:text-white transition-colors">
                      {concept.name}
                    </h3>
                    <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
                      {concept.tagline}
                    </p>

                    {/* Arrow Indicator */}
                    <div className="flex items-center text-sm text-neutral-500 group-hover:text-neutral-300 transition-colors">
                      <span>Explore concept</span>
                      <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>

              {/* Recommendation Section */}
              <div className="mt-16 p-8 rounded-2xl border-2 border-blue-900/50 bg-gradient-to-br from-blue-950/30 to-cyan-950/30">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Recommended: Hybrid "Fluid Bento + Floating Pods"</h3>
                    <p className="text-neutral-400 mb-4">
                      Combine the best of Fluid Bento Box (smart, adaptive, smooth) with Floating Pods (temporary focus).
                      The "Show Workflow" button creates magic with zoom-out reveal, optimal bento arrangement,
                      and floating pods as glowing orbs.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm">⚡ Speed</span>
                      <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-sm">🎯 Precision</span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-sm">🌊 Smoothness</span>
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm">🎨 Design</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Back Button */}
              <button
                onClick={() => setSelectedConcept('overview')}
                className="mb-8 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Overview</span>
              </button>

              {/* Concept Detail */}
              {concepts
                .filter((c) => c.id === selectedConcept)
                .map((concept) => (
                  <div key={concept.id}>
                    {/* Header */}
                    <div className="mb-8">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${concept.color} mb-4`}>
                        <div className="text-white">
                          {concept.icon}
                        </div>
                      </div>
                      <h2 className="text-3xl font-bold mb-2">{concept.name}</h2>
                      <p className="text-lg text-neutral-400">{concept.tagline}</p>
                    </div>

                    {/* Description */}
                    <div className="mb-8 p-6 rounded-xl bg-neutral-900/50 border border-neutral-800">
                      <p className="text-neutral-300 leading-relaxed">{concept.description}</p>
                    </div>

                    {/* Pros & Cons */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                      {/* Pros */}
                      <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-900/50">
                        <h3 className="text-lg font-semibold mb-4 text-emerald-400">Advantages</h3>
                        <ul className="space-y-2">
                          {concept.pros.map((pro, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-neutral-300">
                              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Cons */}
                      <div className="p-6 rounded-xl bg-orange-950/20 border border-orange-900/50">
                        <h3 className="text-lg font-semibold mb-4 text-orange-400">Considerations</h3>
                        <ul className="space-y-2">
                          {concept.cons.map((con, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-neutral-300">
                              <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Interactive Demo Placeholder */}
                    <div className={`relative overflow-hidden rounded-2xl border-2 border-neutral-800 bg-gradient-to-br ${concept.color} p-1`}>
                      <div className="bg-neutral-950 rounded-xl p-12 min-h-[400px] flex items-center justify-center">
                        <div className="text-center">
                          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${concept.color} mb-6 animate-pulse`}>
                            <div className="text-white">
                              {concept.icon}
                            </div>
                          </div>
                          <h3 className="text-2xl font-bold mb-2">Interactive Demo</h3>
                          <p className="text-neutral-400 max-w-md">
                            Visual prototype coming soon! This will showcase the {concept.name} concept
                            with interactive elements and animations.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
