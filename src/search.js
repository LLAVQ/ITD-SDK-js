/**
 * Search manager
 */
export class SearchManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Searches users and hashtags
     *
     * @param {string} query - Search query
     * @param {number} userLimit - Max number of users (default 5)
     * @param {number} hashtagLimit - Max number of hashtags (default 5)
     * @returns {Promise<Object|null>} { users: [], hashtags: [] } or null on error
     */
    async search(query, userLimit = 5, hashtagLimit = 5) {
        try {
            const searchUrl = `${this.client.baseUrl}/api/search/`;
            const params = {
                q: query,
                userLimit: userLimit,
                hashtagLimit: hashtagLimit,
            };

            const response = await this.axios.get(searchUrl, { params });

            if (response.status === 200) {
                const data = response.data;

                if (data.data) {
                    return {
                        users: data.data.users || [],
                        hashtags: data.data.hashtags || []
                    };
                }

                if (data.users || data.hashtags) {
                    return {
                        users: data.users || [],
                        hashtags: data.hashtags || []
                    };
                }

                return { users: [], hashtags: [] };
            } else {
                console.error(`Search error: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Exception during search:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Searches users
     *
     * @param {string} query - Search query
     * @param {number} limit - Max number of users (default 5)
     * @returns {Promise<Array|null>} Array of users or null on error
     */
    async searchUsers(query, limit = 5) {
        const result = await this.search(query, limit, 0);
        return result ? result.users : null;
    }

    /**
     * Searches hashtags
     *
     * @param {string} query - Search query
     * @param {number} limit - Max number of hashtags (default 5)
     * @returns {Promise<Array|null>} Array of hashtags or null on error
     */
    async searchHashtags(query, limit = 5) {
        const result = await this.search(query, 0, limit);
        return result ? result.hashtags : null;
    }
}
