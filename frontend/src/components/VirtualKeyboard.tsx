import React from 'react';
import { motion } from 'framer-motion';
import { Delete, X, CheckCircle2 } from 'lucide-react';

interface VirtualKeyboardProps {
    value: string;
    onChange: (val: string) => void;
    onClose: () => void;
    onConfirm?: () => void;
    title?: string;
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ value, onChange, onClose, onConfirm, title = "TECLADO VIRTUAL" }) => {
    // Only show virtual keyboard if the device is touch-based (tablet/mobile)
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouchDevice) return null;

    const handleKeyPress = (key: string) => {
        onChange(value + key);
    };

    const handleBackspace = () => {
        onChange(value.slice(0, -1));
    };

    return (
        <motion.div 
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="alphanumeric-keypad-overlay"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="alphanumeric-keypad">
                <div className="keyboard-header-minimal">
                    <span>{title}</span>
                    <button onClick={onClose} className="close-kb-btn"><X size={16} /></button>
                </div>
                {/* Numeros */}
                <div className="key-row">
                    {['1','2','3','4','5','6','7','8','9','0'].map(k => (
                        <button key={k} className="key-btn-qwerty" onClick={() => handleKeyPress(k)}>{k}</button>
                    ))}
                </div>
                {/* Fila 1 */}
                <div className="key-row">
                    {['Q','W','E','R','T','Y','U','I','O','P'].map(k => (
                        <button key={k} className="key-btn-qwerty" onClick={() => handleKeyPress(k)}>{k}</button>
                    ))}
                </div>
                {/* Fila 2 */}
                <div className="key-row">
                    {['A','S','D','F','G','H','J','K','L','Ñ'].map(k => (
                        <button key={k} className="key-btn-qwerty" onClick={() => handleKeyPress(k)}>{k}</button>
                    ))}
                </div>
                {/* Fila 3 */}
                <div className="key-row">
                    {['Z','X','C','V','B','N','M','.',','].map(k => (
                        <button key={k} className="key-btn-qwerty" onClick={() => handleKeyPress(k)}>{k}</button>
                    ))}
                    <button className="key-btn-qwerty back-btn-qwerty" onClick={handleBackspace}>
                        <Delete size={20} />
                    </button>
                </div>
                {/* Acciones */}
                <div className="key-row">
                    <button className="key-btn-qwerty space-btn-qwerty" onClick={() => handleKeyPress(' ')}>ESPACIO</button>
                    {onConfirm && (
                        <button className="key-btn-qwerty confirm-btn-qwerty" onClick={() => { onConfirm(); onClose(); }}>
                            <CheckCircle2 size={18} /> LISTO
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                .alphanumeric-keypad-overlay {
                    position: fixed;
                    bottom: 0;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 9999;
                    background: linear-gradient(to top, rgba(15, 23, 42, 0.7), transparent);
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    padding-bottom: 2rem;
                    pointer-events: none;
                }
                .alphanumeric-keypad {
                    background: rgba(255, 255, 255, 0.25);
                    backdrop-filter: blur(30px) saturate(200%);
                    -webkit-backdrop-filter: blur(30px) saturate(200%);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 24px;
                    padding: 1rem;
                    width: 95%;
                    max-width: 850px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    box-shadow: 0 40px 100px rgba(0,0,0,0.5);
                    pointer-events: auto;
                }
                .keyboard-header-minimal {
                    display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; padding: 0 4px;
                }
                .keyboard-header-minimal span {
                    font-size: 0.65rem; font-weight: 900; color: white; background: #0f172a80; padding: 3px 10px; border-radius: 100px; letter-spacing: 0.1em;
                }
                .close-kb-btn {
                    background: rgba(0,0,0,0.1); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
                }
                .key-row { display: flex; gap: 6px; justify-content: center; }
                .key-btn-qwerty {
                    flex: 1;
                    height: 52px;
                    border-radius: 12px;
                    border: 1px solid rgba(0,0,0,0.05);
                    background: rgba(255, 255, 255, 0.85);
                    color: #0f172a;
                    font-weight: 800;
                    font-size: 1.1rem;
                    cursor: pointer;
                    transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    display: flex; align-items: center; justify-content: center;
                }
                .key-btn-qwerty:active { 
                    transform: scale(0.92); 
                    background: #8b5cf6 !important; 
                    color: white !important;
                    box-shadow: 0 0 15px rgba(139, 92, 246, 0.6);
                    transition: all 0.05s ease;
                }
                .back-btn-qwerty { background: rgba(254, 226, 226, 0.95); color: #ef4444; flex: 1.5; }
                .space-btn-qwerty { flex: 4; background: rgba(255, 255, 255, 0.9); font-size: 0.85rem; letter-spacing: 0.1em; }
                .confirm-btn-qwerty { flex: 2; background: #3b82f6; color: white; font-size: 0.85rem; letter-spacing: 0.05em; gap: 6px; }
                
                @media (max-width: 768px) {
                    .key-btn-qwerty { height: 44px; font-size: 0.95rem; }
                }
            `}</style>
        </motion.div>
    );
};


export default VirtualKeyboard;
