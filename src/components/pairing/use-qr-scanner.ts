"use client";

import * as React from "react";

export type ScannerState =
  | "idle"
  | "requesting"
  | "scanning"
  | "denied"
  | "unavailable"
  | "unsupported"
  | "insecure"
  | "error";

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): BarcodeDetectorLike;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

/**
 * Camera QR scanning.
 *
 * Prefers the platform's BarcodeDetector where it exists (hardware-backed on
 * Android/Chrome) and falls back to decoding canvas frames with jsQR, which is
 * what iOS Safari needs. jsQR is loaded lazily so browsers with the native API
 * never download it.
 *
 * Every failure mode the spec calls out is a distinct state, because "camera
 * blocked" and "browser too old" need different advice (§11).
 */
/**
 * Whether this browser can use a camera at all. Read from the DOM rather than
 * mirrored into state: it cannot change during a session, and writing it from
 * an effect would cost a second render on every mount.
 */
function capabilitySnapshot(): "ok" | "insecure" | "unsupported" {
  if (!window.isSecureContext) return "insecure";
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  return "ok";
}

// Capability never changes, so the store never notifies.
const noopSubscribe = () => () => {};
const serverCapability = () => "ok" as const;

export function useQrScanner(onResult: (value: string) => void, active: boolean) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const detectorRef = React.useRef<BarcodeDetectorLike | null>(null);
  const decoderRef = React.useRef<typeof import("jsqr").default | null>(null);
  const doneRef = React.useRef(false);

  const capability = React.useSyncExternalStore(
    noopSubscribe,
    capabilitySnapshot,
    serverCapability
  );

  const [cameraState, setCameraState] = React.useState<ScannerState>("idle");
  const [error, setError] = React.useState<string | null>(null);

  // A browser that cannot ever scan reports that directly; only a browser that
  // could scan goes through the request/scan lifecycle.
  const state: ScannerState = capability === "ok" ? cameraState : capability;

  // Kept in a ref so restarting the camera is not tied to the callback's
  // identity — a re-created handler must not tear down a live stream.
  const onResultRef = React.useRef(onResult);
  React.useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const stop = React.useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  React.useEffect(() => {
    if (!active || capability !== "ok") {
      stop();
      return;
    }

    doneRef.current = false;
    let cancelled = false;

    async function start() {
      setCameraState("requesting");

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch (err) {
        if (cancelled) return;
        const name = (err as DOMException)?.name;
        if (name === "NotAllowedError" || name === "SecurityError") setCameraState("denied");
        else if (name === "NotFoundError" || name === "OverconstrainedError") setCameraState("unavailable");
        else {
          setCameraState("error");
          setError((err as Error)?.message ?? "The camera could not be started.");
        }
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      try {
        await video.play();
      } catch {
        // Autoplay rejection still leaves usable frames on most browsers.
      }

      if (window.BarcodeDetector) {
        try {
          detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
        } catch {
          detectorRef.current = null;
        }
      }
      if (!detectorRef.current && !decoderRef.current) {
        decoderRef.current = (await import("jsqr")).default;
      }

      if (cancelled) return;
      setCameraState("scanning");
      frameRef.current = requestAnimationFrame(tick);
    }

    async function tick() {
      const video = videoRef.current;
      if (!video || doneRef.current) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const value = await readFrame(video);
        if (value && !doneRef.current) {
          doneRef.current = true;
          stop();
          onResultRef.current(value);
          return;
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    async function readFrame(video: HTMLVideoElement): Promise<string | null> {
      if (detectorRef.current) {
        try {
          const [first] = await detectorRef.current.detect(video);
          return first?.rawValue ?? null;
        } catch {
          // A detector that starts throwing is dropped in favour of jsQR
          // rather than killing the scan.
          detectorRef.current = null;
          decoderRef.current ??= (await import("jsqr")).default;
          return null;
        }
      }

      const decode = decoderRef.current;
      const canvas = canvasRef.current;
      if (!decode || !canvas) return null;

      // Cap the working resolution: decoding a full 4K frame every tick melts
      // phone batteries for no accuracy gain.
      const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight || 1));
      const width = Math.floor(video.videoWidth * scale);
      const height = Math.floor(video.videoHeight * scale);
      if (width === 0 || height === 0) return null;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, width, height);
      const image = ctx.getImageData(0, 0, width, height);
      const result = decode(image.data, width, height, { inversionAttempts: "dontInvert" });
      return result?.data ?? null;
    }

    void start();

    return () => {
      cancelled = true;
      stop();
    };
  }, [active, capability, stop]);

  return { videoRef, canvasRef, state, error, stop };
}
