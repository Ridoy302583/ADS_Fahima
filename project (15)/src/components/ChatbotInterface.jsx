import React, { useState, useRef, useEffect } from 'react';
import { FaRobot, FaFileCsv, FaFileExcel, FaPaperPlane, FaSpinner } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
const ChatMessage = ({ message, isBot }) => (
  <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4 w-full`}>
    <div className={`flex ${isBot ? 'flex-row' : 'flex-row-reverse'} w-full items-start gap-3`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 
        ${isBot ? 'bg-primary' : 'bg-gray-700'}`}>
        {isBot ? <FaRobot className="text-white" /> : 
          <div className="w-4 h-4 rounded-full bg-gray-300"></div>}
      </div>
      <div className={`rounded-2xl px-4 py-3 ${
        isBot ? 'bg-gray-800 text-white' : 'bg-primary text-white'
      } flex-1`}>
        {typeof message === 'string' ? 
          <div dangerouslySetInnerHTML={{ __html: message }} /> : 
          message
        }
      </div>
    </div>
  </div>
);

const ChatbotHeader = () => {
  const fileInfo = JSON.parse(localStorage.getItem('fileInfo') || '{}');
  const selectedModelId = localStorage.getItem('selectedModel') || 'llama-3.2-90b-vision-preview';

  const modelNames = {
    'llama-3.1-70b-versatile': 'llama-3.1-70b-versatile',
    'llama-3.2-90b-vision-preview': 'llama-3.2-90b-vision-preview',
    'llama-3.3-70b-versatile': 'llama-3.3-70b-versatile',
    'gemma2-9b-it': 'gemma2-9b-it',
    'mixtral-8x7b-32768': 'mixtral-8x7b-32768'
  };

  return (
    <div className="bg-gray-900 border-b border-gray-800 p-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <span className="text-white">{modelNames[selectedModelId]}</span>
        {fileInfo && fileInfo.name && (
          <span className="text-white">{fileInfo.name}</span>
        )}
      </div>
    </div>
  );
};

