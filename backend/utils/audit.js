const prisma = require('../db');

/**
 * Registra un evento en la bitácora de auditoría
 * @param {number} userId - ID del usuario que realiza la acción
 * @param {string} action - Descripción de la acción (ej: 'CREATE_PRODUCT')
 * @param {Object} details - Detalles adicionales en formato JSON (opcional)
 * @param {number} branchId - ID de la sucursal (opcional)
 * @param {string} ipAddress - Dirección IP del cliente (opcional)
 */
const logAudit = async (userId, action, details = null, branchId = null, ipAddress = null) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                details: details ? JSON.stringify(details) : null,
                branchId,
                ipAddress,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('Error logging audit:', error);
        // No lanzamos el error para no detener la ejecución principal
    }
};

module.exports = { logAudit };
