import { useRef } from 'react';

// Mantener pantalla encendida 

export const useWakeLock = () => {
    const wakeLockRef = useRef(null);
    
    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
                console.log('🔆 Wake Lock activado');
            }
        } catch (err) {
            console.log('❌ Error activando Wake Lock:', err);
        }
    };

    const releaseWakeLock = async () => {
        try {
            if (wakeLockRef.current) {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
                console.log('🌙 Wake Lock liberado');
            }
        } catch (err) {
            console.log('❌ Error liberando Wake Lock:', err);
        }
    };

    return {
        requestWakeLock,
        releaseWakeLock
    };
}