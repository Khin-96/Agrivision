'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  Room, 
  VideoPresets, 
  createLocalVideoTrack, 
  createLocalAudioTrack,
  Track,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication
} from 'livekit-client';
import { ArrowLeft, Camera, CameraOff, Mic, MicOff, Bot } from 'lucide-react';

interface LiveVisionProps {
  onClose?: () => void;
}

interface ConnectionDetails {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
}

export default function LiveVision({ onClose }: LiveVisionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [agentConnected, setAgentConnected] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);

  // Fetch connection details from API
  const fetchConnectionDetails = async (): Promise<ConnectionDetails> => {
    try {
      console.log('Fetching connection details from API...');
      const response = await fetch('/api/connection-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Connection details received:', data);
      return data;
    } catch (err) {
      console.error('Failed to fetch connection details:', err);
      throw new Error(`Failed to get connection details: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Start camera preview
  const startCamera = async () => {
    try {
      setError(null);
      
      // Create video track
      const videoTrack = await createLocalVideoTrack({ 
        resolution: VideoPresets.h720,
        facingMode: 'user'
      });
      setLocalVideoTrack(videoTrack.mediaStreamTrack);

      // Create audio track
      const audioTrack = await createLocalAudioTrack();
      setLocalAudioTrack(audioTrack.mediaStreamTrack);

      // Attach video to preview
      if (videoRef.current) {
        videoTrack.attach(videoRef.current);
      }

    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Failed to access camera and microphone. Please check permissions.');
    }
  };

  // Handle remote track subscriptions
  const handleTrackSubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    console.log('Track subscribed:', track.kind, track.sid, participant.identity, participant.name);
    
    if (track.kind === Track.Kind.Audio) {
      // This is the AI's audio track - attach it to audio element
      if (audioRef.current) {
        track.attach(audioRef.current);
        console.log('AI audio track attached and should be playing');
        
        // Force play the audio element
        audioRef.current.play().catch(e => {
          console.log('Auto-play prevented, trying to play manually:', e);
        });
      }
      
      // Check if this is an agent - updated to match Python agent identity
      if (participant.identity.includes('agent') || participant.name?.includes('agent') || participant.identity.includes('Assistant')) {
        setAgentConnected(true);
        console.log('AI Agent connected and audio track ready');
      }
    }
  };

  const handleTrackUnsubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    console.log('Track unsubscribed:', track.kind, track.sid);
    
    if (track.kind === Track.Kind.Audio && audioRef.current) {
      track.detach(audioRef.current);
    }
  };

  const handleParticipantConnected = (participant: RemoteParticipant) => {
    console.log('Participant connected:', participant.identity, participant.name, participant.metadata);
    setRemoteParticipants(prev => [...prev, participant]);

    // Check if this is an agent - updated to match Python agent
    if (participant.identity.includes('agent') || participant.name?.includes('agent') || participant.identity.includes('Assistant')) {
      setAgentConnected(true);
      console.log('AI Agent detected:', participant.identity);
    }

    // FIX: Safely handle tracks - they might not be immediately available
    // Use getTrackPublications() instead of .tracks
    const trackPublications = participant.getTrackPublications();
    console.log('Available track publications:', trackPublications.map(t => ({
      trackSid: t.trackSid,
      kind: t.kind,
      track: t.track ? 'has track' : 'no track'
    })));

    // Subscribe to all audio tracks from this participant
    trackPublications.forEach(publication => {
      if (publication.kind === Track.Kind.Audio && publication.track) {
        if (audioRef.current) {
          publication.track.attach(audioRef.current);
          audioRef.current.play().catch(e => {
            console.log('Auto-play prevented for initial track:', e);
          });
        }
      }
    });

    // Also listen for future track publications
    participant.on('trackPublished', (publication: RemoteTrackPublication) => {
      console.log('Track published later:', publication.trackSid, publication.kind);
      if (publication.kind === Track.Kind.Audio && publication.track && audioRef.current) {
        publication.track.attach(audioRef.current);
        audioRef.current.play().catch(e => {
          console.log('Auto-play prevented for later track:', e);
        });
      }
    });
  };

  const handleParticipantDisconnected = (participant: RemoteParticipant) => {
    console.log('Participant disconnected:', participant.identity);
    setRemoteParticipants(prev => prev.filter(p => p !== participant));
    
    if (participant.identity.includes('agent') || participant.name?.includes('agent') || participant.identity.includes('Assistant')) {
      setAgentConnected(false);
    }
  };

  // LiveKit connect
  const connectLiveKit = async (livekitUrl: string, accessToken: string, roomName: string) => {
    if (!livekitUrl || !accessToken) {
      setError('Missing LiveKit URL or access token');
      return;
    }

    if (!localVideoTrack || !localAudioTrack) {
      setError('Camera not initialized');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      setAgentConnected(false);

      console.log('Connecting to LiveKit:', { livekitUrl, roomName });

      const room = new Room({ 
        adaptiveStream: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720,
        },
      });

      // Set up room event listeners
      room
        .on('disconnected', () => {
          console.log('Disconnected from room');
          setIsStreaming(false);
          setRemoteParticipants([]);
          setAgentConnected(false);
        })
        .on('participantConnected', handleParticipantConnected)
        .on('participantDisconnected', handleParticipantDisconnected)
        .on('trackSubscribed', handleTrackSubscribed)
        .on('trackUnsubscribed', handleTrackUnsubscribed)
        .on('localTrackPublished', (publication) => {
          console.log('Local track published:', publication.trackSid);
        })
        .on('trackPublished', (publication, participant) => {
          console.log('Remote track published:', publication.trackSid, participant.identity);
        })
        .on('connected', () => {
          console.log('Successfully connected to room');
          console.log('Room participants:', Array.from(room.remoteParticipants.values()).map(p => ({
            identity: p.identity,
            name: p.name,
            metadata: p.metadata,
            tracks: p.getTrackPublications().map(t => t.trackSid)
          })));
        });

      // Connect to room with auto-subscribe enabled
      await room.connect(livekitUrl, accessToken, {
        autoSubscribe: true,
      });

      roomRef.current = room;

      // Create and publish tracks using LiveKit's track system
      const videoTrack = await createLocalVideoTrack({ resolution: VideoPresets.h720 });
      const audioTrack = await createLocalAudioTrack();

      await room.localParticipant.publishTrack(videoTrack);
      await room.localParticipant.publishTrack(audioTrack);

      console.log('Local tracks published, waiting for agent...');

      // Check for existing remote participants (agent might already be there)
      if (room.remoteParticipants.size > 0) {
        console.log('Found existing remote participants:', room.remoteParticipants.size);
        room.remoteParticipants.forEach(participant => {
          handleParticipantConnected(participant);
        });
      }

      setIsStreaming(true);
      setIsConnecting(false);

      // Set timeout to warn if no agent connects
      setTimeout(() => {
        if (!agentConnected && room.remoteParticipants.size === 0) {
          setError('No AI agent detected in the room. Please check if your agent is running and configured correctly.');
          console.log('Available participants:', Array.from(room.remoteParticipants.values()));
        }
      }, 10000); // 10 second timeout

    } catch (err) {
      console.error('Failed to connect to LiveKit:', err);
      setError(`Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsConnecting(false);
    }
  };

  const stopStreaming = async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (localVideoTrack) {
      localVideoTrack.stop();
    }

    if (localAudioTrack) {
      localAudioTrack.stop();
    }

    setLocalVideoTrack(null);
    setLocalAudioTrack(null);
    setIsStreaming(false);
    setIsCameraOn(false);
    setIsMicOn(false);
    setRemoteParticipants([]);
    setAgentConnected(false);
    setConnectionDetails(null);
  };

  const toggleCamera = async () => {
    if (localVideoTrack) {
      localVideoTrack.enabled = !localVideoTrack.enabled;
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleMicrophone = async () => {
    if (localAudioTrack) {
      localAudioTrack.enabled = !localAudioTrack.enabled;
      setIsMicOn(!isMicOn);
    }
  };

  const startStreaming = async () => {
    try {
      if (!localVideoTrack || !localAudioTrack) {
        await startCamera();
      }
      
      // Fetch connection details first
      const details = await fetchConnectionDetails();
      setConnectionDetails(details);
      
      // Connect to LiveKit with the fetched details
      await connectLiveKit(details.serverUrl, details.participantToken, details.roomName);
    } catch (err) {
      console.error('Failed to start streaming:', err);
      setError(`Failed to start streaming: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleBack = () => {
    stopStreaming();
    if (onClose) onClose();
  };

  // Manual play for audio (in case of browser restrictions)
  const playAudioManually = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        console.log('Audio playback started manually');
      }).catch(e => {
        console.log('Manual audio play failed:', e);
      });
    }
  };

  // Hide controls after 3s
  useEffect(() => {
    if (!showControls) return;
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [showControls]);

  // Update video element when local video track changes
  useEffect(() => {
    if (videoRef.current && localVideoTrack) {
      const stream = new MediaStream([localVideoTrack]);
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.log('Video play failed:', e));
    }
  }, [localVideoTrack]);

  // Initialize camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopStreaming();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" onClick={() => setShowControls(true)}>
      {/* Hidden audio element for AI audio */}
      <audio 
        ref={audioRef} 
        autoPlay 
        className="hidden"
        onCanPlay={() => console.log('AI audio can play')}
        onPlay={() => console.log('AI audio started playing')}
        onError={(e) => console.error('AI audio error:', e)}
      />

      {/* Fullscreen video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Error message */}
      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 bg-red-500 text-white px-4 py-2 rounded-lg max-w-md text-center">
          {error}
          <br />
          <button 
            onClick={() => setError(null)}
            className="mt-2 bg-white text-red-500 px-3 py-1 rounded text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Connection status */}
      {isStreaming && (
        <div className="absolute top-4 right-4 z-30 bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${agentConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span>
              {agentConnected ? 'AI Agent Connected' : 'Waiting for AI Agent...'}
            </span>
          </div>
          {connectionDetails?.roomName && <div className="text-xs mt-1">Room: {connectionDetails.roomName}</div>}
          <div className="text-xs mt-1">Participants: {remoteParticipants.length + 1}</div>
          {!agentConnected && (
            <button 
              onClick={playAudioManually}
              className="mt-2 bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded text-xs w-full"
            >
              Check Audio
            </button>
          )}
        </div>
      )}

      {/* Top overlay */}
      {showControls && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-full backdrop-blur-sm transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-4">
            {agentConnected && (
              <div className="flex items-center space-x-2 bg-green-500/80 px-3 py-1 rounded-full text-white text-sm">
                <Bot size={16} />
                <span>AI Listening</span>
              </div>
            )}
            {isStreaming && (
              <div className="bg-red-500 px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span>LIVE</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom right controls */}
      {showControls && (
        <div className="absolute bottom-10 right-10 z-20 flex items-center space-x-4">
          {/* Camera and Mic controls */}
          <div className="flex items-center space-x-3 bg-black/50 rounded-full p-2 backdrop-blur-sm">
            <button
              onClick={toggleCamera}
              disabled={!localVideoTrack || isConnecting}
              className={`p-3 rounded-full transition-colors ${
                isCameraOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500/80 hover:bg-red-600/80'
              } text-white disabled:opacity-50`}
            >
              {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
            </button>

            <button
              onClick={toggleMicrophone}
              disabled={!localAudioTrack || isConnecting}
              className={`p-3 rounded-full transition-colors ${
                isMicOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500/80 hover:bg-red-600/80'
              } text-white disabled:opacity-50`}
            >
              {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
          </div>

          {/* Go Live/End Live button */}
          <div>
            {!isStreaming ? (
              <button
                onClick={startStreaming}
                disabled={!localVideoTrack || !localAudioTrack || isConnecting}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-medium text-lg disabled:opacity-50 transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Go Live'}
              </button>
            ) : (
              <button
                onClick={stopStreaming}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-medium text-lg transition-colors"
              >
                End Live
              </button>
            )}
          </div>
        </div>
      )}

      {/* Connecting overlay */}
      {isConnecting && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="text-center text-white">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p>Connecting to LiveKit...</p>
            <p className="text-sm mt-2">Waiting for AI agent to join</p>
          </div>
        </div>
      )}
    </div>
  );
}
