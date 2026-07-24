import { io } from 'socket.io-client';

const SOCKET_URL = window.location.origin.replace('5173', '5000').replace('4000', '3015'); // Adjust for dev/prod

export const socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

export const socketEvents = {
    PRODUCT_CREATED: 'PRODUCT_CREATED',
    PRODUCT_UPDATED: 'PRODUCT_UPDATED',
    PRODUCT_DELETED: 'PRODUCT_DELETED',
    INVENTORY_UPDATED: 'INVENTORY_UPDATED',
    FORCE_LOGOUT: 'FORCE_LOGOUT'
};
