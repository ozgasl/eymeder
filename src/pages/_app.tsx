import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/toaster";
import { WhatsAppFloating } from "@/components/WhatsAppFloating";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/globals.css";

function isPublicPath(pathname: string): boolean {
  return pathname === "/welcome" || pathname.startsWith("/auth/");
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !isPublicPath(router.pathname)) {
        router.replace("/welcome");
        return;
      }
      if (active) setChecked(true);
    };

    checkAccess();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !isPublicPath(router.pathname)) {
        router.replace("/welcome");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.pathname]);

  if (!checked && !isPublicPath(router.pathname)) {
    return null;
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="flex flex-col min-h-screen">
          <Component {...pageProps} />
          <Footer />
        </div>
        <Toaster />
        <WhatsAppFloating />
      </LanguageProvider>
    </ThemeProvider>
  );
}
