import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { ToastProvider } from "@/components/ui/toast";
import { CommandPalette } from "@/components/ui/command-palette";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg">
        <Sidebar />
        <CommandPalette />
        {/* Main content — offset by sidebar on desktop, bottom-padded for mobile tab bar */}
        <div className="md:pl-[220px] pb-20 md:pb-0">
          <DashboardHeader />
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
