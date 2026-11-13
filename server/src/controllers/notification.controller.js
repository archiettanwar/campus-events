import { Notification } from '../models/Notification.js';

export async function getNotifications(req, res, next) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ user: req.user.id, read: false }),
    ]);

    return res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.json({ notification });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
}