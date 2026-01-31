/**
 * Authentication module
 */
import { saveAccessToken, saveCookieHeader } from './token-storage.js';

export class AuthManager {
    /**
     * Authentication management
     *
     * @param {ITDClient} client - Main client
     */
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Checks for refresh_token in cookies
     *
     * @returns {boolean} True if refresh_token is available
     */
    hasRefreshToken() {
        try {
            const cookies = this.client.cookieJar.getCookiesSync(this.client.baseUrl);
            return cookies.some(c => c.key === 'refresh_token');
        } catch (e) {
            return false;
        }
    }

    /**
     * Refreshes accessToken via /api/v1/auth/refresh
     * IMPORTANT: this endpoint usually works only when refresh-cookie is present,
     * which was set earlier by browser/server.
     *
     * @returns {Promise<string|null>} accessToken or null
     */
    async refreshAccessToken() {
        if (!this.hasRefreshToken()) {
            console.error('❌ Failed to refresh token: refresh_token not found in cookies');
            console.error('💡 Solution:');
            console.error('   1. Open итд.com in the browser and log in');
            console.error('   2. Open DevTools (F12) → Network');
            console.error('   3. Find any request to итд.com');
            console.error('   4. Copy the Cookie header value');
            console.error('   5. Paste into .cookies file in project root');
            console.error('   6. Ensure Cookie contains refresh_token');
            return null;
        }

        try {
            const refreshUrl = `${this.client.baseUrl}/api/v1/auth/refresh`;

            const headers = {
                'Referer': `${this.client.baseUrl}/`,
                'Origin': this.client.baseUrl,
            };

            const response = await this.axios.post(refreshUrl, {}, { headers });

            if (response.status === 200 && response.data?.accessToken) {
                const newToken = response.data.accessToken;

                this.client.setAccessToken(newToken);

                await saveAccessToken(newToken, this.client.envPath);

                if (response.headers['set-cookie']) {
                    const cookies = response.headers['set-cookie'];
                    for (const cookieString of cookies) {
                        try {
                            this.client.cookieJar.setCookieSync(cookieString, this.client.baseUrl);
                        } catch (e) {
                            // Ignore individual cookie parse errors
                        }
                    }

                    try {
                        const allCookies = await this.client.cookieJar.getCookiesSync(this.client.baseUrl);
                        const importantCookies = allCookies.filter(c =>
                            c.key === 'refresh_token' ||
                            c.key.startsWith('__ddg') ||
                            c.key === 'is_auth'
                        );
                        if (importantCookies.length > 0) {
                            const cookieHeader = importantCookies.map(c => `${c.key}=${c.value}`).join('; ');
                            await saveCookieHeader(cookieHeader, this.client.cookiesPath);
                        }
                    } catch (e) {
                        console.warn('⚠️  Failed to save updated cookies:', e.message);
                    }
                }

                return newToken;
            }

            return null;
        } catch (error) {
            if (error.response) {
                const errorData = error.response.data;
                if (errorData?.error?.code === 'REFRESH_TOKEN_MISSING') {
                    console.error('❌ Failed to refresh token: refresh_token not found');
                    console.error('💡 Solution: update .cookies from browser (see instructions above)');
                } else {
                    console.error('refreshAccessToken failed:', error.response.status, error.response.data);
                }
            } else {
                console.error('refreshAccessToken failed:', error.message);
            }
            return null;
        }
    }

    /**
     * Change password. POST /api/v1/auth/change-password
     * Requires cookies (refresh_token).
     *
     * @param {string} oldPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<Object|null>} API response or null on error
     */
    async changePassword(oldPassword, newPassword) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: accessToken required');
            return null;
        }
        if (!this.hasRefreshToken()) {
            console.error('Error: refresh_token required in cookies');
            return null;
        }
        try {
            const url = `${this.client.baseUrl}/api/v1/auth/change-password`;
            const response = await this.axios.post(url, {
                oldPassword,
                newPassword,
            });
            if (response.status === 200) {
                return response.data;
            }
            return null;
        } catch (error) {
            console.error('Error changing password:', error.message);
            if (error.response) {
                console.error('Response:', error.response.status, error.response.data);
            }
            return null;
        }
    }

    /**
     * Logout.
     * POST /api/v1/auth/logout → 204
     *
     * @returns {Promise<boolean>} True on success
     */
    async logout() {
        try {
            const logoutUrl = `${this.client.baseUrl}/api/v1/auth/logout`;
            const response = await this.axios.post(logoutUrl);

            if (response.status === 200 || response.status === 204) {
                this.client.setAccessToken(null);
                try {
                    this.client.cookieJar.removeAllCookiesSync();
                } catch (e) {
                    // MemoryCookieStore supports removeAllCookiesSync
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Logout error:', error.message);
            return false;
        }
    }

    /**
     * Checks if user is authenticated
     *
     * @returns {Promise<boolean>} True if authenticated
     */
    async checkAuth() {
        return !!this.client.accessToken;
    }

    /**
     * Validates token with a test request.
     * If token expired and refresh_token exists, refreshes automatically.
     *
     * @returns {Promise<boolean>} True if token valid or successfully refreshed
     */
    async validateAndRefreshToken() {
        if (!this.client.accessToken) {
            return false;
        }

        try {
            const profileUrl = `${this.client.baseUrl}/api/users/me`;
            const response = await this.client.axios.get(profileUrl);

            if (response.status === 200) {
                return true;
            }

            return false;
        } catch (error) {
            if (error.response?.status === 401) {
                const newToken = await this.refreshAccessToken();
                return !!newToken;
            }
            return false;
        }
    }
}
