import React, { useState, useRef, useEffect } from 'react';
import { FaUpload, FaFileCsv, FaFileExcel, FaTimes, FaRobot } from 'react-icons/fa';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AnalysisPage = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [fileInfo, setFileInfo] = useState(null);
  const [placeholderText, setPlaceholderText] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.2-90b-vision-preview');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  const aiModels = [
    {
      id: 'llama-3.2-90b-vision-preview',
      name: 'llama-3.2-90b-vision-preview',
      description: 'Balanced performance for most tasks',
      provider: 'Meta'
    },
    {
      id: 'llama-3.1-70b-versatile',
      name: 'llama-3.1-70b-versatile',
      description: 'Advanced reasoning and analysis',
      provider: 'Meta'
    },
    {
      id: 'llama-3.3-70b-versatile',
      name: 'llama-3.3-70b-versatile',
      description: 'Open source, locally deployable',
      provider: 'Meta'
    },
    {
      id: 'gemma2-9b-it',
      name: 'gemma2-9b-it',
      description: 'Highest capability model',
      provider: 'Google'
    },
    {
      id: 'mixtral-8x7b-32768',
      name: 'mixtral-8x7b-32768',
      description: 'Multimodal understanding',
      provider: 'Mistral AI'
    }
  ];

  const placeholders = [
    "AI is waiting for you, ask anything about data...",
    "Upload a CSV or Excel file to analyze...",
    "Get insights, visualizations, and predictions..."
  ];

  const suggestions = [
    "How many data in there",
    "Train this dataset",
    "Provide me the visualize insights"
  ];

  useEffect(() => {
    const storedFileInfo = localStorage.getItem('fileInfo');
    const storedModel = localStorage.getItem('selectedModel');
    
    if (storedFileInfo) {
      setFileInfo(JSON.parse(storedFileInfo));
    }
    if (storedModel) {
      setSelectedModel(storedModel);
    }
  }, []);

  useEffect(() => {
    let currentPlaceholderIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;

    const typingEffect = setInterval(() => {
      const currentPlaceholder = placeholders[currentPlaceholderIndex];

      if (!isDeleting && currentCharIndex <= currentPlaceholder.length) {
        setPlaceholderText(currentPlaceholder.slice(0, currentCharIndex));
        currentCharIndex++;
      } else if (isDeleting && currentCharIndex >= 0) {
        setPlaceholderText(currentPlaceholder.slice(0, currentCharIndex));
        currentCharIndex--;
      } else {
        isDeleting = !isDeleting;
        if (!isDeleting) {
          currentPlaceholderIndex = (currentPlaceholderIndex + 1) % placeholders.length;
        }
      }
    }, 50);

    return () => clearInterval(typingEffect);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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
      
      setInputValue('');
    } else {
      alert("Please upload a CSV or Excel file.");
    }
  };

  const removeFile = () => {
    setFileInfo(null);
    fileInputRef.current.value = '';
    localStorage.removeItem('fileInfo');
    localStorage.removeItem('fileContent');
  };

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    localStorage.setItem('selectedModel', modelId);
    setIsModelDropdownOpen(false);
  };

  const handleAnalyze = () => {
    if (!fileInfo) {
      alert('Please upload a file first');
      return;
    }
    if (!inputValue.trim()) {
      alert('Please enter a query');
      return;
    }
    
    localStorage.setItem('currentQuery', inputValue);
    navigate('/chatpage', { state: { query: inputValue } });
  };

  const FilePreview = ({ fileInfo }) => {
    const getFileIcon = () => {
      if (fileInfo.type === "text/csv") {
        return <FaFileCsv className="text-4xl text-green-500" />;
      }
      return <FaFileExcel className="text-4xl text-green-500" />;
    };

    return (
      <div className="bg-gray-800 p-4 rounded-lg mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {getFileIcon()}
          <div>
            <p className="font-semibold text-lg">{fileInfo.name}</p>
            <p className="text-gray-400 text-sm">
              Size: {fileInfo.size} • Last modified: {fileInfo.lastModified}
            </p>
          </div>
        </div>
        <button 
          onClick={removeFile}
          className="p-2 hover:bg-gray-700 rounded-full transition-colors"
        >
          <FaTimes className="text-gray-400 hover:text-red-500" />
        </button>
      </div>
    );
  };

  const selectedModelInfo = aiModels.find(model => model.id === selectedModel);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary text-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-3xl bg-gray-900 p-8 rounded-lg shadow-2xl">
        <h1 className="text-4xl font-bold mb-4 text-center">What do you want to analyze today?</h1>
        
        {fileInfo && <FilePreview fileInfo={fileInfo} />}
        
        <div className="mb-4 relative" ref={dropdownRef}>
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className="w-full bg-gray-800 p-4 rounded-lg flex items-center justify-between hover:bg-gray-700 transition-colors border-2 border-primary"
          >
            <div className="flex items-center space-x-3">
              <FaRobot className="text-xl text-primary" />
              <div className="text-left">
                <p className="font-semibold">{selectedModelInfo.name}</p>
                <p className="text-sm text-gray-400">{selectedModelInfo.provider} • {selectedModelInfo.description}</p>
              </div>
            </div>
            <ChevronDown className={`transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isModelDropdownOpen && (
            <div className="absolute w-full mt-2 bg-gray-800 rounded-lg shadow-xl border-2 border-primary z-10">
              {aiModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model.id)}
                  className={`w-full p-4 text-left hover:bg-gray-700 transition-colors flex items-center space-x-3
                    ${model.id === selectedModel ? 'bg-gray-700' : ''}
                    ${model.id === aiModels[0].id ? 'rounded-t-lg' : ''}
                    ${model.id === aiModels[aiModels.length - 1].id ? 'rounded-b-lg' : ''}`}
                >
                  <FaRobot className="text-xl text-primary" />
                  <div>
                    <p className="font-semibold">{model.name}</p>
                    <p className="text-sm text-gray-400">{model.provider} • {model.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="mb-8 relative">
          <div className="flex items-center bg-gray-800 rounded-lg overflow-hidden border-2 border-primary">
            <div 
              className="bg-primary p-3 rounded-l-lg cursor-pointer mr-2 hover:bg-opacity-80 transition-colors"
              onClick={() => fileInputRef.current.click()}
            >
              <FaUpload className="text-white" />
            </div>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholderText}
              className="w-full bg-transparent text-white border-none py-3 px-2 text-lg focus:outline-none placeholder-gradient"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAnalyze();
                }
              }}
            />
            <button 
              onClick={handleAnalyze}
              className="bg-primary hover:bg-opacity-80 text-white rounded-r-lg px-6 py-3 transition-colors"
            >
              Analyze
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv,.xlsx"
            onChange={handleFileUpload}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setInputValue(suggestion)}
              className="bg-primary hover:bg-opacity-80 text-white rounded-full px-6 py-2 text-sm transition-colors"
            >
              {suggestion} →
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;