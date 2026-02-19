import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./hooks/useAuth";
import { DarkModeProvider } from "./hooks/useDarkMode";
import AppLayout from "./components/layout/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Donors from "./pages/Donors";
import DonorDetail from "./pages/DonorDetail";
import Donations from "./pages/Donations";
import Reports from "./pages/Reports";
import TaxLetters from "./pages/TaxLetters";
import Settings from "./pages/Settings";
import Upgrade from "./pages/Upgrade";
import PaymentSuccess from "./pages/PaymentSuccess";
import VerifyEmail from "./pages/VerifyEmail";
import VerifyEmailPending from "./pages/VerifyEmailPending";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Support from "./pages/Support";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DarkModeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/upgrade" element={<Upgrade />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verify-email-pending" element={<VerifyEmailPending />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="donors" element={<Donors />} />
              <Route path="donors/:id" element={<DonorDetail />} />
              <Route path="donations" element={<Donations />} />
              <Route path="reports" element={<Reports />} />
              <Route path="tax-letters" element={<TaxLetters />} />
              <Route path="settings" element={<Settings />} />
              <Route path="support" element={<Support />} />
              <Route path="upgrade" element={<Upgrade />} />
            </Route>
          </Routes>
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
      </DarkModeProvider>
    </QueryClientProvider>
  );
}

export default App;
