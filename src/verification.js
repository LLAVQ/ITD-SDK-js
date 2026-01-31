/**
 * Account verification module
 */
export class VerificationManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Gets verification status. GET /api/verification/status
     *
     * @returns {Promise<Object|null>} Verification status or null
     */
    async getStatus() {
        if (!await this.client.auth.checkAuth()) return null;
        try {
            const url = `${this.client.baseUrl}/api/verification/status`;
            const response = await this.axios.get(url);
            if (response.status === 200) {
                return response.data?.data ?? response.data;
            }
            return null;
        } catch (error) {
            console.error('Error getting verification status:', error.message);
            return null;
        }
    }

    /**
     * Submits verification request. POST /api/verification/submit
     *
     * @param {string} videoUrl - URL of uploaded video (from uploadFile)
     * @returns {Promise<Object|null>} { success, request: { id, status, ... } } or null
     */
    async submit(videoUrl) {
        if (!await this.client.auth.checkAuth()) return null;
        try {
            const url = `${this.client.baseUrl}/api/verification/submit`;
            const response = await this.axios.post(url, { videoUrl });
            if (response.status === 200 || response.status === 201) {
                return response.data?.data ?? response.data;
            }
            return null;
        } catch (error) {
            console.error('Error submitting verification request:', error.message);
            return null;
        }
    }
}
