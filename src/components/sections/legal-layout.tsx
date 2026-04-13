"use client";

import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Call once on mount

    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: "smooth",
      });
      setActiveSection(id);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-5 lg:px-10 py-8 lg:py-16 min-h-screen">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
        
        {/* Sticky Sidebar Navigation */}
        <aside className="w-full lg:w-[280px] shrink-0">
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
              <div className="print:hidden">
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
        <main className="flex-1 max-w-[800px]">
          <header className="mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">{title}</h1>
            <p className="text-sm font-mono text-fg-muted uppercase tracking-wider">Last Updated: {lastUpdated}</p>
          </header>
          
          <div className="text-fg-secondary text-[15px] sm:text-[16px] leading-[1.75] [&_h2]:text-2xl [&_h2]:sm:text-3xl [&_h2]:font-bold [&_h2]:text-fg [&_h2]:mt-16 [&_h2]:mb-6 [&_h2]:tracking-tight [&_h2]:border-b [&_h2]:border-line [&_h2]:pb-4 [&_p]:mb-6 [&_strong]:text-fg [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_ul]:space-y-3 [&_li]:pl-1 [&_a]:text-green hover:[&_a]:underline">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
