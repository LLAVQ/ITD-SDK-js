/**
 * Users module
 */
export class UsersManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Updates current user profile.
     * PUT /api/users/me → { id, username, displayName, bio, updatedAt }
     *
     * @param {string|null} bio - New profile description (optional)
     * @param {string|null} displayName - New display name (optional)
     * @param {string|null} username - New username (optional)
     * @param {string|null} bannerId - Uploaded banner ID (optional)
     * @returns {Promise<Object|null>} Updated profile data or null on error
     */
    async updateProfile(bio = null, displayName = null, username = null, bannerId = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }

        try {
            const updateUrl = `${this.client.baseUrl}/api/users/me`;
            const updateData = {};
            if (bio != null) updateData.bio = bio;
            if (displayName != null) updateData.displayName = displayName;
            if (username != null) updateData.username = username;
            if (bannerId != null) updateData.bannerId = bannerId;
            if (Object.keys(updateData).length === 0) {
                return await this.getMyProfile();
            }

            const response = await this.axios.put(updateUrl, updateData);

            if (response.status === 200) {
                return response.data?.data ?? response.data;
            } else {
                console.error(`Profile update error: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Exception updating profile:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Gets current user data
     * 
     * @returns {Promise<Object|null>} Profile data or null on error
     */
    async getMyProfile() {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }

        try {
            const profileUrl = `${this.client.baseUrl}/api/users/me`;
            const response = await this.axios.get(profileUrl);

            if (response.status === 200) {
                return response.data;
            } else {
                console.error(`Profile fetch error: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Exception getting profile:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Gets current user privacy settings.
     * GET /api/users/me/privacy → { isPrivate, wallClosed }
     *
     * @returns {Promise<Object|null>} { isPrivate, wallClosed } or null on error
     */
    async getPrivacy() {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }
        try {
            const url = `${this.client.baseUrl}/api/users/me/privacy`;
            const response = await this.axios.get(url);
            if (response.status === 200) {
                return response.data?.data ?? response.data;
            }
            return null;
        } catch (error) {
            console.error('Privacy fetch error:', error.message);
            return null;
        }
    }

    /**
     * Updates privacy settings.
     * PUT /api/users/me/privacy → { isPrivate, wallClosed }
     *
     * @param {Object} options - { isPrivate?: boolean, wallClosed?: boolean }
     * @returns {Promise<Object|null>} { isPrivate, wallClosed } or null on error
     */
    async updatePrivacy(options = {}) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }
        try {
            const url = `${this.client.baseUrl}/api/users/me/privacy`;
            const payload = {};
            if (options.isPrivate != null) payload.isPrivate = options.isPrivate;
            if (options.wallClosed != null) payload.wallClosed = options.wallClosed;
            if (Object.keys(payload).length === 0) return await this.getPrivacy();

            const response = await this.axios.put(url, payload);
            if (response.status === 200) {
                return response.data?.data ?? response.data;
            }
            return null;
        } catch (error) {
            console.error('Privacy update error:', error.message);
            return null;
        }
    }

    /**
     * Gets user profile by username
     *
     * @param {string} username - Username
     * @returns {Promise<Object|null>} Profile data or null on error
     * 
     * Note: Auth not required for public profiles
     */
    async getUserProfile(username) {
        try {
            const profileUrl = `${this.client.baseUrl}/api/users/${username}`;
            const response = await this.axios.get(profileUrl);

            if (response.status === 200) {
                // Response may be { data: {...} } or just {...}
                return response.data.data || response.data;
            } else {
                console.error(`User profile fetch error: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Exception getting user profile:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Follows user
     *
     * @param {string} username - Username
     * @returns {Promise<Object|null>} { following: true, followersCount: number } or null on error
     */
    async followUser(username) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }

        try {
            const followUrl = `${this.client.baseUrl}/api/users/${username}/follow`;
            const response = await this.axios.post(followUrl);

            if (response.status === 200 || response.status === 201) {
                return response.data; // { following: true, followersCount: number }
            } else {
                console.error(`Follow error: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Exception following:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Unfollows user
     *
     * @param {string} username - Username
     * @returns {Promise<Object|null>} { following: false, followersCount: number } or null on error
     */
    async unfollowUser(username) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }

        try {
            const unfollowUrl = `${this.client.baseUrl}/api/users/${username}/follow`;
            const response = await this.axios.delete(unfollowUrl);

            if (response.status === 200 || response.status === 204) {
                return response.data || { following: false, followersCount: 0 };
            } else {
                console.error(`Unfollow error: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Exception unfollowing:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Gets user's followers list
     *
     * @param {string} username - Username
     * @param {number} page - Page number (starting from 1)
     * @param {number} limit - Items per page
     * @returns {Promise<Object|null>} { users: [], pagination: {} } or null on error
     *
     * Note: Auth not required to view followers
     */
    async getFollowers(username, page = 1, limit = 30) {
        try {
            const followersUrl = `${this.client.baseUrl}/api/users/${username}/followers`;
            const params = { page, limit };
            const response = await this.axios.get(followersUrl, { params });

            if (response.status === 200) {
                const data = response.data;
                // Response: { data: { users: [...], pagination: {...} } }
                if (data.data && data.data.users) {
                    return {
                        users: data.data.users,
                        pagination: data.data.pagination || {}
                    };
                } else if (data.users) {
                    return {
                        users: data.users,
                        pagination: data.pagination || {}
                    };
                }
                return { users: [], pagination: {} };
            } else {
                console.error(`Followers fetch error: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Exception getting followers:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Gets user's following list
     *
     * @param {string} username - Username
     * @param {number} page - Page number (starting from 1)
     * @param {number} limit - Items per page
     * @returns {Promise<Object|null>} { users: [], pagination: {} } or null on error
     *
     * Note: Auth not required to view following
     */
    async getFollowing(username, page = 1, limit = 30) {
        try {
            const followingUrl = `${this.client.baseUrl}/api/users/${username}/following`;
            const params = { page, limit };
            const response = await this.axios.get(followingUrl, { params });

            if (response.status === 200) {
                const data = response.data;
                // Response: { data: { users: [...], pagination: {...} } }
                if (data.data && data.data.users) {
                    return {
                        users: data.data.users,
                        pagination: data.data.pagination || {}
                    };
                } else if (data.users) {
                    return {
                        users: data.users,
                        pagination: data.pagination || {}
                    };
                }
                return { users: [], pagination: {} };
            } else {
                console.error(`Following fetch error: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Exception getting following:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Gets user's clan (emoji from avatar)
     *
     * @param {string} username - Username
     * @returns {Promise<string|null>} Clan emoji or null on error
     */
    async getUserClan(username) {
        const profile = await this.getUserProfile(username);
        if (!profile) {
            return null;
        }
        // Clan is emoji in avatar field
        return profile.avatar || null;
    }

    /**
     * Gets top clans by member count.
     * Returns array (Array), not object with clans field.
     *
     * @returns {Promise<Array|null>} Array of clans [{ avatar, memberCount }, ...] or null on error
     */
    async getTopClans() {
        try {
            const topClansUrl = `${this.client.baseUrl}/api/users/stats/top-clans`;
            const response = await this.axios.get(topClansUrl);

            if (response.status === 200) {
                const data = response.data?.data ?? response.data;
                return data?.clans || [];
            } else {
                console.error(`Top clans fetch error: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Exception getting top clans:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Gets who-to-follow suggestions
     *
     * @returns {Promise<Array|null>} Array of users or null on error
     */
    async getWhoToFollow() {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }

        try {
            const suggestionsUrl = `${this.client.baseUrl}/api/users/suggestions/who-to-follow`;
            const response = await this.axios.get(suggestionsUrl);

            if (response.status === 200) {
                const data = response.data;
                // Response: { users: [...] }
                return data.users || [];
            } else {
                console.error(`Suggestions fetch error: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Exception getting suggestions:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
// ========== USER-FRIENDLY METHODS ==========

    // getMyProfile() is already implemented above — default convenience method

    /**
     * Checks if current user follows the given user
     *
     * @param {string} username - Username to check
     * @returns {Promise<boolean>} True if following, false otherwise or on error
     */
    async isFollowing(username) {
        if (!await this.client.auth.checkAuth()) {
            return false;
        }
        const profile = await this.getUserProfile(username);
        return profile ? (profile.isFollowing === true) : false;
    }
    
    /**
     * Gets own followers count
     *
     * @returns {Promise<number>} Followers count
     */
    async getMyFollowersCount() {
        const profile = await this.getMyProfile();
        return profile ? (profile.followersCount || 0) : 0;
    }
    
    /**
     * Gets own following count
     *
     * @returns {Promise<number>} Following count
     */
    async getMyFollowingCount() {
        const profile = await this.getMyProfile();
        return profile ? (profile.followingCount || 0) : 0;
    }
    
    /**
     * Gets own clan (avatar emoji)
     *
     * @returns {Promise<string|null>} Clan emoji or null
     */
    async getMyClan() {
        const profile = await this.getMyProfile();
        return profile ? (profile.avatar || null) : null;
    }
}
