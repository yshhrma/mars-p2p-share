import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import { generateChunkHash, encryptData, decryptData } from '../utils/crypto';

const socket = io('https://YOUR-RENDER-URL.onrender.com');

export default function Room() {
  const { roomId } = useParams();
  const location = useLocation();
  const [status, setStatus] = useState('Waiting for peer...');
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(null); // FIXED: Changed from 0 to null
  
  const secretKey = window.location.hash.substring(1);

  const isSender = !!location.state?.file;
  const file = location.state?.file;

  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const receivedBuffersRef = useRef([]);
  const receivedSizeRef = useRef(0);
  const fileMetaRef = useRef(null);
  const startTimeRef = useRef(null); 

  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { target: roomId, candidate: event.candidate });
      }
    };

    if (isSender) {
      socket.emit('create-room', roomId);
      setStatus('Waiting for receiver to join...');

      const dc = pc.createDataChannel('fileTransfer');
      dataChannelRef.current = dc;
      setupDataChannel(dc);

      socket.on('receiver-joined', async () => {
        setStatus('Receiver joined! Establishing connection...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { target: roomId, offer });
      });

      socket.on('answer', async (payload) => {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
      });
    } else {
      socket.emit('join-room', roomId);

      pc.ondatachannel = (event) => {
        dataChannelRef.current = event.channel;
        setupDataChannel(event.channel);
      };

      socket.on('offer', async (payload) => {
        setStatus('Offer received. Answering...');
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { target: roomId, answer });
      });
    }

    socket.on('ice-candidate', async (payload) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('peer-disconnected', () => {
      setStatus('Peer disconnected. Transfer failed.');
      setSpeed(null);
    });

    return () => {
      pc.close();
      socket.off();
    };
  }, [roomId, isSender]);

  const setupDataChannel = (dc) => {
    dc.binaryType = 'arraybuffer';
    
    dc.onopen = () => {
      setStatus('Connected securely! Initializing transfer...');
      if (isSender) startSendingFile(dc);
    };

    dc.onmessage = async (e) => {
      if (typeof e.data === 'string') {
        const msg = JSON.parse(e.data);
        if (msg.type === 'metadata') {
          fileMetaRef.current = msg;
          setStatus(`Receiving (Encrypted): ${msg.name}`);
          startTimeRef.current = Date.now(); 
        } else if (msg.type === 'eof') {
          // FIXED: Removed setSpeed(0) so the final speed stays visible
          finalizeDownload();
        }
      } else {
        try {
          const decryptedChunk = await decryptData(e.data, secretKey);
          receivedBuffersRef.current.push(decryptedChunk);
          receivedSizeRef.current += decryptedChunk.byteLength;
          
          const percent = Math.round((receivedSizeRef.current / fileMetaRef.current.size) * 100);
          setProgress(percent);

          const elapsedSeconds = Math.max((Date.now() - startTimeRef.current) / 1000, 0.001);
          const currentSpeedMBps = (receivedSizeRef.current / (1024 * 1024)) / elapsedSeconds;
          setSpeed(currentSpeedMBps.toFixed(2));

        } catch (err) {
          setStatus('Decryption Error! Invalid security token.');
          console.error(err);
        }
      }
    };
  };

  const startSendingFile = async (dc) => {
    setStatus('Encrypting & Sending...');
    const arrayBuffer = await file.arrayBuffer();
    const fileHash = await generateChunkHash(arrayBuffer);

    dc.send(JSON.stringify({ 
      type: 'metadata', 
      name: file.name, 
      size: file.size, 
      hash: fileHash 
    }));

    const chunkSize = 64 * 1024;
    let offset = 0;
    startTimeRef.current = Date.now(); 

    const sendChunk = async () => {
      while (offset < file.size) {
        if (dc.bufferedAmount > dc.bufferedAmountLowThreshold) {
          dc.onbufferedamountlow = () => {
            dc.onbufferedamountlow = null;
            sendChunk();
          };
          return;
        }
        
        const chunk = arrayBuffer.slice(offset, offset + chunkSize);
        const encryptedChunk = await encryptData(chunk, secretKey);
        
        dc.send(encryptedChunk);
        offset += chunk.byteLength;
        
        setProgress(Math.round((offset / file.size) * 100));

        const elapsedSeconds = Math.max((Date.now() - startTimeRef.current) / 1000, 0.001);
        const currentSpeedMBps = (offset / (1024 * 1024)) / elapsedSeconds;
        setSpeed(currentSpeedMBps.toFixed(2));
      }
      
      dc.send(JSON.stringify({ type: 'eof' }));
      // FIXED: Removed setSpeed(0) so the final speed stays visible
      setStatus('Transfer Complete! (End-to-End Encrypted)');
    };

    sendChunk();
  };

  const finalizeDownload = async () => {
    setStatus('Verifying Cryptographic Integrity...');
    const blob = new Blob(receivedBuffersRef.current);
    const arrayBuffer = await blob.arrayBuffer();
    const finalHash = await generateChunkHash(arrayBuffer);
    
    if (finalHash === fileMetaRef.current.hash) {
      setStatus('Verified intact! Downloading...');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMetaRef.current.name;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('Success! Safe & Private Download Complete.');
    } else {
      setStatus('Error: Integrity compilation mismatched! Data altered.');
    }
  };

  const shareableLink = `${window.location.origin}/room/${roomId}${window.location.hash}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border border-gray-700">
        <h2 className="text-2xl font-bold mb-2 text-white">Secure Transfer Room</h2>
        <div className="text-xs text-green-400 font-mono mb-6">🔒 Zero-Knowledge AES-GCM Active</div>
        
        {isSender && (
          <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
            <p className="text-sm text-gray-400 mb-2">Share this private link. The server cannot read it:</p>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={shareableLink} 
                className="w-full bg-black text-blue-400 p-2 rounded text-sm outline-none font-mono text-ellipsis overflow-hidden"
              />
              <button 
                onClick={() => navigator.clipboard.writeText(shareableLink)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm transition-colors shrink-0"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="text-lg font-semibold text-blue-400 mb-2">{status}</div>
          
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden mt-4">
            <div className="bg-blue-500 h-4 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
          
          <div className="flex justify-between items-center text-gray-400 mt-2 text-sm px-1">
            <span>{progress}% Complete</span>
            {/* FIXED: It will now accurately render the final speed string */}
            {speed && <span>{speed} MB/s</span>}
          </div>
        </div>
      </div>
    </div>
  );
}