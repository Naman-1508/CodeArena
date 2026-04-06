import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import { Users, Phone, Mic, MicOff, Video, VideoOff, MessageSquare, Send, Copy, Check } from 'lucide-react';
import axios from 'axios';

export default function InterviewRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [code, setCode] = useState('// Waiting for sync...');
  const [socket, setSocket] = useState(null);
  
  const [micOn, setMicOn] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  
  const [roomData, setRoomData] = useState(null);
  const [waitingStatus, setWaitingStatus] = useState('idle'); // idle | waiting | admitted | rejected
  const [pendingRequests, setPendingRequests] = useState([]);
  const [copied, setCopied] = useState(false);
  const [leftWidth, setLeftWidth] = useState(28); // percentage
  const isDragging = useRef(false);
  
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : null;
    } catch { return null; }
  });

  const chatEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  // Manage Local Media Stream
  useEffect(() => {
    const updateMedia = async () => {
      try {
        // Stop existing stream if constraints changed
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop());
        }

        // If neither is true, clean up and exit
        if (!micOn && !videoOn) {
          localStreamRef.current = null;
          if (localVideoRef.current) localVideoRef.current.srcObject = null;
          return;
        }

        // Request specifically what was turned on to avoid NotFoundError when hardware is missing
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: videoOn, 
          audio: micOn 
        });
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Media access denied or unavailable:", err);
        // Revert toggles on failure
        if (videoOn) setVideoOn(false);
        if (micOn) setMicOn(false);
        alert("Failed to access media devices. Ensure they are connected and permissions are granted.");
      }
    };

    updateMedia();
  }, [micOn, videoOn]);

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Initial Fetch & Socket Setup
  useEffect(() => {
    let activeSocket = null;
    let isMounted = true;
    
    if (!roomId) return;
    const token = localStorage.getItem('token');
    
    if (!token) {
      if (isMounted) navigate('/login');
      return;
    }

    const initRoom = async () => {
      try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/interviews/join/${roomId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!isMounted) return;
        
        setRoomData(response.data.interview);
        if (response.data.currentCode) {
          setCode(response.data.currentCode);
        }

        // Establish Socket Connection
        const newSocket = io(`${import.meta.env.VITE_API_URL}/interview`, {
          withCredentials: true,
          auth: { token }
        });

        if (!isMounted) {
          newSocket.disconnect();
          return;
        }

        setSocket(newSocket);
        activeSocket = newSocket;

        // My role
        const isHost = response.data.interview.interviewerId === currentUser?._id;
        const role = isHost ? 'Interviewer' : 'Candidate';
        
        if (isHost) {
          setWaitingStatus('admitted');
        } else {
          setWaitingStatus('waiting');
        }

        newSocket.on('connect', () => {
          if (isHost) {
            newSocket.emit('joinRoom', { 
              roomId, 
              userId: currentUser?._id, 
              username: currentUser?.username,
              role
            });
          } else {
            // Ask for permission instead of joining blindly
            newSocket.emit('requestEntry', {
              roomId,
              userId: currentUser?._id,
              username: currentUser?.username,
              role
            });
          }
        });

        newSocket.on('entryRequested', (data) => {
          // Only Host receives this
          setPendingRequests(prev => [...prev, data]);
        });

        newSocket.on('entryGranted', (data) => {
          setWaitingStatus('admitted');
          newSocket.emit('joinRoom', { 
            roomId, 
            userId: currentUser?._id, 
            username: currentUser?.username,
            role: 'Candidate'
          });
        });

        newSocket.on('entryRejected', (data) => {
          setWaitingStatus('rejected');
          newSocket.disconnect();
        });

        newSocket.on('userJoined', (data) => {
          setChatMessages(prev => [...prev, { system: true, text: `${data.username || 'A user'} joined the room.` }]);
        });

        newSocket.on('chatMessage', (msg) => {
          setChatMessages(prev => [...prev, msg]);
        });

        newSocket.on('codeSync', (data) => {
          if (data.userId !== currentUser?._id) {
            setCode(data.code);
          }
        });

      } catch (err) {
        console.error("Failed to join room:", err);
        if (isMounted) navigate('/interview');
      }
    };
    
    initRoom();

    return () => {
      isMounted = false;
      if (activeSocket) activeSocket.disconnect();
    };
  }, [roomId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleEditorChange = (value) => {
    const val = value || '';
    setCode(val);
    if (socket) {
      socket.emit('codeUpdate', { roomId, code: val, userId: currentUser?._id });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!currentMessage.trim() || !socket) return;
    
    const role = roomData?.interviewerId === currentUser?._id ? 'Interviewer' : 'Candidate';
    const msgData = {
      message: currentMessage.trim(),
      userId: currentUser?._id,
      username: currentUser?.username,
      role
    };

    // Add to local state instantly
    setChatMessages(prev => [...prev, { ...msgData, isMine: true }]);
    // Broadcast to room
    socket.emit('chatMessage', { roomId, ...msgData });
    setCurrentMessage('');
  };

  const handleAdmit = (request) => {
    if (socket) {
      socket.emit('admitUser', { roomId, candidateSocketId: request.socketId });
      setPendingRequests(prev => prev.filter(r => r.socketId !== request.socketId));
    }
  };

  const handleReject = (request) => {
    if (socket) {
      socket.emit('rejectUser', { roomId, candidateSocketId: request.socketId });
      setPendingRequests(prev => prev.filter(r => r.socketId !== request.socketId));
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDividerMouseDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = leftWidth;

    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX;
      const containerWidth = window.innerWidth;
      const newWidth = Math.min(Math.max((startWidth) + (delta / containerWidth) * 100, 15), 65);
      setLeftWidth(newWidth);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  if (waitingStatus === 'waiting') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
        <div className="w-16 h-16 rounded-full border-4 border-surface border-t-primary animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">Waiting for Host</h2>
        <p className="text-slate-400">The interviewer must admit you into the session...</p>
      </div>
    );
  }

  if (waitingStatus === 'rejected') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">!</div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Connection Rejected</h2>
        <p className="text-slate-400 mb-6">The host declined your request to join the room.</p>
        <button onClick={() => navigate('/interview')} className="px-6 py-2 bg-surface hover:bg-surface/80 rounded-lg text-white font-medium transition-colors">
          Return to Lobby
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col font-sans bg-[#000000] relative">
      {/* Host Pending Admission Toasts */}
      {pendingRequests.length > 0 && (
        <div className="absolute top-20 right-6 z-50 flex flex-col gap-3">
          {pendingRequests.map(req => (
            <div key={req.socketId} className="bg-surface border border-primary/30 p-4 rounded-xl shadow-2xl shadow-black/50 min-w-[300px] animate-in slide-in-from-right fade-in">
              <h4 className="text-sm font-bold text-white mb-1">Entry Request</h4>
              <p className="text-xs text-slate-400 mb-3"><span className="text-primary font-medium">{req.username}</span> is waiting in the lobby.</p>
              <div className="flex gap-2">
                <button onClick={() => handleAdmit(req)} className="flex-1 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded">Admit</button>
                <button onClick={() => handleReject(req)} className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded border border-red-500/20">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Workspace Sub-Header */}
      <header className="h-[60px] border-b border-surface/50 flex items-center justify-between px-6 bg-[#0a0a0a] backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex p-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mt-1 ml-1 mr-2" />
            <span className="text-sm font-bold text-red-400 uppercase tracking-wider pr-2">LIVE</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-lg bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Technical Screen
              </h1>
              <button onClick={copyRoomLink} className="p-1 hover:bg-surface rounded text-slate-400 hover:text-white transition-colors" title="Copy Room Link">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider">ROOM {roomId.split('-')[0]}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface/50 rounded-lg border border-white/5">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium">2/2</span>
          </div>
          {roomData?.interviewerId === currentUser?._id ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">
              <Phone className="w-4 h-4 rotate-[135deg]" /> End Call
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface/80 border border-white/10 text-white rounded-lg font-medium transition-colors">
              <Phone className="w-4 h-4 rotate-[135deg]" /> Leave Session
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden select-none">
        
        {/* Left Video/Chat Panel */}
        <div style={{ width: `${leftWidth}%`, minWidth: '200px' }} className="flex flex-col bg-black/20 border-r border-surface/50 overflow-hidden">
          
          {/* Video Feeds */}
          <div className="p-4 flex flex-col gap-4">
            <div className="relative aspect-video bg-surface rounded-xl overflow-hidden border border-white/10 shadow-lg">
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                <Users className="w-12 h-12 opacity-20" />
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs font-medium border border-white/10">
                {roomData?.interviewerId === currentUser?._id ? 'Candidate (Waiting...)' : 'Interviewer (Host)'}
              </div>
            </div>
            
            <div className="relative aspect-video bg-surface rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black">
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover transition-opacity duration-300 ${videoOn ? 'opacity-100' : 'opacity-0'}`} />
                {!videoOn && <Users className="w-12 h-12 opacity-20 absolute" />}
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs font-medium border border-white/10">
                You ({currentUser?.username || 'User'})
              </div>
            </div>

            {/* A/V Controls */}
            <div className="flex justify-center gap-3 mt-2">
              <button
                onClick={() => setMicOn(!micOn)}
                className={`p-3 rounded-full flex items-center justify-center transition-colors ${micOn ? 'bg-surface hover:bg-surface/80 text-white' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setVideoOn(!videoOn)}
                className={`p-3 rounded-full flex items-center justify-center transition-colors ${videoOn ? 'bg-surface hover:bg-surface/80 text-white' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                
                {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 border-t border-surface/50 flex flex-col min-h-0">
            <div className="h-10 border-b border-surface/50 flex items-center px-4 bg-surface/30 shrink-0">
              <MessageSquare className="w-4 h-4 text-slate-400 mr-2" />
              <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Room Chat</span>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              <div className="flex items-center justify-center mb-2">
                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full border border-white/5">End-to-End Encrypted</span>
              </div>
              
              {chatMessages.map((msg, idx) => (
                msg.system ? (
                  <div key={idx} className="text-center text-xs text-slate-500 italic my-1">{msg.text}</div>
                ) : (
                  <div key={idx} className={`max-w-[85%] ${msg.isMine ? 'self-end' : 'self-start'}`}>
                    <p className={`text-[10px] mb-1 font-bold ${msg.isMine ? 'text-primary text-right' : 'text-slate-400'}`}>
                      {msg.isMine ? 'You' : msg.username} <span className="text-slate-600 font-medium">({msg.role})</span>
                    </p>
                    <div className={`p-2.5 rounded-xl border ${msg.isMine ? 'bg-primary/20 border-primary/30 text-white rounded-tr-none' : 'bg-surface/40 border-white/5 rounded-tl-none text-slate-200'} text-sm leading-relaxed whitespace-pre-wrap word-break`}>
                      {msg.message}
                    </div>
                  </div>
                )
              ))}
              <div ref={chatEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} className="p-3 border-t border-surface/50 bg-[#080808] flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-surface border border-white/10 rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                autoComplete="off"
              />
              <button 
                type="submit" 
                disabled={!currentMessage.trim()}
                className="p-2 bg-primary hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Resizable Divider Handle */}
        <div
          onMouseDown={handleDividerMouseDown}
          className="w-1.5 cursor-col-resize bg-surface/50 hover:bg-primary/60 transition-colors border-x border-white/5 flex items-center justify-center group shrink-0"
        >
          <div className="h-10 w-0.5 bg-white/20 rounded-full group-hover:bg-primary/80 transition-colors" />
        </div>

        {/* Right Panel: Editor Area */}
        <div className="flex-1 relative overflow-hidden">
           <Editor
            height="100%"
            defaultLanguage="javascript"
            theme="vs-dark"
            value={code}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              lineHeight: 24,
              padding: { top: 20 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: "smooth"
            }}
            className="pt-2" />
          
        </div>
      </div>
    </div>);

}