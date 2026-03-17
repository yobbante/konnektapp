import { useState, useEffect, useRef, useCallback } from "react";
import Peer from "peerjs";
import { supabase } from "@/integrations/supabase/client";

export type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

interface UseAudioCallOptions {
  currentUserId: string;
  conversationId: string;
}

export function useAudioCall({ currentUserId, conversationId }: UseAudioCallOptions) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ callId: string; callerId: string } | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const mediaConnectionRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize peer
  const initPeer = useCallback(() => {
    if (peerRef.current) return peerRef.current;
    
    const peerId = `kkt-${currentUserId.slice(0, 8)}-${Date.now()}`;
    const peer = new Peer(peerId, {
      debug: 0,
    });

    peer.on("call", (call) => {
      // Incoming call handled via Supabase signals
      mediaConnectionRef.current = call;
    });

    peerRef.current = peer;
    return peer;
  }, [currentUserId]);

  // Listen for incoming calls via Supabase realtime
  useEffect(() => {
    const channel = supabase
      .channel(`calls-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `callee_id=eq.${currentUserId}`,
        },
        (payload: any) => {
          if (payload.new.status === "ringing" && payload.new.conversation_id === conversationId) {
            setIncomingCall({
              callId: payload.new.id,
              callerId: payload.new.caller_id,
            });
            setCallStatus("ringing");
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_signals",
        },
        (payload: any) => {
          const signal = payload.new;
          if (signal.id !== activeCallId && signal.id !== incomingCall?.callId) return;

          if (signal.status === "ended" || signal.status === "rejected") {
            endCall(false);
          } else if (signal.status === "connected" && signal.callee_peer_id && signal.caller_id === currentUserId) {
            // Caller: callee accepted, connect via PeerJS
            connectToPeer(signal.callee_peer_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, conversationId, activeCallId, incomingCall]);

  const connectToPeer = async (remotePeerId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const peer = initPeer();
      const call = peer.call(remotePeerId, stream);
      mediaConnectionRef.current = call;

      call.on("stream", (remoteStream: MediaStream) => {
        playRemoteStream(remoteStream);
        setCallStatus("connected");
        startTimer();
      });

      call.on("close", () => endCall(false));
    } catch (error) {
      console.error("Error connecting to peer:", error);
      endCall(true);
    }
  };

  const playRemoteStream = (stream: MediaStream) => {
    if (!remoteAudioRef.current) {
      remoteAudioRef.current = new Audio();
    }
    remoteAudioRef.current.srcObject = stream;
    remoteAudioRef.current.play().catch(console.error);
  };

  const startTimer = () => {
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  // Start a call
  const startCall = async (calleeId: string) => {
    try {
      const peer = initPeer();
      
      // Wait for peer to be ready
      await new Promise<void>((resolve) => {
        if (peer.id) resolve();
        else peer.on("open", () => resolve());
      });

      const { data, error } = await supabase
        .from("call_signals")
        .insert({
          caller_id: currentUserId,
          callee_id: calleeId,
          conversation_id: conversationId,
          status: "ringing",
          caller_peer_id: peer.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setActiveCallId(data.id);
      setCallStatus("calling");

      // Auto-timeout after 30s
      setTimeout(() => {
        if (callStatus === "calling") {
          endCall(true);
        }
      }, 30000);
    } catch (error) {
      console.error("Error starting call:", error);
      setCallStatus("idle");
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    if (!incomingCall) return;

    try {
      const peer = initPeer();

      await new Promise<void>((resolve) => {
        if (peer.id) resolve();
        else peer.on("open", () => resolve());
      });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      // Update signal with our peer ID
      await supabase
        .from("call_signals")
        .update({
          status: "connected",
          callee_peer_id: peer.id,
          started_at: new Date().toISOString(),
        })
        .eq("id", incomingCall.callId);

      setActiveCallId(incomingCall.callId);
      setIncomingCall(null);

      // Answer the PeerJS call when it comes
      peer.on("call", (call) => {
        call.answer(stream);
        mediaConnectionRef.current = call;

        call.on("stream", (remoteStream: MediaStream) => {
          playRemoteStream(remoteStream);
          setCallStatus("connected");
          startTimer();
        });

        call.on("close", () => endCall(false));
      });
    } catch (error) {
      console.error("Error accepting call:", error);
      rejectCall();
    }
  };

  // Reject incoming call
  const rejectCall = async () => {
    if (!incomingCall) return;

    await supabase
      .from("call_signals")
      .update({ status: "rejected", ended_at: new Date().toISOString() })
      .eq("id", incomingCall.callId);

    setIncomingCall(null);
    setCallStatus("idle");
  };

  // End call
  const endCall = async (updateDb: boolean = true) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    mediaConnectionRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    remoteAudioRef.current?.pause();
    
    if (updateDb && activeCallId) {
      await supabase
        .from("call_signals")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", activeCallId);
    }

    setCallStatus("idle");
    setCallDuration(0);
    setActiveCallId(null);
    setIncomingCall(null);
    mediaConnectionRef.current = null;
    localStreamRef.current = null;
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      localStreamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      peerRef.current?.destroy();
    };
  }, []);

  return {
    callStatus,
    callDuration,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall: () => endCall(true),
  };
}

export function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
