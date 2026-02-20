import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { UserButton } from "@clerk/clerk-react";
import { Menu } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background dark">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-screen overflow-auto">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
<<<<<<< HEAD:frontend/src/components/DashboardLayout.tsx
            <div className="ml-auto flex items-center">
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
=======
            <UserButton
              afterSignOutUrl="/login"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
>>>>>>> 58cd5d0fbf77c192200299f08ea0f25b435a77a7:src/components/DashboardLayout.tsx
          </header>
          <div className="flex-1 p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
