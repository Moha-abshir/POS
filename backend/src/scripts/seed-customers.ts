import { db, pool } from '../db';
import { businesses, customers, users } from '../db/schema';
import { eq, ilike, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

function parseCSV(text: string): string[][] {
  const cleanText = (text || '').replace(/^\uFEFF/, '');
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal.trim());
      if (row.some(cell => cell.length > 0)) {
        result.push(row);
      }
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(cell => cell.length > 0)) {
      result.push(row);
    }
  }

  return result;
}

async function run() {
  console.log('=== Customer Seeding Script ===');

  // 1. Find business matching "Abu Rayan"
  const allBusinesses = await db.select().from(businesses);
  console.log('Available businesses in DB:', allBusinesses.map(b => ({ id: b.id, name: b.name })));

  let targetBusiness = allBusinesses.find(b => b.name.toLowerCase().includes('abu rayan'));
  if (!targetBusiness && allBusinesses.length > 0) {
    console.log('Exact "Abu Rayan" business not found by fuzzy search. Using first business:', allBusinesses[0].name);
    targetBusiness = allBusinesses[0];
  }

  if (!targetBusiness) {
    console.error('No businesses found in database!');
    process.exit(1);
  }

  console.log(`Targeting Business: "${targetBusiness.name}" (${targetBusiness.id})`);

  // Find owner/user for this business
  const [owner] = await db.select()
    .from(users)
    .where(eq(users.businessId, targetBusiness.id))
    .limit(1);

  const userId = owner ? owner.id : null;

  // 2. Read allcustomerdetails.csv from root
  const csvPath = path.join(__dirname, '../../../allcustomerdetails.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at:', csvPath);
    process.exit(1);
  }

  const csvText = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvText);

  console.log(`Parsed ${rows.length} total rows (including header).`);

  if (rows.length <= 1) {
    console.error('CSV is empty');
    process.exit(1);
  }

  // Header indexing
  const headers = rows[0].map(h => h.toLowerCase().trim());
  const nameIdx = headers.findIndex(h => h.includes('name'));
  const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile'));
  const idIdx = headers.findIndex(h => h.includes('id'));
  const addressIdx = headers.findIndex(h => h.includes('address'));
  const notesIdx = headers.findIndex(h => h.includes('note'));
  const typeIdx = headers.findIndex(h => h.includes('type'));
  const amountOwedIdx = headers.findIndex(h => h.includes('owed') || h.includes('balance') || h.includes('amount'));
  const periodOwedIdx = headers.findIndex(h => h.includes('period'));

  // 3. Clear existing customers for this business
  const deleteResult = await db.delete(customers).where(eq(customers.businessId, targetBusiness.id)).returning();
  console.log(`Cleared ${deleteResult.length} existing customer records for "${targetBusiness.name}".`);

  // 4. Batch insert customer records
  let successCount = 0;
  let errorCount = 0;

  const insertedPhones = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(cell => !cell.trim())) continue;

    try {
      const name = row[nameIdx]?.trim();
      if (!name) continue;

      let rawPhone = phoneIdx !== -1 ? row[phoneIdx]?.trim() : '';
      if (rawPhone && !rawPhone.startsWith('0') && !rawPhone.startsWith('+') && rawPhone.length === 9) {
        rawPhone = '0' + rawPhone;
      }
      const phone = rawPhone && rawPhone.length > 0 ? rawPhone : null;

      // Handle duplicate phones within the CSV itself
      let finalPhone = phone;
      if (finalPhone && insertedPhones.has(finalPhone)) {
        finalPhone = null; // nullify duplicate phone so row still imports safely
      } else if (finalPhone) {
        insertedPhones.add(finalPhone);
      }

      const nationalId = idIdx !== -1 ? (row[idIdx]?.trim() || null) : null;
      const address = addressIdx !== -1 ? (row[addressIdx]?.trim() || null) : null;
      const notes = notesIdx !== -1 ? (row[notesIdx]?.trim() || null) : null;

      let type = typeIdx !== -1 ? row[typeIdx]?.trim()?.toUpperCase() : 'INDIVIDUAL';
      if (type !== 'BUSINESS') type = 'INDIVIDUAL';

      const amountOwedRaw = amountOwedIdx !== -1 ? row[amountOwedIdx]?.trim() : '0';
      const amountOwed = amountOwedRaw ? Number(amountOwedRaw) : 0;
      const validAmount = !isNaN(amountOwed) && amountOwed > 0 ? amountOwed : 0;

      const periodOwedRaw = periodOwedIdx !== -1 ? row[periodOwedIdx]?.trim() : null;
      const periodOwed = validAmount > 0 ? (periodOwedRaw || 'within 30 days') : null;

      await db.insert(customers).values({
        businessId: targetBusiness.id,
        name,
        phone: finalPhone,
        nationalId,
        address,
        notes,
        type: type as 'INDIVIDUAL' | 'BUSINESS',
        balance: validAmount > 0 ? validAmount.toString() : '0',
        periodOwed,
        hasActiveCredit: validAmount > 0,
        createdBy: userId,
      });

      successCount++;
    } catch (err: any) {
      errorCount++;
      console.error(`Row ${i + 1} error (${row[nameIdx]}):`, err.message);
    }
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Successfully imported: ${successCount} customers`);
  console.log(`Errors encountered: ${errorCount}`);

  await pool.end();
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal Script Error:', err);
  process.exit(1);
});
