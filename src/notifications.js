/**
 * Notifications module
 */
export class NotificationsManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Gets notifications list.
     * GET /api/notifications/?offset=0&limit=20 → { notifications: [], hasMore }
     *
     * @param {number} limit - Number of notifications
     * @param {number} offset - Pagination offset
     * @param {string|null} type - Filter by type: 'reply', 'like', 'wall_post', 'follow', 'comment' (client-side)
     * @returns {Promise<Object|null>} { notifications: [], hasMore } or null on error
     */
    async getNotifications(limit = 20, offset = 0, type = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }

        try {
            const notificationsUrl = `${this.client.baseUrl}/api/notifications`;
            const params = { limit, offset };

            const response = await this.axios.get(notificationsUrl, { params });

            if (response.status === 200) {
                const data = response.data;
                let notifications = Array.isArray(data?.notifications) ? data.notifications : [];
                const hasMore = Boolean(data?.hasMore);

                if (type && notifications.length > 0) {
                    notifications = notifications.filter(notif => notif.type === type);
                }

                return { notifications, hasMore };
            } else {
                console.error(`Error getting notifications: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Exception getting notifications:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Marks several notifications as read.
     * POST /api/notifications/read-batch → { success: true, count: number }
     *
     * @param {string[]} ids - Array of notification IDs
     * @returns {Promise<Object|null>} { success: true, count } or null on error
     */
    async markAsReadBatch(ids) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }
        if (!Array.isArray(ids) || ids.length === 0) {
            return { success: true, count: 0 };
        }
        try {
            const url = `${this.client.baseUrl}/api/notifications/read-batch`;
            const response = await this.axios.post(url, { ids });
            if (response.status === 200) {
                return response.data;
            }
            return null;
        } catch (error) {
            console.error('Exception marking notifications as read:', error.message);
            return null;
        }
    }

    /**
     * Marks notification as read
     *
     * @param {string} notificationId - Notification ID
     * @returns {Promise<Object|null>} { success: true } or null on error
     */
    async markAsRead(notificationId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }

        try {
            const readUrl = `${this.client.baseUrl}/api/notifications/${notificationId}/read`;
            const response = await this.axios.post(readUrl);

            if (response.status === 200 || response.status === 204) {
                return response.data || { success: true };
            } else {
                console.error(`Error marking notification: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Exception marking notification as read:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Gets unread notifications count
     *
     * @returns {Promise<number|null>} Count or null on error
     */
    async getUnreadCount() {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }

        try {
            const countUrl = `${this.client.baseUrl}/api/notifications/count`;
            const response = await this.axios.get(countUrl);

            if (response.status === 200) {
                const data = response.data;
                return data.count || 0;
            } else {
                console.error(`Error getting notification count: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Exception getting notification count:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Marks all notifications as read.
     * POST /api/notifications/read-all → { success: true }
     *
     * @returns {Promise<boolean>} True on success
     */
    async markAllAsRead() {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return false;
        }

        try {
            const readAllUrl = `${this.client.baseUrl}/api/notifications/read-all`;
            const response = await this.axios.post(readAllUrl);

            if (response.status === 200 || response.status === 204) {
                return response.data?.success !== false;
            } else {
                console.error(`Error marking all notifications: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return false;
            }
        } catch (error) {
            console.error('Exception marking all notifications as read:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return false;
        }
    }

    // ========== USER-FRIENDLY METHODS ==========

    /**
     * Checks if there are unread notifications
     *
     * @returns {Promise<boolean>} True if there are unread
     */
    async hasUnreadNotifications() {
        const count = await this.getUnreadCount();
        return (count || 0) > 0;
    }

    /**
     * Gets only unread notifications
     *
     * @param {number} limit - Number of notifications
     * @param {number} offset - Pagination offset
     * @returns {Promise<Object|null>} { notifications: [], hasMore } or null
     */
    async getUnreadNotifications(limit = 20, offset = 0) {
        const all = await this.getNotifications(limit, offset);
        if (!all) return null;
        const unread = all.notifications.filter(n => !n.read);
        return { notifications: unread, hasMore: all.hasMore };
    }

}
