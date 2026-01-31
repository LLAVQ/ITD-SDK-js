/**
 * Comments module
 */
export class CommentsManager {
    /**
     * Comment management
     *
     * @param {ITDClient} client - Main client
     */
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }
    
    /**
     * Adds comment to post.
     * POST /api/posts/{postId}/comments → { id, content, author, attachments, ... }
     * Supports text, voice (attachmentIds with audio/ogg) and replies (replyTo).
     *
     * @param {string} postId - Post ID
     * @param {string} text - Comment text (empty string for voice)
     * @param {string|null} replyToCommentId - Comment ID to reply to (optional)
     * @param {string[]|null} attachmentIds - Uploaded file IDs (audio/ogg for voice)
     * @returns {Promise<Object|null>} Created comment data or null
     */
    async addComment(postId, text, replyToCommentId = null, attachmentIds = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }
        try {
            const commentUrl = `${this.client.baseUrl}/api/posts/${postId}/comments`;
            const commentData = { content: text ?? '' };
            if (replyToCommentId) commentData.replyTo = replyToCommentId;
            if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
                commentData.attachmentIds = attachmentIds;
            }
            const response = await this.axios.post(commentUrl, commentData);
            
            if (response.status === 200 || response.status === 201) {
                return response.data;
            } else {
                console.error(`Add comment error: ${response.status} - ${JSON.stringify(response.data)}`);
                return null;
            }
        } catch (error) {
            console.error('Exception adding comment:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Adds voice message as comment.
     * Uploads audio/ogg via /api/files/upload and creates comment with attachmentIds.
     *
     * @param {string} postId - Post ID
     * @param {string} audioPath - Path to audio file (audio/ogg)
     * @param {string|null} replyToCommentId - Comment ID to reply to (optional)
     * @returns {Promise<Object|null>} Created comment data or null
     */
    async addVoiceComment(postId, audioPath, replyToCommentId = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }
        const uploaded = await this.client.files.uploadFile(audioPath);
        if (!uploaded) return null;
        return await this.addComment(postId, '', replyToCommentId, [uploaded.id]);
    }

    /**
     * Reply to comment (separate endpoint /api/comments/:id/replies).
     *
     * @param {string} commentId - Comment ID to reply to
     * @param {string} content - Reply text
     * @param {string} replyToUserId - Comment author user ID (required by API)
     * @returns {Promise<Object|null>} Created reply comment data or null on error
     */
    async replyToComment(commentId, content, replyToUserId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }
        if (!replyToUserId) {
            console.error('Error: replyToUserId is required for replying to comment');
            return null;
        }
        try {
            const url = `${this.client.baseUrl}/api/comments/${commentId}/replies`;
            const response = await this.axios.post(url, {
                content,
                replyToUserId,
            });
            if (response.status === 200 || response.status === 201) {
                return response.data;
            }
            console.error(`Reply to comment error: ${response.status} - ${JSON.stringify(response.data)}`);
            return null;
        } catch (error) {
            console.error('Exception replying to comment:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Gets comments for post.
     * API expects sort: "newest" | "oldest" | "popular". SDK accepts "new"/"old"/"popular" and maps to newest/oldest/popular.
     *
     * @param {string} postId - Post ID
     * @param {number} limit - Number of comments (default 20)
     * @param {string} sort - Sort: "popular", "new", "old" (sent to API as popular, newest, oldest)
     * @returns {Promise<Object>} { comments: [], total, hasMore, nextCursor } or { comments: [] } on error
     */
    async getComments(postId, limit = 20, sort = 'popular') {
        const commentsUrl = `${this.client.baseUrl}/api/posts/${postId}/comments`;
        const reqLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
        const sortMap = { new: 'newest', old: 'oldest', popular: 'popular', newest: 'newest', oldest: 'oldest' };
        const reqSort = sortMap[sort] || 'popular';

        const parseResponse = (response) => {
            const data = response.data?.data ?? response.data;
            if (data?.comments) {
                return {
                    comments: data.comments,
                    total: data.total ?? data.comments.length,
                    hasMore: data.hasMore ?? false,
                    nextCursor: data.nextCursor ?? null
                };
            }
            if (Array.isArray(data)) {
                return {
                    comments: data,
                    total: data.length,
                    hasMore: false,
                    nextCursor: null
                };
            }
            return { comments: [], total: 0, hasMore: false, nextCursor: null };
        };

        try {
            const response = await this.axios.get(commentsUrl, {
                params: { limit: reqLimit, sort: reqSort },
            });

            if (response.status === 200) {
                return parseResponse(response);
            }
            if (response.status === 422) {
                const fallback = await this.axios.get(commentsUrl, { params: { limit: reqLimit, sort: 'popular' } });
                if (fallback.status === 200) {
                    return parseResponse(fallback);
                }
                console.warn('⚠️  GET /api/posts/:postId/comments: 422. API expects sort: newest | oldest | popular.');
            }
            console.error(`Get comments error: ${response.status}`);
            return { comments: [], total: 0, hasMore: false, nextCursor: null };
        } catch (error) {
            if (error.response?.status === 422) {
                try {
                    const retry = await this.axios.get(commentsUrl, { params: { limit: 20, sort: 'popular' } });
                    if (retry.status === 200) {
                        return parseResponse(retry);
                    }
                } catch (_) {}
            }
            console.error('Exception getting comments:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return { comments: [], total: 0, hasMore: false, nextCursor: null };
        }
    }
    
    /**
     * Likes comment
     *
     * @param {string} commentId - Comment ID
     * @returns {Promise<Object|null>} { liked: true, likesCount: number } or null on error
     */
    async likeComment(commentId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }
        
        try {
            const likeUrl = `${this.client.baseUrl}/api/comments/${commentId}/like`;
            const response = await this.axios.post(likeUrl);
            
            if (response.status === 200 || response.status === 201) {
                return response.data; // { liked: true, likesCount: number }
            } else {
                console.error(`Like comment error: ${response.status} - ${JSON.stringify(response.data)}`);
                return null;
            }
        } catch (error) {
            console.error('Exception liking comment:', error.message);
            if (error.response) {
                console.error('Response:', error.response.status, error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Unlikes comment
     *
     * @param {string} commentId - Comment ID
     * @returns {Promise<Object|null>} { liked: false, likesCount: number } or null on error
     */
    async unlikeComment(commentId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }
        
        try {
            const unlikeUrl = `${this.client.baseUrl}/api/comments/${commentId}/like`;
            const response = await this.axios.delete(unlikeUrl);
            
            if (response.status === 200 || response.status === 204) {
                return response.data || { liked: false, likesCount: 0 };
            } else {
                console.error(`Unlike comment error: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Exception unliking comment:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Deletes comment
     *
     * @param {number} commentId - Comment ID
     * @returns {Promise<boolean>} True on success
     */
    async deleteComment(commentId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return false;
        }
        
        try {
            const deleteUrl = `${this.client.baseUrl}/api/comments/${commentId}`;
            const response = await this.axios.delete(deleteUrl);
            
            if (response.status === 200 || response.status === 204) {
                return true;
            } else {
                console.error(`Delete comment error: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error('Exception deleting comment:', error.message);
            return false;
        }
    }

    /**
     * Restores deleted comment. POST /api/comments/{id}/restore
     *
     * @param {string} commentId - Comment ID
     * @returns {Promise<boolean>} True on success
     */
    async restoreComment(commentId) {
        if (!await this.client.auth.checkAuth()) return false;
        try {
            const url = `${this.client.baseUrl}/api/comments/${commentId}/restore`;
            const response = await this.axios.post(url);
            return response.status === 200 || response.status === 201 || response.status === 204;
        } catch (error) {
            console.error('Exception restoring comment:', error.message);
            return false;
        }
    }
    
// ========== USER-FRIENDLY METHODS ==========

    /**
     * Gets post comment count
     *
     * @param {string} postId - Post ID
     * @returns {Promise<number>} Comment count
     */
    async getPostCommentsCount(postId) {
        const result = await this.getComments(postId, 1);
        if (result && result.total !== undefined) {
            return result.total;
        }
        // Fallback: get via post
        const post = await this.client.posts.getPost(postId);
        return post ? (post.commentsCount || 0) : 0;
    }
    
    /**
     * Gets top comment for post (most likes)
     *
     * @param {string} postId - Post ID
     * @returns {Promise<Object|null>} Top comment or null
     */
    async getTopComment(postId) {
        const result = await this.getComments(postId, 20, 'popular');
        if (result && result.comments && result.comments.length > 0) {
            // Sort by likes and return first
            const sorted = [...result.comments].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
            return sorted[0];
        }
        return null;
    }
    
    /**
     * Checks if post has comments
     *
     * @param {string} postId - Post ID
     * @returns {Promise<boolean>} True if has comments
     */
    async hasComments(postId) {
        const count = await this.getPostCommentsCount(postId);
        return count > 0;
    }
}
