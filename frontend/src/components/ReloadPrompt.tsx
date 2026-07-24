import React, { useState, useEffect } from 'react';
// @ts-ignore - virtual module injected by vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, X, Sparkles } from 'lucide-react';

const ReloadPrompt: React.FC = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: ServiceWorkerRegistration | undefined) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error: any) {
            console.error('SW registration error', error);
        },
    });

    // Auto-close "Offline Ready" after 5 seconds
    useEffect(() => {
        if (offlineReady) {
            const timer = setTimeout(() => {
                setOfflineReady(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [offlineReady, setOfflineReady]);

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    const show = offlineReady || needRefresh;

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, x: "-50%", y: -50, scale: 0.9 }}
                    animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: "-50%", y: -50, scale: 0.9 }}
                    className="pwa-toast"
                >
                    <div className="pwa-content">
                        <div className="pwa-icon-box">
                            {needRefresh ? <RefreshCw className="animate-spin" /> : <Sparkles />}
                        </div>
                        <div className="pwa-text">
                            {offlineReady ? (
                                <>
                                    <strong>Listo para usar Offline</strong>
                                    <span>La app ya se puede usar sin conexión.</span>
                                </>
                            ) : (
                                <>
                                    <strong>Actualización Instalada</strong>
                                    <span>LuckyPOS se ha actualizado automáticamente.</span>
                                </>
                            )}
                        </div>
                        <div className="pwa-actions">
                            {needRefresh && (
                                <button className="btn-pwa-main" onClick={() => window.location.reload()}>
                                    <RefreshCw size={18} />
                                    Reiniciar
                                </button>
                            )}
                            <button className="btn-pwa-close" onClick={close}>
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    <style>{`
                        .pwa-toast {
                            position: fixed;
                            left: 50%;
                            top: 1.5rem;
                            margin: 0;
                            z-index: 10000;
                            background: rgba(15, 23, 42, 0.9);
                            backdrop-filter: blur(12px);
                            border: 1px solid rgba(59, 130, 246, 0.5);
                            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
                            border-radius: 999px;
                            padding: 0.75rem 1.5rem;
                            max-width: fit-content;
                            width: auto;
                        }
                        .pwa-content {
                            display: flex;
                            align-items: center;
                            gap: 1rem;
                        }
                        .pwa-icon-box {
                            width: 44px;
                            height: 44px;
                            background: rgba(59, 130, 246, 0.1);
                            border-radius: 12px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #3b82f6;
                            flex-shrink: 0;
                        }
                        .pwa-text {
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            gap: 2px;
                        }
                        .pwa-text strong {
                            font-size: 0.9rem;
                            color: #f8fafc;
                        }
                        .pwa-text span {
                            font-size: 0.75rem;
                            color: #94a3b8;
                        }
                        .pwa-actions {
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                        }
                        .btn-pwa-main {
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 0.6rem 1rem;
                            border-radius: 10px;
                            font-size: 0.8rem;
                            font-weight: 700;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                            cursor: pointer;
                            white-space: nowrap;
                        }
                        .btn-pwa-close {
                            background: rgba(255, 255, 255, 0.05);
                            color: #64748b;
                            border: none;
                            width: 32px;
                            height: 32px;
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                        }
                        .btn-pwa-close:hover {
                            background: rgba(255, 255, 255, 0.1);
                            color: #f8fafc;
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ReloadPrompt;
