import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ChatPage } from "./pages/ChatPage";
import "./index.css";

// Simple URL-based routing for multi-window support
// Supports both path-based (/chat) and query-param based (index.html?sessionId=xxx)
function Router() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("sessionId");
  const mode = params.get("mode");

  console.log("[Router] path:", path, "sessionId:", sessionId, "mode:", mode);

  // Terminal mode - load App which handles terminal mode internally
  if (mode === "terminal") {
    console.log("[Router] Loading App in terminal mode");
    return <App />;
  }

  // Chat window route - either via /chat path or via sessionId query param
  if (path === "/chat" || sessionId) {
    const isNewChat = params.get("newChat") === "true";

    if (!sessionId) {
      return (
        <div className="h-screen flex items-center justify-center bg-zinc-900 text-zinc-400">
          Missing sessionId parameter
        </div>
      );
    }

    console.log("[Router] Loading ChatPage for session:", sessionId, "isNewChat:", isNewChat);
    return <ChatPage sessionId={sessionId} isNewChat={isNewChat} />;
  }

  // Default: main app
  console.log("[Router] Loading main App");
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
);
