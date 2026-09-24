import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Loader from './components/ui/Loader';
import ScrollToTop from './components/ScrollToTop';
import { GlobalLoaderProvider } from './context/GlobalLoaderContext';

// Lazy load all pages for global transition effect

// Auth pages
const SignIn = lazy(() => import('./pages/auth/SignIn'));
const SignUp = lazy(() => import('./pages/auth/SignUp'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
// Vendor pages
const Vendors = lazy(() => import('./pages/vendor/Vendors'));
const VendorSignUp = lazy(() => import('./pages/vendor/VendorSignUp'));
const VendorSignIn = lazy(() => import('./pages/vendor/VendorSignIn'));
const VendorDashboard = lazy(() => import('./pages/vendor/VendorDashboard'));
const VendorOrders = lazy(() => import('./pages/vendor/VendorOrders'));
const VendorRestaurant = lazy(() => import('./pages/vendor/VendorRestaurant'));
const VendorAddMenuItem = lazy(() => import('./pages/vendor/VendorAddMenuItem'));
const VendorDetails = lazy(() => import('./pages/vendor/VendorDetails'));
const VendorKycOnboarding = lazy(() => import('./pages/vendor/VendorKycOnboarding'));

// Admin pages
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

// Rider pages
const RiderDashboard = lazy(() => import('./pages/rider/RiderDashboard'));
const RiderKycOnboarding = lazy(() => import('./pages/rider/RiderKycOnboarding'));
// Customer pages
const UserProfile = lazy(() => import('./pages/customer/UserProfile'));
const Explore = lazy(() => import('./pages/customer/Explore'));
const OrderSummary = lazy(() => import('./pages/customer/OrderSummary'));

// Marketing pages
const Home = lazy(() => import('./pages/marketing/Home'));
const Overview = lazy(() => import('./pages/marketing/Overview'));
const Features = lazy(() => import('./pages/marketing/Features'));
const About = lazy(() => import('./pages/marketing/About'));
const Contact = lazy(() => import('./pages/marketing/Contact'));
const FAQ = lazy(() => import('./pages/marketing/FAQ'));

// Legal pages
const Terms = lazy(() => import('./pages/legal/Terms'));
const Privacy = lazy(() => import('./pages/legal/Privacy'));

// Fallback for unmatched URLs
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <GlobalLoaderProvider>
        <ScrollToTop />
        <Suspense fallback={<Loader fullScreen />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/vendors" element={<Vendors />} />
            {/* One shared signup form, two addresses. The URL picks the tab. */}
            <Route path="/partner-signup" element={<VendorSignUp />} />
            <Route path="/rider-signup" element={<VendorSignUp />} />
            {/* Old links (ads, bookmarks, WhatsApp) keep working */}
            <Route path="/vendor-signup" element={<Navigate to="/partner-signup" replace />} />
            <Route path="/vendor-kyc" element={<VendorKycOnboarding />} />
            <Route path="/rider-kyc" element={<RiderKycOnboarding />} />
            <Route path="/vendor-signin" element={<VendorSignIn />} />
            <Route path="/vendor-dashboard" element={<VendorDashboard />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/vendor-dashboard/orders" element={<VendorOrders />} />
            <Route path="/vendor-dashboard/restaurant/:id" element={<VendorRestaurant />} />
            <Route path="/vendor-dashboard/restaurant/:id/add-item" element={<VendorAddMenuItem />} />

            {/* New Pages */}
            <Route path="/rider-dashboard" element={<RiderDashboard />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/user-profile" element={<UserProfile />} />

            <Route path="/explore" element={<Explore />} />
            <Route path="/vendor-details" element={<VendorDetails />} />
            <Route path="/order-summary" element={<OrderSummary />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/features" element={<Features />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Shorthand URLs people type by hand */}
            <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />
            <Route path="/vendor" element={<Navigate to="/vendor-dashboard" replace />} />
            <Route path="/rider" element={<Navigate to="/rider-dashboard" replace />} />
            <Route path="/profile" element={<Navigate to="/user-profile" replace />} />

            {/* Anything else. Without this, an unknown URL renders a blank page. */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </GlobalLoaderProvider>
    </Router>
  );
}

export default App;
