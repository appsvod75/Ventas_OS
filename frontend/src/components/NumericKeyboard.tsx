import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, X, CheckCircle2 } from 'lucide-react';

interface NumericKeyboardProps {
    value: string;
    onChange: (val: string) => void;
    onClose: () => void;
    title?: string;
    onConfirm?: () => void;
    showExact?: boolean;
    exactAmount?: number;
}

const NumericKeyboard: React.FC<NumericKeyboardProps> = ({ 
    value, 
    onChange, 
    onClose, 
    title = "TECLADO NUMÉRICO", 
    onConfirm,
    showExact = false,
    exactAmount = 0
}) => {
    // Detect if the primary pointer is coarse (like a finger on a tablet/phone)
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

    // If it's not a touch device (like a PC with a mouse), don't render the virtual keyboard
    if (!isTouchDevice) return null;

    const handlePress = (val: string) => {
        if (val === 'back') {
            onChange(value.slice(0, -1));
        } else if (val === 'clear') {
            onChange('');
        } else if (val === 'exact') {
            onChange(exactAmount.toString());
        } else {
            if (val === '.' && value.includes('.')) return;
            // Limit to 2 decimals for currency
            if (value.includes('.') && value.split('.')[1].length >= 2) return;
            onChange(value + val);
        }
    };

    return (
        <motion.div 
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="numeric-keyboard-overlay"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="numeric-keyboard-container">
                <div className="keyboard-header">
                    <span>{title}</span>
                    <button onClick={onClose} className="close-kb-btn"><X size={18} /></button>
                </div>
                
                <div className="keypad-grid">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <button key={n} onClick={() => handlePress(n.toString())} className="number-key">{n}</button>
                    ))}
                    <button onClick={() => handlePress('.')} className="number-key">.</button>
                    <button onClick={() => handlePress('0')} className="number-key">0</button>
                    <button onClick={() => handlePress('back')} className="number-key delete-key">
                        <Delete size={22} />
                    </button>
                </div>

                <div className="keyboard-footer">
                    {showExact && (
                        <button onClick={() => handlePress('exact')} className="footer-btn exact-btn">
                            EXACTO (${exactAmount.toFixed(2)})
                        </button>
                    )}
                    <button onClick={() => handlePress('clear')} className="footer-btn clear-btn">
                        LIMPIAR
                    </button>
                    {onConfirm && (
                        <button onClick={() => { onConfirm(); onClose(); }} className="footer-btn confirm-btn">
                            <CheckCircle2 size={18} /> LISTO
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                .numeric-keyboard-overlay {
                    position: fixed;
                    bottom: 0;
                    right: 0;
                    left: 0;
                    z-index: 9999;
                    padding: 1.5rem;
                    display: flex;
                    justify-content: center;
                    pointer-events: auto;
                    background: linear-gradient(to top, rgba(15, 23, 42, 0.8), transparent);
                }
                .numeric-keyboard-container {
                    background: rgba(255, 255, 255, 0.3);
                    backdrop-filter: blur(25px) saturate(200%);
                    -webkit-backdrop-filter: blur(25px) saturate(200%);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 24px;
                    padding: 1.25rem;
                    width: 100%;
                    max-width: 380px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                .keyboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                .keyboard-header span {
                    font-size: 0.75rem;
                    font-weight: 900;
                    color: white;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    background: #0f172a;
                    padding: 4px 12px;
                    border-radius: 100px;
                }
                .close-kb-btn {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
                .keypad-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-bottom: 1rem;
                }
                .number-key {
                    height: 60px;
                    background: rgba(255, 255, 255, 0.9);
                    border: none;
                    border-radius: 16px;
                    font-size: 1.5rem;
                    font-weight: 900;
                    color: #0f172a;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    transition: all 0.1s;
                    cursor: pointer;
                }
                .number-key:active { 
                    transform: scale(0.92); 
                    background: #8b5cf6 !important; 
                    color: white !important;
                    box-shadow: 0 0 20px rgba(139, 92, 246, 0.6); 
                    transition: all 0.05s ease;
                }
                .delete-key { color: #ef4444; background: rgba(254, 226, 226, 0.95); }
                
                .keyboard-footer {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .footer-btn {
                    padding: 12px;
                    border-radius: 12px;
                    font-weight: 900;
                    font-size: 0.8rem;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .exact-btn { background: #10b981; color: white; }
                .clear-btn { background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255,255,255,0.2); }
                .confirm-btn { background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; gap: 8px; }
            `}</style>
        </motion.div>
    );
};

export default NumericKeyboard;
