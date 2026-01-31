# API Reference — итд.com (Node.js SDK)

Technical guide to the library’s methods and configuration for the `итд.com` API.

## Confirmed endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/{username}` | Profile → `{ id, username, displayName, avatar, banner, bio, verified, pinnedPostId, wallClosed, followersCount, followingCount, postsCount, isFollowing, isFollowedBy, createdAt }` |
| GET | `/api/users/{username}/followers?page=1&limit=30` | Followers → `{ data: { users: [], pagination: { page, limit, total, hasMore } } }` |
| GET | `/api/users/{username}/following?page=1&limit=30` | Following → `{ data: { users: [], pagination } }` |
| GET | `/api/posts/user/{username}?limit=20&sort=new` | User posts → `{ data: { posts: [], pagination: { limit, nextCursor, hasMore } } }` |
| GET | `/api/posts/user/{username}/liked?limit=20` | Liked posts → `{ data: { posts: [], pagination } }` |
| GET | `/api/hashtags/{name}/posts?limit=20` | Posts by hashtag → `{ data: { hashtag: {}, posts: [], pagination } }` |
| GET | `/api/hashtags/trending?limit=10` | Trending hashtags → `{ data: { hashtags: [{ id, name, postsCount }] } }` |
| GET | `/api/users/suggestions/who-to-follow` | Suggestions → `{ users: [] }` |
| GET | `/api/users/stats/top-clans` | Top clans → `{ clans: [{ avatar, memberCount }] }` |
| POST | `/api/posts` | Create post. `{ content, wallRecipientId?, attachmentIds? }` → `{ id, content, author, ... }` |
| PUT | `/api/posts/{id}` | Edit post. `{ content }` → `{ id, content, updatedAt }` |
| DELETE | `/api/posts/{id}` | Delete post (empty response) |
| POST | `/api/posts/{id}/restore` | Restore post (empty response) |
| POST | `/api/posts/{id}/repost` | Repost. `{ content? }` (comment optional). **attachmentIds is ignored** — attachments on repost are not supported. |
| POST | `/api/posts/{id}/like` | Like → `{ liked: true, likesCount }` |
| DELETE | `/api/posts/{id}/like` | Unlike → `{ liked: false, likesCount }` |
| POST | `/api/posts/{id}/pin` | Pin post → `{ success: true, pinnedPostId }` |
| DELETE | `/api/posts/{id}/pin` | Unpin post → `{ success: true, pinnedPostId: null }` |
| POST | `/api/posts/{id}/view` | Mark post as viewed |
| GET | `/api/posts/user/{username}/wall` | Posts on user's wall → `{ data: { posts: [], pagination } }` |
| POST | `/api/comments/{id}/restore` | Restore deleted comment |
| POST | `/api/v1/auth/change-password` | Change password. `{ oldPassword, newPassword }`. Requires cookies. |
| GET | `/api/files/{id}` | File info |
| DELETE | `/api/files/{id}` | Delete file |
| GET | `/api/verification/status` | Verification status |
| POST | `/api/verification/submit` | Submit verification request. `{ videoUrl }` |
| GET | `/api/platform/status` | Platform status |
| POST | `/api/files/upload` | File upload (images, audio/ogg). → 201, `{ id, url, filename, mimeType, size }` |
| PUT | `/api/users/me` | Update profile (bio, displayName, username, bannerId) |
| POST | `/api/reports` | Report. `{ targetType, targetId, reason, description? }` → `{ data: { id, createdAt } }`. reason: `spam`, `violence`, `hate`, `adult`, `fraud`, `other` |
| GET | `/api/notifications/?offset=0&limit=20` | Notifications list → `{ notifications: [], hasMore }` |
| POST | `/api/notifications/read-batch` | Mark several as read → `{ success: true, count }` |
| POST | `/api/notifications/read-all` | Mark all as read → `{ success: true }` |
| GET | `/api/users/me/privacy` | Privacy settings → `{ isPrivate, wallClosed }` |
| PUT | `/api/users/me/privacy` | Update privacy |
| POST | `/api/v1/auth/refresh` | Refresh token → `{ accessToken }` |
| POST | `/api/v1/auth/logout` | Logout → 204 |
| GET | `/api/posts/{id}` | Single post |
| GET | `/api/posts/{postId}/comments?limit&sort` | Post comments → `{ data: { comments: [], total, hasMore, nextCursor } }`. sort: `newest`, `oldest`, `popular` |
| POST | `/api/posts/{postId}/comments` | Add comment. `{ content?, attachmentIds? }` — voice: empty content, attachmentIds with id from uploadFile (audio/ogg) |
| POST | `/api/comments/{id}/replies` | Reply to comment. `{ content, replyToUserId }` |
| GET | `/api/comments/{id}/replies?page&limit&sort` | Comment replies (page-based pagination) |
| POST | `/api/reports` | targetType: `post`, `comment`, `user`. 400 on duplicate report: "You have already submitted a report" |
| DELETE | `/api/comments/{id}` | Delete comment (empty response). On your wall you can delete any. |
| POST/DELETE | `/api/comments/{id}/like` | Like/unlike comment or reply → `{ liked, likesCount }` |
| POST | `/api/users/{username}/follow` | Follow → `{ following: true, followersCount }` |
| DELETE | `/api/users/{username}/follow` | Unfollow → `{ following: false, followersCount }` |
| POST | `/api/notifications/{id}/read` | Mark one notification as read |
| GET | `/api/notifications/count` | Unread count |

