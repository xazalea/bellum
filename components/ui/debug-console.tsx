'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface LogEntry {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  timestamp: number;
  args: any[];
}

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  error?: string;
}

interface DebugConsoleProps {
  className?: string;
}

export function DebugConsole({ className = '' }: DebugConsoleProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedTab, setSelectedTab] = useState<'console' | 'network'>('console');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Intercept console methods
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug,
    };

    const createInterceptor = (type: LogEntry['type']) => (...args: any[]) => {
      originalConsole[type](...args);
      
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        message: args.map(a => formatArg(a)).join(' '),
        timestamp: Date.now(),
        args,
      };
      
      setLogs(prev => [...prev.slice(-499), entry]);
    };

    console.log = createInterceptor('log');
    console.warn = createInterceptor('warn');
    console.error = createInterceptor('error');
    console.info = createInterceptor('info');
    console.debug = createInterceptor('debug');

    return () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const formatArg = (arg: any): string => {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    try {
      return JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  };

  const clearLogs = () => setLogs([]);

  const filteredLogs = logs.filter(log => 
    filter === '' || 
    log.message.toLowerCase().includes(filter.toLowerCase()) ||
    log.type === filter.toLowerCase()
  );

  const typeColors: Record<LogEntry['type'], string> = {
    log: 'text-gray-300',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    info: 'text-blue-400',
    debug: 'text-gray-500',
  };

  const typeLabels: Record<LogEntry['type'], string> = {
    log: 'LOG',
    warn: 'WARN',
    error: 'ERR',
    info: 'INFO',
    debug: 'DBG',
  };

  return (
    <div className={`bg-gray-900 rounded-lg overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedTab('console')}
            className={`text-sm font-medium ${selectedTab === 'console' ? 'text-white' : 'text-gray-400'}`}
          >
            Console ({logs.length})
          </button>
          <button
            onClick={() => setSelectedTab('network')}
            className={`text-sm font-medium ${selectedTab === 'network' ? 'text-white' : 'text-gray-400'}`}
          >
            Network
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            className="px-2 py-1 bg-gray-700 rounded text-xs text-white w-32"
          />
          <button
            onClick={clearLogs}
            className="px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Content */}
      {selectedTab === 'console' ? (
        <div ref={logContainerRef} className="flex-1 overflow-auto p-2 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No logs</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="py-1 border-b border-gray-800">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`shrink-0 px-1 rounded ${typeColors[log.type]}`}>
                    {typeLabels[log.type]}
                  </span>
                  <span className={`${typeColors[log.type]} break-all`}>
                    {log.message}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <NetworkPanel />
      )}

      {/* Input */}
      <div className="border-t border-gray-800 p-2">
        <ConsoleInput />
      </div>
    </div>
  );
}

// Network Panel Component
function NetworkPanel() {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequest | null>(null);

  useEffect(() => {
    // Intercept fetch
    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || 'GET';

      const request: NetworkRequest = {
        id,
        url,
        method,
        status: 0,
        statusText: 'pending',
        startTime: performance.now(),
        requestHeaders: init?.headers as Record<string, string>,
        requestBody: init?.body?.toString(),
      };

      setRequests(prev => [...prev.slice(-99), request]);

      try {
        const response = await originalFetch(input, init);
        
        const completedRequest: NetworkRequest = {
          ...request,
          status: response.status,
          statusText: response.statusText,
          endTime: performance.now(),
          duration: performance.now() - request.startTime,
          responseHeaders: Object.fromEntries(response.headers.entries()),
        };

        setRequests(prev => prev.map(r => r.id === id ? completedRequest : r));

        return response;
      } catch (error) {
        const failedRequest: NetworkRequest = {
          ...request,
          status: 0,
          statusText: 'failed',
          endTime: performance.now(),
          duration: performance.now() - request.startTime,
          error: String(error),
        };

        setRequests(prev => prev.map(r => r.id === id ? failedRequest : r));
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const statusColor = (status: number): string => {
    if (status === 0) return 'text-gray-400';
    if (status < 300) return 'text-green-400';
    if (status < 400) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Request List */}
      <div className="w-1/2 border-r border-gray-800 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              <th className="px-2 py-1 text-left text-gray-400">Method</th>
              <th className="px-2 py-1 text-left text-gray-400">URL</th>
              <th className="px-2 py-1 text-left text-gray-400">Status</th>
              <th className="px-2 py-1 text-left text-gray-400">Time</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr
                key={req.id}
                onClick={() => setSelectedRequest(req)}
                className={`cursor-pointer hover:bg-gray-800 ${selectedRequest?.id === req.id ? 'bg-gray-800' : ''}`}
              >
                <td className="px-2 py-1 text-gray-300">{req.method}</td>
                <td className="px-2 py-1 text-gray-300 truncate max-w-[150px]" title={req.url}>
                  {req.url}
                </td>
                <td className={`px-2 py-1 ${statusColor(req.status)}`}>
                  {req.status || req.statusText}
                </td>
                <td className="px-2 py-1 text-gray-400">
                  {req.duration ? `${req.duration.toFixed(0)}ms` : '...'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Request Details */}
      <div className="w-1/2 overflow-auto p-2">
        {selectedRequest ? (
          <div className="text-xs">
            <div className="mb-4">
              <div className="text-gray-400 mb-1">URL</div>
              <div className="text-white break-all">{selectedRequest.url}</div>
            </div>
            <div className="mb-4">
              <div className="text-gray-400 mb-1">Status</div>
              <div className={statusColor(selectedRequest.status)}>
                {selectedRequest.status} {selectedRequest.statusText}
              </div>
            </div>
            {selectedRequest.duration && (
              <div className="mb-4">
                <div className="text-gray-400 mb-1">Duration</div>
                <div className="text-white">{selectedRequest.duration.toFixed(2)}ms</div>
              </div>
            )}
            {selectedRequest.requestHeaders && (
              <div className="mb-4">
                <div className="text-gray-400 mb-1">Request Headers</div>
                <pre className="text-gray-300 bg-gray-800 p-2 rounded overflow-auto">
                  {JSON.stringify(selectedRequest.requestHeaders, null, 2)}
                </pre>
              </div>
            )}
            {selectedRequest.responseHeaders && (
              <div className="mb-4">
                <div className="text-gray-400 mb-1">Response Headers</div>
                <pre className="text-gray-300 bg-gray-800 p-2 rounded overflow-auto">
                  {JSON.stringify(selectedRequest.responseHeaders, null, 2)}
                </pre>
              </div>
            )}
            {selectedRequest.error && (
              <div className="mb-4">
                <div className="text-gray-400 mb-1">Error</div>
                <div className="text-red-400">{selectedRequest.error}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">Select a request to view details</div>
        )}
      </div>
    </div>
  );
}

// Console Input Component
function ConsoleInput() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const executeCommand = () => {
    if (!input.trim()) return;

    setHistory(prev => [...prev, input]);
    setHistoryIndex(-1);

    try {
      // Create a function to execute the input
      const result = new Function(`return (${input})`)();
      console.log(result);
    } catch (error) {
      console.error('Execution error:', error);
    }

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="flex gap-2">
      <span className="text-gray-500 font-mono text-sm">></span>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Execute JavaScript..."
        className="flex-1 bg-transparent text-white text-sm outline-none font-mono"
      />
    </div>
  );
}

export default DebugConsole;