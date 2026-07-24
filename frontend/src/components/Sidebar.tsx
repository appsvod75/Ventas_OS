import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, LayoutDashboard, Package, RefreshCw, ClipboardList, LogOut, Layers, History,
  Users, User, Receipt, Archive, Activity, TrendingUp, Wallet, Truck, Settings as SettingsIcon, ShieldCheck, MapPin,
  BarChart3, LineChart, Eye, Tags, Store, Building2, Banknote
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { configApi } from '../services/api';
import { getUser, hasRole, ROLES } from '../utils/permissions';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarConfig, setSidebarConfig] = useState<any[]>([]);
  const user = getUser();
  const isAdmin = hasRole(ROLES.SUPER_ADMIN, ROLES.ADMIN);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await configApi.getConfig();
        if (res.data?.logoUrl !== undefined) {
          setLogoUrl(res.data.logoUrl);
        }
        if (res.data?.businessName) {
          setBusinessName(res.data.businessName);
        }
        if (res.data?.sidebarConfig) {
          const config = typeof res.data.sidebarConfig === 'string'
            ? JSON.parse(res.data.sidebarConfig)
            : res.data.sidebarConfig;
          setSidebarConfig(Array.isArray(config) ? config : []);
        }
      } catch (error) {
        console.error('Error fetching config', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();

    window.addEventListener('config-updated', fetchConfig);
    return () => window.removeEventListener('config-updated', fetchConfig);
  }, []);

  const isAdminPath = location.pathname === '/admin';

  if (isAdminPath) return null;

  const handleLogout = () => {
    localStorage.clear();
    window.location.replace('/login');
  };

  // Base definitions of ALL possible menu items
  const allPossibleItems: Record<string, any> = {
    pos: { icon: <ShoppingCart />, label: 'Ventas', path: '/pos' },
    summary: { icon: <Eye />, label: 'Resumen', path: '/summary' },
    inventory: { icon: <Package />, label: 'Inventario', path: '/inventory' },
    replenishment: { icon: <TrendingUp />, label: 'Reposición', path: '/replenishment' },
    products: { icon: <Archive />, label: 'Productos', path: '/products' },
    categories: { icon: <Tags />, label: 'Categorías', path: '/categories' },
    suppliers: { icon: <Building2 />, label: 'Proveedores', path: '/suppliers' },
    clients: { icon: <Users />, label: 'Clientes', path: '/clients' },
    receivable: { icon: <Wallet />, label: 'CxC', path: '/receivable' },
    payable: { icon: <Truck />, label: 'CxP', path: '/payable' },
    expenses: { icon: <Receipt />, label: 'Gastos', path: '/expenses' },
    history: { icon: <History />, label: 'Historial', path: '/sales-history' },
    closings: { icon: <Banknote />, label: 'Cortes', path: '/closings' },
    users: { icon: <User />, label: 'Personal', path: '/users' },
    branches: { icon: <Store />, label: 'Sucursales', path: '/branches' },
    settings: { icon: <SettingsIcon />, label: 'Ajustes', path: '/settings' },
    reports: { icon: <BarChart3 />, label: 'Reportes', path: '/reports' },
    projections: { icon: <LineChart />, label: 'Proyecciones', path: '/projections' },
    transfers: { icon: <Truck />, label: 'Traslados', path: '/transfers' },
    admin: { icon: <LayoutDashboard />, label: 'Dashboard', path: '/admin' },
    audit: { icon: <Activity />, label: 'Auditoría', path: '/audit' },
  };

  // Only show items from the config; if no config yet, show nothing until admin saves in Settings
  let menuItems: any[] = [];

  if (sidebarConfig && sidebarConfig.length > 0) {
    menuItems = sidebarConfig
      .map(conf => {
        const baseItem = allPossibleItems[conf.key];
        if (!baseItem || conf.enabled === false || conf.enabled === "false") return null;
        
        if ((conf.key === 'settings' || conf.key === 'users') && !isAdmin) return null;
        
        if (conf.key === 'audit' && !hasRole(ROLES.SUPER_ADMIN)) return null;
        
        return baseItem;
      })
      .filter(Boolean);
  }

  const branchColor = user.color_hex || '#3b82f6';

  return (
    <nav className="sidebar" style={{ borderRight: `4px solid ${branchColor}` }}>
      <div className="sidebar-logo">
        <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div className="logo-container premium-logo">
            {!isLoading && (
              logoUrl ? (
                <img src={logoUrl} alt="Logo" className="logo-img" />
              ) : (
                'L'
              )
            )}
          </div>
          <span>{!isLoading && (businessName || 'LuckyPOS')}</span>
        </Link>
      </div>

      <div className="sidebar-menu">
        {!isLoading && menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <button className="logout-btn" onClick={handleLogout}>
        <LogOut />
        <span>Cerrar Sesión</span>
      </button>

      <style>{`
        .sidebar {
          width: 90px;
          height: 100vh;
          background: #1e293b;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem 0;
          color: white;
          z-index: 1001;
          flex-shrink: 0;
          box-shadow: 4px 0 15px rgba(0,0,0,0.2);
          border-right: 1px solid rgba(255,255,255,0.05);
        }

        .sidebar-logo {
          margin-bottom: 3rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .sidebar-logo span { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7; }

        .logo-container {
          position: relative;
          width: 54px;
          height: 54px;
          background: #1e293b;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-weight: 900;
          font-size: 1.6rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .premium-logo::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: conic-gradient(
                var(--branch-color), 
                #8b5cf6, 
                var(--branch-color)
            );
            animation: spin-border 4s linear infinite;
            z-index: 1;
        }

        .premium-logo::after {
            content: '';
            position: absolute;
            inset: 2px;
            background: #1e293b;
            border-radius: 14px;
            z-index: 1;
        }

        @keyframes spin-border {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        .logo-img {
          position: relative;
          z-index: 2;
          max-width: 85%;
          max-height: 85%;
          object-fit: contain;
          border-radius: 12px;
        }

        .sidebar {
            --branch-color: ${isAdminPath ? '#3b82f6' : branchColor};
            border-right: 4px solid var(--branch-color) !important;
        }

        /* Ensure the L text is also on top if no image */
        .logo-container:not(:has(img)) {
            color: var(--branch-color);
            z-index: 2;
            position: relative;
        }
        
        /* If no img, we need to ensure the text is above the ::after */
        .premium-logo {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* The character 'L' should be above the inner background */
        .logo-container > span, .logo-container:not(:has(img)) {
            position: relative;
            z-index: 2;
        }

        .sidebar-menu {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 1rem 0;
          scrollbar-width: none;
          -ms-overflow-style: none;
          mask-image: linear-gradient(to bottom, transparent, black 8%, black 92%, transparent);
          -webkit-mask-image: linear-gradient(to bottom, transparent, black 8%, black 92%, transparent);
        }

        .sidebar-menu::-webkit-scrollbar {
          display: none;
        }

        .menu-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #94a3b8;
          text-decoration: none;
          padding: 0.75rem 0;
          width: 100%;
          transition: all 0.2s;
        }

        .menu-item span { font-size: 0.65rem; font-weight: 600; text-align: center; }

        .menu-item.active {
          background: ${isAdminPath ? 'rgba(59, 130, 246, 0.1)' : (user.color_hex ? user.color_hex + '1A' : 'rgba(59, 130, 246, 0.1)')};
          color: white;
          border-left: 3px solid ${isAdminPath ? '#3b82f6' : (user.color_hex || '#3b82f6')};
        }

        .menu-item:hover { color: white; background: rgba(255,255,255,0.05); }

        .logout-btn {
          margin-top: auto;
          background: rgba(239, 68, 68, 0.05);
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 1.25rem 0;
          width: 100%;
          transition: all 0.2s;
        }

        .logout-btn:hover { 
          background: rgba(239, 68, 68, 0.1); 
          color: #ef4444; 
          box-shadow: inset 0 0 10px rgba(239, 68, 68, 0.1);
        }
        
        .logout-btn svg { color: #ef4444; opacity: 0.8; }
        .logout-btn:hover svg { opacity: 1; transform: scale(1.1); }

        @media (max-width: 768px) {
          .sidebar { width: 80px; }
        }
      `}</style>
    </nav>
  );
};

export default Sidebar;