### Unconfirmed endpoints

| Method | Endpoint | Used in |
|--------|----------|---------|
| GET | `/api/posts?tab=popular` / `tab=following` | `getFeedPopular`, `getFeedFollowing` — no tab in web UI |
| GET | `/api/search/?q=&userLimit=&hashtagLimit=` | `search`, `searchUsers`, `searchHashtags` |
| GET | `/api/notifications/stream` | SSE notification stream (not implemented in SDK) |

### Official routes from the site

Endpoint list from the frontend (итд.com):

| Group | Endpoint | SDK |
|-------|----------|-----|
| **auth** (`/api/v1/auth`) | sign-up, sign-in, verify-otp, resend-otp, refresh, logout, change-password, forgot-password, reset-password, login/yandex, login/google | refresh, logout, change-password |
| **users** | me, profile(id), updateProfile, privacy, follow(id), followers(id), following(id), who-to-follow, top-clans, search | ✓ |
| **posts** | list, single(id), create, update(id), delete(id), restore(id), like(id), repost(id), view(id), pin(id), byUser(id), likedByUser(id), wallByUser(id), comments(id) | ✓ |
| **comments** | delete(id), restore(id), like(id), replies(id) | ✓ |
| **notifications** | list, count, markRead(id), markReadBatch, markAllRead, **stream** | except stream |
| **files** | upload, get(id), delete(id) | ✓ |
| **reports** | create | ✓ |
| **hashtags** | search, trending, posts(name) | except search |
| **search** | global | ✓ |
| **verification** | status, submit | ✓ |

SDK does not include: sign-up/sign-in (browser flow), verify-otp/resend-otp, forgot/reset-password, OAuth (yandex/google), notifications/stream, users/search, hashtags/search.

If a method returns an error — check the endpoint in DevTools.

## SDK structure

| File | Purpose |
|------|---------|
| `client.js` | Main client: axios setup, cookie loading, token storage, managers, helpers `get/post/put/patch/delete` |
| `auth.js` | Auth: refresh, logout, checkAuth, ensureAuthenticated, validateAndRefreshToken |
| `token-storage.js` | Save token to .env and cookies to .cookies (used by auth on refresh) |
| `posts.js` | Posts: createPost, getPosts, editPost, deletePost, etc. |
| `comments.js` | Comments: addComment, replyToComment, getComments, likeComment, etc. |
| `users.js` | Users: getMyProfile, getUserProfile, followUser, getTopClans, etc. |
| `notifications.js` | Notifications |
| `hashtags.js` | Hashtags |
| `files.js` | Upload, get, delete files |
| `verification.js` | Verification: getStatus, submit |
| `search.js` | Search |
| `reports.js` | Reports |

## Installation

### Via npm

```bash
npm install itd-sdk-js
```

### Usage

```javascript
import { ITDClient } from 'itd-sdk-js';
```

## Project setup

### 1. Environment variables (.env)

Create `.env` in the project root and set:

- `ITD_ACCESS_TOKEN` — your JWT token.
- `ITD_BASE_URL` — `https://xn--d1ah4a.com`.
- `ITD_USER_AGENT` — User-Agent string from the browser.

### 2. .cookies file

For automatic token refresh, create `.cookies` in the project root. Copy the `Cookie` header from any request to the site in the browser and paste it into this file.

**Paths for .env and .cookies:** by default the SDK looks for and saves these files in the **project root** (`process.cwd()`). On token refresh, updated values are written to your project, not the package folder. You can set a custom root or explicit paths via constructor options (see below).

