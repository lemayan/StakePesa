import { Suspense } from "react";
import { Navbar } from "@/components/sections/navbar";
import { Hero } from "@/components/sections/hero";
import { StatsBar } from "@/components/sections/stats-bar";
import { HowItWorks } from "@/components/sections/how-it-works";
import { LiveMarkets } from "@/components/sections/live-markets";
import { CallToAction } from "@/components/sections/cta";
import { Footer } from "@/components/sections/footer";
import CookieConsent from "@/components/ui/cookie-consent";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg">
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <Hero />
      <StatsBar />
      <HowItWorks />
      <Suspense fallback={null}>
        <LiveMarkets />
      </Suspense>
      <CallToAction />
      <Footer />
      <CookieConsent />
    </div>
  );
}

