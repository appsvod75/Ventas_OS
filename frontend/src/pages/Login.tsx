import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { configApi } from '../services/api';
import NumericKeyboard from '../components/NumericKeyboard';
import { ROLES, hasRole } from '../utils/permissions';

const Login: React.FC = () => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [lockout, setLockout] = useState(0);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [businessName, setBusinessName] = useState('LuckyPOS');
    const [isLoadingLogo, setIsLoadingLogo] = useState(true);
    const [showKeyboard, setShowKeyboard] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        
        const fetchLogo = async () => {
            try {
                const res = await configApi.getConfig();
                if (res.data?.logoUrl) setLogoUrl(res.data.logoUrl);
                if (res.data?.businessName) setBusinessName(res.data.businessName);
            } catch (err) {
                console.error("Error fetching logo for login", err);
            } finally {
                setIsLoadingLogo(false);
            }
        };
        fetchLogo();
    }, []);

    useEffect(() => {
        if (pin.length === 6) {
            submitPin(pin);
        }
    }, [pin]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (lockout > 0) {
            timer = setInterval(() => {
                setLockout((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [lockout]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (lockout > 0 || loading) return;

        if (e.key >= '0' && e.key <= '9') {
            if (pin.length < 6) {
                setPin(prev => prev + e.key);
                setError('');
            }
        } else if (e.key === 'Backspace') {
            setPin(prev => prev.slice(0, -1));
            setError('');
        }
    };

    const submitPin = async (currentPin: string) => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/auth/login', { pin: currentPin });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            // Temporarily set user for hasRole to work immediately
            const isAdmin = hasRole(ROLES.SUPER_ADMIN, ROLES.ADMIN);
            if (isAdmin) {
                window.location.href = '/admin';
            } else {
                window.location.href = '/pos';
            }
        } catch (err: any) {
            setPin('');
            if (err.response?.status === 423) {
                setLockout(60);
                setError('Bloqueado por 1 minuto.');
            } else {
                setError(err.response?.data?.message || 'PIN incorrecto');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="login-container"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            onClick={() => inputRef.current?.focus()}
        >
            <input
                ref={inputRef}
                type="password" autoComplete="off"
                inputMode="none"
                value={pin}
                onChange={() => { }}
                onFocus={() => setShowKeyboard(true)}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                autoFocus
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="login-card"
            >
                <div className="login-header">
                    <div className="premium-logo-box">
                        <div className="logo-spinner"></div>
                        <div className="logo-inner">
                            {isLoadingLogo ? (
                                <Loader2 className="animate-spin text-blue-500" />
                            ) : (
                                logoUrl ? (
                                    <img src={logoUrl} alt="Lucky POS" className="login-logo-img" />
                                ) : (
                                    <span className="fallback-logo">L</span>
                                )
                            )}
                        </div>
                    </div>
                    <h1>{businessName}</h1>
                    <div className="login-instruction">
                        <Lock size={14} className="text-blue-400" />
                        <p>Ingrese su PIN de 6 dígitos</p>
                    </div>
                </div>

                <div className="pin-display">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={`pin-dot ${pin.length > i ? 'active' : ''} ${error ? 'error' : ''}`} />
                    ))}
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="error-message"
                        >
                            <AlertCircle size={16} />
                            <span>{error} {lockout > 0 && `(${lockout}s)`}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {loading && (
                    <div className="login-loading-overlay">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                        <p>Validando acceso...</p>
                    </div>
                )}

                <AnimatePresence>
                    {showKeyboard && (
                        <NumericKeyboard
                            value={pin}
                            onChange={(val) => { setPin(val); setError(''); }}
                            onClose={() => setShowKeyboard(false)}
                            title="INGRESE SU PIN"
                        />
                    )}
                </AnimatePresence>

                <div className="login-footer">
                    <p>Toque la pantalla para mostrar el teclado</p>
                </div>
            </motion.div>

            <style>{`
        .login-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          color: white;
          outline: none;
        }
        .login-card {
          position: relative;
          background: #1e293b;
          padding: 3rem;
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          width: 100%;
          max-width: 420px;
          text-align: center;
          overflow: hidden;
        }
        .login-header h1 {
          font-size: 2.2rem;
          margin: 1.5rem 0 0.25rem;
          font-weight: 900;
          letter-spacing: -0.04em;
          background: linear-gradient(to bottom, #ffffff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .login-instruction {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .login-instruction p {
          color: #94a3b8;
          font-size: 0.9rem;
          font-weight: 600;
        }
        
        /* PREMIUM LOGO BOX */
        .premium-logo-box {
            position: relative;
            width: 110px;
            height: 110px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-radius: 32px;
            background: #1e293b;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
        }
        
        .logo-spinner {
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: conic-gradient(
                #3b82f6, 
                #8b5cf6, 
                #3b82f6
            );
            animation: spin-border 3s linear infinite;
            filter: blur(4px);
            z-index: 1;
        }
        
        @keyframes spin-border {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .logo-inner {
            position: absolute;
            inset: 2px;
            background: #1e293b;
            border-radius: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
            overflow: hidden;
            padding: 2px;
        }
        
        .login-logo-img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 12px;
            filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.3));
        }
        
        .fallback-logo {
            font-size: 2.2rem;
            font-weight: 900;
            color: #3b82f6;
            text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }

        .pin-display {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin: 3rem 0;
        }
        .pin-dot {
          width: 14px;
          height: 14px;
          border-radius: 4px;
          background: rgba(51, 65, 85, 0.8);
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .pin-dot.active {
          background: #3b82f6;
          box-shadow: 0 0 25px rgba(59, 130, 246, 0.8), 0 0 10px #3b82f6;
          transform: scale(1.4) rotate(135deg);
          border-radius: 3px;
        }
        .pin-dot.error {
          background: #ef4444;
          box-shadow: 0 0 25px rgba(239, 68, 68, 0.8);
          transform: scale(1.1);
        }
        .error-message {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #f87171;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 0.85rem;
          border-radius: 16px;
          font-size: 0.9rem;
          font-weight: 600;
        }
        
        .login-loading-overlay {
            margin-top: 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
        }
        .login-loading-overlay p {
            font-size: 0.85rem;
            color: #60a5fa;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .login-footer {
          margin-top: 2.5rem;
          color: #475569;
          font-size: 0.75rem;
          font-weight: 500;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        /* TABLET OPTIMIZATION */
        @media (max-width: 1200px), (pointer: coarse) {
            .login-card { max-width: 360px; padding: 2rem; }
            .login-header h1 { font-size: 1.8rem; margin: 1.25rem 0 0.25rem; }
            .premium-logo-box { width: 85px; height: 85px; }
            .pin-display { gap: 1rem; margin: 1.5rem 0; }
            .login-footer { margin-top: 1.5rem; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
        </div>
    );
};

export default Login;
