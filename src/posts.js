/**
 * Posts module
 */
import fs from 'fs';
import FormData from 'form-data';

export class PostsManager {
    /**
     * Post management
     *
     * @param {ITDClient} client - Main client
     */
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }
    
    /**
     * Creates a new post.
     * Returns null on any error (network, 5xx, 429, upload failure).
     * Timeout for upload and create — client.uploadTimeout (default 120 s).
     *
     * @param {string} text - Post text
     * @param {string|null} imagePath - Path to image (optional)
     * @returns {Promise<Object|null>} Created post data or null on error
     */
    async createPost(text, imagePath = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }
        
        try {
            // API URL
            const postUrl = `${this.client.baseUrl}/api/posts`;
            
            // Request payload
            let postData = {
                content: text,
            };
            
            // If image provided
            if (imagePath) {
                // Upload file via /api/files/upload
                const uploadedFile = await this.client.files.uploadFile(imagePath);
                if (!uploadedFile) {
                    console.error('Error: failed to upload image');
                    return null;
                }
                
                // Create post with uploaded file ID (API uses attachmentIds)
                postData.attachmentIds = [uploadedFile.id];
            }
            
            // Create post (with or without image); extended timeout
            const response = await this.axios.post(postUrl, postData, {
                timeout: this.client.uploadTimeout ?? 120000,
            });

            if (response.status === 200 || response.status === 201) {
                return response.data;
            } else {
                console.error(`Create post error: ${response.status} - ${JSON.stringify(response.data)}`);
                return null;
            }
        } catch (error) {
            console.error('Exception creating post:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Creates post on another user's wall (wall post).
     * Returns null on any error. Timeout — client.uploadTimeout (default 120 s).
     *
     * @param {string} username - Username whose wall to post on
     * @param {string} text - Post text
     * @param {string|null} imagePath - Path to image (optional)
     * @returns {Promise<Object|null>} Created post data or null on error
     */
    async createWallPost(username, text, imagePath = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }
        
        try {
            // Get user profile for ID
            const profile = await this.client.users.getUserProfile(username);
            if (!profile || !profile.id) {
                console.error(`Error: failed to get user profile ${username}`);
                return null;
            }
            
            const wallRecipientId = profile.id;
            
            // API URL
            const postUrl = `${this.client.baseUrl}/api/posts`;
            
            let postData = {
                content: text,
                wallRecipientId: wallRecipientId,
            };
            
            // If image provided
            if (imagePath) {
                // Upload file via /api/files/upload
                const uploadedFile = await this.client.files.uploadFile(imagePath);
                if (!uploadedFile) {
                    console.error('Error: failed to upload image');
                    return null;
                }
                
                // Create post with uploaded file ID (API uses attachmentIds)
                postData.attachmentIds = [uploadedFile.id];
            }
            
            // Create wall post; extended timeout
            const response = await this.axios.post(postUrl, postData, {
                timeout: this.client.uploadTimeout ?? 120000,
            });

            if (response.status === 200 || response.status === 201) {
                return response.data;
            } else {
                console.error(`Create wall post error: ${response.status} - ${JSON.stringify(response.data)}`);
                return null;
            }
        } catch (error) {
            console.error('Exception creating wall post:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Gets user posts or feed
     *
     * @param {string|null} username - Username (null = feed/own posts)
     * @param {number} limit - Number of posts
     * @param {string} sort - Sort: "new", "old", "popular", "trending", "recent"
     * @param {string|null} cursor - Pagination cursor (from pagination.nextCursor)
     * @param {string|null} tab - Feed type: "popular", "following", null
     * @param {string|null} type - Alternative: "trending" (same as tab=popular)
     * @param {string|null} filter - Alternative: "trending" (same as tab=popular)
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getPosts(username = null, limit = 20, sort = 'new', cursor = null, tab = null, type = null, filter = null) {
        // Feed requires auth when username not set and tab/type/filter set
        if (!username && (tab || type || filter) && !await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in to get feed');
            return { posts: [], pagination: {} };
        }
        
        try {
            let postsUrl;
            const params = {
                limit: limit,
            };
            
            if (username) {
                // User posts (public, auth not required)
                postsUrl = `${this.client.baseUrl}/api/posts/user/${username}`;
                params.sort = sort;
            } else {
                // Feed (popular, following, or default)
                postsUrl = `${this.client.baseUrl}/api/posts`;
                
                if (tab) {
                    params.tab = tab;
                } else if (type) {
                    params.type = type;
                } else if (filter) {
                    params.filter = filter;
                } else {
                    params.sort = sort;
                }
            }
            
            if (cursor) {
                params.cursor = cursor;
            }
            
            const response = await this.axios.get(postsUrl, { params });
            
            if (response.status === 200) {
                const data = response.data;
                
                // Response: { data: { posts: [...], pagination: {...} } }
                if (data.data && data.data.posts) {
                    return {
                        posts: data.data.posts,
                        pagination: data.data.pagination || {}
                    };
                }
                
                // Fallback for other response shapes
                if (Array.isArray(data)) {
                    return { posts: data, pagination: {} };
                } else if (data.posts && Array.isArray(data.posts)) {
                    return { posts: data.posts, pagination: data.pagination || {} };
                }
                
                return { posts: [], pagination: {} };
            } else {
                console.error(`Get posts error: ${response.status}`);
                return { posts: [], pagination: {} };
            }
        } catch (error) {
            console.error('Exception getting posts:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return { posts: [], pagination: {} };
        }
    }
    
    /**
     * Gets user's liked posts.
     * GET /api/posts/user/{username}/liked → { data: { posts: [], pagination: {} } }
     *
     * @param {string} username - Username
     * @param {number} limit - Number of posts (default 20)
     * @param {string|null} cursor - Pagination cursor (pagination.nextCursor)
     * @returns {Promise<Object>} { posts: [], pagination: { limit, nextCursor, hasMore } }
     */
    async getLikedPosts(username, limit = 20, cursor = null) {
        try {
            const url = `${this.client.baseUrl}/api/posts/user/${encodeURIComponent(username)}/liked`;
            const params = { limit };
            if (cursor) params.cursor = cursor;

            const response = await this.axios.get(url, { params });

            if (response.status === 200) {
                const data = response.data;
                const inner = data?.data ?? data;
                return {
                    posts: inner?.posts || [],
                    pagination: inner?.pagination || {}
                };
            }
            return { posts: [], pagination: {} };
        } catch (error) {
            console.error('Get liked posts error:', error.message);
            return { posts: [], pagination: {} };
        }
    }

    /**
     * Gets popular posts (popular feed)
     *
     * @param {number} limit - Number of posts
     * @param {string|null} cursor - Pagination cursor
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getFeedPopular(limit = 20, cursor = null) {
        return await this.getPosts(null, limit, 'new', cursor, 'popular');
    }
    
    /**
     * Gets following feed posts
     *
     * @param {number} limit - Number of posts
     * @param {string|null} cursor - Pagination cursor
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getFeedFollowing(limit = 20, cursor = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in to get following feed');
            return { posts: [], pagination: {} };
        }
        return await this.getPosts(null, limit, 'new', cursor, 'following');
    }
    
    
    /**
     * Marks post as viewed. POST /api/posts/{id}/view
     *
     * @param {string} postId - Post ID
     * @returns {Promise<boolean>} True on success
     */
    async viewPost(postId) {
        if (!await this.client.auth.checkAuth()) return false;
        try {
            const url = `${this.client.baseUrl}/api/posts/${postId}/view`;
            const response = await this.axios.post(url);
            return response.status === 200 || response.status === 201 || response.status === 204;
        } catch (error) {
            console.error('Exception marking view:', error.message);
            return false;
        }
    }

    /**
     * Gets posts on user's wall. GET /api/posts/user/{username}/wall
     *
     * @param {string} username - Username
     * @param {number} limit - Count
     * @param {string|null} cursor - Pagination cursor
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getWallByUser(username, limit = 20, cursor = null) {
        try {
            const url = `${this.client.baseUrl}/api/posts/user/${encodeURIComponent(username)}/wall`;
            const params = { limit };
            if (cursor) params.cursor = cursor;
            const response = await this.axios.get(url, { params });
            if (response.status === 200) {
                const data = response.data?.data ?? response.data;
                return {
                    posts: data?.posts || [],
                    pagination: data?.pagination || {}
                };
            }
            return { posts: [], pagination: {} };
        } catch (error) {
            console.error('Get wall posts error:', error.message);
            return { posts: [], pagination: {} };
        }
    }

    /**
     * Gets single post by ID
     *
     * @param {string} postId - Post ID
     * @returns {Promise<Object|null>} Post data or null
     *
     * Note: Auth not required for public posts
     */
    async getPost(postId) {
        try {
            // API URL
            const postUrl = `${this.client.baseUrl}/api/posts/${postId}`;
            const response = await this.axios.get(postUrl);
            
            if (response.status === 200) {
                // Response: { data: { id, content, comments: [...], ... } }
                const post = response.data.data || response.data;
                return post;
            } else {
                console.error(`Get post error: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Exception getting post:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Edits existing post
     *
     * @param {string} postId - Post ID
     * @param {string} newContent - New post text
     * @returns {Promise<Object|null>} Updated post data or null
     */
    async editPost(postId, newContent) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }
        
        try {
            // API URL: PUT /api/posts/{id}
            const editUrl = `${this.client.baseUrl}/api/posts/${postId}`;
            
            const postData = {
                content: newContent,
            };
            
            const response = await this.axios.put(editUrl, postData);
            
            if (response.status === 200) {
                return response.data?.data ?? response.data;
            } else {
                console.error(`Edit post error: ${response.status} - ${JSON.stringify(response.data)}`);
                return null;
            }
        } catch (error) {
            console.error('Exception editing post:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Deletes post
     *
     * @param {string} postId - Post ID
     * @returns {Promise<boolean>} True on success
     */
    async deletePost(postId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return false;
        }
        
        try {
            // API URL
            const deleteUrl = `${this.client.baseUrl}/api/posts/${postId}`;
            const response = await this.axios.delete(deleteUrl);
            
            if (response.status === 200 || response.status === 204) {
                return true;
            }
            return false;
        } catch (error) {
            console.error('Exception deleting post:', error.message);
            return false;
        }
    }

    /**
     * Restores deleted post.
     * POST /api/posts/{id}/restore — empty response on success
     *
     * @param {string} postId - Post ID
     * @returns {Promise<boolean>} True on success
     */
    async restorePost(postId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return false;
        }
        try {
            const url = `${this.client.baseUrl}/api/posts/${postId}/restore`;
            const response = await this.axios.post(url);
            return response.status === 200 || response.status === 201 || response.status === 204;
        } catch (error) {
            console.error('Exception restoring post:', error.message);
            return false;
        }
    }
    
    /**
     * Pins post.
     * POST /api/posts/{id}/pin → { success: true, pinnedPostId }
     *
     * @param {string} postId - Post ID
     * @returns {Promise<boolean>} True on success
     */
    async pinPost(postId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return false;
        }
        try {
            const pinUrl = `${this.client.baseUrl}/api/posts/${postId}/pin`;
            const response = await this.axios.post(pinUrl);
            if (response.status === 200 || response.status === 201) {
                return response.data?.success !== false;
            }
            return false;
        } catch (error) {
            console.error('Exception pinning post:', error.message);
            return false;
        }
    }

    /**
     * Unpins post.
     * DELETE /api/posts/{id}/pin → { success: true, pinnedPostId: null }
     *
     * @param {string} postId - Post ID
     * @returns {Promise<boolean>} True on success
     */
    async unpinPost(postId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return false;
        }
        try {
            const pinUrl = `${this.client.baseUrl}/api/posts/${postId}/pin`;
            const response = await this.axios.delete(pinUrl);
            if (response.status === 200 || response.status === 204) {
                return response.data?.success !== false;
            }
            return false;
        } catch (error) {
            console.error('Exception unpinning post:', error.message);
            return false;
        }
    }
    
    /**
     * Reposts a post
     *
     * @param {string} postId - Post ID to repost
     * @param {string|null} comment - Repost comment (optional)
     * @returns {Promise<Object|null>} Created repost data or null on error
     */
    async repost(postId, comment = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }
        
        try {
            const repostUrl = `${this.client.baseUrl}/api/posts/${postId}/repost`;
            
            const repostData = {};
            if (comment !== null && comment !== undefined && comment !== '') {
                repostData.content = comment;
            }
            
            const response = await this.axios.post(repostUrl, repostData);
            
            if (response.status === 200 || response.status === 201) {
                return response.data?.data ?? response.data;
            } else {
                console.error(`Repost error: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Exception reposting:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
// ========== USER-FRIENDLY METHODS ==========

    /**
     * Gets trending posts
     *
     * @param {number} limit - Number of posts (default 20)
     * @param {string|null} cursor - Pagination cursor
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getTrendingPosts(limit = 20, cursor = null) {
        return await this.getPosts(null, limit, 'trending', cursor);
    }
    
    /**
     * Gets recent posts
     *
     * @param {number} limit - Number of posts (default 20)
     * @param {string|null} cursor - Pagination cursor
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getRecentPosts(limit = 20, cursor = null) {
        return await this.getPosts(null, limit, 'recent', cursor);
    }
    
    /**
     * Gets own posts
     *
     * @param {number} limit - Number of posts (default 20)
     * @param {string} sort - Sort: 'new', 'old', 'popular' (default 'new')
     * @param {string|null} cursor - Pagination cursor
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getMyPosts(limit = 20, sort = 'new', cursor = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in to get own posts');
            return { posts: [], pagination: {} };
        }
        // Get own username from profile
        const profile = await this.client.users.getMyProfile();
        if (!profile || !profile.username) {
            console.error('Error: failed to get own username');
            return { posts: [], pagination: {} };
        }
        return await this.getPosts(profile.username, limit, sort, cursor);
    }
    
    /**
     * Gets user's latest post
     *
     * @param {string} username - Username
     * @returns {Promise<Object|null>} Latest post or null
     */
    async getUserLatestPost(username) {
        const result = await this.getPosts(username, 1, 'new');
        if (result && result.posts && result.posts.length > 0) {
            return result.posts[0];
        }
        return null;
    }
    
    /**
     * Gets post likes count
     *
     * @param {string} postId - Post ID
     * @returns {Promise<number>} Likes count
     */
    async getPostLikesCount(postId) {
        const post = await this.getPost(postId);
        return post ? (post.likesCount || 0) : 0;
    }
    
    /**
     * Gets post views count
     *
     * @param {string} postId - Post ID
     * @returns {Promise<number>} Views count
     */
    async getPostViewsCount(postId) {
        const post = await this.getPost(postId);
        return post ? (post.viewsCount || 0) : 0;
    }
    
    /**
     * Gets post comments count
     *
     * @param {string} postId - Post ID
     * @returns {Promise<number>} Comments count
     */
    async getPostCommentsCount(postId) {
        const post = await this.getPost(postId);
        return post ? (post.commentsCount || 0) : 0;
    }
    
    /**
     * Gets post statistics
     *
     * @param {string} postId - Post ID
     * @returns {Promise<Object|null>} { likes, views, comments, reposts } or null
     */
    async getPostStats(postId) {
        const post = await this.getPost(postId);
        if (!post) return null;
        return {
            likes: post.likesCount || 0,
            views: post.viewsCount || 0,
            comments: post.commentsCount || 0,
            reposts: post.repostsCount || 0
        };
    }
}
