const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const details = [
            { productId: 1, quantity: 150, unitCost: 0.06, subtotal: 8.70, batchNumber: "Lote1", expirationDate: "2027-12-15" }
        ];

        const purchaseDetails = details.map(item => {
            return {
                productId: item.productId,
                quantity: Number(item.quantity),
                unitCost: Number(item.unitCost),
                subtotal: item.subtotal,
                batchNumber: item.batchNumber,
                expirationDate: item.expirationDate ? new Date(item.expirationDate) : null
            };
        });

        const purchase = await prisma.$transaction(async (tx) => {
            const pur = await tx.purchaseH.create({
                data: {
                    branchId: 1,
                    userId: 1,
                    providerId: null,
                    invoiceNumber: "TEST-123",
                    total: 8.70,
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
                        batchNumber: item.batchNumber,
                        expirationDate: item.expirationDate,
                        quantity: item.quantity
                    }
                });
            }
            return pur;
        });

        console.log("Success Purchase", purchase.id);
    } catch (e) {
        console.error("ERROR CREATING: ", e);
    }
}
test().finally(() => prisma.$disconnect());
