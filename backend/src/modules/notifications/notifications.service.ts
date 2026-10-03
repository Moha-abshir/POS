import { db } from '../../db';
import { notifications } from '../../db/schema';
import { eq, and, desc, not } from 'drizzle-orm';
import { flushPattern } from '../../core/cache/redis';

export class NotificationsService {
  /**
   * Create a new notification
   */
  static async createNotification(
    businessId: string,
    type: 'LOW_STOCK' | 'DAMAGE' | 'CASH_DISCREPANCY' | 'SYSTEM',
    title: string,
    message: string
  ) {
    const [notification] = await db.insert(notifications).values({
      businessId,
      type,
      title,
      message,
      isRead: false,
    }).returning();
    await flushPattern(`cache:${businessId}:*notifications*`);
    return notification;
  }

  /**
   * Get latest 10 notifications
   */
  static async getNotifications(businessId: string, role: string) {
    const filters = [eq(notifications.businessId, businessId)];
    if (role !== 'OWNER') {
      filters.push(not(eq(notifications.type, 'CASH_DISCREPANCY')));
    }
    
    return await db.select()
      .from(notifications)
      .where(and(...filters))
      .orderBy(desc(notifications.createdAt))
      .limit(10);
  }

  /**
   * Get count of unread notifications
   */
  static async getUnreadCount(businessId: string, role: string) {
    const filters = [
      eq(notifications.businessId, businessId),
      eq(notifications.isRead, false)
    ];
    if (role !== 'OWNER') {
      filters.push(not(eq(notifications.type, 'CASH_DISCREPANCY')));
    }
    
    const result = await db.select()
      .from(notifications)
      .where(and(...filters));
    return result.length;
  }

  /**
   * Mark a specific notification as read
   */
  static async markAsRead(id: string, businessId: string) {
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.businessId, businessId)
        )
      )
      .returning();
    return updated;
  }

  /**
   * Mark all notifications for the business as read
   */
  static async markAllAsRead(businessId: string, role: string) {
    const filters = [
      eq(notifications.businessId, businessId),
      eq(notifications.isRead, false)
    ];
    if (role !== 'OWNER') {
      filters.push(not(eq(notifications.type, 'CASH_DISCREPANCY')));
    }
    
    return await db.update(notifications)
      .set({ isRead: true })
      .where(and(...filters))
      .returning();
  }
}
