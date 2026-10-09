import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

function App(): React.ReactElement {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">AuditPilot</h1>
        <p className="text-slate-400 text-sm">
          Frontend foundation is configured and ready with Tailwind CSS v4.
        </p>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
