import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff } from "lucide-react";
import { useState } from "react";
import { CallStatus, formatCallDuration } from "@/hooks/useAudioCall";

interface AudioCallUIProps {
  callStatus: CallStatus;
  callDuration: number;
  contactName: string;
  incomingCall: { callId: string; callerId: string } | null;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
}

export function AudioCallUI({
  callStatus,
  callDuration,
  contactName,
  incomingCall,
  onAccept,
  onReject,
  onEnd,
}: AudioCallUIProps) {
  const [muted, setMuted] = useState(false);

  if (callStatus === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed inset-0 z-[100] bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center text-white"
      >
        {/* Pulsing avatar */}
        <div className="relative mb-8">
          <div className={`w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center ${
            callStatus === "ringing" || callStatus === "calling" ? "animate-pulse" : ""
          }`}>
            <span className="text-3xl font-bold text-white">
              {contactName.charAt(0).toUpperCase()}
            </span>
          </div>
          {(callStatus === "calling" || callStatus === "ringing") && (
            <div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping" />
          )}
        </div>

        {/* Contact name */}
        <h2 className="text-xl font-bold mb-2">{contactName}</h2>

        {/* Status text */}
        <p className="text-sm text-white/60 mb-8">
          {callStatus === "calling" && "Appel en cours..."}
          {callStatus === "ringing" && "Appel entrant..."}
          {callStatus === "connected" && formatCallDuration(callDuration)}
        </p>

        {/* Controls */}
        <div className="flex items-center gap-6">
          {callStatus === "ringing" ? (
            <>
              {/* Reject */}
              <button
                onClick={onReject}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
              {/* Accept */}
              <button
                onClick={onAccept}
                className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform animate-bounce"
              >
                <PhoneIncoming className="w-7 h-7 text-white" />
              </button>
            </>
          ) : (
            <>
              {/* Mute toggle */}
              {callStatus === "connected" && (
                <button
                  onClick={() => setMuted(!muted)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    muted ? "bg-red-500/80" : "bg-white/10"
                  }`}
                >
                  {muted ? (
                    <MicOff className="w-6 h-6 text-white" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </button>
              )}

              {/* End call */}
              <button
                onClick={onEnd}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