const ChatbotInterface = () => {
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const initialQuerySentRef = useRef(false);

  useEffect(() => {
    const initialQuery = location.state?.query;
    
    if (initialQuery && !initialQuerySentRef.current) {
      initialQuerySentRef.current = true;
      
      setMessages([
        { text: initialQuery, isBot: false },
        { text: "Thanks for your question. I'm analyzing your file now...", isBot: true }
      ]);
      
      // Wrap in setTimeout to ensure state is updated before API call
      setTimeout(() => {
        handleApiCall(initialQuery);
      }, 0);
    }
  }, [location.state?.query]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleApiCall = async (query) => {
    const fileContent = localStorage.getItem('fileContent');
    const selectedModel = localStorage.getItem('selectedModel') || 'llama-3.2-90b-vision-preview';
    const fileInfo = JSON.parse(localStorage.getItem('fileInfo') || '{}');  

    try {
      const response = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          fileContent,
          selectedModel,
          fileInfo 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(data);

      // Process content and format tables
      const processContent = (htmlContent) => {
        const tableRegex = /<table[\s\S]*?<\/table>/g;
        const tables = htmlContent.match(tableRegex) || [];
        
        let processedContent = htmlContent;

        tables.forEach(tableHtml => {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = tableHtml;
          const table = tempDiv.querySelector('table');
          
          let mdTable = '\n';
          const rows = table.querySelectorAll('tr');
          
          const headerCells = rows[0].querySelectorAll('th');
          if (headerCells.length) {
            mdTable += '| ' + Array.from(headerCells).map(cell => cell.textContent.trim()).join(' | ') + ' |\n';
            mdTable += '|' + Array(headerCells.length).fill('---:|').join('') + '\n';
          }
          
          Array.from(rows).forEach((row, idx) => {
            if (idx === 0 && headerCells.length) return;
            const cells = row.querySelectorAll('td, th');
            mdTable += '| ' + Array.from(cells).map(cell => cell.textContent.trim()).join(' | ') + ' |\n';
          });
          
          processedContent = processedContent.replace(tableHtml, mdTable);
        });

        return processedContent;
      };

      const processedResponse = processContent(data.response);

      // Custom components for ReactMarkdown with comprehensive styling
      const components = {
        table: ({node, ...props}) => (
          <div className="relative mb-6 mt-4 w-[calc(100vw-160px)] max-w-[1200px] overflow-x-auto shadow-md sm:rounded-lg border border-gray-700 bg-gray-800">
            <div className="min-w-full">
              <table className="min-w-full divide-y divide-gray-700 text-white table-fixed" {...props} />
            </div>
          </div>
        ),
        thead: ({node, ...props}) => (
          <thead className="bg-gray-700 sticky top-0 z-10 text-gray-300" {...props} />
        ),
        tbody: ({node, ...props}) => (
          <tbody className="bg-gray-800 divide-y divide-gray-700" {...props} />
        ),
        tr: ({node, ...props}) => (
          <tr className="hover:bg-gray-600 transition-colors duration-200 ease-in-out" {...props} />
        ),
        th: ({node, ...props}) => (
          <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wider text-left whitespace-nowrap text-gray-300" {...props} />
        ),
        td: ({node, ...props}) => (
          <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap" {...props} />
        ),
        p: ({node, ...props}) => (
          <p className="text-gray-300 mb-4 leading-relaxed" {...props} />
        ),
        h1: ({node, ...props}) => (
          <h1 className="text-2xl font-bold text-gray-100 mb-4 mt-6" {...props} />
        ),
        h2: ({node, ...props}) => (
          <h2 className="text-xl font-bold text-gray-100 mb-3 mt-5" {...props} />
        ),
        h3: ({node, ...props}) => (
          <h3 className="text-lg font-bold text-gray-100 mb-2 mt-4" {...props} />
        ),
        ul: ({node, ...props}) => (
          <ul className="list-disc list-inside mb-4 text-gray-300 space-y-2" {...props} />
        ),
        ol: ({node, ...props}) => (
          <ol className="list-decimal list-inside mb-4 text-gray-300 space-y-2" {...props} />
        ),
        li: ({node, ...props}) => (
          <li className="text-gray-300 ml-4" {...props} />
        ),
        code: ({node, inline, className, children, ...props}) => (
          inline ? 
            <code className="px-1.5 py-0.5 bg-gray-700 rounded text-sm font-mono text-gray-200" {...props}>
              {children}
            </code> :
            <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto my-4 text-gray-200">
              <code className="text-sm font-mono block" {...props}>{children}</code>
            </pre>
        ),
        blockquote: ({node, ...props}) => (
          <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-400 my-4" {...props} />
        ),
        a: ({node, ...props}) => (
          <a className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer" {...props} />
        ),
        hr: ({node, ...props}) => (
          <hr className="border-gray-700 my-6" {...props} />
        ),
      };

      // Create message content with styling, now including results
      let messageContent = (
        <div className="w-[calc(100vw-160px)] max-w-[1200px] break-words">
          {/* Display results if they exist */}
          {data.result && (
            <div className="mb-6 p-4 rounded-lg border border-gray-700 bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-200 mb-3">Analysis Code for your Query:</h3>
              <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-gray-200 text-sm font-mono">
                {typeof data.result === 'object' 
                  ? JSON.stringify(data.result, null, 2)
                  : data.result}
              </pre>
            </div>
          )}

          {/* Main response content */}
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={components}
              className="text-gray-300"
            >
              {processedResponse}
            </ReactMarkdown>
          </div>
          
          {/* Display images if they exist */}
          {data.images && data.images.length > 0 && (
            <div className="mt-6 space-y-6">
              {data.images.map((image, index) => (
                <div key={index} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                  <p className="text-sm text-gray-400 mb-3">{image.name}</p>
                  <div className="relative rounded-lg overflow-hidden">
                    <img 
                      src={image.url}
                      alt={image.name}
                      className="w-full h-auto object-cover rounded-lg shadow-lg"
                      loading="lazy"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

      setMessages(prev => [...prev, { 
        text: messageContent, 
        isBot: true 
      }]);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        text: "I apologize, but I encountered an error while processing your request. Please try again.", 
        isBot: true 
      }]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setIsLoading(true);

    try {
      await handleApiCall(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <ChatbotHeader />
      
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-[1200px] mx-auto w-full">
          {messages.map((message, index) => (
            <ChatMessage 
              key={index}
              message={message.text}
              isBot={message.isBot}
            />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400 ml-12">
              <FaSpinner className="animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-gray-800 bg-gray-900 p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a follow-up question..."
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className={`bg-primary text-white rounded-lg px-6 py-3 flex items-center gap-2
                ${(!inputValue.trim() || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'}`}
            >
              <span>Send</span>
              <FaPaperPlane className="text-sm" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatbotInterface;