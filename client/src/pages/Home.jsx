import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Handle Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Required to allow dropping
  };

  // Handle manual file selection
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  // Ensure file is under 50MB (as per MARS MVP requirements)
  const validateAndSetFile = (selectedFile) => {
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        alert("File size must be under 50MB for this basic transfer.");
        return;
      }
      setFile(selectedFile);
    }
  };

  // Generate a random room ID and a secret encryption key that stays in the URL hash
  const generateLink = () => {
    if (!file) return;
    const roomId = Math.random().toString(36).substring(2, 9);
    const secretKey = Math.random().toString(36).substring(2, 15); // Stays client-side only!
    
    navigate(`/room/${roomId}#${secretKey}`, { state: { file } });
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-2 text-blue-400">P2P Web Share</h1>
      <p className="text-gray-400 mb-8">Direct Browser-to-Browser File Transfer</p>

      {/* Drag and Drop Zone */}
      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current.click()}
        className="w-full max-w-md h-64 border-2 border-dashed border-gray-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-gray-800 transition-all"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          className="hidden" 
        />
        
        {file ? (
          <div className="text-green-400 font-semibold text-lg">
            📄 {file.name}
            <div className="text-sm text-gray-400 font-normal mt-1">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </div>
          </div>
        ) : (
          <p className="text-gray-300">Drag & Drop a file here, or click to select</p>
        )}
      </div>

      {/* Action Button */}
      {file && (
        <button 
          onClick={generateLink}
          className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-500/30"
        >
          Generate Secure Link
        </button>
      )}
    </div>
  );
}