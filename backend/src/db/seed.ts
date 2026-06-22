import { db } from './index';
import { 
  businesses, users, categories, products, productVariants, variantUnits, 
  customers, sales, saleItems, payments, suppliers, purchases, purchaseItems, 
  damagedGoods, expenses, refunds, refundItems, stockMovements 
} from './schema';
import { eq, sql } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Starting database seeding for reports...');

  try {
    // 1. Get or Create Business and User
    let [business] = await db.select().from(businesses).limit(1);
    let [user] = await db.select().from(users).limit(1);

    if (!business) {
      console.log('No business found. Creating a default business...');
      const [newBusiness] = await db.insert(businesses).values({
        name: 'Antigravity Hypermarket',
        sector: 'Retail',
        phone: '+254712345678',
        location: 'Nairobi',
        isSetupComplete: true
      }).returning();
      business = newBusiness;
    }

    if (!user) {
      console.log('No user found. Creating a default admin user...');
      const [newUser] = await db.insert(users).values({
        businessId: business.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'admin@antigravity.com',
        role: 'OWNER'
      }).returning();
      user = newUser;
    }

    const businessId = business.id;
    const userId = user.id;

    console.log(`Seeding data for Business ID: ${businessId}, User ID: ${userId}`);

    // 3. Create Categories
    const categoryNames = ['Groceries', 'Beverages', 'Electronics', 'Hardware', 'Stationery', 'Cosmetics', 'Clothing', 'Home Decor'];
    const seededCategories = [];
    for (const name of categoryNames) {
      const [cat] = await db.insert(categories).values({
        businessId,
        name: `${name} ${Math.floor(Math.random() * 1000)}`
      }).returning();
      seededCategories.push(cat);
    }
    console.log(`Seeded ${seededCategories.length} categories.`);

    // 4. Create Suppliers
    const supplierNames = ['Safaricom Logistics', 'Kapa Oil Refineries', 'East African Breweries', 'Sony East Africa', 'Brookside Dairies', 'Crown Paints', 'Bamburi Cement'];
    const seededSuppliers = [];
    for (const name of supplierNames) {
      const [sup] = await db.insert(suppliers).values({
        businessId,
        name: `${name} Ltd`,
        phone: `254700${Math.floor(100000 + Math.random() * 900000)}`,
        email: `sales@${name.toLowerCase().replace(/\s+/g, '')}.com`,
        balance: '0',
        createdBy: userId
      }).returning();
      seededSuppliers.push(sup);
    }
    console.log(`Seeded ${seededSuppliers.length} suppliers.`);

    // 5. Create Customers
    const customerNames = ['Alice Mwangi', 'Bob Ochieng', 'Charlie Kiprop', 'Diana Nafula', 'Evans Kamau', 'Fiona Wanjiku', 'George Mwangi', 'Harriet Nekesa', 'Ian Mutua', 'Jane Wairimu'];
    const seededCustomers = [];
    for (const name of customerNames) {
      const [cust] = await db.insert(customers).values({
        businessId,
        type: Math.random() > 0.3 ? 'INDIVIDUAL' : 'BUSINESS',
        name,
        phone: `254722${Math.floor(100000 + Math.random() * 900000)}`,
        balance: '0',
        hasActiveCredit: false,
        createdBy: userId
      }).returning();
      seededCustomers.push(cust);
    }
    console.log(`Seeded ${seededCustomers.length} customers.`);

    // 6. Create Products, Variants, and Units
    const productTemplates = [
      { name: 'Coca Cola 500ml', catIdx: 1, baseUnit: 'Bottle', cost: 50, price: 70 },
      { name: 'Fanta Orange 500ml', catIdx: 1, baseUnit: 'Bottle', cost: 50, price: 70 },
      { name: 'Brookside Milk 1L', catIdx: 1, baseUnit: 'Packet', cost: 80, price: 110 },
      { name: 'Jogoo Maize Meal 2kg', catIdx: 0, baseUnit: 'Packet', cost: 130, price: 160 },
      { name: 'Broadways Bread 400g', catIdx: 0, baseUnit: 'Loaf', cost: 55, price: 65 },
      { name: 'Raha Premium Flour 2kg', catIdx: 0, baseUnit: 'Packet', cost: 150, price: 190 },
      { name: 'Celtel LED Bulb 15W', catIdx: 2, baseUnit: 'Piece', cost: 180, price: 280 },
      { name: 'Safaricom Airtime 100', catIdx: 2, baseUnit: 'Scratch Card', cost: 94, price: 100 },
      { name: 'Bamburi Cement 50kg', catIdx: 3, baseUnit: 'Bag', cost: 680, price: 780 },
      { name: 'Crown Paint White 4L', catIdx: 3, baseUnit: 'Tin', cost: 1800, price: 2400 },
      { name: 'Kasuku Exercise Book A5', catIdx: 4, baseUnit: 'Piece', cost: 35, price: 50 },
      { name: 'Bic M10 Pen Blue', catIdx: 4, baseUnit: 'Box', cost: 360, price: 480 },
      { name: 'Dettol Soap 120g', catIdx: 5, baseUnit: 'Bar', cost: 90, price: 130 },
      { name: 'Colgate Toothpaste 120g', catIdx: 5, baseUnit: 'Tube', cost: 120, price: 180 },
    ];

    const seededVariants = [];
    const seededUnits = [];

    for (const template of productTemplates) {
      const cat = seededCategories[template.catIdx % seededCategories.length];
      const [prod] = await db.insert(products).values({
        businessId,
        categoryId: cat.id,
        name: `${template.name} ${Math.floor(Math.random() * 100)}`,
        createdBy: userId
      }).returning();

      const [variant] = await db.insert(productVariants).values({
        businessId,
        productId: prod.id,
        name: 'Standard',
        sku: `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
        costPrice: template.cost.toString(),
        baseUnitName: template.baseUnit,
        baseStockQuantity: '500',
        lowStockThreshold: '20'
      }).returning();
      seededVariants.push(variant);

      const [unit] = await db.insert(variantUnits).values({
        businessId,
        variantId: variant.id,
        name: template.baseUnit,
        sellingPrice: template.price.toString(),
        conversionFactor: '1',
        isDefault: true
      }).returning();
      seededUnits.push(unit);
    }
    console.log(`Seeded ${seededVariants.length} products, variants, and units.`);

    // 7. Create Historical Sales and Payments over 90 Days
    const paymentMethods: ('CASH' | 'MPESA' | 'SPLIT')[] = ['CASH', 'MPESA', 'SPLIT'];

    console.log('Seeding 250 historical sales...');
    const now = new Date();

    for (let i = 0; i < 250; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const saleDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 8 * 60 * 60 * 1000);

      const customer = Math.random() > 0.3 ? seededCustomers[Math.floor(Math.random() * seededCustomers.length)] : null;
      
      const itemsCount = Math.floor(1 + Math.random() * 4);
      const selectedItems = [];
      let totalAmount = 0;

      for (let j = 0; j < itemsCount; j++) {
        const idx = Math.floor(Math.random() * seededVariants.length);
        const variant = seededVariants[idx];
        const unit = seededUnits[idx];
        const quantity = Math.floor(1 + Math.random() * 5);
        const subtotal = quantity * Number(unit.sellingPrice);
        
        selectedItems.push({
          variantId: variant.id,
          unitId: unit.id,
          quantity: quantity.toString(),
          sellingPrice: unit.sellingPrice,
          costPrice: variant.costPrice,
          subtotal: subtotal.toString()
        });
        totalAmount += subtotal;
      }

      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const status: 'PAID' | 'PARTIAL' | 'UNPAID' = method === 'SPLIT' 
        ? 'PAID' 
        : (Math.random() > 0.8 && customer ? 'PARTIAL' : (Math.random() > 0.9 && customer ? 'UNPAID' : 'PAID'));
      
      let amountPaid = totalAmount;
      if (status === 'PARTIAL') {
        amountPaid = Math.floor(totalAmount * 0.4);
      } else if (status === 'UNPAID') {
        amountPaid = 0;
      }

      const [sale] = await db.insert(sales).values({
        businessId,
        customerId: customer ? customer.id : null,
        totalAmount: totalAmount.toString(),
        discountAmount: '0',
        amountPaid: amountPaid.toString(),
        paymentStatus: status,
        paymentMethod: method,
        mpesaRef: (method === 'MPESA' || method === 'SPLIT') ? `STK${Math.floor(100000 + Math.random() * 900000)}` : null,
        mpesaPhoneNumber: (method === 'MPESA' || method === 'SPLIT') ? '254712345678' : null,
        soldAt: saleDate,
        createdAt: saleDate,
        createdBy: userId
      }).returning();

      // Insert sale items
      for (const item of selectedItems) {
        await db.insert(saleItems).values({
          businessId,
          saleId: sale.id,
          variantId: item.variantId,
          unitId: item.unitId,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          costPrice: item.costPrice,
          subtotal: item.subtotal
        });

        // Insert stock movement
        await db.insert(stockMovements).values({
          businessId,
          variantId: item.variantId,
          type: 'SALE',
          quantityChange: `-${item.quantity}`,
          referenceType: 'SALE',
          referenceId: sale.id,
          createdAt: saleDate,
          createdBy: userId
        });
      }

      // Record payments in payments table
      if (method === 'SPLIT') {
        const cashPart = Math.floor(totalAmount * 0.5);
        const mpesaPart = totalAmount - cashPart;
        await db.insert(payments).values({
          businessId,
          referenceType: 'SALE',
          referenceId: sale.id,
          amount: cashPart.toString(),
          method: 'CASH',
          status: 'COMPLETED',
          paidAt: saleDate,
          createdBy: userId
        });
        await db.insert(payments).values({
          businessId,
          referenceType: 'SALE',
          referenceId: sale.id,
          amount: mpesaPart.toString(),
          method: 'MPESA',
          status: 'COMPLETED',
          mpesaReceiptNumber: `TXN${Math.floor(100000 + Math.random() * 900000)}`,
          paidAt: saleDate,
          createdBy: userId
        });
      } else {
        if (amountPaid > 0) {
          await db.insert(payments).values({
            businessId,
            referenceType: 'SALE',
            referenceId: sale.id,
            amount: amountPaid.toString(),
            method: method === 'CASH' ? 'CASH' : 'MPESA',
            status: 'COMPLETED',
            mpesaReceiptNumber: method === 'MPESA' ? `TXN${Math.floor(100000 + Math.random() * 900000)}` : null,
            paidAt: saleDate,
            createdBy: userId
          });
        }
      }

      // If credit, adjust customer balance
      if (customer && status !== 'PAID') {
        const debt = totalAmount - amountPaid;
        await db.update(customers)
          .set({
            balance: sql`${customers.balance} + ${debt}`,
            hasActiveCredit: true
          })
          .where(eq(customers.id, customer.id));
      }
    }
    console.log('Seeded sales and sales payments.');

    // 8. Create Supplier Purchases over 90 Days
    console.log('Seeding 50 supplier purchases...');
    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const purchaseDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const supplier = seededSuppliers[Math.floor(Math.random() * seededSuppliers.length)];
      const itemsCount = Math.floor(1 + Math.random() * 3);
      let totalAmount = 0;
      const selectedItems = [];

      for (let j = 0; j < itemsCount; j++) {
        const idx = Math.floor(Math.random() * seededVariants.length);
        const variant = seededVariants[idx];
        const unit = seededUnits[idx];
        const quantity = Math.floor(10 + Math.random() * 50);
        const costPrice = Math.floor(Number(variant.costPrice) * 0.9);
        const subtotal = quantity * costPrice;

        selectedItems.push({
          variantId: variant.id,
          unitId: unit.id,
          quantity: quantity.toString(),
          costPrice: costPrice.toString(),
          subtotal: subtotal.toString()
        });
        totalAmount += subtotal;
      }

      const status = Math.random() > 0.8 ? 'PARTIAL' : 'PAID';
      let amountPaid = totalAmount;
      if (status === 'PARTIAL') {
        amountPaid = Math.floor(totalAmount * 0.5);
      }

      const [purchase] = await db.insert(purchases).values({
        businessId,
        supplierId: supplier.id,
        totalAmount: totalAmount.toString(),
        amountPaid: amountPaid.toString(),
        paymentStatus: status,
        invoiceRef: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        purchasedAt: purchaseDate,
        createdAt: purchaseDate,
        createdBy: userId
      }).returning();

      for (const item of selectedItems) {
        await db.insert(purchaseItems).values({
          businessId,
          purchaseId: purchase.id,
          variantId: item.variantId,
          unitId: item.unitId,
          quantity: item.quantity,
          costPrice: item.costPrice,
          subtotal: item.subtotal
        });

        // Insert stock movement
        await db.insert(stockMovements).values({
          businessId,
          variantId: item.variantId,
          type: 'PURCHASE',
          quantityChange: item.quantity,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          createdAt: purchaseDate,
          createdBy: userId
        });
      }

      if (amountPaid > 0) {
        await db.insert(payments).values({
          businessId,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          amount: amountPaid.toString(),
          method: 'CASH',
          status: 'COMPLETED',
          paidAt: purchaseDate,
          createdBy: userId
        });
      }

      if (status !== 'PAID') {
        const debt = totalAmount - amountPaid;
        await db.update(suppliers)
          .set({
            balance: sql`${suppliers.balance} + ${debt}`
          })
          .where(eq(suppliers.id, supplier.id));
      }
    }
    console.log('Seeded supplier purchases.');

    // 9. Create Damaged Goods
    console.log('Seeding 20 damaged goods entries...');
    const damageReasons = ['Broken during transport', 'Expired stock', 'Water leak damage', 'Defective from manufacturer', 'Mice/Pest damage'];
    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const damageDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const idx = Math.floor(Math.random() * seededVariants.length);
      const variant = seededVariants[idx];
      const quantity = Math.floor(1 + Math.random() * 4);

      const [dmg] = await db.insert(damagedGoods).values({
        businessId,
        variantId: variant.id,
        quantity: quantity.toString(),
        reason: damageReasons[Math.floor(Math.random() * damageReasons.length)],
        damagedAt: damageDate,
        createdAt: damageDate,
        createdBy: userId
      }).returning();

      // Stock movement
      await db.insert(stockMovements).values({
        businessId,
        variantId: variant.id,
        type: 'DAMAGE',
        quantityChange: `-${quantity}`,
        referenceType: 'DAMAGE',
        referenceId: dmg.id,
        createdAt: damageDate,
        createdBy: userId
      });
    }
    console.log('Seeded damaged goods.');

    // 10. Create Expenses
    console.log('Seeding 60 expenses...');
    const expenseCategories = ['Rent', 'Electricity', 'Water', 'Salaries', 'Internet', 'Marketing', 'Cleaning Supplies', 'Transport', 'Licenses & Permits', 'Miscellaneous'];
    for (let i = 0; i < 60; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const expDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const cat = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      let amount = 0;
      if (cat === 'Rent') amount = 15000;
      else if (cat === 'Salaries') amount = 8000 + Math.floor(Math.random() * 12000);
      else if (cat === 'Electricity') amount = 1200 + Math.floor(Math.random() * 2000);
      else amount = 200 + Math.floor(Math.random() * 1500);

      await db.insert(expenses).values({
        businessId,
        category: cat,
        description: `Monthly ${cat.toLowerCase()} payout`,
        amount: amount.toString(),
        expenseDate: expDate,
        createdAt: expDate,
        createdBy: userId
      });
    }
    console.log('Seeded business expenses.');

    // 11. Create Refunds
    console.log('Seeding 15 refunds...');
    const recentSales = await db.select().from(sales).where(eq(sales.businessId, businessId)).limit(30);
    const refundReasons = ['Customer changed mind', 'Incorrect variant selected', 'Minor product defect'];

    for (let i = 0; i < 15; i++) {
      const sale = recentSales[Math.floor(Math.random() * recentSales.length)];
      const saleItemsList = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
      if (saleItemsList.length === 0) continue;

      const item = saleItemsList[0];
      const refundQty = '1';
      const refundSubtotal = Number(item.sellingPrice) * 1;
      
      const refundDate = new Date(sale.soldAt.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000);

      const [ref] = await db.insert(refunds).values({
        businessId,
        saleId: sale.id,
        totalAmount: refundSubtotal.toString(),
        reason: refundReasons[Math.floor(Math.random() * refundReasons.length)],
        refundedAt: refundDate,
        createdAt: refundDate,
        createdBy: userId
      }).returning();

      await db.insert(refundItems).values({
        businessId,
        refundId: ref.id,
        variantId: item.variantId,
        unitId: item.unitId,
        quantity: refundQty,
        unitPrice: item.sellingPrice,
        subtotal: refundSubtotal.toString()
      });

      // Stock movement
      await db.insert(stockMovements).values({
        businessId,
        variantId: item.variantId,
        type: 'REFUND',
        quantityChange: refundQty,
        referenceType: 'REFUND',
        referenceId: ref.id,
        createdAt: refundDate,
        createdBy: userId
      });
    }
    console.log('Seeded refunds.');

    console.log('🎉 Seeding successfully completed!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
