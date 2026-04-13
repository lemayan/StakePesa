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
    <div className="max-w-[1200px] mx-auto px-5 lg:px-10 py-8 lg:py-16 min-h-screen print:py-0 print:px-0 print:m-0 print:bg-white print:text-black">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 print:block">
        
        {/* Sticky Sidebar Navigation - HIDE IN PRINT */}
        <aside className="w-full lg:w-[280px] shrink-0 print:hidden">
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
              <a 
                href="mailto:support@stakepesa.com?subject=Legal%20Feedback"
                className="flex items-center gap-2 text-sm text-fg-secondary hover:text-fg transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                Send Feedback
              </a>
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
        <main className="flex-1 max-w-[800px] print:max-w-none print:w-full print:block print:text-black">
          <header className="mb-12 print:mb-6">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4 print:text-black print:text-3xl">{title}</h1>
            <p className="text-sm font-mono text-fg-muted uppercase tracking-wider print:text-gray-600">Last Updated: {lastUpdated}</p>
          </header>
          
          <div className="text-fg-secondary text-[15px] sm:text-[16px] leading-[1.75] print:text-[12pt] print:leading-normal print:text-black print:[&_*]:text-black print:[&_h2]:text-black print:[&_h2]:border-gray-300 print:[&_strong]:text-black [&_h2]:text-2xl [&_h2]:sm:text-3xl [&_h2]:font-bold [&_h2]:text-fg [&_h2]:mt-16 [&_h2]:mb-6 print:[&_h2]:mt-8 print:[&_h2]:mb-4 [&_h2]:tracking-tight [&_h2]:border-b [&_h2]:border-line [&_h2]:pb-4 [&_p]:mb-6 [&_strong]:text-fg [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_ul]:space-y-3 [&_li]:pl-1 [&_a]:text-green hover:[&_a]:underline">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