---

## Auth and sessions

### Client initialization

**Simple:**

```javascript
import { ITDClient } from 'itd-sdk-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new ITDClient();
// Token is read from .env automatically
```

**Only .cookies (no ITD_ACCESS_TOKEN in .env):**

```javascript
const client = new ITDClient();
await client.ensureAuthenticated(); // get token via refresh from .cookies
```

**With options (projectRoot / envPath / cookiesPath):**

If the script runs from a subfolder or you need explicit paths:

```javascript
const client = new ITDClient({
    baseUrl: 'https://xn--d1ah4a.com',
    userAgent: '...',
    projectRoot: process.cwd(),
    requestTimeout: 60000,
    uploadTimeout: 120000,
    accessToken: '...',                       // optional; default from .env ITD_ACCESS_TOKEN
});
```

- `projectRoot` — directory where `.env` and `.cookies` are looked for (default `process.cwd()`).
- `envPath` / `cookiesPath` — when set, override paths derived from `projectRoot`.
- `requestTimeout` — timeout for normal requests in ms (default 60000). Avoids hanging on slow networks.
- `uploadTimeout` — timeout for file upload and post creation in ms (default 120000). Used in `uploadFile`, `createPost`, `createWallPost`.

### Automatic refresh (Refresh Token)

On `401 Unauthorized`, the client automatically calls `/api/v1/auth/refresh` using data from `.cookies`. On success, the new token is saved to `.env`, cookies are updated, and the original request is retried.

**Important:** Automatic token refresh requires `refresh_token` in `.cookies`. Without it, the SDK cannot refresh the token automatically.

**Check for refresh_token:**
```javascript
if (client.hasRefreshToken()) {
    console.log('✅ Refresh token available, token will refresh automatically');
} else {
    console.log('⚠️  Refresh token not found - update .cookies file');
}
```

**Manual token check and refresh:**
```javascript
// Validates token and refreshes if needed
const isValid = await client.validateAndRefreshToken();
if (isValid) {
    console.log('✅ Token valid or successfully refreshed');
} else {
    console.log('❌ Token invalid and refresh failed');
}
```

**Recommendation for spaced-out requests:**
If you make requests with long gaps (more than 10–15 minutes), check the token before each request:
```javascript
// Before publishing a post
await client.validateAndRefreshToken();
const post = await client.createPost('Post text', 'image.jpg');
```

---

## API methods: Posts

### createPost(text, imagePath?)

Creates a new post. If `imagePath` is provided, the file is uploaded via `/api/files/upload`, then the file ID is attached via `attachmentIds`.

- **Returns:** post object on success; **`null`** on any error (network, 5xx, 429, upload failure, invalid response). Always check for `null`.
- **Timeout:** `uploadTimeout` (default 120 s) is used for file upload and post creation.
- **Retries:** on 5xx/429 or “API returned null”, retry in your app (e.g. 3–8 attempts with exponential backoff). The SDK has no built-in retries.

**Note:** The API uses `attachmentIds` (array of file IDs), not `attachments`. The SDK uses the correct field.

- **Parameters**: `text` (string), `imagePath` (string, optional).

### createWallPost(username, text, imagePath?)

Creates a post **on another user's wall** (wall post).

- **Returns:** post object on success; **`null`** on any error. Check for `null`; retry on 5xx/429 in your app.
- **Timeout:** `uploadTimeout` (default 120 s).
- Uses `POST /api/posts` with body `{ content, wallRecipientId, attachmentIds? }`.
- `wallRecipientId` is the **recipient user ID**, so the method first calls `getUserProfile(username)` and uses `profile.id`.
- If `imagePath` is set, the file is uploaded and attached via `attachmentIds`.

- **Parameters**:
  - `username` — recipient username (string)
  - `text` — post text (string)
  - `imagePath` — path to image (string, optional)

### getPost(postId)

Fetches a single post.

- **Returns**: Object with content, author, and nested comments.

### getPosts(username, limit, sort, cursor, tab, type, filter)

Generic method for post lists.

- **Parameters**:
  - `username` — username (null for general feed).
  - `limit` — number of items (default: 20).
  - `sort` — `new`, `old`, `popular`, `trending`, `recent`.
  - `tab` — `popular`, `following` or null.
  - `cursor` — pagination cursor.

### Other post methods

