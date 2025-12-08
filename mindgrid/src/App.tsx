import { Terminal } from "./components/Terminal";

function App() {
  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <h1 className="text-lg font-semibold text-zinc-100">MindGrid</h1>
      </header>
      <main className="flex-1 min-h-0">
        <Terminal className="h-full" />
      </main>
    </div>
  );
}

export default App;
