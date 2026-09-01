"use client";

import * as React from "react";
import { Camera, CameraOff, Lock, MonitorSmartphone, RefreshCw } from "lucide-react";
import { useQrScanner, type ScannerState } from "./use-qr-scanner";
import { Mascot, type Expression } from "@/components/brand/mascot";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

interface Guidance {
  expression: Expression;
  title: string;
  body: string;
  icon: React.ReactNode;
  retry: boolean;
}

/**
 * Every camera failure gets its own explanation and its own next step (§11).
 * A blocked permission and an unsupported browser are not the same problem,
 * and telling the user to "try again" when the browser cannot ever work is
 * worse than saying nothing.
 */
const GUIDANCE: Record<Exclude<ScannerState, "idle" | "requesting" | "scanning">, Guidance> = {
  denied: {
    expression: "annoyed",
    title: "CAMERA IS BLOCKED.",
    body: "Allow camera access for this site in your browser settings, then try again.",
    icon: <CameraOff size={16} />,
    retry: true,
  },
  unavailable: {
    expression: "waiting",
    title: "NO CAMERA FOUND.",
    body: "This device has no usable camera. You can type the code from your terminal instead.",
    icon: <CameraOff size={16} />,
    retry: false,
  },
  unsupported: {
    expression: "annoyed",
    title: "THIS BROWSER CAN'T SCAN.",
    body: "It has no camera API. Open Lazy Skill in Safari or Chrome, or enter the code manually.",
    icon: <MonitorSmartphone size={16} />,
    retry: false,
  },
  insecure: {
    expression: "annoyed",
    title: "NEEDS A SECURE CONNECTION.",
    body: "Browsers only allow the camera over HTTPS. Open the site over https and try again.",
    icon: <Lock size={16} />,
    retry: false,
  },
  error: {
    expression: "annoyed",
    title: "THE CAMERA DIDN'T START.",
    body: "Even Lazy Skill gets tired sometimes.",
    icon: <CameraOff size={16} />,
    retry: true,
  },
};

export function ScannerView({
  onResult,
  active,
  onRetry,
}: {
  onResult: (value: string) => void;
  active: boolean;
  onRetry: () => void;
}) {
  const { videoRef, canvasRef, state, error } = useQrScanner(onResult, active);

  if (state !== "idle" && state !== "requesting" && state !== "scanning") {
    const guidance = GUIDANCE[state];
    return (
      <Panel className="flex flex-col items-center px-6 py-10 text-center">
        <Mascot expression={guidance.expression} size={64} />
        <p className="mt-5 font-pixel text-[12px] leading-relaxed text-ink">{guidance.title}</p>
        <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-dim">
          {state === "error" && error ? error : guidance.body}
        </p>
        {guidance.retry && (
          <Button variant="secondary" size="sm" className="mt-6" onClick={onRetry}>
            <RefreshCw size={14} />
            Try again
          </Button>
        )}
      </Panel>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-bg-deep">
      <video
        ref={videoRef}
        muted
        playsInline
        className={cn(
          "aspect-square w-full object-cover transition-opacity duration-300",
          state === "scanning" ? "opacity-100" : "opacity-0"
        )}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Framing brackets, drawn outside the video so nothing overlaps the
          area the decoder reads. */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="relative h-[62%] w-[62%]">
          {[
            "left-0 top-0 border-l-2 border-t-2 rounded-tl-lg",
            "right-0 top-0 border-r-2 border-t-2 rounded-tr-lg",
            "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-lg",
            "right-0 bottom-0 border-r-2 border-b-2 rounded-br-lg",
          ].map((pos) => (
            <span key={pos} className={cn("absolute h-8 w-8 border-accent", pos)} />
          ))}
        </div>
      </div>

      {state !== "scanning" && (
        <div className="absolute inset-0 grid place-items-center bg-bg-deep">
          <div className="text-center">
            <Mascot expression="curious" size={56} float className="mx-auto" />
            <p className="mt-4 flex items-center justify-center gap-2 text-[13px] text-dim">
              <Camera size={14} />
              {state === "requesting" ? "Asking for the camera..." : "Starting camera..."}
            </p>
          </div>
        </div>
      )}

      {state === "scanning" && (
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-deep to-transparent px-4 pb-4 pt-8 text-center text-[13px] text-dim">
          Point at the QR in your terminal
        </p>
      )}
    </div>
  );
}
