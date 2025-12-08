    // Review Dialog
    function ReviewDialog({ isOpen, onClose, session, onConfirmCommit }) {
      const [reviewStatus, setReviewStatus] = useState('pending'); // pending, reviewing, approved, issues
      const [feedback, setFeedback] = useState([]);

      useEffect(() => {
        if (isOpen) {
          setReviewStatus('reviewing');
          // Simulate review
          setTimeout(() => {
            setFeedback([
              { type: 'suggestion', file: 'src/app/login/page.tsx', message: 'Consider adding loading state to login button' },
              { type: 'approval', file: 'src/app/api/auth/[...nextauth]/route.ts', message: 'Auth configuration looks good' }
            ]);
            setReviewStatus('approved');
          }, 2000);
        }
      }, [isOpen]);

      if (!isOpen) return null;

      return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                {Icons.review({ className: "w-6 h-6 text-orange-400" })}
                <div>
                  <h2 className="font-medium text-white">Code Review</h2>
                  <p className="text-xs text-neutral-500">
                    {session.git.changedFiles.length} files changed
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
                {Icons.x({ className: "w-4 h-4" })}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {reviewStatus === 'reviewing' ? (
                <div className="text-center py-8">
                  <div className="mb-4 animate-pulse">{Icons.review({ className: "w-12 h-12 mx-auto text-orange-400" })}</div>
                  <p className="text-neutral-300">Review agent is analyzing your changes...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    {Icons.check({ className: "w-5 h-5 text-green-400" })}
                    <span className="text-green-300">Changes look good to commit</span>
                  </div>

                  <div className="space-y-2">
                    {feedback.map((item, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${
                        item.type === 'suggestion'
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : 'bg-green-500/10 border-green-500/30'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {item.type === 'suggestion'
                            ? Icons.lightbulb({ className: "w-4 h-4 text-yellow-400" })
                            : Icons.check({ className: "w-4 h-4 text-green-400" })}
                          <span className="font-mono text-xs text-neutral-400">{item.file}</span>
                        </div>
                        <p className="text-sm text-neutral-300">{item.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-800">
              <button
                onClick={onClose}
                className="px-4 py-2 text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmCommit}
                disabled={reviewStatus !== 'approved'}
                className={`px-4 py-2 rounded-lg font-medium ${
                  reviewStatus === 'approved'
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                }`}
              >
                Commit Changes
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Compare Models Dialog
    function CompareModelsDialog({ isOpen, onClose, prompt, onUseResponse }) {
      const [selectedModels, setSelectedModels] = useState(['claude-opus', 'claude-sonnet', 'gpt-4']);
      const [responses, setResponses] = useState({});
      const [showAddModel, setShowAddModel] = useState(false);

      // Simulate model responses
      useEffect(() => {
        if (isOpen && prompt) {
          setResponses({});

          // Simulate different response times and content for each model
          const modelResponses = {
            'claude-opus': {
              delay: 2500,
              content: "For Next.js authentication, I recommend a careful evaluation based on your specific needs:\n\n**1. NextAuth.js (Auth.js)**\n- Best for: Full control, self-hosted\n- Supports 50+ OAuth providers\n- Great TypeScript support\n- Free and open source\n\n**2. Clerk**\n- Best for: Quick setup, managed solution\n- Beautiful pre-built components\n- User management dashboard\n- Paid, but generous free tier\n\n**3. Auth0**\n- Best for: Enterprise, complex requirements\n- Advanced security features\n- SSO, MFA built-in\n- Can be expensive at scale\n\nGiven your Next.js + shadcn/ui stack, I'd lean toward **NextAuth.js** for maximum flexibility and seamless integration with your existing components.",
              tokens: 245,
              thinking: "Analyzing the user's stack and requirements..."
            },
            'claude-sonnet': {
              delay: 1200,
              content: "For Next.js authentication, the most popular options are:\n\n1. **NextAuth.js** - Most widely used, supports OAuth, email, credentials\n2. **Clerk** - Managed solution with great DX\n3. **Auth0** - Enterprise-grade, feature-rich\n4. **Supabase Auth** - Good if using Supabase\n\nBased on your stack (Next.js + shadcn), I recommend **NextAuth.js** for flexibility and full control.",
              tokens: 128,
              thinking: "Considering popular auth libraries..."
            },
            'gpt-4': {
              delay: 800,
              content: "Here are the top authentication libraries for Next.js:\n\n1. **NextAuth.js** - The de facto standard for Next.js auth\n   - Pros: Free, flexible, great community\n   - Cons: More setup required\n\n2. **Clerk** - Modern auth-as-a-service\n   - Pros: Quick setup, great UI components\n   - Cons: Paid service\n\n3. **Auth0** - Enterprise identity platform\n   - Pros: Feature-rich, secure\n   - Cons: Complex, expensive\n\nFor a Next.js + Tailwind project, I'd recommend **NextAuth.js** or **Clerk** depending on whether you prefer control or convenience.",
              tokens: 156,
              thinking: null
            },
            'gemini': {
              delay: 1000,
              content: "For Next.js authentication, consider these options:\n\n• **NextAuth.js**: Open-source, highly customizable, supports many providers\n• **Firebase Auth**: Google's solution, easy setup, good for mobile too\n• **Clerk**: Developer-friendly, pre-built components\n• **Supabase Auth**: Great if you're using Supabase for your backend\n\nMy recommendation: NextAuth.js for most use cases due to its flexibility and active community.",
              tokens: 98,
              thinking: null
            }
          };

          selectedModels.forEach(modelId => {
            const response = modelResponses[modelId];
            if (response) {
              // Start with "running" state
              setResponses(prev => ({
                ...prev,
                [modelId]: { status: 'running', content: '', thinking: response.thinking }
              }));

              // Complete after delay
              setTimeout(() => {
                setResponses(prev => ({
                  ...prev,
                  [modelId]: {
                    status: 'done',
                    content: response.content,
                    tokens: response.tokens,
                    time: (response.delay / 1000).toFixed(1) + 's'
                  }
                }));
              }, response.delay);
            }
          });
        }
      }, [isOpen, prompt, selectedModels]);

      const addModel = (modelId) => {
        if (!selectedModels.includes(modelId)) {
          setSelectedModels([...selectedModels, modelId]);
        }
        setShowAddModel(false);
      };

      const removeModel = (modelId) => {
        setSelectedModels(selectedModels.filter(id => id !== modelId));
        setResponses(prev => {
          const next = { ...prev };
          delete next[modelId];
          return next;
        });
      };

      if (!isOpen) return null;

      const availableModels = MODELS.filter(m => !selectedModels.includes(m.id));

      return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-6xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                {Icons.compare({ className: "w-5 h-5 text-blue-400" })}
                <div>
                  <h2 className="font-medium text-white">Compare Models</h2>
                  <p className="text-xs text-neutral-500">{selectedModels.length} models</p>
                </div>
              </div>
              <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
                {Icons.x({ className: "w-4 h-4" })}
              </button>
            </div>

            {/* Prompt */}
            <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-800/30">
              <div className="text-xs text-neutral-500 mb-1">Prompt</div>
              <div className="text-sm text-neutral-300">{prompt}</div>
            </div>

            {/* Responses Grid */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full flex divide-x divide-neutral-800 overflow-x-auto">
                {selectedModels.map(modelId => {
                  const model = MODELS.find(m => m.id === modelId);
                  const response = responses[modelId];

                  return (
                    <div key={modelId} className="flex-1 min-w-[280px] flex flex-col">
                      {/* Model Header */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-800/50">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: model?.color }} />
                          <span className="text-sm font-medium text-white">{model?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {response?.status === 'running' ? (
                            <span className="text-xs text-yellow-400 flex items-center gap-1">
                              <span className="animate-pulse-dot">●</span> Running...
                            </span>
                          ) : response?.status === 'done' ? (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              {Icons.check({ className: "w-3 h-3" })} {response.time}
                            </span>
                          ) : null}
                          {selectedModels.length > 2 && (
                            <button
                              onClick={() => removeModel(modelId)}
                              className="text-neutral-500 hover:text-red-400"
                            >
                              {Icons.x({ className: "w-3 h-3" })}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Response Content */}
                      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
                        {response?.status === 'running' ? (
                          <div className="space-y-3">
                            {response.thinking && (
                              <div className="text-xs text-purple-400 italic bg-purple-500/10 rounded p-2 flex items-start gap-1.5">
                                {Icons.thinking({ className: "w-3 h-3 mt-0.5 flex-shrink-0" })}
                                <span>{response.thinking}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-neutral-500">
                              <div className="w-4 h-4 border-2 border-neutral-600 border-t-blue-500 rounded-full animate-spin" />
                              <span className="text-sm">Generating...</span>
                            </div>
                          </div>
                        ) : response?.status === 'done' ? (
                          <div className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                            {response.content}
                          </div>
                        ) : (
                          <div className="text-neutral-500 text-sm">Waiting...</div>
                        )}
                      </div>

                      {/* Response Footer */}
                      {response?.status === 'done' && (
                        <div className="px-3 py-2 border-t border-neutral-800 flex items-center justify-between">
                          <span className="text-xs text-neutral-500">{response.tokens} tokens</span>
                          <button
                            onClick={() => onUseResponse?.(modelId, response.content)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium text-white"
                          >
                            Use This
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Model Column */}
                {availableModels.length > 0 && (
                  <div className="w-48 flex-shrink-0 flex flex-col items-center justify-center p-4 bg-neutral-800/20">
                    {showAddModel ? (
                      <div className="space-y-2 w-full">
                        {availableModels.map(model => (
                          <button
                            key={model.id}
                            onClick={() => addModel(model.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm"
                          >
                            <span className="w-2 h-2 rounded-full" style={{ background: model.color }} />
                            {model.name}
                          </button>
                        ))}
                        <button
                          onClick={() => setShowAddModel(false)}
                          className="w-full text-xs text-neutral-500 hover:text-white py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddModel(true)}
                        className="flex flex-col items-center gap-2 text-neutral-500 hover:text-white transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-neutral-600 flex items-center justify-center text-xl">
                          +
                        </div>
                        <span className="text-xs">Add Model</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
              <div className="text-xs text-neutral-500">
                Tip: Compare responses to find the best answer for your use case
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-neutral-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }
