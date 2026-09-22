/**
 * Utility for handling web push notifications and KDS sound alerts
 */

export const notificationService = {
  // Audio context for sound alerts (avoids autoplay restrictions if unlocked on user interaction)
  playNewOrderSound: () => {
    try {
      const audio = new Audio('/sounds/new-order.mp3');
      audio.play().catch(e => console.warn('Audio play blocked by browser', e));
    } catch (e) {
      console.error('Error playing sound', e);
    }
  },

  playStatusChangeSound: () => {
    try {
      const audio = new Audio('/sounds/status-change.mp3');
      audio.play().catch(e => console.warn('Audio play blocked by browser', e));
    } catch (e) {
      console.error('Error playing sound', e);
    }
  },

  requestPushPermission: async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  },

  showNotification: (title: string, body: string, url?: string) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200]
      });

      if (url) {
        notification.onclick = function() {
          window.focus();
          // In real app, router goto url
          this.close();
        };
      }
    }
  }
};
