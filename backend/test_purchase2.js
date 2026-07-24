const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const details = [
            { productId: 1, quantity: 150, unit_cost: 0.05, subtotal: 7.50, batch_number: '', expiration_date: '' }
        ];

        const purchaseDetails = details.map(item => {
            return {
                productId: item.productId || item.product_id,
                quantity: Number(item.quantity),
                unitCost: Number(item.unit_cost),
                subtotal: item.subtotal,
                batchNumber: item.batchNumber || item.batch_number,
                expirationDate: item.expirationDate || item.expiration_date ? new Date(item.expirationDate || item.expiration_date) : null
            };
        });

        const purchase = await prisma.$transaction(async (tx) => {
            const pur = await tx.purchaseH.create({
                data: {
                    branchId: 1,
                    userId: 1,
                    providerId: null,
                    invoiceNumber: "TEST-1234",
                    total: 7.50,
                    paymentType: 'CASH',
                    balance: 0,
                    details: {
                        create: purchaseDetails.map(d => ({
                            productId: d.productId,
                            quantity: d.quantity,
                            unitCost: d.unitCost,
                            subtotal: d.subtotal
                        }))
                    }
                }
            });
            for (const item of purchaseDetails) {
                await tx.inventoryLot.create({
                    data: {
                        productId: item.productId,
                        branchId: 1,
                        batchNumber: item.batchNumber || null,
                        expirationDate: item.expirationDate || null,
                        quantity: item.quantity
                    }
                });
            }
            return pur;
        });

        console.log("Success Purchase", purchase.id);
    } catch (e) {
        console.error("ERROR CREATING: ", e.message);
    }
}
test().finally(() => prisma.$disconnect());
