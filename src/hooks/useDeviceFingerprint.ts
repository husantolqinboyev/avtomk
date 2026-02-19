import { useState, useEffect } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { supabase } from "@/integrations/supabase/client";

type DeviceType = "pc" | "mobile";

function detectDeviceType(): DeviceType {
  const ua = navigator.userAgent;
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return "mobile";
  }
  return "pc";
}

export function useDeviceFingerprint(userId: string | undefined) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!userId) {
      setChecking(false);
      setAllowed(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const visitorId = result.visitorId;
        const deviceType = detectDeviceType();

        const { data: profile } = await supabase
          .from("profiles")
          .select("pc_device_id, mobile_device_id")
          .eq("user_id", userId)
          .single();

        if (cancelled) return;

        if (!profile) {
          setAllowed(false);
          setChecking(false);
          return;
        }

        const column = deviceType === "pc" ? "pc_device_id" : "mobile_device_id";
        const currentDeviceId = profile[column];

        if (!currentDeviceId) {
          // Slot is empty — register this device
          await supabase
            .from("profiles")
            .update({ [column]: visitorId })
            .eq("user_id", userId);
          if (!cancelled) {
            setAllowed(true);
            setChecking(false);
          }
        } else if (currentDeviceId === visitorId) {
          // Same device — allow
          if (!cancelled) {
            setAllowed(true);
            setChecking(false);
          }
        } else {
          // Different device — blocked
          if (!cancelled) {
            setAllowed(false);
            setChecking(false);
          }
        }
      } catch {
        if (!cancelled) {
          setAllowed(true); // fallback: don't block on error
          setChecking(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  return { allowed, checking };
}
