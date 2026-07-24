import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Share, PlusSquare } from 'lucide-react';

const PWAInstallBanner: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        // 1. Detect if already installed (standalone mode)
        const checkStandalone = () => {
            const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone || 
                               document.referrer.includes('android-app://');
            setIsStandalone(isInstalled);
            return isInstalled;
        };

        // 1.b Detect Mobile/Tablet
        const checkMobile = () => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        };

        // 2. Detect iOS
        const checkIOS = () => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            const ios = /iphone|ipad|ipod/.test(userAgent);
            setIsIOS(ios);
            return ios;
        };

        const installed = checkStandalone();
        const ios = checkIOS();
        const mobile = checkMobile();

        if (installed || !mobile) return;

        // 3. Listen for Android/Chrome install prompt
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 4. For iOS, we show the banner manually because there's no event
        if (ios && !installed) {
            // Small delay to not overwhelm on load
            const timeout = setTimeout(() => setIsVisible(true), 3000);
            return () => {
                clearTimeout(timeout);
                window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            };
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }

        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        // Save choice for 24 hours
        localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
    };

    // Check if dismissed recently
    useEffect(() => {
        const dismissedAt = localStorage.getItem('pwa_banner_dismissed');
        if (dismissedAt) {
            const diff = Date.now() - parseInt(dismissedAt);
            if (diff < 24 * 60 * 60 * 1000) { // 24h
                setIsVisible(false);
            }
        }
    }, [isVisible]);

    if (isStandalone || !isVisible) return null;

    return (
        <>
            <AnimatePresence>
                {isVisible && !showIOSInstructions && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="pwa-top-banner"
                    >
                        <div className="pwa-banner-content">
                            <div className="pwa-banner-icon">
                                <Smartphone size={24} />
                            </div>
                            <div className="pwa-banner-text">
                                <strong>Instalar VariosPOS</strong>
                                <span>Accede más rápido y usa la app a pantalla completa.</span>
                            </div>
                            <div className="pwa-banner-actions">
                                <button className="pwa-install-btn" onClick={handleInstallClick}>
                                    <Download size={18} />
                                    Instalar
                                </button>
                                <button className="pwa-close-btn" onClick={handleClose}>
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showIOSInstructions && (
                    <div className="ios-modal-overlay" onClick={() => setShowIOSInstructions(false)}>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="ios-instructions-modal"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="ios-modal-header">
                                <h3>Instalar en iOS (iPhone/iPad)</h3>
                                <button onClick={() => setShowIOSInstructions(false)}><X /></button>
                            </div>
                            <div className="ios-modal-body">
                                <div className="ios-step">
                                    <div className="step-num">1</div>
                                    <span className="step-text">Pulsa el botón <strong>Compartir</strong> <Share size={20} className="inline-icon" /> en la barra inferior de Safari.</span>
                                </div>
                                <div className="ios-step">
                                    <div className="step-num">2</div>
                                    <span className="step-text">Desliza hacia abajo y selecciona <strong>Añadir a pantalla de inicio</strong> <PlusSquare size={20} className="inline-icon" />.</span>
                                </div>
                                <div className="ios-step">
                                    <div className="step-num">3</div>
                                    <span className="step-text">Pulsa <strong>Añadir</strong> en la esquina superior derecha.</span>
                                </div>
                            </div>
                            <button className="ios-close-confirm" onClick={() => setShowIOSInstructions(false)}>
                                Entendido
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .pwa-top-banner {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 11000;
                    background: #1e293b;
                    border-bottom: 2px solid #3b82f6;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                    padding: 0.75rem 1rem;
                }
                .pwa-banner-content {
                    max-width: 800px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .pwa-banner-icon {
                    width: 42px;
                    height: 42px;
                    background: rgba(59, 130, 246, 0.15);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #3b82f6;
                    flex-shrink: 0;
                }
                .pwa-banner-text {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                .pwa-banner-text strong {
                    color: #f8fafc;
                    font-size: 0.95rem;
                    font-weight: 700;
                }
                .pwa-banner-text span {
                    color: #94a3b8;
                    font-size: 0.75rem;
                }
                .pwa-banner-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .pwa-install-btn {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: transform 0.2s;
                }
                .pwa-install-btn:active { transform: scale(0.95); }
                .pwa-close-btn {
                    background: rgba(255,255,255,0.05);
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

                /* iOS Modal Styles */
                .ios-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.8);
                    backdrop-filter: blur(8px);
                    z-index: 12000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                }
                .ios-instructions-modal {
                    background: #1e293b;
                    width: 100%;
                    max-width: 400px;
                    border-radius: 24px;
                    border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                    overflow: hidden;
                }
                .ios-modal-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .ios-modal-header h3 { color: white; margin: 0; font-size: 1.1rem; }
                .ios-modal-header button { background: none; border: none; color: #64748b; cursor: pointer; }
                .ios-modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
                .ios-step { display: flex; align-items: flex-start; gap: 1rem; }
                .step-num { 
                    width: 24px; height: 24px; background: #3b82f6; color: white; 
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    font-size: 0.75rem; font-weight: 800; flex-shrink: 0; margin-top: 2px;
                }
                .step-text { color: #cbd5e1; font-size: 0.95rem; line-height: 1.5; }
                .inline-icon { display: inline-block; vertical-align: middle; margin: 0 4px; color: #3b82f6; }
                .ios-close-confirm {
                    width: 100%; padding: 1rem; background: #3b82f6; color: white; border: none;
                    font-weight: 700; cursor: pointer; border-top: 1px solid rgba(255,255,255,0.05);
                }

                @media (max-width: 480px) {
                    .pwa-banner-text span { display: none; }
                    .pwa-banner-text { justify-content: center; }
                    .pwa-top-banner { padding: 0.5rem 0.75rem; }
                }
            `}</style>
        </>
    );
};

export default PWAInstallBanner;
