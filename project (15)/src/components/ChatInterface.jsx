import React, { useState, useEffect, useRef } from 'react';
import { FaRobot, FaUser, FaFile } from 'react-icons/fa';
import { ArrowLeft, Send, ChevronDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark,okaidia } from 'react-syntax-highlighter/dist/cjs/styles/prism';


const ChatInterface = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [fileInfo, setFileInfo] = useState(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const modelDropdownRef = useRef(null);
  const wsRef = useRef(null);

  const aiModels = [
    {
      id: 'claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      description: 'Balanced performance for most tasks',
      provider: 'Anthropic'
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      description: 'Advanced reasoning and analysis',
      provider: 'OpenAI'
    },
    {
      id: 'llama-3',
      name: 'Llama 3',
      description: 'Open source, locally deployable',
      provider: 'Meta'
    },
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      description: 'Highest capability model',
      provider: 'Anthropic'
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      description: 'Multimodal understanding',
      provider: 'Google'
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].type === 'assistant') {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const storedFileInfo = localStorage.getItem('fileInfo');
    const storedModel = localStorage.getItem('selectedModel');
    const initialQuery = localStorage.getItem('currentQuery');

    if (!storedFileInfo || !storedModel || !initialQuery) {
      navigate('/');
      return;
    }

    setFileInfo(JSON.parse(storedFileInfo));
    setSelectedModel(storedModel);

    if (!isInitialized) {
      setMessages([{
        type: 'user',
        content: initialQuery,
        timestamp: new Date().toISOString()
      }]);
      handleSendToBackend(initialQuery);
      setIsInitialized(true);
    }
  }, [navigate, isInitialized]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        setIsModelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file && (file.type === "text/csv" || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
      const fileInfoData = {
        name: file.name,
        type: file.type,
        size: (file.size / 1024).toFixed(2) + ' KB',
        lastModified: new Date(file.lastModified).toLocaleDateString()
      };
      
      localStorage.setItem('fileInfo', JSON.stringify(fileInfoData));
      setFileInfo(fileInfoData);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        localStorage.setItem('fileContent', e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please upload a CSV or Excel file.");
    }
  };

  const handleNewChat = () => {
    localStorage.removeItem('currentQuery');
    navigate('/');
  };

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    localStorage.setItem('selectedModel', modelId);
    setIsModelDropdownOpen(false);
  };

  const connectWebSocket = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const requestBody = {
        model: localStorage.getItem('selectedModel'),
        query: message,
        file: localStorage.getItem('fileContent'),
        fileName: localStorage.getItem('fileInfo')
      };
      wsRef.current.send(JSON.stringify(requestBody));
    } else {
      const ws = new WebSocket('ws://127.0.0.1:8000/ws/generate/');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        const requestBody = {
          model: localStorage.getItem('selectedModel'),
          query: message,
          file: localStorage.getItem('fileContent'),
          fileName: localStorage.getItem('fileInfo')
        };
        ws.send(JSON.stringify(requestBody));
      };

      ws.onmessage = (event) => {
        try {
          const newContent = event.data;
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.type === 'assistant') {
              const updatedMessages = [...prev.slice(0, -1)];
              updatedMessages.push({
                ...lastMessage,
                content: lastMessage.content + newContent,
                isLoading: false
              });
              return updatedMessages;
            } else {
              return [...prev, {
                type: 'assistant',
                content: newContent,
                timestamp: new Date().toISOString(),
                isLoading: false
              }];
            }
          });
          setIsLoading(false);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          handleWebSocketError();
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed', event.code, event.reason);
        handleWebSocketDisconnect(event);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        handleWebSocketError();
      };
    }

    setMessages(prev => [...prev, {
      type: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true
    }]);
  };

  const handleWebSocketError = () => {
    setMessages(prev => prev.filter(msg => !msg.isLoading));
    setIsLoading(false);
  };

  const handleWebSocketDisconnect = (event) => {
    wsRef.current = null;
    setIsLoading(false);
    setMessages(prev => prev.filter(msg => !msg.isLoading));
  };

  const handleSendToBackend = async (message) => {
    setIsLoading(true);
    try {
      connectWebSocket(message);
    } catch (error) {
      console.error('Error:', error);
      handleWebSocketError();
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    setMessages(prev => [...prev, {
      type: 'user',
      content: newMessage,
      timestamp: new Date().toISOString()
    }]);

    handleSendToBackend(newMessage);
    setNewMessage('');
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

const MessageBubble = ({ message }) => {
  const isUser = message.type === 'user';
  
  const processContent = (content) => {
    console.log(content);
    if (!content) return content;
    
    // Split content into lines
    const lines = content.split('\n');
    let processedLines = [];
    let inCodeBlock = false;
    let codeBlock = [];
    
    for (let line of lines) {
      // Check for code block start/end
      if (line.trim() === '###') {
        if (inCodeBlock) {
          // End of code block
          const code = codeBlock.join('\n');
          processedLines.push('```python\n' + code + '\n```');
          codeBlock = [];
          inCodeBlock = false;
        } else {
          // Start of code block
          inCodeBlock = true;
        }
        continue;
      }
      
      if (inCodeBlock) {
        // Remove exactly 16 spaces from the beginning of each line if they exist
        const lineContent = line.startsWith('                ') 
          ? line.slice(16) 
          : line;
        codeBlock.push(lineContent);
      } else {
        processedLines.push(line);
      }
    }
    
    return processedLines.join('\n');
  };
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start max-w-3xl`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary ml-2' : 'bg-gray-700 mr-2'
        }`}>
          {isUser ? <FaUser className="text-white text-sm" /> : <FaRobot className="text-white text-sm" />}
        </div>
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`rounded-lg px-4 py-2 max-w-xl ${
            isUser 
              ? 'bg-primary text-white' 
              : 'bg-gray-800 text-white'
          }`}>
            {message.isLoading ? (
              <p className="whitespace-pre-wrap">Analyzing...</p>
            ) : (
              <ReactMarkdown
                className="prose prose-invert max-w-none"
                components={{
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';
                    
                    if (!inline && language) {
                      return (
                        <div className="my-4">
                          <SyntaxHighlighter
                            language={language}
                            style={okaidia}
                            PreTag="div"
                            className="rounded-md"
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              backgroundColor: '#1e1e1e'
                            }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }
                    
                    return (
                      <code className={`${className} bg-gray-700 px-1 py-0.5 rounded`} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {processContent(message.content)}
              </ReactMarkdown>
              
            )}
            {/* {!isUser && (
          <React.Fragment>
              {message.content && setTimeout(() => {
              fetch('http://localhost:8000/execute_code', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: message.content })
              })
              .then(response => response.json())
              .then(data => console.log(data))
              .catch(error => console.error(error));
            }, 0)}
              
            </React.Fragment>
            )}*/}
          </div> 
          <span className="text-xs text-gray-500 mt-1">\

            {formatTimestamp(message.timestamp)}
          </span>
          </div>
        </div>
        
      </div>
      
      
    
    
  );
};

// useEffect(() => {
//   const button = document.getElementById('run-code-button');
//   if (button && message.content) {
//     button.click();
//   }
// }, [message]);

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
          <button
              onClick={handleNewChat}
              className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>New Chat</span>
            </button>

            

            <div className="flex items-center space-x-3">
              <div className="relative flex items-center bg-gray-900 rounded px-3 py-1.5 cursor-pointer hover:bg-gray-700 transition-colors"
                   onClick={() => fileInputRef.current.click()}>
                <FaFile className="text-gray-400 mr-2 text-sm" />
                <span className="text-gray-300 text-sm truncate max-w-[150px]">
                  {fileInfo?.name || 'Select file'}
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.xlsx"
                  className="hidden"
                />
              </div>

              <div className="relative" ref={modelDropdownRef}>
                <button
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className="flex items-center bg-gray-900 rounded px-3 py-1.5 hover:bg-gray-700 transition-colors space-x-2"
                >
                  <FaRobot className="text-gray-400 text-sm" />
                  <span className="text-gray-300 text-sm">
                    {selectedModel || 'Select model'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isModelDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-10">
                    {aiModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleModelSelect(model.id)}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors flex items-center space-x-2
                          ${model.id === selectedModel ? 'bg-gray-700' : ''}
                          ${model.id === aiModels[0].id ? 'rounded-t-lg' : ''}
                          ${model.id === aiModels[aiModels.length - 1].id ? 'rounded-b-lg' : ''}`}
                      >
                        <FaRobot className="text-gray-400 text-sm" />
                        <div>
                          <p className="text-sm text-white">{model.name}</p>
                          <p className="text-xs text-gray-400">{model.provider}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 to-gray-800"
      >
        <div className="max-w-6xl mx-auto p-4">
          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="bg-gray-800 border-t border-gray-700 w-full">
        <div className="max-w-6xl mx-auto p-4">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-900 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !newMessage.trim()}
              className={`bg-primary hover:bg-primary/80 text-white rounded-lg px-6 py-3 flex items-center space-x-2 transition-colors ${
                (isLoading || !newMessage.trim()) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <span>Send</span>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
    );
  };
  
  export default ChatInterface;