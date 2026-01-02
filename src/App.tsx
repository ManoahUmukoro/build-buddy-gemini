import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { UserSettingsProvider } from "@/hooks/useUserSettings";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import PaymentCallback from "./pages/PaymentCallback";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminEmail from "./pages/admin/AdminEmail";
import AdminHelp from "./pages/admin/AdminHelp";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminSupportInbox from "./pages/admin/AdminSupportInbox";
import AdminCurrencyCache from "./pages/admin/AdminCurrencyCache";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UserSettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <MaintenanceBanner />
          <PWAInstallPrompt />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/payment-callback" element={<PaymentCallback />} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/admin/roles" element={<AdminRoute><AdminRoles /></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
              <Route path="/admin/billing" element={<AdminRoute><AdminBilling /></AdminRoute>} />
              <Route path="/admin/email" element={<AdminRoute><AdminEmail /></AdminRoute>} />
              <Route path="/admin/help" element={<AdminRoute><AdminHelp /></AdminRoute>} />
              <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
              <Route path="/admin/support" element={<AdminRoute><AdminSupportInbox /></AdminRoute>} />
              <Route path="/admin/currency" element={<AdminRoute><AdminCurrencyCache /></AdminRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </UserSettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
