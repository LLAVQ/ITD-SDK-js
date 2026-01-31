/**
 * Main client for unofficial итд.com API
 */
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { AuthManager } from './auth.js';
import { PostsManager } from './posts.js';
import { CommentsManager } from './comments.js';
import { UsersManager } from './users.js';
import { NotificationsManager } from './notifications.js';
import { HashtagsManager } from './hashtags.js';
import { FilesManager } from './files.js';
import { ReportsManager } from './reports.js';
import { SearchManager } from './search.js';
import { VerificationManager } from './verification.js';

dotenv.config();

export class ITDClient {
    /**
     * Client initialization
     *
     * @param {string|Object} baseUrlOrOptions - Base URL or options object
     * @param {string} [userAgent] - User-Agent (if first arg is baseUrl)
     *
     * Options (if first arg is object):
     * @param {string} [options.baseUrl] - Base URL
     * @param {string} [options.userAgent] - User-Agent
     * @param {string} [options.projectRoot] - Project root (default process.cwd()); .env and .cookies are looked up here
     * @param {string} [options.envPath] - Full path to .env (overrides projectRoot for .env)
     * @param {string} [options.cookiesPath] - Full path to .cookies (overrides projectRoot for .cookies)
     * @param {number} [options.requestTimeout] - Request timeout in ms (default 60000)
     * @param {number} [options.uploadTimeout] - File upload and post creation timeout in ms (default 120000)
     * @param {string} [options.accessToken] - JWT token (if not set — from .env ITD_ACCESS_TOKEN)
     */
    constructor(baseUrlOrOptions = null, userAgent = null) {
        let baseUrl, projectRoot, envPath, cookiesPath, requestTimeout, uploadTimeout, accessToken;

        if (baseUrlOrOptions && typeof baseUrlOrOptions === 'object' && !(baseUrlOrOptions instanceof URL)) {
            const opts = baseUrlOrOptions;
            baseUrl = opts.baseUrl ?? process.env.ITD_BASE_URL ?? 'https://xn--d1ah4a.com';
            userAgent = opts.userAgent ?? process.env.ITD_USER_AGENT ?? null;
            projectRoot = opts.projectRoot ?? process.cwd();
            envPath = opts.envPath ?? path.join(projectRoot, '.env');
            cookiesPath = opts.cookiesPath ?? path.join(projectRoot, '.cookies');
            requestTimeout = opts.requestTimeout ?? 60000;
            uploadTimeout = opts.uploadTimeout ?? 120000;
            accessToken = opts.accessToken ?? process.env.ITD_ACCESS_TOKEN ?? null;
        } else {
            projectRoot = process.cwd();
            baseUrl = baseUrlOrOptions || process.env.ITD_BASE_URL || 'https://xn--d1ah4a.com';
            envPath = path.join(projectRoot, '.env');
            cookiesPath = path.join(projectRoot, '.cookies');
            requestTimeout = 60000;
            uploadTimeout = 120000;
            accessToken = process.env.ITD_ACCESS_TOKEN ?? null;
        }

        // Real domain (IDN: итд.com = xn--d1ah4a.com)
        this.baseUrl = baseUrl;
        this.userAgent = userAgent || process.env.ITD_USER_AGENT ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        /** Paths to .env and .cookies (default project root) */
        this.envPath = envPath;
        this.cookiesPath = cookiesPath;

        /** Normal request timeout (ms). uploadTimeout is used for upload and post creation. */
        this.requestTimeout = requestTimeout;
        /** File upload and post creation timeout (ms), to avoid hanging on 504/slow network. */
        this.uploadTimeout = uploadTimeout;

        /** @type {string|null} */
        this.accessToken = accessToken || null;

        // Proxy (e.g. ITD_PROXY=http://127.0.0.1:10808 or HTTPS_PROXY/HTTP_PROXY)
        this.proxyUrl = process.env.ITD_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || null;
        
        // axios does not store cookies by default; use CookieJar for session.
        this.cookieJar = new CookieJar();

        // Cookies loaded from .cookies file (sensitive — do not commit)
        this._loadCookiesFromFile();

        // Create axios instance with cookie jar
        const axiosConfig = {
            baseURL: this.baseUrl,
            timeout: requestTimeout,
            withCredentials: true,
            jar: this.cookieJar,
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                'Content-Type': 'application/json',
                // Optional extra headers:
                // 'Referer': this.baseUrl,
                // 'Origin': this.baseUrl,
            }
        };

