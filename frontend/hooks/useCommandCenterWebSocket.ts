import { useEffect } from "react";
import { useCommandCenterStore } from "@/stores/useCommandCenterStore";

export function useCommandCenterWebSocket() {
  const { setConnectionStatus, updateLog, updateStep } = useCommandCenterStore();

  useEffect(() => {
    // In a real implementation this would connect to the actual backend WS.
    // For now we simulate the connection lifecycle and real-time updates.
    setConnectionStatus("connecting");
    
    const timer = setTimeout(() => {
      setConnectionStatus("connected");
      
      // Simulate an incoming step completion event for the design mock
      setTimeout(() => {
        updateStep("log-2", "s2", true);
      }, 3000);
      
      setTimeout(() => {
        updateStep("log-2", "s3", true);
        updateLog("log-2", { status: "success", summary: "Successfully mapped structured nodes to Notion block API." });
      }, 6000);

    }, 1000);

    return () => {
      clearTimeout(timer);
      setConnectionStatus("disconnected");
    };
  }, [setConnectionStatus, updateLog, updateStep]);
}
