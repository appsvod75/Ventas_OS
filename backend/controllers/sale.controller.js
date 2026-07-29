const prisma = require('../db');
const { logAudit } = require('../utils/audit');
const { getIO } = require('../services/socketManager');

const createSale = async (req, res) => {
    let { branch_id, items, payment_method, discount = 0, client_id, due_date, amount_tendered, change, customDate, shipping = 0, balance, shipping_date, fulfillment_status } = req.body;
    const user_id = req.user.id;
    const user_role = req.user.role;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'La venta debe tener al menos un producto.' });
    }

    // Non-admin users are locked to their assigned branch
    if (user_role !== 'Super Admin' && user_role !== 'Admin') {
        branch_id = req.user.branch_id;
    }

    try {
        const sale = await prisma.$transaction(async (tx) => {
            let total = 0;
            const saleDetailsData = [];

            for (const item of items) {
                const product = await tx.product.findUnique({
                    where: { id: item.product_id },
                    include: { variants: { orderBy: { quantity: 'desc' } } }
                });

                if (!product) throw new Error(`Producto ${item.product_id} no encontrado`);

                // Tiered pricing logic: Prioritize using unitPrice from frontend if provided
                let unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(product.basePrice);
                
                if (item.unitPrice === undefined) {
                    for (const variant of product.variants) {
                        if (item.quantity >= variant.quantity) {
                            unitPrice = Number(variant.price) / variant.quantity;
                            break;
                        }
                    }
                }

                const subtotal = unitPrice * item.quantity;
                total += subtotal;

                saleDetailsData.push({
                    productId: item.product_id,
                    quantity: item.quantity,
                    unitPrice: unitPrice,
                    subtotal: subtotal,
                    notes: item.notes || null,
                    customData: item.customData || null
                });

                // Update Inventory (ONLY if NOT a service)
                if (!product.isService) {
                    await tx.inventory.update({
                        where: {
                            branchId_productId: {
                                branchId: parseInt(branch_id),
                                productId: item.product_id
                            }
                        },
                        data: { stockLevel: { decrement: item.quantity } }
                    });
                }
            }

            const finalTotal = total - discount;

            const newSale = await tx.saleH.create({
                data: {
                    branchId: parseInt(branch_id),
                    userId: user_id,
                    clientId: client_id ? parseInt(client_id) : 1,
                    total: finalTotal,
                    discount: Number(discount) || 0,
                    shipping: Number(shipping) || 0,
                    paymentMethod: payment_method,
                    dueDate: due_date ? new Date(due_date) : null,
                    shippingDate: shipping_date ? new Date(shipping_date) : null,
                    fulfillmentStatus: fulfillment_status || 'VENDIDO',
                    balance: balance !== undefined ? Number(balance) : (payment_method === 'CREDITO' ? finalTotal : 0),
                    amountTendered: Number(amount_tendered) || finalTotal,
                    change: Number(change) || 0,
                    createdAt: (user_role === 'Admin' && customDate) ? new Date(customDate.includes('T') ? `${customDate}-06:00` : `${customDate}T${new Date().toLocaleTimeString('en-GB')}-06:00`) : undefined,
                    details: {
                        create: saleDetailsData
                    }
                }
            });

            return newSale;
        });

        await logAudit(user_id, 'CREATE_SALE', { saleId: sale.id, total: sale.total, itemsCount: items.length }, branch_id);

        // Notify other clients about inventory change
        const io = getIO();
        if (io) io.emit('INVENTORY_UPDATED', { branchId: branch_id });

        res.json({ message: 'Venta registrada con éxito', sale_id: sale.id, total: sale.total });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Error al registrar la venta' });
    }
};

