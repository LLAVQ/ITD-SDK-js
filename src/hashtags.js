/**
 * Hashtags module
 */
export class HashtagsManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Gets trending hashtags
     *
     * @param {number} limit - Number of hashtags (default 10)
     * @returns {Promise<Object|null>} { hashtags: [] } or null on error
     */
    async getTrending(limit = 10) {
        try {
            const trendingUrl = `${this.client.baseUrl}/api/hashtags/trending`;
            const params = { limit };
            const response = await this.axios.get(trendingUrl, { params });

            if (response.status === 200) {
                const data = response.data;
                if (data.data && data.data.hashtags) {
                    return {
                        hashtags: data.data.hashtags
                    };
                } else if (data.hashtags) {
                    return {
                        hashtags: data.hashtags
                    };
                }
                return { hashtags: [] };
            } else {
                console.error(`Error getting trending hashtags: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Exception getting trending hashtags:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Gets posts by hashtag
     *
     * @param {string} hashtagName - Hashtag name (without #)
     * @param {number} limit - Number of posts (default 20)
     * @param {string|null} cursor - Pagination cursor
     * @returns {Promise<Object|null>} { posts: [], hashtag: {}, pagination: {} } or null on error
     */
    async getPostsByHashtag(hashtagName, limit = 20, cursor = null) {
        try {
            const cleanHashtag = hashtagName.replace(/^#/, '');
            const hashtagUrl = `${this.client.baseUrl}/api/hashtags/${encodeURIComponent(cleanHashtag)}/posts`;

            const params = { limit };
            if (cursor) {
                params.cursor = cursor;
            }

            const response = await this.axios.get(hashtagUrl, { params });

            if (response.status === 200) {
                const data = response.data;

                if (data.data) {
                    return {
                        hashtag: data.data.hashtag || null,
                        posts: data.data.posts || [],
                        pagination: data.data.pagination || {}
                    };
                }

                return {
                    hashtag: null,
                    posts: data.posts || [],
                    pagination: data.pagination || {}
                };
            } else {
                console.error(`Error getting posts by hashtag: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Exception getting posts by hashtag:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
}
