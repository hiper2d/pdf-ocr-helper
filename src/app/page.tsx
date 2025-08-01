"use client";

import { useState } from "react";

export default function PDFTextractDemo() {
  const [extractedText, setExtractedText] = useState<string>("");
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [processor, setProcessor] = useState<string>("");
  const [ocrMethod, setOcrMethod] = useState<'textract' | 'mistral'>('textract');
  const [qaMethod, setQaMethod] = useState<'anthropic' | 'mistral'>('anthropic');
  const [, setUploadedFile] = useState<File | null>(null);
  const [answerMethod, setAnswerMethod] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [mistralFileInfo, setMistralFileInfo] = useState<{id: string, signedUrl: string} | null>(null);
  const [structuredData, setStructuredData] = useState<{
    keyValuePairs: Array<{key: string, value: string, confidence: number, pageNumber: number}>;
    formFields: Array<{fieldName: string, fieldValue: string, confidence: number, pageNumber: number}>;
    tables: Array<{rows: string[][], confidence: number, pageNumber: number}>;
    totalPages: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('text');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setFileName(file.name);
    setExtractedText("");
    setAnswer("");
    setProcessor("");
    setUploadedFile(file);
    setMistralFileInfo(null);
    setStructuredData(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      // Choose API endpoint based on selected OCR method
      const endpoint = ocrMethod === 'mistral' ? '/api/extract-text-mistral' : '/api/extract-text-aws';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract text');
      }

      const data = await response.json();
      setExtractedText(data.text);
      setProcessor(data.processor || (ocrMethod === 'mistral' ? 'Mistral OCR' : 'AWS Textract'));
      
      // Store Mistral file info if using Mistral OCR
      if (ocrMethod === 'mistral' && data.fileInfo) {
        setMistralFileInfo({
          id: data.fileInfo.id,
          signedUrl: data.fileInfo.signedUrl
        });
      }
      
      // Store structured data if using AWS Textract
      if (ocrMethod === 'textract' && (data.keyValuePairs || data.formFields || data.tables)) {
        setStructuredData({
          keyValuePairs: data.keyValuePairs || [],
          formFields: data.formFields || [],
          tables: data.tables || [],
          totalPages: data.totalPages || 1
        });
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      alert(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    
    // Check requirements based on Q&A method
    if (qaMethod === 'anthropic' && !extractedText) return;
    if (qaMethod === 'mistral' && !mistralFileInfo) return;

    setIsAnswering(true);
    setAnswer("");

    try {
      if (qaMethod === 'mistral') {
        // Use Mistral direct document Q&A with file ID
        if (!mistralFileInfo) {
          throw new Error('No Mistral file info available. Please upload a document with Mistral OCR first.');
        }

        const response = await fetch('/api/ask-question-mistral', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question,
            fileId: mistralFileInfo.id,
            signedUrl: mistralFileInfo.signedUrl,
            filename: fileName
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get answer from Mistral');
        }

        const data = await response.json();
        setAnswer(data.answer);
        setAnswerMethod(data.method || 'mistral-direct');
      } else {
        // Use Anthropic with extracted text and structured data
        const response = await fetch('/api/ask-question-anthropic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question,
            extractedText,
            qaMethod: 'anthropic',
            structuredData
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get answer from Anthropic');
        }

        const data = await response.json();
        setAnswer(data.answer);
        setAnswerMethod(data.method || 'anthropic');
      }
    } catch (error) {
      console.error('Error getting answer:', error);
      alert(`Failed to get answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      alert('Failed to copy text to clipboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          OCR Document Processing Demo
        </h1>

        {/* OCR Method Selection */}
        <div className="mb-6 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Choose OCR Method</h2>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="ocrMethod"
                value="textract"
                checked={ocrMethod === 'textract'}
                onChange={(e) => setOcrMethod(e.target.value as 'textract' | 'mistral')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-white">AWS Textract</span>
              <span className="text-gray-400 text-sm">(PDF only, 10MB limit)</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="ocrMethod"
                value="mistral"
                checked={ocrMethod === 'mistral'}
                onChange={(e) => setOcrMethod(e.target.value as 'textract' | 'mistral')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-white">Mistral OCR</span>
              <span className="text-gray-400 text-sm">(PDF + Images, 50MB limit)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">1. Upload Document</h2>
            <input
              type="file"
              accept={ocrMethod === 'mistral' ? '.pdf,.jpg,.jpeg,.png,.gif,.webp' : '.pdf'}
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer focus:outline-none"
            />
            <p className="mt-2 text-xs text-gray-500">
              {ocrMethod === 'mistral' 
                ? 'Accepts: PDF, JPEG, PNG, GIF, WebP (up to 50MB)'
                : 'Accepts: PDF only (up to 10MB)'
              }
            </p>
            {fileName && (
              <p className="mt-2 text-sm text-gray-400">Selected: {fileName}</p>
            )}
            {processor && (
              <p className="mt-1 text-sm text-green-400">Processed with: {processor}</p>
            )}
            {mistralFileInfo && (
              <div className="mt-2 p-2 bg-blue-900 border border-blue-700 rounded text-xs">
                <p className="text-blue-200">
                  <span className="font-medium">Mistral File ID:</span> 
                  <span className="font-mono ml-1">{mistralFileInfo.id}</span>
                </p>
                <p className="text-blue-300 text-xs mt-1">✓ Document is uploaded and ready for Mistral Q&A</p>
              </div>
            )}
            {isExtracting && (
              <div className="mt-4 flex items-center text-blue-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                Extracting text with {ocrMethod === 'mistral' ? 'Mistral OCR' : 'AWS Textract'}...
              </div>
            )}
          </div>

          {/* Question Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">2. Ask Questions</h2>
            
            {/* Q&A Method Selection */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-white mb-2">Choose Q&A Method</h3>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="qaMethod"
                    value="anthropic"
                    checked={qaMethod === 'anthropic'}
                    onChange={(e) => setQaMethod(e.target.value as 'anthropic' | 'mistral')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white text-sm">Anthropic</span>
                  <span className="text-gray-400 text-xs">(over parsed text)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="qaMethod"
                    value="mistral"
                    checked={qaMethod === 'mistral'}
                    onChange={(e) => setQaMethod(e.target.value as 'anthropic' | 'mistral')}
                    className="text-blue-600 focus:ring-blue-500"
                    disabled={ocrMethod === 'textract'}
                  />
                  <span className={`text-sm ${ocrMethod === 'textract' ? 'text-gray-500' : 'text-white'}`}>Mistral</span>
                  <span className="text-gray-400 text-xs">
                    {ocrMethod === 'textract' ? '(only available with Mistral OCR)' : '(direct document Q&A)'}
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Enter your question about the document content..."
                className="w-full h-24 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={qaMethod === 'anthropic' ? !extractedText : !mistralFileInfo}
              />
              <button
                onClick={handleAskQuestion}
                disabled={!question.trim() || isAnswering || (qaMethod === 'anthropic' ? !extractedText : !mistralFileInfo)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnswering ? "Getting Answer..." : `Ask Question (${qaMethod === 'anthropic' ? 'Anthropic' : 'Mistral'})`}
              </button>
            </div>
          </div>
        </div>

        {/* Extracted Data with Tabs */}
        {extractedText && (
          <div className="mt-6 bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Extracted Document Data</h2>
            
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700">
              <button
                onClick={() => setActiveTab('text')}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors duration-200 ${
                  activeTab === 'text'
                    ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                📄 Free Text
              </button>
              
              {structuredData?.keyValuePairs && structuredData.keyValuePairs.length > 0 && (
                <button
                  onClick={() => setActiveTab('keyvalue')}
                  className={`px-4 py-2 rounded-t-lg font-medium transition-colors duration-200 ${
                    activeTab === 'keyvalue'
                      ? 'bg-green-600 text-white border-b-2 border-green-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  🔑 Forms & Key-Value Pairs ({structuredData.keyValuePairs.length})
                </button>
              )}
              
              {structuredData?.tables && structuredData.tables.length > 0 && (
                <button
                  onClick={() => setActiveTab('tables')}
                  className={`px-4 py-2 rounded-t-lg font-medium transition-colors duration-200 ${
                    activeTab === 'tables'
                      ? 'bg-purple-600 text-white border-b-2 border-purple-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  📊 Tables ({structuredData.tables.length})
                </button>
              )}
              
              
              {structuredData && (
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-4 py-2 rounded-t-lg font-medium transition-colors duration-200 ${
                    activeTab === 'summary'
                      ? 'bg-gray-600 text-white border-b-2 border-gray-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  📈 Summary
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {/* Free Text Tab */}
              {activeTab === 'text' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-white">Raw Extracted Text</h3>
                    <button
                      onClick={handleCopyText}
                      className="flex items-center space-x-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors duration-200 text-sm"
                      title="Copy to clipboard"
                    >
                      {copySuccess ? (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-6 h-96 overflow-y-auto">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{extractedText}</pre>
                  </div>
                </div>
              )}

              {/* Key-Value Pairs Tab */}
              {activeTab === 'keyvalue' && structuredData?.keyValuePairs && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">
                    Forms & Key-Value Pairs ({structuredData.keyValuePairs.length} pairs)
                  </h3>
                  <div className="bg-gray-700 rounded-lg p-6 h-96 overflow-y-auto space-y-4">
                    {structuredData.keyValuePairs.map((pair, index) => (
                      <div key={index} className="bg-gray-600 rounded-lg p-4 border-l-4 border-green-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-400 mb-2 font-medium">KEY</div>
                            <div className="text-green-300 font-medium text-base break-words">
                              {pair.key || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-2 font-medium">VALUE</div>
                            <div className="text-blue-300 text-base break-words">
                              {pair.value || 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-500 text-xs text-gray-400">
                          <span>Page {pair.pageNumber}</span>
                          <span>{Math.round(pair.confidence)}% confidence</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tables Tab */}
              {activeTab === 'tables' && structuredData?.tables && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">
                    Tables ({structuredData.tables.length} table{structuredData.tables.length !== 1 ? 's' : ''})
                  </h3>
                  <div className="h-96 overflow-y-auto space-y-6">
                    {structuredData.tables.map((table, tableIndex) => (
                      <div key={tableIndex} className="bg-gray-700 rounded-lg p-6 border-l-4 border-purple-500">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-base font-medium text-white">Table {tableIndex + 1}</h4>
                          <div className="text-xs text-gray-400">
                            Page {table.pageNumber} • {Math.round(table.confidence)}% confidence
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm border border-gray-600">
                            <tbody>
                              {table.rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-600' : 'bg-gray-800'}>
                                  {row.map((cell, cellIndex) => (
                                    <td 
                                      key={cellIndex} 
                                      className={`px-4 py-3 border border-gray-600 text-gray-300 ${
                                        rowIndex === 0 ? 'font-semibold text-white bg-gray-600' : ''
                                      }`}
                                    >
                                      {cell || '—'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Summary Tab */}
              {activeTab === 'summary' && structuredData && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-6">Extraction Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-700 rounded-lg p-6 text-center border-l-4 border-blue-500">
                      <div className="text-3xl font-bold text-white mb-2">{structuredData.totalPages}</div>
                      <div className="text-gray-400 font-medium">Total Pages</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-6 text-center border-l-4 border-green-500">
                      <div className="text-3xl font-bold text-green-400 mb-2">{structuredData.keyValuePairs?.length || 0}</div>
                      <div className="text-gray-400 font-medium">Forms & Key-Value Pairs</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-6 text-center border-l-4 border-purple-500">
                      <div className="text-3xl font-bold text-purple-400 mb-2">{structuredData.tables?.length || 0}</div>
                      <div className="text-gray-400 font-medium">Tables</div>
                    </div>
                  </div>
                  
                  <div className="mt-8 bg-gray-700 rounded-lg p-6">
                    <h4 className="text-base font-medium text-white mb-4">Processing Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Processor:</span>
                        <span className="text-white ml-2">{processor}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Document:</span>
                        <span className="text-white ml-2">{fileName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Answer Section */}
        {answer && (
          <div className="mt-6 bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Answer</h2>
              {answerMethod && (
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                  {answerMethod === 'mistral-direct' ? 'Mistral Direct Q&A' : 
                   answerMethod === 'anthropic' ? 'Anthropic (over parsed text)' : 
                   answerMethod}
                </span>
              )}
            </div>
            <div className="bg-green-900 border border-green-700 rounded-lg p-4">
              <p className="text-green-100">{answer}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}