const getAccountsReceivable = async (req, res) => {
    try {
        const sales = await prisma.saleH.findMany({
            where: { balance: { gt: 0 } },
            include: { client: true, branch: true },
            orderBy: { createdAt: 'asc' }
        });

        // Group by client
        const clientsMap = {};
        for (const sale of sales) {
            if (!sale.clientId) continue;

            if (!clientsMap[sale.clientId]) {
                clientsMap[sale.clientId] = {
                    clientId: sale.clientId,
                    clientName: sale.client?.name || 'Cliente Genérico',
                    documentId: sale.client?.documentId,
                    phone: sale.client?.phone,
                    branchName: sale.branch?.name,
                    totalBalance: Number(sale.balance),
                    oldestDebtDate: sale.createdAt,
                    pendingInvoices: 1,
                    invoices: [sale]
                };
            } else {
                clientsMap[sale.clientId].totalBalance += Number(sale.balance);
                clientsMap[sale.clientId].pendingInvoices += 1;
                clientsMap[sale.clientId].invoices.push(sale);
                // La más vieja ya está primero por el orderBy, pero aseguramos
                if (new Date(sale.createdAt) < new Date(clientsMap[sale.clientId].oldestDebtDate)) {
                    clientsMap[sale.clientId].oldestDebtDate = sale.createdAt;
                }
            }
        }

        res.json(Object.values(clientsMap));
    } catch (error) {
        console.error('Error fetching accounts receivable:', error);
        res.status(500).json({ message: 'Error al obtener cuentas por cobrar' });
    }
};

const getSalesHistory = async (req, res) => {
    try {
        const { branchId, startDate, endDate, search, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const whereClause = {};

        let targetBranchId = branchId;
        if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
            targetBranchId = req.user.branch_id;
        }

        if (targetBranchId) {
            whereClause.branchId = parseInt(targetBranchId);
        }

        // --- Lógica de Filtrado por Fecha (Fixed with Offset -06:00) ---
        // Forzamos el offset para que la medianoche sea la local.
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
        
        let startStr = startDate ? `${startDate}T00:00:00-06:00` : null;
        let endStr = endDate ? (endDate.includes('T') ? `${endDate.split('T')[0]}T23:59:59-06:00` : `${endDate}T23:59:59-06:00`) : `${todayStr}T23:59:59-06:00`;

        let start;
        if (startStr) {
            start = new Date(startStr);
        } else {
            // Default: 3 días atrás al inicio del día local
            start = new Date(`${todayStr}T00:00:00-06:00`);
            start.setDate(start.getDate() - 3);
        }

        let end = new Date(endStr);

        whereClause.createdAt = {
            gte: start,
            lte: end
        };
        // --------------------------------------------------------

        if (search) {
            whereClause.OR = [
                {
                    client: {
                        name: { contains: search }
                    }
                },
                {
                    client: {
                        phone: { contains: search }
                    }
                }
            ];
        }

        const [sales, total] = await Promise.all([
            prisma.saleH.findMany({
                where: whereClause,
                include: {
                    user: { select: { name: true } },
                client: { select: { name: true, phone: true, address: true, email: true } },
                    branch: { select: { name: true } },
                    details: {
                        include: {
                            product: { select: { name: true } }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: Number(limit)
            }),
            prisma.saleH.count({ where: whereClause })
        ]);

        res.json({
            data: sales,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching sales history:', error);
        res.status(500).json({ message: 'Error al obtener historial de ventas' });
    }
};

const getSaleById = async (req, res) => {
    const { id } = req.params;
    try {
        const sale = await prisma.saleH.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: { select: { name: true } },
                client: { select: { name: true, phone: true } },
                branch: { select: { name: true } },
                details: {
                    include: {
                        product: { select: { name: true } }
                    }
                }
            }
        });

        if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });
        res.json(sale);
    } catch (error) {
        console.error('Error fetching sale by id:', error);
        res.status(500).json({ message: 'Error al obtener la venta' });
    }
};

