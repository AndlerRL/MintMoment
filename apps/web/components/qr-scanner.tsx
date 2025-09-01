"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@supabase/auth-helpers-react";
import {
  type IDetectedBarcode,
  Scanner
} from "@yudiel/react-qr-scanner";
import { ScanQrCodeIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function QRScanner({
  onResult,
}: { onResult?: (result: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const session = useSession();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  const handleScanClick = () => {
    setScanning(true);
  };

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    const detectedCode = detectedCodes[0]
    const { format, rawValue } = detectedCode
    console.log('detectedCodes', detectedCodes)
    if (error || !scanning || format !== 'qr_code') {
      if (error || format !== 'qr_code') {
        handleError(error || new Error("No QR code found"));
      }
      return;
    }

    console.log("setScanned(true);", rawValue);

    onResult?.(rawValue);
    // Assume the QR code contains the event ID/slug
    const digestedResults = rawValue.replace(/(https|http):\/\/.*\//, "");
    const redirectionLink = !session?.user.id
      ? `/events/${digestedResults}`
      : `/sign-in?redirect=/events/${digestedResults}`;

    setScanning(false);
    setScanned(true);

    router.push(redirectionLink);
  };

  const handleError = (err: any) => {
    setError(err.message);
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-[420px] max-h-[420px] bg-accent rounded-3xl">
      {!scanning ? (
        <Button variant="secondary" size="lg" onClick={handleScanClick} className="text-lg font-bold">
          SCAN<ScanQrCodeIcon className="size-7" />
        </Button>
      ) : (
        <Scanner
          constraints={{
            facingMode: "environment",
            aspectRatio: 0.75,
            frameRate: 24,
            sampleSize: 124,
          }}
          formats={["qr_code"]}
          paused={scanned}
          // components={{ audio: false }}
          onScan={handleScan}
          classNames={{
            container: "rounded-3xl h-full w-full max-w-[420px] max-h-[420px] [&_svg]:rounded-3xl relative",
            video:
              "w-full h-full relative object-cover rounded-3xl",
          }}
        />
      )}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
