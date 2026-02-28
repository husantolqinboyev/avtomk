import { useState, useEffect } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { supabase } from "@/integrations/supabase/client";

type DeviceType = "pc" | "mobile";
const STORAGE_KEY = "avtomaktab_device_trust_id";

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
        const localTrustId = localStorage.getItem(STORAGE_KEY);

        const { data: profile } = await supabase
          .from("profiles")
          .select("pc_device_ids, mobile_device_ids, pc_limit, mobile_limit")
          .eq("user_id", userId)
          .single();

        if (cancelled) return;

        if (!profile) {
          setAllowed(false);
          setChecking(false);
          return;
        }

        const column = deviceType === "pc" ? "pc_device_ids" : "mobile_device_ids";
        const limitColumn = deviceType === "pc" ? "pc_limit" : "mobile_limit";

        const deviceIds = (profile[column] as string[]) || [];
        const limit = (profile[limitColumn] as number) || 1;

        if (deviceIds.includes(visitorId)) {
          // Device already registered
          localStorage.setItem(STORAGE_KEY, visitorId);
          if (!cancelled) {
            setAllowed(true);
            setChecking(false);
          }
        } else if (localTrustId && deviceIds.includes(localTrustId)) {
          // "LOOSEN" logic: Replacing an old ID on the same device
          console.log("Device update detected. Updating fingerprint.");
          const newDeviceIds = deviceIds.map(id => id === localTrustId ? visitorId : id);

          await supabase
            .from("profiles")
            .update({ [column]: newDeviceIds })
            .eq("user_id", userId);

          localStorage.setItem(STORAGE_KEY, visitorId);
          if (!cancelled) {
            setAllowed(true);
            setChecking(false);
          }
        } else if (deviceIds.length < limit) {
          // New device and space available
          const newDeviceIds = [...deviceIds, visitorId];

          await supabase
            .from("profiles")
            .update({ [column]: newDeviceIds })
            .eq("user_id", userId);

          localStorage.setItem(STORAGE_KEY, visitorId);
          if (!cancelled) {
            setAllowed(true);
            setChecking(false);
          }
        } else {
          // Limit reached
          if (!cancelled) {
            setAllowed(false);
            setChecking(false);
          }
        }
      } catch (err) {
        console.error("Device fingerprint error:", err);
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
