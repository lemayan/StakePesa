"use client";

  import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { PrintButton } from "@/components/ui/print-button";

interface Section {
  id: string;
  title: string;
}

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  sections: Section[];
  children: React.ReactNode;
}

export function LegalLayout({ title, lastUpdated, sections, children }: LegalLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || "");
  const isClickScrolling = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (isClickScrolling.current) return;
      
      const scrollPosition = window.scrollY + 120; // threshold

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const element = document.getElementById(section.id);
        if (element) {
          const top = element.getBoundingClientRect().top + window.scrollY;
          if (scrollPosition >= top) {
            if (activeSection !== section.id) {
               setActiveSection(section.id);
            }
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections, activeSection]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      isClickScrolling.current = true;
      setActiveSection(id);
      
      const top = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({
        top,
        behavior: "smooth",
      });

      // Re-enable scroll spy after animation assumes completion
      setTimeout(() => {
        isClickScrolling.current = false;
      }, 800);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .hide-on-print {
              display: none !important;
            }
            .print-full-width {
              width: 100% !important;
              max-width: none !important;
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            body {
              background: white !important;
              color: black !important;
            }
            .print-color-black,
            .print-color-black * {
              color: black !important;
              background: transparent !important;
            }
            .print-color-black h2 {
              border-bottom-color: #ccc !important;
              margin-top: 2rem !important;
              margin-bottom: 1rem !important;
            }
            .print-color-black a {
              text-decoration: underline !important;
            }
          }
        `
      }} />
      <div className="max-w-[1200px] mx-auto px-5 lg:px-10 py-8 lg:py-16 min-h-screen print-full-width print-color-black">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 print-full-width">
          
          {/* Sticky Sidebar Navigation - HIDE IN PRINT */}
          <aside className="w-full lg:w-[280px] shrink-0 hide-on-print">
            <div className="sticky top-24 space-y-6 max-h-[calc(100vh-6rem)] overflow-y-auto pr-4 pb-8">
              <div>
                <h2 className="text-sm font-semibold text-fg uppercase tracking-wider mb-4 border-b border-line pb-2">Contents</h2>
                <nav className="flex flex-col space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`text-left text-sm py-1.5 px-3 rounded-md transition-colors ${
                        activeSection === section.id
                          ? "bg-green/10 text-green font-medium"
                          : "text-fg-secondary hover:text-fg hover:bg-line/30"
                      }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="pt-4 border-t border-line space-y-4">
                <button 
                onClick={(e) => {
                  e.preventDefault();
                  try {
                    window.location.href = "mailto:support@stakepesa.com?subject=StakePesa%20Legal%20Feedback";
                  } catch(err) {
                    // Fallback to clipboard if mailto throws or blocked
                    navigator.clipboard.writeText("support@stakepesa.com");
                    alert("Email copied to clipboard: support@stakepesa.com");
                  }
                }}
                className="w-full flex items-center justify-center gap-2 text-sm text-[var(--background)] bg-green hover:opacity-90 transition-all px-4 py-3 rounded-lg font-bold shadow-[0_0_15px_rgba(0,255,102,0.2)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                Send Feedback
              </button>
                <div>
                  <PrintButton />
                </div>
                <div className="pt-2">
                  <Link href="/" className="text-sm text-green hover:underline">
                    &larr; Return to Home
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 max-w-[800px] print-full-width">
            <header className="mb-12 print:mb-6">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">{title}</h1>
              <p className="text-sm font-mono text-fg-muted uppercase tracking-wider">Last Updated: {lastUpdated}</p>
            </header>
            
            <div className="text-fg-secondary text-[15px] sm:text-[16px] leading-[1.75] [&_h2]:text-2xl [&_h2]:sm:text-3xl [&_h2]:font-bold [&_h2]:text-fg [&_h2]:mt-16 [&_h2]:mb-6 [&_h2]:tracking-tight [&_h2]:border-b [&_h2]:border-line [&_h2]:pb-4 [&_p]:mb-6 [&_strong]:text-fg [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_ul]:space-y-3 [&_li]:pl-1 [&_a]:text-green hover:[&_a]:underline">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
