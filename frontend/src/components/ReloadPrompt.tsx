// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';

const ReloadPrompt: React.FC = () => {
    useRegisterSW({
        onNeedRefresh() {
            sessionStorage.setItem('lucky_app_updated', '1');
            const reg = navigator.serviceWorker?.controller;
            if (reg) {
                reg.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
            }
        },
        onOfflineReady() {},
        onRegistered() {},
        onRegisterError() {},
    });

    return null;
};

export default ReloadPrompt;
