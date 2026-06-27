import { db } from './index';
import { admins } from './schema';
import { eq } from 'drizzle-orm';

async function seedAdmin() {
  console.log('🌱 Seeding platform administrator...');
  try {
    const email = 'yusuufabdisheikh@gmail.com';
    const [existing] = await db.select().from(admins).where(eq(admins.email, email));
    
    if (!existing) {
      const [newAdmin] = await db.insert(admins).values({
        name: 'Mohammed Abshir',
        email: email,
        role: 'super_admin',
      }).returning();
      console.log('✅ Admin account seeded successfully:', newAdmin);
    } else {
      console.log('ℹ️ Admin account already exists:', existing);
    }
  } catch (error) {
    console.error('❌ Failed to seed admin account:', error);
  }
}

seedAdmin().then(() => process.exit(0));
