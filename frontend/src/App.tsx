import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { socket, socketEvents } from './services/socket';
import { Toaster } from 'react-hot-toast';
import { configApi } from './services/api';
import './styles/dashboard-routes.css';
import Login from './pages/Login';
import POS from './pages/POS';
import AdminDashboard from './pages/AdminDashboard';
import Inventory from './pages/Inventory';
import Products from './pages/Products';
import Clients from './pages/Clients';
import Audit from './pages/Audit';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import AccountsReceivable from './pages/AccountsReceivable';
import AccountsPayable from './pages/AccountsPayable';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import BranchManagement from './pages/BranchManagement';
import Replenishment from './pages/Replenishment';
import Expenses from './pages/Expenses';
import SalesHistory from './pages/SalesHistory';
import CashClosings from './pages/CashClosings';
import Projections from './pages/Projections';
import DailySummary from './pages/DailySummary';
import Transfers from './pages/Transfers';
import Shipments from './pages/Shipments';
import { CartProvider } from './context/CartContext';
import { initAppVersionSync } from './lib/appUpdate';
import ReloadPrompt from './components/ReloadPrompt';
import PWAInstallBanner from './components/PWAInstallBanner';
import { getUser, hasRole, ROLES } from './utils/permissions';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

const App: React.FC = () => {
    useEffect(() => {
        // --- MANEJO DE ERRORES DE CARGA (Assets) ---
        const handleAssetError = (e: ErrorEvent) => {
            const errorMsg = String(e.message || '');
            const isAssetError = errorMsg.includes('Failed to fetch dynamically imported module') ||
                errorMsg.includes('Load chunk failed') ||
                errorMsg.includes('Unexpected token') ||
                errorMsg.includes('is not a valid JSON');

            if (isAssetError) {
                console.log('🔄 Error de carga de assets detectado (posible versión nueva). Recargando...');
                window.location.reload();
            }
        };

        window.addEventListener('error', handleAssetError, true);

        // --- AUTO-UPDATE (versión mejorada desde CarWash_OS) ---
        const stopSync = initAppVersionSync();

        // --- SOCKET.IO FORCED LOGOUT ---
        socket.on(socketEvents.FORCE_LOGOUT, (data: any) => {
            console.log('⚠️ CIERRE FORZADO RECIBIDO:', data.message);
            import('react-hot-toast').then(({ toast }) => {
                toast.error('Sesión finalizada por cierre de sistema.', { duration: 10000 });
            });
            setTimeout(() => {
                localStorage.clear();
                window.location.replace('/login');
            }, 3000);
        });

        // Update title/favicon when config changes
        const handleConfigUpdate = async () => {
            try {
                const res = await configApi.getConfig();
                if (res.data?.businessName) document.title = res.data.businessName;
                if (res.data?.logoUrl) {
                    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
                    if (link) link.href = res.data.logoUrl;
                }
                // Actualizar manifest dinámico con nombre del negocio
                const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
                if (manifestLink) manifestLink.href = '/api/manifest';
            } catch {}
        };
        window.addEventListener('config-updated', handleConfigUpdate);

        return () => {
            window.removeEventListener('error', handleAssetError, true);
            window.removeEventListener('config-updated', handleConfigUpdate);
            stopSync();
        };
    }, []);

    return (
        <CartProvider>
            <PWAInstallBanner />
            <ReloadPrompt />
            <Toaster
                position="top-center"
                reverseOrder={false}
                gutter={12}
                containerStyle={{
                    top: 80, // Offset to leave space for PWA notification or just top margin
                }}
                toastOptions={{
                    style: {
                        background: 'rgba(17, 24, 39, 0.8)',
                        backdropFilter: 'blur(10px)',
                        color: '#fff',
                        border: '1px solid rgba(52, 211, 153, 0.2)',
                        padding: '12px 24px',
                        borderRadius: '9999px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        fontStyle: 'italic',
                        fontSize: '14px',
                        letterSpacing: '0.05em'
                    },
                    success: {
                        style: {
                            border: '1px solid rgba(52, 211, 153, 0.5)',
                            color: '#34d399',
                            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2)'
                        },
                        iconTheme: { primary: '#34d399', secondary: '#064e3b' }
                    },
                    error: {
                        style: {
                            border: '1px solid rgba(244, 63, 94, 0.5)',
                            color: '#f43f5e',
                            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2)'
                        },
                        iconTheme: { primary: '#f43f5e', secondary: '#4c0519' }
                    },
                    loading: {
                        style: {
                            border: '1px solid rgba(59, 130, 246, 0.5)',
                            color: '#60a5fa',
                            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.2)'
                        }
                    }
                }}
            />
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/pos"
                        element={
                            <ProtectedRoute>
                                <POS />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/summary"
                        element={
                            <ProtectedRoute>
                                <DailySummary />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/inventory"
                        element={
                            <ProtectedRoute>
                                <Inventory />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/products"
                        element={
                            <ProtectedRoute>
                                <Products />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/expenses"
                        element={
                            <ProtectedRoute>
                                <Expenses />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/sales-history"
                        element={
                            <ProtectedRoute>
                                <SalesHistory />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/closings"
                        element={
                            <ProtectedRoute>
                                <CashClosings />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/projections"
                        element={
                            <ProtectedRoute>
                                <Projections />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/audit"
                        element={
                            <ProtectedRoute>
                                <Audit />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/clients"
                        element={
                            <ProtectedRoute>
                                <Clients />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/categories"
                        element={
                            <ProtectedRoute>
                                <Categories />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/suppliers"
                        element={
                            <ProtectedRoute>
                                <Suppliers />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/reports"
                        element={
                            <ProtectedRoute>
                                <Reports />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/receivable"
                        element={
                            <ProtectedRoute>
                                <AccountsReceivable />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/payable"
                        element={
                            <ProtectedRoute>
                                <AccountsPayable />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute>
                                <Settings />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute>
                                <UserManagement />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/branches"
                        element={
                            <ProtectedRoute>
                                <BranchManagement />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/replenishment"
                        element={
                            <ProtectedRoute>
                                <Replenishment />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/shipments"
                        element={
                            <ProtectedRoute>
                                <Shipments />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                {(() => {
                                    return hasRole(ROLES.SUPER_ADMIN, ROLES.ADMIN) ? <Navigate to="/admin" replace /> : <Navigate to="/pos" replace />;
                                })()}
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </CartProvider>
    );
};

export default App;
