import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./hooks/useAuth";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Donors from "./pages/Donors";
import DonorDetail from "./pages/DonorDetail";
import Donations from "./pages/Donations";
import Reports from "./pages/Reports";
import TaxLetters from "./pages/TaxLetters";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/donors" element={<Donors />} />
              <Route path="/donors/:id" element={<DonorDetail />} />
              <Route path="/donations" element={<Donations />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/tax-letters" element={<TaxLetters />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
