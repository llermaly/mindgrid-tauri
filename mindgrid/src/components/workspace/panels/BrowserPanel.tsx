import { useState } from 'react';

interface BrowserPanelProps {
  initialUrl?: string;
}

export function BrowserPanel({ initialUrl = 'http://localhost:3000' }: BrowserPanelProps) {
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [status] = useState<'idle' | 'loading' | 'error'>('idle');

  const handleNavigate = () => {
    let finalUrl = inputUrl.trim();
    if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    setUrl(finalUrl);
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* URL Bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400"
            onClick={() => window.history.back()}
            title="Back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400"
            onClick={() => window.history.forward()}
            title="Forward"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400"
            onClick={() => setUrl(url + '?_reload=' + Date.now())}
            title="Reload"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex items-center gap-2 bg-neutral-800 rounded px-2 py-1">
          <span className="text-green-500 text-xs">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
          </span>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
            className="flex-1 bg-transparent text-sm focus:outline-none"
            placeholder="Enter URL..."
          />
        </div>
        {/* Status Badge */}
        {status !== 'idle' && (
          <span className={`px-2 py-0.5 text-xs rounded ${
            status === 'loading' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {status}
          </span>
        )}
      </div>

      {/* Browser Content */}
      <div className="flex-1 min-h-0 bg-white">
        {url ? (
          <iframe
            src={url}
            className="w-full h-full border-0"
            title="Browser Preview"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-neutral-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <p className="text-sm">Enter a URL to browse</p>
              <p className="text-xs text-neutral-500 mt-1">
                Navigate to localhost:3000 or any web address
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-neutral-800 flex items-center justify-end text-xs">
        <span className="text-neutral-500">Ready</span>
      </div>
    </div>
  );
}
