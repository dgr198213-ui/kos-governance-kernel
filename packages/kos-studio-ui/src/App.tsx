import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import WorkspaceView from './components/WorkspaceView';
import ExecutionView from './components/ExecutionView';
import SettingsView from './components/SettingsView';
import ChatInterface from './components/ChatInterface';

type View = 'dashboard' | 'workspace' | 'execution' | 'settings' | 'chat';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('chat');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>('default-workspace');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  const handleSelectWorkspace = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    setCurrentView('workspace');
  };

  const handleSelectExecution = (executionId: string) => {
    setSelectedExecutionId(executionId);
    setCurrentView('execution');
  };

  const renderView = () => {
    switch (currentView) {
      case 'chat':
        return <ChatInterface />;
      case 'dashboard':
        return <Dashboard onSelectWorkspace={handleSelectWorkspace} onSelectExecution={handleSelectExecution} />;
      case 'workspace':
        return selectedWorkspaceId ? (
          <WorkspaceView 
            workspaceId={selectedWorkspaceId} 
            onSelectExecution={handleSelectExecution}
          />
        ) : null;
      case 'execution':
        return selectedExecutionId ? (
          <ExecutionView executionId={selectedExecutionId} />
        ) : null;
      case 'settings':
        return <SettingsView />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="flex h-screen bg-kos-dark text-white overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView}
        onSelectWorkspace={handleSelectWorkspace}
      />
      <main className="flex-1 overflow-hidden relative">
        {renderView()}
      </main>
    </div>
  );
}
