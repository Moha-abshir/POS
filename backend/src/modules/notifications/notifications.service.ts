import { db } from '../../db';
import { notifications } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

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
    return notification;
  }

  /**
   * Get latest 10 notifications
   */
  static async getNotifications(businessId: string) {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.businessId, businessId))
      .orderBy(desc(notifications.createdAt))
      .limit(10);
  }

  /**
   * Get count of unread notifications
   */
  static async getUnreadCount(businessId: string) {
    const result = await db.select()
      .from(notifications)
      .where(
        and(
          eq(notifications.businessId, businessId),
          eq(notifications.isRead, false)
        )
      );
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
  static async markAllAsRead(businessId: string) {
    return await db.update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.businessId, businessId),
          eq(notifications.isRead, false)
        )
      )
      .returning();
  }
}