        if (this.proxyUrl) {
            // Use axios built-in proxy (HTTP CONNECT, not SOCKS).
            const parsed = new URL(this.proxyUrl);
            axiosConfig.proxy = {
                protocol: parsed.protocol.replace(':', ''),
                host: parsed.hostname,
                port: parsed.port ? Number(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80),
            };
        }

        this.axios = wrapper(axios.create(axiosConfig));

        // Debounce refresh (avoid 10 parallel 401s triggering 10 refreshes)
        /** @type {Promise<string|null> | null} */
        this._refreshPromise = null;

        // Auto-add Authorization when accessToken is set
        this.axios.interceptors.request.use((config) => {
            if (this.accessToken && !config.headers?.Authorization) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${this.accessToken}`;
            }
            return config;
        });

        // Auto-refresh token on 401 and retry request
        this.axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const status = error?.response?.status;
                const originalRequest = error?.config;

                if (!originalRequest) {
                if (!originalRequest) throw error;

                // Only refresh on 401, not on 429 etc.
                if (status !== 401) {
                    throw error;
                }

                // Avoid retry loop
                if (originalRequest.__itdRetried) {
                    throw error;
                }

                // Don't refresh when the request is refresh itself
                const url = String(originalRequest.url || '');
                if (url.includes('/api/v1/auth/refresh')) {
                    throw error;
                }

                originalRequest.__itdRetried = true;

                // Try to refresh token (requires refresh_token in cookie jar)
                if (!this._refreshPromise) {
                    this._refreshPromise = this.refreshAccessToken().finally(() => {
                        this._refreshPromise = null;
                    });
                }

                const newToken = await this._refreshPromise;

                if (!newToken) {
                    // Refresh failed — rethrow 401
                    throw error;
                }

                // Retry original request with new token
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                delete originalRequest.__itdRetried;
                const retryResponse = await this.axios.request(originalRequest);
                return retryResponse;
            }
        );
        
        // Initialize managers
        this.auth = new AuthManager(this);
        this.posts = new PostsManager(this);
        this.comments = new CommentsManager(this);
        this.users = new UsersManager(this);
        this.notifications = new NotificationsManager(this);
        this.hashtags = new HashtagsManager(this);
        this.files = new FilesManager(this);
        this.reports = new ReportsManager(this);
        this.searchManager = new SearchManager(this);
        this.verification = new VerificationManager(this);
    }

    /**
     * Set accessToken (JWT) for Authorization header
     * @param {string|null} token
     */
    setAccessToken(token) {
        this.accessToken = token || null;
    }

    /**
     * Ensure accessToken exists. If not but refresh_token in cookies — calls refresh.
     * For ".cookies only": await client.ensureAuthenticated() before first request.
     * @returns {Promise<boolean>} true if token exists or was obtained, false otherwise
     */
    async ensureAuthenticated() {
        if (this.accessToken) return true;
        if (!this.hasRefreshToken()) return false;
        const token = await this.refreshAccessToken();
        return !!token;
    }

    /**
     * Custom GET request (baseURL already set)
     * @param {string} path - Path e.g. /api/users/me
     * @param {Object} [config] - Axios config
     */
    get(path, config = {}) {
        return this.axios.get(path, config);
    }

    /**
     * Custom POST request
     * @param {string} path - Path e.g. /api/posts
     * @param {Object} [data] - Request body (JSON)
     * @param {Object} [config] - Axios config
     */
    post(path, data = {}, config = {}) {
        return this.axios.post(path, data, config);
    }

    /**
     * Custom PUT request
     * @param {string} path - Path
     * @param {Object} [data] - Request body
     * @param {Object} [config] - Axios config
     */
    put(path, data = {}, config = {}) {
        return this.axios.put(path, data, config);
    }

    /**
     * Custom PATCH request
     * @param {string} path - Path
     * @param {Object} [data] - Request body
     * @param {Object} [config] - Axios config
     */
    patch(path, data = {}, config = {}) {
        return this.axios.patch(path, data, config);
    }

    /**
     * Custom DELETE request
     * @param {string} path - Path
     * @param {Object} [config] - Axios config
     */
    delete(path, config = {}) {
        return this.axios.delete(path, config);
    }
    
    /**
     * Loads cookies from .cookies file
     * @private
     */
    _loadCookiesFromFile() {
        try {
            if (!fs.existsSync(this.cookiesPath)) {
                // File missing — skip
                return;
            }
            
            const cookieHeader = fs.readFileSync(this.cookiesPath, 'utf8').trim();
            if (!cookieHeader) {
                return;
            }
            
            // Parse cookies
            const parts = cookieHeader.split(';').map((p) => p.trim()).filter(Boolean);
            const domain = new URL(this.baseUrl).hostname;
            
            for (const part of parts) {
                // part is "name=value"
                const [name, ...valueParts] = part.split('=');
                if (name && valueParts.length > 0) {
                    const value = valueParts.join('='); 
                    // Set cookie for tough-cookie
                    const cookieString = `${name}=${value}; Domain=${domain}; Path=/`;
                    this.cookieJar.setCookieSync(cookieString, this.baseUrl);
                }
            }
        } catch (e) {
            console.warn('⚠️  Failed to load cookies from .cookies:', e?.message || e);
        }
    }
    

    /**
     * Refresh accessToken via refresh endpoint.
     * Works when cookie jar has refresh-cookie from site.
     * @returns {Promise<string|null>} accessToken or null
     */
    async refreshAccessToken() {
        return await this.auth.refreshAccessToken();
    }
    
    /**
     * Checks for refresh_token in cookies
     *
     * @returns {boolean} True if refresh_token is available for token refresh
     */
    hasRefreshToken() {
        return this.auth.hasRefreshToken();
    }
    
    /**
     * Validates token and refreshes if needed.
     * Call before multiple requests with long gaps.
     *
     * @returns {Promise<boolean>} True if token valid or successfully refreshed
     */
    async validateAndRefreshToken() {
        return await this.auth.validateAndRefreshToken();
    }
    
    /**
     * Logout
     *
     * @returns {Promise<boolean>} True on success
     */
    async logout() {
        return await this.auth.logout();
    }

    /**
     * Change password. POST /api/v1/auth/change-password. Requires cookies (refresh_token).
     *
     * @param {string} oldPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<Object|null>} API response or null
     */
    async changePassword(oldPassword, newPassword) {
        return await this.auth.changePassword(oldPassword, newPassword);
    }
    
    /**
     * Creates post     * 
     * @param {string} text - Post text
     * @param {string|null} imagePath - Path to image (optional)
     * @returns {Promise<Object|null>} Post data or null
     */
    async createPost(text, imagePath = null) {
        return await this.posts.createPost(text, imagePath);
    }
    
    /**
     * Creates post on another user's wall (wall post)
     * 
     * @param {string} username - Username     * @param {string} text - Post text
     * @param {string|null} imagePath - Path to image (optional)
     * @returns {Promise<Object|null>} Created post data or null
     */
    async createWallPost(username, text, imagePath = null) {
        return await this.posts.createWallPost(username, text, imagePath);
    }
    
    /**
     * Edits post     * 
     * @param {string} postId - Post ID
     * @param {string} newContent - New post text
     * @returns {Promise<Object|null>} Updated post data or null
     */
    async editPost(postId, newContent) {
        return await this.posts.editPost(postId, newContent);
    }
    
    /**
     * Gets user posts or feed
     * 
     * @param {string|null} username - Username (null = feed/own posts)
     * @param {number} limit - Number of posts
     * @param {string} sort - Sort: "newest", "oldest", "popular"
     * @param {string|null} cursor - Pagination cursor
     * @param {string|null} tab - Feed type: "popular", "following", null (default feed)
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getPosts(username = null, limit = 20, sort = 'new', cursor = null, tab = null) {
        return await this.posts.getPosts(username, limit, sort, cursor, tab);
    }
    
    /**
     * Gets popular posts (popular feed)
     * 
     * @param {number} limit - Number of posts
     * @param {string|null} cursor - Pagination cursor
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getFeedPopular(limit = 20, cursor = null) {
        return await this.posts.getFeedPopular(limit, cursor);
    }
    
    /**
     * Gets following feed posts
     * 
     * @param {number} limit - Number of posts
     * @param {string|null} cursor - Pagination cursor
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getFeedFollowing(limit = 20, cursor = null) {
        return await this.posts.getFeedFollowing(limit, cursor);
    }

    /**
     * Gets user's liked posts.
     * GET /api/posts/user/{username}/liked → { posts: [], pagination: {} }
     *
     * @param {string} username - Username
     * @param {number} limit - Number of posts
     * @param {string|null} cursor - Pagination cursor
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getLikedPosts(username, limit = 20, cursor = null) {
        return await this.posts.getLikedPosts(username, limit, cursor);
    }
    
    /**
     * Gets posts list (array only)
     * 
     * @param {string|null} username - Username
     * @param {number} limit - Number of posts
     * @returns {Promise<Array>} Posts array
     */
    async getPostsList(username = null, limit = 20) {
        const result = await this.posts.getPosts(username, limit, 'new', null);
        return result.posts;
    }
    
    /**
     * Gets single post by ID
     * 
     * @param {string} postId - Post ID
     * @returns {Promise<Object|null>} Post data or null
     */
    async getPost(postId) {
        return await this.posts.getPost(postId);
    }

    /**
     * Marks post as viewed. POST /api/posts/{id}/view
     *
     * @param {string} postId - Post ID
     * @returns {Promise<boolean>} True on success
     */
    async viewPost(postId) {
        return await this.posts.viewPost(postId);
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
        return await this.posts.getWallByUser(username, limit, cursor);
    }
    
    /**
     * Deletes post     * 
     * @param {string} postId - Post ID
     * @returns {Promise<boolean>} True on success
     */
    async deletePost(postId) {
        return await this.posts.deletePost(postId);
    }

    /**
     * Restores deleted post. POST /api/posts/{id}/restore
     *
     * @param {string} postId - Post ID
     * @returns {Promise<boolean>} True on success
     */
    async restorePost(postId) {
        return await this.posts.restorePost(postId);
    }
    
    /**
     * Pins post. POST /api/posts/{id}/pin → { success: true, pinnedPostId }
     *
     * @param {string} postId - Post ID
     * @returns {Promise<boolean>} True on success
     */
    async pinPost(postId) {
        return await this.posts.pinPost(postId);
    }

    /**
     * Unpins post. DELETE /api/posts/{id}/pin → { success: true, pinnedPostId: null }
     *
     * @param {string} postId - Post ID
     * @returns {Promise<boolean>} True on success
     */
    async unpinPost(postId) {
        return await this.posts.unpinPost(postId);
    }
    
    /**
     * Reposts     * 
     * @param {string} postId - Post ID to repost
     * @param {string|null} comment - Repost comment (optional)
     * @returns {Promise<Object|null>} Created repost data or null
     */
    async repost(postId, comment = null) {
        return await this.posts.repost(postId, comment);
    }
    
    /**
     * Likes post
     * 
     * @param {string} postId - Post ID
     * @returns {Promise<Object|null>} { liked, likesCount } or null on error
     */
    async likePost(postId) {
        if (!await this.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }
        
        try {
            const likeUrl = `${this.baseUrl}/api/posts/${postId}/like`;
            const response = await this.axios.post(likeUrl);
            
            if (response.status === 200 || response.status === 201) {
                return response.data; // { liked: true, likesCount: number }
            } else {
                console.error(`Like error: ${response.status} - ${JSON.stringify(response.data)}`);
                return null;
            }
        } catch (error) {
            console.error('Exception liking:', error.message);
            if (error.response) {
                console.error('Response:', error.response.status, error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Unlikes post
     * 
     * @param {string} postId - Post ID
     * @returns {Promise<Object|null>} { liked, likesCount } or null on error
     */
    async unlikePost(postId) {
        if (!await this.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }
        
        try {
            const unlikeUrl = `${this.baseUrl}/api/posts/${postId}/like`;
            const response = await this.axios.delete(unlikeUrl);
            
            if (response.status === 200 || response.status === 204) {
                return response.data || { liked: false, likesCount: 0 };
            } else {
                console.error(`Unlike error: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Exception unliking:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Adds comment to post
     * 
     * @param {string} postId - Post ID
     * @param {string} text - Text (empty for voice)
     * @param {string|null} replyToCommentId - Comment ID to reply to (optional)
     * @param {string[]|null} attachmentIds - Uploaded file IDs (audio/ogg for voice)
     * @returns {Promise<Object|null>} Comment data
     */
    async addComment(postId, text, replyToCommentId = null, attachmentIds = null) {
        return await this.comments.addComment(postId, text, replyToCommentId, attachmentIds);
    }

    /**
     * Adds voice message as comment. Uploads audio/ogg and creates comment.
     *
     * @param {string} postId - Post ID
     * @param {string} audioPath - Path to audio file (audio/ogg)
     * @param {string|null} replyToCommentId - Comment ID to reply to (optional)
     * @returns {Promise<Object|null>} Created comment data or null
     */
    async addVoiceComment(postId, audioPath, replyToCommentId = null) {
        return await this.comments.addVoiceComment(postId, audioPath, replyToCommentId);
    }

    /**
     * Reply to comment (POST /api/comments/:id/replies).
     *
     * @param {string} commentId - Comment ID to reply to
     * @param {string} content - Reply text
     * @param {string} replyToUserId - Comment author user ID (required by API)
     * @returns {Promise<Object|null>} Created reply data or null on error
     */
    async replyToComment(commentId, content, replyToUserId) {
        return await this.comments.replyToComment(commentId, content, replyToUserId);
    }
    
    /**
     * Likes comment
     * 
     * @param {string} commentId - Comment ID
     * @returns {Promise<Object|null>} { liked, likesCount } or null on error
     */
    async likeComment(commentId) {
        return await this.comments.likeComment(commentId);
    }
    
    /**
     * Unlikes comment
     * 
     * @param {string} commentId - Comment ID
     * @returns {Promise<Object|null>} { liked, likesCount } or null on error
     */
    async unlikeComment(commentId) {
        return await this.comments.unlikeComment(commentId);
    }
    
    /**
     * Deletes comment
     * 
     * @param {string} commentId - Comment ID
     * @returns {Promise<boolean>} True on success
     */
    async deleteComment(commentId) {
        return await this.comments.deleteComment(commentId);
    }

    /**
     * Restores deleted comment. POST /api/comments/{id}/restore
     *
     * @param {string} commentId - Comment ID
     * @returns {Promise<boolean>} True on success
     */
    async restoreComment(commentId) {
        return await this.comments.restoreComment(commentId);
    }
    
    /**
     * Gets comments for post
     * 
     * @param {string} postId - Post ID
     * @param {number} limit - Number of comments
     * @param {string} sort - Sort: "popular", "new", "old"
     * @returns {Promise<Object>} { comments: [], total, hasMore, nextCursor }
     */
    async getComments(postId, limit = 20, sort = 'popular') {
        return await this.comments.getComments(postId, limit, sort);
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
        return await this.users.updateProfile(bio, displayName, username, bannerId);
    }

    /**
     * Gets privacy settings.
     * GET /api/users/me/privacy → { isPrivate, wallClosed }
     *
     * @returns {Promise<Object|null>} { isPrivate, wallClosed } or null
     */
    async getPrivacy() {
        return await this.users.getPrivacy();
    }

    /**
     * Updates privacy settings.
     * PUT /api/users/me/privacy → { isPrivate, wallClosed }
     *
     * @param {Object} options - { isPrivate?: boolean, wallClosed?: boolean }
     * @returns {Promise<Object|null>} { isPrivate, wallClosed } or null
     */
    async updatePrivacy(options = {}) {
        return await this.users.updatePrivacy(options);
    }
    
    /**
     * Gets current user data
     * 
     * @returns {Promise<Object|null>} Profile data or null on error
     */
    async getMyProfile() {
        return await this.users.getMyProfile();
    }
    
    /**
     * Gets user profile by username
     * 
     * @param {string} username - Username
     * @returns {Promise<Object|null>} Profile data or null on error
     */
    async getUserProfile(username) {
        return await this.users.getUserProfile(username);
    }
    
    /**
     * Follows user
     * 
     * @param {string} username - Username
     * @returns {Promise<Object|null>} { following: true, followersCount: number } or null on error
     */
    async followUser(username) {
        return await this.users.followUser(username);
    }
    
    /**
     * Unfollows user
     * 
     * @param {string} username - Username
     * @returns {Promise<Object|null>} { following: false, followersCount: number } or null on error
     */
    async unfollowUser(username) {
        return await this.users.unfollowUser(username);
    }
    
    /**
     * Gets user's followers list
     * 
     * @param {string} username - Username
     * @param {number} page - Page number (from 1)
     * @param {number} limit - Items per page
     * @returns {Promise<Object|null>} { users: [], pagination: {} } or null
     */
    async getFollowers(username, page = 1, limit = 30) {
        return await this.users.getFollowers(username, page, limit);
    }
    
    /**
     * Gets user's following list
     * 
     * @param {string} username - Username
     * @param {number} page - Page number (from 1)
     * @param {number} limit - Items per page
     * @returns {Promise<Object|null>} { users: [], pagination: {} } or null
     */
    async getFollowing(username, page = 1, limit = 30) {
        return await this.users.getFollowing(username, page, limit);
    }
    
    /**
     * Gets user's clan (emoji from avatar)
     * 
     * @param {string} username - Username
     * @returns {Promise<string|null>} Clan emoji or null
     */
    async getUserClan(username) {
        return await this.users.getUserClan(username);
    }
    
    /**
     * Gets notifications list.
     * GET /api/notifications/?offset=0&limit=20 → { notifications: [], hasMore }
     *
     * @param {number} limit - Number of notifications
     * @param {number} offset - Pagination offset
     * @param {string|null} type - Filter by type: 'reply', 'like', 'wall_post', 'follow', 'comment'
     * @returns {Promise<Object|null>} { notifications: [], hasMore } or null
     */
    async getNotifications(limit = 20, offset = 0, type = null) {
        return await this.notifications.getNotifications(limit, offset, type);
    }

    /**
     * Gets notifications of given type
     *
     * @param {string} type - Type: 'reply', 'like', 'wall_post', 'follow', 'comment'
     * @param {number} limit - Count
     * @param {number} offset - Offset
     * @returns {Promise<Object|null>} { notifications: [], hasMore } or null
     */
    async getNotificationsByType(type, limit = 20, offset = 0) {
        return await this.notifications.getNotifications(limit, offset, type);
    }

    /**
     * Marks several notifications as read.
     * POST /api/notifications/read-batch → { success: true, count }
     *
     * @param {string[]} ids - Array of notification IDs
     * @returns {Promise<Object|null>} { success: true, count } or null
     */
    async markNotificationsAsReadBatch(ids) {
        return await this.notifications.markAsReadBatch(ids);
    }
    
    /**
     * Marks notification as read
     * 
     * @param {string} notificationId - Notification ID
     * @returns {Promise<Object|null>} { success: true } or null on error
     */
    async markNotificationAsRead(notificationId) {
        return await this.notifications.markAsRead(notificationId);
    }
    
    /**
     * Marks all notifications as read
     * 
     * @returns {Promise<boolean>} True on success
     */
    async markAllNotificationsAsRead() {
        return await this.notifications.markAllAsRead();
    }
    
    /**
     * Gets unread notification count
     * 
     * @returns {Promise<number|null>} Number of notifications or null on error
     */
    async getNotificationCount() {
        return await this.notifications.getUnreadCount();
    }
    
    /**
     * Gets trending hashtags
     * 
     * @param {number} limit - Number of hashtags (default 10)
     * @returns {Promise<Object|null>} { hashtags: [] } or null on error
     */
    async getTrendingHashtags(limit = 10) {
        return await this.hashtags.getTrending(limit);
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
        return await this.hashtags.getPostsByHashtag(hashtagName, limit, cursor);
    }
    
    /**
     * Gets top clans by member count
     * 
     * @returns {Promise<Array|null>} Array of clans [{ avatar: "🦎", memberCount: 3794 }, ...] or null on error
     */
    async getTopClans() {
        return await this.users.getTopClans();
    }
    
    /**
     * Gets who-to-follow suggestions
     * 
     * @returns {Promise<Array|null>} Array of users or null on error
     */
    async getWhoToFollow() {
        return await this.users.getWhoToFollow();
    }
    
    /**
     * Uploads file (image) to server
     * 
     * @param {string} filePath - Path to file
     * @returns {Promise<Object|null>} { id, url, filename, mimeType, size } or null on error
     */
    async uploadFile(filePath) {
        return await this.files.uploadFile(filePath);
    }

    /**
     * Gets file info. GET /api/files/{id}
     *
     * @param {string} fileId - File ID
     * @returns {Promise<Object|null>} { id, url, filename, mimeType, size } or null
     */
    async getFile(fileId) {
        return await this.files.getFile(fileId);
    }

    /**
     * Deletes file. DELETE /api/files/{id}
     *
     * @param {string} fileId - File ID
     * @returns {Promise<boolean>} True on success
     */
    async deleteFile(fileId) {
        return await this.files.deleteFile(fileId);
    }
    
    /**
     * Submits report for post, comment or user
     * 
     * @param {string} targetType - Target type: "post", "comment", "user"
     * @param {string} targetId - Target ID
     * @param {string} reason - Report reason (default "other")
     * @param {string} description - Problem description
     * @returns {Promise<Object|null>} { id, createdAt } or null on error
     */
    async report(targetType, targetId, reason = 'other', description = '') {
        return await this.reports.report(targetType, targetId, reason, description);
    }
    
    /**
     * Submits report for post
     * 
     * @param {string} postId - Post ID
     * @param {string} reason - Report reason (default "other")
     * @param {string} description - Problem description
     * @returns {Promise<Object|null>} { id, createdAt } or null on error
     */
    async reportPost(postId, reason = 'other', description = '') {
        return await this.reports.reportPost(postId, reason, description);
    }
    
    /**
     * Submits report for comment
     * 
     * @param {string} commentId - Comment ID
     * @param {string} reason - Report reason (default "other")
     * @param {string} description - Problem description
     * @returns {Promise<Object|null>} { id, createdAt } or null on error
     */
    async reportComment(commentId, reason = 'other', description = '') {
        return await this.reports.reportComment(commentId, reason, description);
    }
    
    /**
     * Submits report for user
     * 
     * @param {string} userId - User ID
     * @param {string} reason - Report reason (default "other")
     * @param {string} description - Problem description
     * @returns {Promise<Object|null>} { id, createdAt } or null on error
     */
    async reportUser(userId, reason = 'other', description = '') {
        return await this.reports.reportUser(userId, reason, description);
    }

    /**
     * Gets verification status. GET /api/verification/status
     *
     * @returns {Promise<Object|null>} Verification status or null
     */
    async getVerificationStatus() {
        return await this.verification.getStatus();
    }

    /**
     * Submits verification request. POST /api/verification/submit
     *
     * @param {string} videoUrl - URL of uploaded video (from uploadFile)
     * @returns {Promise<Object|null>} { success, request } or null
     */
    async submitVerification(videoUrl) {
        return await this.verification.submit(videoUrl);
    }

    /**
     * Gets platform status. GET /api/platform/status
     *
     * @returns {Promise<Object|null>} Platform status or null
     */
    async getPlatformStatus() {
        try {
            const response = await this.axios.get('/api/platform/status');
            if (response.status === 200) {
                return response.data?.data ?? response.data;
            }
            return null;
        } catch (error) {
            console.error('Error getting platform status:', error.message);
            return null;
        }
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
        return await this.searchManager.search(query, userLimit, hashtagLimit);
    }
    
    /**
     * Searches users
     * 
     * @param {string} query - Search query
     * @param {number} limit - Max number of users (default 5)
     * @returns {Promise<Array|null>} Array of users or null on error
     */
    async searchUsers(query, limit = 5) {
        return await this.searchManager.searchUsers(query, limit);
    }
    
    /**
     * Searches hashtags
     * 
     * @param {string} query - Search query
     * @param {number} limit - Max number of hashtags (default 5)
     * @returns {Promise<Array|null>} Array of hashtags or null on error
     */
    async searchHashtags(query, limit = 5) {
        return await this.searchManager.searchHashtags(query, limit);
    }
    
    // ========== USER-FRIENDLY METHODS ==========
    
    // === Posts ===
    
    /**
     * Gets trending posts     * 
     * @param {number} limit - Number of posts (default 20)
     * @param {string|null} cursor - Pagination cursor
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getTrendingPosts(limit = 20, cursor = null) {
        return await this.posts.getTrendingPosts(limit, cursor);
    }
    
    /**
     * Gets recent posts     * 
     * @param {number} limit - Number of posts (default 20)
     * @param {string|null} cursor - Pagination cursor
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getRecentPosts(limit = 20, cursor = null) {
        return await this.posts.getRecentPosts(limit, cursor);
    }
    
    /**
     * Gets own posts     * 
     * @param {number} limit - Number of posts (default 20)
     * @param {string} sort - Sort: 'new', 'old', 'popular' (default 'new')
     * @param {string|null} cursor - Pagination cursor
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getMyPosts(limit = 20, sort = 'new', cursor = null) {
        return await this.posts.getMyPosts(limit, sort, cursor);
    }
    
    /**
     * Gets user's latest post     * 
     * @param {string} username - Username
     * @returns {Promise<Object|null>} Latest post or null
     */
    async getUserLatestPost(username) {
        return await this.posts.getUserLatestPost(username);
    }
    
    /**
     * Gets post likes count     * 
     * @param {string} postId - Post ID
     * @returns {Promise<number>} Likes count
     */
    async getPostLikesCount(postId) {
        return await this.posts.getPostLikesCount(postId);
    }
    
    /**
     * Gets post views count     * 
     * @param {string} postId - Post ID
     * @returns {Promise<number>} Views count
     */
    async getPostViewsCount(postId) {
        return await this.posts.getPostViewsCount(postId);
    }
    
    /**
     * Gets post comments count     * 
     * @param {string} postId - Post ID
     * @returns {Promise<number>} Number of comments
     */
    async getPostCommentsCount(postId) {
        return await this.posts.getPostCommentsCount(postId);
    }
    
    /**
     * Gets post statistics     * 
     * @param {string} postId - Post ID
     * @returns {Promise<Object|null>} { likes: number, views: number, comments: number, reposts: number } or null
     */
    async getPostStats(postId) {
        return await this.posts.getPostStats(postId);
    }
    
    // === Users ===
    
    /**
     * Checks if current user follows the given user     * 
     * @param {string} username - Username to check
     * @returns {Promise<boolean>} True if following, false otherwise or on error
     */
    async isFollowing(username) {
        return await this.users.isFollowing(username);
    }
    
    /**
     * Gets own followers count     * 
     * @returns {Promise<number>} Followers count
     */
    async getMyFollowersCount() {
        return await this.users.getMyFollowersCount();
    }
    
    /**
     * Gets own following count     * 
     * @returns {Promise<number>} Following count
     */
    async getMyFollowingCount() {
        return await this.users.getMyFollowingCount();
    }
    
    /**
     * Gets own clan (avatar emoji)     * 
     * @returns {Promise<string|null>} Clan emoji or null
     */
    async getMyClan() {
        return await this.users.getMyClan();
    }
    
    // === Comments ===
    
    /**
     * Gets top comment for post (most likes)     * 
     * @param {string} postId - Post ID
     * @returns {Promise<Object|null>} Top comment or null
     */
    async getTopComment(postId) {
        return await this.comments.getTopComment(postId);
    }
    
    /**
     * Checks if post has comments     * 
     * @param {string} postId - Post ID
     * @returns {Promise<boolean>} True if has comments
     */
    async hasComments(postId) {
        return await this.comments.hasComments(postId);
    }
    
    // === Notifications ===
    
    /**
     * Checks for unread notifications     * 
     * @returns {Promise<boolean>} True if has unread
     */
    async hasUnreadNotifications() {
        return await this.notifications.hasUnreadNotifications();
    }
    
    /**
     * Gets only unread notifications     *
     * @param {number} limit - Count
     * @param {number} offset - Offset
     * @returns {Promise<Object|null>} { notifications: [], hasMore } or null
     */
    async getUnreadNotifications(limit = 20, offset = 0) {
        return await this.notifications.getUnreadNotifications(limit, offset);
    }
}
