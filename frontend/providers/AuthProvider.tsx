"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth";
import type { User, Session } from "better-auth/types";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useOrinStore } from "@/stores/useOrinStore";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  googleOneTap: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { setUser: setOrinUser } = useOrinStore();
  const oneTapInFlight = useRef(false);

  useEffect(() => {
    async function fetchSession() {
      try {
        const { data } = await authClient.getSession();
        const currentUser = data?.user || null;
        setUser(currentUser);
        setSession(data?.session || null);

        // Sync to OrinStore for UI data consistency
        if (currentUser) {
          setOrinUser({
            id: currentUser.id,
            email: currentUser.email,
            name: currentUser.name || "User",
            avatar: currentUser.image || undefined,
            geminiKey: (currentUser as any).geminiKey,
            notionRestAccessToken: (currentUser as any).notionRestAccessToken,
            notionMcpAccessToken: (currentUser as any).notionMcpAccessToken
          });

          const hasGemini = Boolean((currentUser as any).geminiKey);
          const hasNotionMcp = Boolean((currentUser as any).notionMcpAccessToken);
          const isSetupComplete = hasGemini && hasNotionMcp;
          const isAuthOrOnboarding = pathname === "/auth" || pathname === "/onboarding";
          if (isAuthOrOnboarding) {
            router.push(isSetupComplete ? "/dashboard" : "/onboarding");
          }
        } else {
          setOrinUser(null);
        }
      } catch (error) {
        console.error("Session fetch failed", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [setOrinUser, pathname, searchParams, router]);

  const refresh = async () => {
    setLoading(true);
    // Force direct call ignoring any potential client cache
    const { data } = await authClient.getSession();
    const currentUser = data?.user || null;
    setUser(currentUser);
    setSession(data?.session || null);
    
    if (currentUser) {
       setOrinUser({
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name || "User",
        avatar: currentUser.image || undefined,
        geminiKey: (currentUser as any).geminiKey,
        notionRestAccessToken: (currentUser as any).notionRestAccessToken,
        notionMcpAccessToken: (currentUser as any).notionMcpAccessToken
      });
    }

    setLoading(false);
  };

  const logout = async () => {
    await authClient.signOut();
    setUser(null);
    setSession(null);
    router.push("/auth");
  };

  const loginWithGoogle = async () => {
    await authClient.signIn.social({ 
      provider: "google",
      callbackURL: `${process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"}/onboarding`
    });
  };

  const loginWithGithub = async () => {
    await authClient.signIn.social({ 
      provider: "github",
      callbackURL: `${process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"}/onboarding`
    });
  };

  const googleOneTap = async () => {
    try {
      if (oneTapInFlight.current) return;
      oneTapInFlight.current = true;
      // @ts-ignore - better-auth types might not catch social.oneTap depending on plugin setup
      await authClient.oneTap({
        callbackURL: `${process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"}/onboarding`
      });
    } catch (error) {
      console.warn("One Tap sign-in failed or was dismissed", error);
    } finally {
      oneTapInFlight.current = false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user, 
      session, 
      isAuthenticated: !!user, 
      loading, 
      logout, 
      loginWithGoogle, 
      loginWithGithub,
      googleOneTap,
      refresh
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