- `getFeedPopular(limit, cursor)` — popular feed. ⚠️ GET `/api/posts?tab=popular` **unconfirmed** (no tab in web UI). Test tool: `tools/test-feed-tabs.js`.
- `getFeedFollowing(limit, cursor)` — following feed. ⚠️ GET `/api/posts?tab=following` **unconfirmed**. Requires auth.
- `getPostsList(username?, limit?)` — simplified, returns only posts array (no pagination).
- `editPost(postId, newContent)` — edit text. PUT `/api/posts/{id}`. `{ content }` → `{ id, content, updatedAt }`.
- `viewPost(postId)` — mark post as viewed. POST `/api/posts/{id}/view`.
- `getWallByUser(username, limit, cursor)` — posts on user's wall. GET `/api/posts/user/{username}/wall`.
- `deletePost(postId)` — delete post. DELETE `/api/posts/{id}`. Returns `boolean`.
- `restorePost(postId)` — restore deleted post. POST `/api/posts/{id}/restore`.
- `getLikedPosts(username, limit, cursor)` — user's liked posts. GET `/api/posts/user/{username}/liked` → `{ posts: [], pagination }`.
- `pinPost(postId)` — pin post. POST `/api/posts/{id}/pin` → `{ success: true, pinnedPostId }`.
- `unpinPost(postId)` — unpin post. DELETE `/api/posts/{id}/pin` → `{ success: true, pinnedPostId: null }`.
- `repost(postId, comment?)` — repost. POST `/api/posts/{id}/repost`. `{ content? }` (comment optional). **attachmentIds not supported** — API ignores attachments on repost.
- `likePost(postId)` **/** `unlikePost(postId)` — like/unlike. Return `{ liked: boolean, likesCount: number }`.

---

## API methods: Comments

### getComments(postId, limit, sort)

Gets comment tree for a post. GET `/api/posts/{postId}/comments?limit&sort`.

- **Parameters**: `postId`, `limit` (default 20, clamped 1–100), `sort` — in SDK use `"popular"`, `"new"`, `"old"`; API uses `popular`, `newest`, `oldest` respectively.
- **API response:** `{ data: { comments: [], total, hasMore, nextCursor } }`. Comments may have nested `replies`; replies have `replyTo`.
- **Replies endpoint:** GET `/api/comments/{id}/replies?page=1&limit=50&sort=oldest` — page-based, not cursor. SDK has no separate `getReplies`; replies come inside `getComments`.

### addComment(postId, text, replyToCommentId?, attachmentIds?)

Adds a comment. POST `/api/posts/{postId}/comments`. Payload: `{ content?, attachmentIds? }`.

- **Text**: `content` — comment text.
- **Voice**: empty `content`, `attachmentIds: [uploadedId]` — id from `uploadFile` (audio/ogg). Attachments in response have `type: "audio"`, `duration`, `mimeType: "audio/ogg"`.

### addVoiceComment(postId, audioPath, replyToCommentId?)

Adds a voice message. Uploads audio/ogg via `uploadFile` and creates a comment with `attachmentIds`. Convenience over `addComment(postId, '', replyToCommentId, [uploadedId])`.

### replyToComment(commentId, content, replyToUserId)

Reply via POST `/api/comments/:commentId/replies`.

- **Parameters**:
  - `commentId` — comment to reply to.
  - `content` — reply text.
  - `replyToUserId` — author's user ID (required by API).
- **Returns:** created reply comment object or `null` on error.

Example: `client.replyToComment('80a775df-811a-4b60-b2fd-24651c1e546e', 'reply text', '220e565c-45b9-4634-bdba-a6ebe6e8c5d1')`.

### Comment management

- `likeComment(commentId)` **/** `unlikeComment(commentId)` — like/unlike comments/replies. POST/DELETE `/api/comments/{id}/like` → `{ liked, likesCount }`.
- `deleteComment(commentId)` — delete comment. DELETE `/api/comments/{id}` (empty response). On your wall you can delete any comment.
- `restoreComment(commentId)` — restore deleted comment. POST `/api/comments/{id}/restore`.

---

## API methods: Profiles and subscriptions