const payAccountReceivable = async (req, res) => {
    const { id: clientId } = req.params; // It's actually clientId now
    const { amount } = req.body;
    const user_id = req.user?.id || 1;

    try {
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'El monto debe ser un número válido mayor a 0' });
        }

        await prisma.$transaction(async (tx) => {
            const pendingSales = await tx.saleH.findMany({
                where: { clientId: parseInt(clientId), balance: { gt: 0 } },
                orderBy: { createdAt: 'asc' }
            });

            const totalDebt = pendingSales.reduce((sum, sale) => sum + Number(sale.balance), 0);
            if (totalDebt === 0) {
                throw new Error('Este cliente no tiene deudas pendientes');
            }

            // Create global payment record
            const payment = await tx.clientPayment.create({
                data: {
                    clientId: parseInt(clientId),
                    userId: user_id,
                    amount: parsedAmount
                }
            });

            let remainingAmount = parsedAmount;
            let applications = [];

            for (const sale of pendingSales) {
                if (remainingAmount <= 0) break;

                const saleBalance = Number(sale.balance);
                const amountToApply = Math.min(saleBalance, remainingAmount);

                // Update Sale balance
                await tx.saleH.update({
                    where: { id: sale.id },
                    data: { balance: saleBalance - amountToApply }
                });

                // Record application
                applications.push({
                    paymentId: payment.id,
                    saleId: sale.id,
                    amountApplied: amountToApply
                });

                remainingAmount -= amountToApply;
            }

            // Insert all applications
            if (applications.length > 0) {
                await tx.paymentApplication.createMany({
                    data: applications
                });
            }

            // Record Audit directly in transaction
            await tx.auditLog.create({
                data: {
                    userId: user_id,
                    action: 'RECEIVE_PAYMENT',
                    details: JSON.stringify({ clientId, amountPaid: parsedAmount, remainingCredit: Math.max(0, remainingAmount) }),
                    branchId: null
                }
            });
        }, { timeout: 10000 });

        res.json({ message: 'Cobro registrado y distribuido con éxito' });
    } catch (error) {
        console.error('Error paying account:', error);
        res.status(500).json({ message: error.message || 'Error al registrar cobro' });
    }
};

