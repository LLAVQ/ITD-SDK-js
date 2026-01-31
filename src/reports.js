/**
 * Manager for reports
 */
export class ReportsManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Submits report for post, comment or user.
     * POST /api/reports → { data: { id, createdAt } }
     *
     * @param {string} targetType - Target type: "post", "comment", "user"
     * @param {string} targetId - Target ID (post, comment or user)
     * @param {string} reason - Reason: "spam", "violence", "hate", "adult", "fraud", "other"
     * @param {string} description - Problem description (optional)
     * @returns {Promise<Object|null>} { id, createdAt } or null on error
     */
    async report(targetType, targetId, reason = 'other', description = '') {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in to submit report');
            return null;
        }

        try {
            const reportUrl = `${this.client.baseUrl}/api/reports`;
            const payload = {
                targetType: targetType,
                targetId: targetId,
                reason: reason,
            };

            if (description) {
                payload.description = description;
            }

            const response = await this.axios.post(reportUrl, payload);

            if (response.status === 200 || response.status === 201) {
                if (response.data && response.data.data) {
                    return response.data.data;
                }
                return response.data || { success: true };
            } else {
                console.error(`Report submission error: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Exception while submitting report:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Submits report for a post
     *
     * @param {string} postId - Post ID
     * @param {string} reason - Reason: "spam", "violence", "hate", "adult", "fraud", "other" (default "other")
     * @param {string} description - Problem description
     * @returns {Promise<Object|null>} { id, createdAt } or null on error
     */
    async reportPost(postId, reason = 'other', description = '') {
        return await this.report('post', postId, reason, description);
    }

    /**
     * Submits report for a comment
     *
     * @param {string} commentId - Comment ID
     * @param {string} reason - Reason: "spam", "violence", "hate", "adult", "fraud", "other"
     * @param {string} description - Problem description
     * @returns {Promise<Object|null>} { id, createdAt } or null on error
     */
    async reportComment(commentId, reason = 'other', description = '') {
        return await this.report('comment', commentId, reason, description);
    }

    /**
     * Submits report for a user
     *
     * @param {string} userId - User ID
     * @param {string} reason - Reason: "spam", "violence", "hate", "adult", "fraud", "other"
     * @param {string} description - Problem description
     * @returns {Promise<Object|null>} { id, createdAt } or null on error
     */
    async reportUser(userId, reason = 'other', description = '') {
        return await this.report('user', userId, reason, description);
    }
}
