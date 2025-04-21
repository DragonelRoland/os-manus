'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Search, History, CreditCard, Settings, Bot, ArrowRight, Database, FileCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Tab = 'chat' | 'research' | 'history' | 'billing' | 'settings';

type Agent = 'rephraser' | 'searcher' | 'generator';

type ResearchStep = {
  agent: Agent;
  status: string;
  output: string;
};

const MarkdownComponents = {
  p: ({ children }: any) => <p className="m-0">{children}</p>,
  ul: ({ children }: any) => <ul className="m-0 pl-4">{children}</ul>,
  ol: ({ children }: any) => <ol className="m-0 pl-4">{children}</ol>,
  li: ({ children }: any) => <li className="m-0">{children}</li>,
  a: ({ href, children }: any) => (
    <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  pre: ({ children }: any) => (
    <pre className="bg-zinc-900 p-2 rounded overflow-x-auto">{children}</pre>
  ),
  code: ({ children }: any) => (
    <code className="bg-zinc-900 px-1 py-0.5 rounded text-sm">{children}</code>
  ),
};

const agentConfig = {
  rephraser: {
    icon: Bot,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/20',
    name: 'Query Rephraser'
  },
  searcher: {
    icon: Database,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/20',
    name: 'Data Searcher'
  },
  generator: {
    icon: FileCheck,
    color: 'text-green-500',
    bgColor: 'bg-green-500/20',
    name: 'Response Generator'
  }
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  
  // Deep research state
  const [researchQuery, setResearchQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [researchSteps, setResearchSteps] = useState<ResearchStep[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [researchResults, setResearchResults] = useState<string>('');
  const [researchError, setResearchError] = useState<string | null>(null);

  // For debugging API calls
  useEffect(() => {
    console.log("Current research state:", { isResearching, researchSteps, activeAgent });
  }, [isResearching, researchSteps, activeAgent]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, newMessage],
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      } else {
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchQuery.trim() || isResearching) return;

    // Reset states
    setIsResearching(true);
    setResearchSteps([]);
    setResearchResults('');
    setResearchError(null);
    setActiveAgent('rephraser');

    console.log("Starting research with query:", researchQuery);

    try {
      // Set initial step
      const initialStep = {
        agent: 'rephraser' as Agent,
        status: 'Rephrasing your query for better search results...',
        output: ''
      };
      setResearchSteps([initialStep]);

      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: researchQuery,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get research results');
      }

      const data = await response.json();
      console.log("Research API response:", data);
      
      // Process each step with a delay to show the workflow
      if (data.steps && data.steps.length > 0) {
        for (const [index, step] of data.steps.entries()) {
          setActiveAgent(step.agent as Agent);
          await new Promise(resolve => setTimeout(resolve, 1000));
          setResearchSteps(prev => {
            const newSteps = [...prev];
            newSteps[index] = step;
            return newSteps;
          });
        }
      }
      
      // Set final result
      if (data.finalResponse) {
        setResearchResults(data.finalResponse);
      } else {
        setResearchError('No results returned from research');
      }

      // Reset active agent
      setActiveAgent(null);
    } catch (error) {
      console.error('Research error:', error);
      setResearchError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setActiveAgent(null);
    } finally {
      setIsResearching(false);
    }
  };

  const sidebarItems = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'research', label: 'Deep Research', icon: Search },
    { id: 'history', label: 'History', icon: History },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Render agent icon based on agent type
  const renderAgentIcon = (agent: Agent) => {
    const IconComponent = agentConfig[agent].icon;
    return <IconComponent size={24} />;
  };

  const renderAgentSmallIcon = (agent: Agent) => {
    const IconComponent = agentConfig[agent].icon;
    return <IconComponent size={18} />;
  };

  return (
    <div className="flex h-screen bg-black">
      {/* Slim Sidebar */}
      <div className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        {/* Logo/Brand area */}
        <div className="p-4 border-b border-zinc-800">
          <h1 className="text-lg font-bold text-white">AI Assistant</h1>
        </div>

        {/* New Chat button */}
        <div className="p-3">
          <button 
            onClick={() => {
              setMessages([]);
              setActiveTab('chat');
            }}
            className="w-full py-2 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + New Chat
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-2 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === item.id
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-zinc-800">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50">
            <div className="w-8 h-8 rounded-full bg-zinc-700" />
            <div className="flex-1">
              <div className="text-sm font-medium text-white">User</div>
              <div className="text-xs text-zinc-400">Free Plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col bg-zinc-900">
        {activeTab === 'chat' ? (
          <>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-100'
                    }`}
                  >
                    <div className={`prose ${message.role === 'user' ? 'prose-invert' : 'prose-zinc'} max-w-none`}>
                      <ReactMarkdown components={MarkdownComponents}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-4 rounded-lg bg-zinc-800 text-zinc-300">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-zinc-800 p-4">
              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 p-4 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="px-6 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:bg-blue-800 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </>
        ) : activeTab === 'research' ? (
          <div className="flex-1 flex flex-col">
            {/* Research interface */}
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white mb-4">Deep Research</h2>
              <form onSubmit={handleResearchSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={researchQuery}
                  onChange={(e) => setResearchQuery(e.target.value)}
                  placeholder="Ask a detailed question about YC startups..."
                  className="flex-1 p-4 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isResearching}
                />
                <button
                  type="submit"
                  className="px-6 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:bg-blue-800 disabled:opacity-50"
                  disabled={isResearching}
                >
                  {isResearching ? 'Researching...' : 'Research'}
                </button>
              </form>
            </div>

            {/* Agent workflow visualization */}
            {(researchSteps.length > 0 || isResearching) && (
              <div className="p-4 border-b border-zinc-800">
                <h3 className="text-lg font-semibold text-white mb-3">Research Workflow</h3>
                <div className="flex items-center justify-between mb-4">
                  {(['rephraser', 'searcher', 'generator'] as Agent[]).map((agent, index) => (
                    <div key={agent} className="flex flex-col items-center">
                      <div 
                        className={`p-3 rounded-full ${
                          activeAgent === agent 
                            ? `${agentConfig[agent].bgColor} ${agentConfig[agent].color} animate-pulse` 
                            : researchSteps.find(step => step.agent === agent && step.output)
                              ? `${agentConfig[agent].bgColor} ${agentConfig[agent].color}`
                              : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {renderAgentIcon(agent)}
                      </div>
                      <div className="text-sm font-medium text-zinc-300 mt-2">{agentConfig[agent].name}</div>
                      {index < 2 && (
                        <div className="mx-8 text-zinc-600">
                          <ArrowRight className="mt-4" size={20} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Research content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Error message if any */}
              {researchError && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
                  <h4 className="font-semibold mb-1">Error</h4>
                  <p>{researchError}</p>
                </div>
              )}
              
              {/* Display research steps */}
              {researchSteps.map((step, index) => (
                <div key={index} className="mb-6">
                  <div className={`flex items-center gap-2 mb-2 ${agentConfig[step.agent].color}`}>
                    {renderAgentSmallIcon(step.agent)}
                    <h4 className="text-md font-medium">{agentConfig[step.agent].name}</h4>
                  </div>
                  <div className="pl-6 border-l-2 border-zinc-800">
                    <div className="mb-2 text-zinc-400 text-sm">{step.status}</div>
                    {step.output ? (
                      <div className="bg-zinc-800 rounded-lg p-3 text-zinc-200 overflow-x-auto">
                        <ReactMarkdown components={MarkdownComponents}>
                          {step.output}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="bg-zinc-800 rounded-lg p-3 text-zinc-400 italic">
                        Working...
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Final results */}
              {researchResults && (
                <div className="mt-6 bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Research Results</h3>
                  <div className="prose prose-zinc max-w-none text-zinc-100">
                    <ReactMarkdown components={MarkdownComponents}>
                      {researchResults}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
              
              {/* Loading state when no steps shown yet */}
              {isResearching && researchSteps.length === 0 && (
                <div className="flex items-center justify-center h-32">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-zinc-500">This feature is coming soon</div>
          </div>
        )}
      </div>
    </div>
  );
}