const getClientPayments = async (req, res) => {
    const { id: clientId } = req.params;
    try {
        const payments = await prisma.clientPayment.findMany({
            where: { clientId: parseInt(clientId) },
            include: {
                user: { select: { name: true } },
                applications: {
                    include: { sale: { select: { id: true, createdAt: true, total: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(payments);
    } catch (error) {
        console.error('Error fetching client payments:', error);
        res.status(500).json({ message: 'Error al obtener historial de pagos' });
    }
};

const updateSale = async (req, res) => {
    const { id } = req.params;
    const { items, discount, payment_method, clientId, amount_tendered, change, customDate } = req.body;
    const user_id = req.user.id;
    const user_role = req.user.role;

    // Solo Admin o Super Admin pueden editar
    if (user_role !== 'Super Admin' && user_role !== 'Admin') {
        return res.status(403).json({ message: 'No tienes permiso para editar ventas' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const originalSale = await tx.saleH.findUnique({
                where: { id: parseInt(id) },
                include: { details: true }
            });

            if (!originalSale) throw new Error('Venta no encontrada');

            // --- NUEVO: Manejo de Eliminaciones ---
            // Devolver stock de items que estaban antes pero ya no están en la nueva lista
            const newItemProductIds = items.map(it => it.product_id);
            const deletedItems = originalSale.details.filter(d => !newItemProductIds.includes(d.productId));

            for (const delItem of deletedItems) {
                const product = await tx.product.findUnique({ where: { id: delItem.productId } });
                if (product && !product.isService) {
                    await tx.inventory.update({
                        where: {
                            branchId_productId: {
                                branchId: originalSale.branchId,
                                productId: delItem.productId
                            }
                        },
                        data: { stockLevel: { increment: delItem.quantity } }
                    });
                }
            }
            // --------------------------------------

            let newTotal = 0;
            const saleDetailsData = [];

            // Procesar items y ajustar inventario
            for (const item of items) {
                const product = await tx.product.findUnique({
                    where: { id: item.product_id },
                    include: { variants: { orderBy: { quantity: 'desc' } } }
                });

                if (!product) throw new Error(`Producto ${item.product_id} no encontrado`);

                // Encontrar detalle original para comparar cantidades
                const oldDetail = originalSale.details.find(d => d.productId === item.product_id);
                const oldQty = oldDetail ? Number(oldDetail.quantity) : 0;
                const newQty = Number(item.quantity);
                const diff = newQty - oldQty;

                // Actualizar Inventario (Solo si NO es servicio)
                if (!product.isService && diff !== 0) {
                    await tx.inventory.update({
                        where: {
                            branchId_productId: {
                                branchId: originalSale.branchId,
                                productId: item.product_id
                            }
                        },
                        data: { stockLevel: { decrement: diff } }
                    });
                }

                // Lógica de precios por volumen (tiers)
                // Si el frontend envía un unitPrice (edición manual o selección específica de tier), lo respetamos.
                // Si no, lo recalculamos automáticamente.
                let unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(product.basePrice);
                
                if (item.unitPrice === undefined) {
                    for (const variant of product.variants) {
                        if (newQty >= variant.quantity) {
                            unitPrice = Number(variant.price) / variant.quantity;
                            break;
                        }
                    }
                }

                const subtotal = unitPrice * newQty;
                newTotal += subtotal;

                saleDetailsData.push({
                    productId: item.product_id,
                    quantity: newQty,
                    unitPrice: unitPrice,
                    subtotal: subtotal,
                    notes: item.notes || (oldDetail ? oldDetail.notes : null)
                });
            }

            const finalTotal = newTotal - (Number(discount) || 0);

            // Actualizar Cabecera de Venta
            return await tx.saleH.update({
                where: { id: parseInt(id) },
                data: {
                    total: finalTotal,
                    discount: Number(discount) || 0,
                    paymentMethod: payment_method || originalSale.paymentMethod,
                    clientId: clientId ? parseInt(clientId) : originalSale.clientId,
                    amountTendered: amount_tendered !== undefined ? Number(amount_tendered) : originalSale.amountTendered,
                    change: change !== undefined ? Number(change) : (amount_tendered !== undefined ? Number(amount_tendered) : Number(originalSale.amountTendered)) - finalTotal,
                    createdAt: customDate ? new Date(customDate.includes('T') ? `${customDate}-06:00` : `${customDate}T${new Date().toLocaleTimeString('en-GB')}-06:00`) : undefined,
                    // Si era crédito, actualizamos balance para reflejar el nuevo total
                    balance: (payment_method === 'CREDITO' || originalSale.paymentMethod === 'CREDITO') ? finalTotal : 0,
                    details: {
                        deleteMany: {}, // Borramos detalles anteriores
                        create: saleDetailsData // Creamos los nuevos (reemplazo total de items)
                    }
                }
            });
        }, { timeout: 15000 });

        await logAudit(user_id, 'UPDATE_SALE', { saleId: id, total: result.total }, result.branchId);
        const io = getIO();
        if (io) io.emit('INVENTORY_UPDATED', { branchId: result.branchId });

        res.json({ message: 'Venta actualizada con éxito', sale: result });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Error al actualizar la venta' });
    }
};

const getShipments = async (req, res) => {
    try {
        const { status, branch_id } = req.query;
        const where = {
            shipping: { gt: 0 }
        };
        if (status) where.fulfillmentStatus = status;
        if (branch_id) where.branchId = parseInt(branch_id);
        if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
            where.branchId = req.user.branch_id;
        }

        const shipments = await prisma.saleH.findMany({
            where,
            include: {
                client: { select: { name: true, phone: true, address: true, email: true } },
                user: { select: { name: true } },
                branch: { select: { name: true } },
                details: {
                    include: { product: { select: { name: true } } }
                }
            },
            orderBy: { shippingDate: { sort: 'asc', nulls: 'last' } }
        });

        res.json(shipments);
    } catch (error) {
        console.error('Error fetching shipments:', error);
        res.status(500).json({ message: 'Error al obtener envíos' });
    }
};

const updateDeliveryDate = async (req, res) => {
    const { id } = req.params;
    const { deliveryDate } = req.body;
    try {
        const sale = await prisma.saleH.update({
            where: { id: parseInt(id) },
            data: { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }
        });
        res.json({ message: 'Fecha de entrega actualizada', sale });
    } catch (error) {
        console.error('Error updating delivery date:', error);
        res.status(500).json({ message: 'Error al actualizar fecha de entrega' });
    }
};

const updateFulfillmentStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['VENDIDO', 'DESPACHADO', 'ENTREGADO'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Estado inválido. Use: VENDIDO, DESPACHADO o ENTREGADO' });
    }
    try {
        const sale = await prisma.saleH.update({
            where: { id: parseInt(id) },
            data: { fulfillmentStatus: status }
        });
        await logAudit(req.user.id, 'UPDATE_FULFILLMENT', { saleId: id, status }, sale.branchId);
        res.json({ message: `Estado actualizado a ${status}`, sale });
    } catch (error) {
        console.error('Error updating fulfillment:', error);
        res.status(500).json({ message: 'Error al actualizar estado de envío' });
    }
};

const reverseSale = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { reason, includeShipping } = req.body;

    if (!reason || !reason.trim()) {
        return res.status(400).json({ message: 'El motivo de reversión es requerido' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const sale = await tx.saleH.findUnique({
                where: { id: parseInt(id) },
                include: {
                    details: { include: { product: true } },
                    branch: { select: { name: true, id: true } }
                }
            });

            if (!sale) throw new Error('Venta no encontrada');
            if (sale.reversedAt) throw new Error('Esta venta ya fue revertida');

            // 1. Regresar inventario (solo productos, no servicios)
            for (const detail of sale.details) {
                if (!detail.product.isService) {
                    await tx.inventory.update({
                        where: {
                            branchId_productId: {
                                branchId: sale.branchId,
                                productId: detail.productId
                            }
                        },
                        data: { stockLevel: { increment: detail.quantity } }
                    });
                }
            }

            // 2. Crear gasto por reembolso si pagó en efectivo
            const paidInCash = sale.paymentMethod === 'CASH' || sale.paymentMethod?.includes('EFECTIVO');
            if (paidInCash) {
                const cashPaid = (sale.amountTendered || 0) - (sale.change || 0);
                if (cashPaid > 0) {
                    await tx.expense.create({
                        data: {
                            branchId: sale.branchId,
                            userId,
                            description: `REVERSIÓN Venta #${sale.id} - Reembolso efectivo: ${reason}`,
                            amount: cashPaid,
                            createdAt: new Date()
                        }
                    });
                }
            }

            // 3. Crear gasto por envío si aplica
            if (includeShipping && sale.shipping > 0) {
                await tx.expense.create({
                    data: {
                        branchId: sale.branchId,
                        userId,
                        description: `REVERSIÓN Venta #${sale.id} - Envío`,
                        amount: sale.shipping,
                        createdAt: new Date()
                    }
                });
            }

            // 4. Cancelar balance pendiente (crédito / pago parcial)
            if (sale.balance > 0) {
                await tx.saleH.update({
                    where: { id: sale.id },
                    data: { balance: 0 }
                });
            }

            // 5. Marcar venta como revertida
            const updated = await tx.saleH.update({
                where: { id: sale.id },
                data: {
                    reversedAt: new Date(),
                    reversalReason: reason,
                    reversedById: userId,
                    fulfillmentStatus: 'REVERTIDA'
                }
            });

            await logAudit(userId, 'REVERSE_SALE', {
                saleId: sale.id,
                reason,
                includeShipping,
                invoiceNumber: sale.id,
                total: sale.total
            }, sale.branchId);

            return updated;
        }, { timeout: 15000 });

        const io = getIO();
        io?.emit('sale_reversed', { saleId: parseInt(id) });

        res.json({ message: 'Venta revertida exitosamente', sale: result });
    } catch (error) {
        console.error('Error reversing sale:', error);
        res.status(500).json({ message: error.message || 'Error al revertir la venta' });
    }
};

module.exports = { createSale, getAccountsReceivable, getSalesHistory, getSaleById, payAccountReceivable, getClientPayments, updateSale, getShipments, updateFulfillmentStatus, updateDeliveryDate, reverseSale };
