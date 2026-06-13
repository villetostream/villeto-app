import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationItem {
  id: number;
  title: string;
  actionText: string;
  time: string;
  unread: boolean;
}

const initialNotifications: NotificationItem[] = [
  {
    id: 1,
    title: "We noticed that you used your expense card to make some transactions kindly log your expense.",
    actionText: "Log Expense",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: 2,
    title: "We noticed that you used your expense card to make some transactions kindly log your expense.",
    actionText: "Log Expense",
    time: "2 hours ago",
    unread: false,
  },
  {
    id: 3,
    title: "We noticed that you used your expense card to make some transactions kindly log your expense.",
    actionText: "Log Expense",
    time: "2 hours ago",
    unread: false,
  },
  {
    id: 4,
    title: "We  that you used your expense card to make some transactions kindly log your expense.",
    actionText: "Log Expense",
    time: "4 hours ago",
    unread: false,
  },
  {
    id: 5,
    title: "We expense card to make some transactions kindly log your expense.",
    actionText: "Log Expense",
    time: "5 hours ago",
    unread: false,
  },
];

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  setNotifications: (notifications: NotificationItem[]) => void;
  markAllAsRead: () => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, _get) => ({
      notifications: initialNotifications,
      unreadCount: initialNotifications.filter(n => n.unread).length,

      setNotifications: (notifications) => {
        set({ 
          notifications, 
          unreadCount: notifications.filter(n => n.unread).length 
        });
      },

      markAllAsRead: () => {
        set((state) => {
          const updated = state.notifications.map(n => ({ ...n, unread: false }));
          return {
            notifications: updated,
            unreadCount: 0
          };
        });
      },

      reset: () => set({ 
        notifications: initialNotifications, 
        unreadCount: initialNotifications.filter(n => n.unread).length 
      }),
    }),
    {
      name: 'villeto-notifications', // LocalStorage key
    }
  )
);