- `getMyProfile()` — current account data (requires auth).
- `getUserProfile(username)` — public profile of any user.
- `updateProfile(bio?, displayName?, username?, bannerId?)` — update profile. PUT `/api/users/me`. Supports `bannerId` (ID from `uploadFile`).
- `getPrivacy()` — privacy settings. GET `/api/users/me/privacy` → `{ isPrivate, wallClosed }`.
- `updatePrivacy({ isPrivate?, wallClosed? })` — update privacy. PUT `/api/users/me/privacy`.
- `getFollowers(username, page, limit)` — followers list.
- `getFollowing(username, page, limit)` — following list.
- `followUser(username)` **/** `unfollowUser(username)` — follow/unfollow. POST/DELETE `/api/users/{username}/follow` → `{ following, followersCount }`.
- `getUserClan(username)` — user's clan emoji avatar.

## API methods: Token management

- `hasRefreshToken()` — checks for refresh_token in cookies. Returns `boolean`.
- `ensureAuthenticated()` — if no accessToken but refresh_token exists — calls refresh and gets token. Returns `Promise<boolean>`. For “.cookies only”: `await client.ensureAuthenticated()` before first request.
- `validateAndRefreshToken()` — validates token and refreshes if needed. Returns `Promise<boolean>`.
- `refreshAccessToken()` — force refresh via refresh endpoint. Returns `Promise<string|null>`.

**Custom requests:** `client.get(path)`, `client.post(path, data)`, `client.put(path, data)`, `client.patch(path, data)`, `client.delete(path)` — for arbitrary endpoints (baseURL is already set).

- `changePassword(oldPassword, newPassword)` — change password. POST `/api/v1/auth/change-password`. Requires cookies (refresh_token).
- `getVerificationStatus()` — verification status. GET `/api/verification/status`.
- `submitVerification(videoUrl)` — submit verification request. POST `/api/verification/submit`. videoUrl from `uploadFile`.
- `getPlatformStatus()` — platform status. GET `/api/platform/status`.
- `getFile(fileId)` — file info. GET `/api/files/{id}`.
- `deleteFile(fileId)` — delete file. DELETE `/api/files/{id}`.

**Recommendation:** For spaced-out requests (more than 10–15 minutes), call `validateAndRefreshToken()` before each request.

---

## API methods: Notifications and search

### getNotifications(limit, offset, type?)

Notifications list. GET `/api/notifications/?offset=0&limit=20` → `{ notifications: [], hasMore }`.

- **Parameters**: `limit` (default 20), `offset` (pagination), `type` (client-side filter).

**Notification types** (field `type`, object has `actor`, `targetId`, `preview`, etc.):

| type | Description |
|------|-------------|
| `like` | Someone liked a post |
| `comment` | Someone commented on a post |
| `reply` | Someone replied to a comment |
| `follow` | Someone followed |
| `repost` | Someone reposted |
| `mention` | Someone mentioned in a post |
| `wall_post` | Someone posted on wall |
| `verification_approved` | Verification request approved |
| `verification_rejected` | Request rejected (has `preview` — reason) |

**Links**: `follow` → actor profile; `verification_approved` / `verification_rejected` → `/settings`; otherwise if `targetId` present → post.

### Other notification methods

- `getNotificationsByType(type, limit, offset)` — notifications of one type. Returns `{ notifications: [], hasMore }`.
- `markNotificationAsRead(notificationId)` — mark one as read. POST `/api/notifications/{id}/read`.
- `markNotificationsAsReadBatch(ids)` — mark several. POST `/api/notifications/read-batch` → `{ success: true, count }`.
- `markAllNotificationsAsRead()` — mark all. POST `/api/notifications/read-all` → `{ success: true }`.
- `getNotificationCount()` — unread count. GET `/api/notifications/count`. Alternative: derive `hasUnread` from `getNotifications()` (each item has `read`).

### Search and suggestions

- `search(query, userLimit?, hashtagLimit?)` — global search. ⚠️ GET `/api/search/?q=&userLimit=&hashtagLimit=` **unconfirmed**. Returns `{ users: [], hashtags: [] }`.
- `searchUsers(query, limit?)` — users only.
- `searchHashtags(query, limit?)` — hashtags only.
- `getTopClans()` — clans by member count. **Returns array** `Array<{ avatar, memberCount }>` or **`null`** on error (not an object with `clans`).
- `getWhoToFollow()` — suggested users.
- `getTrendingHashtags(limit)` — trending tags.
- `getPostsByHashtag(tagName, limit, cursor)` — posts by tag. Returns `{ posts: [], hashtag: {}, pagination: {} }`.

### Files and reports

- `uploadFile(filePath)` — upload via `/api/files/upload`. Returns `{ id, url, filename, mimeType, size }` or **`null`** on error. Timeout — `uploadTimeout` (default 120 s). Used automatically when creating a post with an image.
- `getFile(fileId)` — file info. GET `/api/files/{id}`.
- `deleteFile(fileId)` — delete file. DELETE `/api/files/{id}`.
- `report(targetType, targetId, reason?, description?)` — submit report. `targetType`: `"post"`, `"comment"`, `"user"`. `reason`: `"spam"`, `"violence"`, `"hate"`, `"adult"`, `"fraud"`, `"other"`. Returns `{ id, createdAt }`. On duplicate report API returns 400: "You have already reported this content".
- `reportPost(postId, reason?, description?)` — report post.
- `reportComment(commentId, reason?, description?)` — report comment.
- `reportUser(userId, reason?, description?)` — report user.

---

## Helper methods

Quick access to stats without parsing full objects:

### Posts

- `getTrendingPosts(limit, cursor)` — trending posts. Returns `{ posts: [], pagination: {} }`.
- `getRecentPosts(limit, cursor)` — recent posts. Returns `{ posts: [], pagination: {} }`.
- `getMyPosts(limit, sort, cursor)` — own posts. Requires auth.
- `getUserLatestPost(username)` — user's latest post. Returns post object or `null`.
- `getPostStats(postId)` — returns `{ likes: number, views: number, comments: number, reposts: number }` or `null`.
- `getPostLikesCount(postId)`, `getPostViewsCount(postId)`, `getPostCommentsCount(postId)` — individual counters. Return `number`.

### Users

- `getMyClan()` — own clan (emoji). Returns `string` or `null`.
- `getMyFollowersCount()`, `getMyFollowingCount()` — follower/following count. Return `number`.
- `isFollowing(username)` — check if following user. Returns `boolean`.

### Comments

- `getTopComment(postId)` — top comment for post. Returns comment object or `null`.
- `hasComments(postId)` — whether post has comments. Returns `boolean`.

### Notifications

- `hasUnreadNotifications()` — has unread. Returns `boolean`.
- `getUnreadNotifications(limit, offset)` — unread only. Returns `{ notifications: [], hasMore }`.

---

## Data structures

### Pagination

Different methods use different pagination:

| Method | Type | Parameter | Example response |
|--------|------|------------|------------------|
| `getPosts`, `getComments`, `getPostsByHashtag`, `getLikedPosts` | cursor | `nextCursor` | `{ limit, nextCursor, hasMore }` |
| `getNotifications`, `getUnreadNotifications` | offset | `offset` | `{ notifications, hasMore }` |
| `getFollowers`, `getFollowing` | page | `page` | `{ page, limit, total, hasMore }` |

```javascript
// Posts — cursor
const result = await client.getPosts('username', 20, 'new');
if (result.pagination.hasMore) {
    const nextPage = await client.getPosts('username', 20, 'new', result.pagination.nextCursor);
}

// Notifications — offset
const notif = await client.getNotifications(20, 0);
const next = await client.getNotifications(20, 20);

// Followers — page
const fol = await client.getFollowers('username', 1, 30);
const nextPage = await client.getFollowers('username', 2, 30);
```

### Post structure

```javascript
{
    id: string,
    content: string,
    author: { id, username, displayName, avatar, verified },
    attachments: [{ id, type, url, thumbnailUrl, width, height }],
    likesCount: number,
    commentsCount: number,
    repostsCount: number,
    viewsCount: number,
    isLiked: boolean,
    isReposted: boolean,
    isOwner: boolean,
    createdAt: string,
    updatedAt?: string
}
```

### Comment structure

```javascript
{
    id: string,
    content: string,
    author: { id, username, displayName, avatar, verified },
    likesCount: number,
    repliesCount: number,
    isLiked: boolean,
    createdAt: string,
    replies: [...], // Nested replies
    replyTo?: { id, username, displayName }
}
```

## Error handling

- **401 Unauthorized**: Auth error. SDK triggers automatic token refresh via `/api/v1/auth/refresh`. If refresh fails, check `.cookies`.
- **429 Too Many Requests**: Rate limit. Check `Retry-After` header and wait.
- **SESSION_REVOKED**: Session invalid. Update `.cookies` manually from the browser.

---

**Last documentation update**: 2026-01-31.

## Image uploads

When creating a post with an image, the SDK uses `attachmentIds` (array of file IDs), not `attachments`. This is the correct field required by the итд.com API.

**Example:**
```javascript
// Create post with image
await client.createPost('Post text', './image.jpg');
// SDK automatically:
// 1. Uploads file via /api/files/upload
// 2. Gets file ID
// 3. Creates post with attachmentIds: [fileId]
```

**Note:** API returns attachments in GET response, but creating a post requires `attachmentIds` in the payload.
