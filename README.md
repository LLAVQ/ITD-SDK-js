# ITD-SDK-js

Unofficial Node.js library for working with the API of [итд.com](http://итд.com). Simplifies writing bots and scripts: handles authentication, session support, and provides ready-made methods for core actions.

## Highlights

- **Automatic Refresh Token**: you don't need to manually refresh `accessToken` in code. The SDK picks up the new token when the old one expires, using data from `.cookies`.
- **34 ready-made methods**: from post statistics to subscription checks and clan operations.
- **Minimal dependencies**: runs on `axios` and `dotenv`.

## Installation

### Via npm (recommended)

```bash
npm install itd-sdk-js
```

### From source

```bash
git clone https://github.com/FriceKa/ITD-SDK-js.git
cd ITD-SDK-js
npm install
```

## Configuration

1. Create `.env` in the project root from `.env.example` (or use environment variables).
2. Token: add `ITD_ACCESS_TOKEN` to .env or place `.cookies` with `refresh_token` — the client will read the token from .env or obtain it via refresh.
3. For automatic token refresh, create a `.cookies` file with cookies from the browser (must include `refresh_token`).

By default the SDK reads and writes `.env` and `.cookies` in the project root (`process.cwd()`). When the token is refreshed, changes are saved to your project. You can set `projectRoot` or explicit paths in the constructor if needed — see [API_REFERENCE.md](API_REFERENCE.md).

## Examples

### Basic requests

JavaScript

```
import { ITDClient } from 'itd-sdk-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new ITDClient();
// Token is read from .env. If only .cookies — await client.ensureAuthenticated();

// Get profile and trends
const myProfile = await client.getMyProfile();
const trending = await client.getTrendingPosts(10);

console.log(`Logged in as: ${myProfile.username}`);

```

### Statistics and notifications

JavaScript

```
// Simple unread check
if (await client.hasUnreadNotifications()) {
    const list = await client.getUnreadNotifications(5);
    console.log(list.notifications);
}

// Post statistics
const stats = await client.getPostStats('post-uuid');
console.log(`${stats.likes} likes, ${stats.views} views`);

```

## What the SDK can do

The full method list is grouped by category in the docs:

- **Posts**: trends, search, create, delete, statistics.
- **Users**: profiles, follower/following counts, clan emojis.
- **Comments**: top comments, replies, existence checks.
- **Notifications**: filter unread only, mark as read.

Full description of each method is in **[API_REFERENCE.md](API_REFERENCE.md)**.

## Wall post (post on another user's wall)

```javascript
// Post on another user's wall (wallRecipientId is resolved by the SDK)
await client.createWallPost('ITD_API', 'Test post on someone else\'s wall 🦫');
```

## Recommendations when creating posts

- **createPost** and **createWallPost** return **`null`** on any error — always check the result.
- A **120 s** timeout is used by default for file upload and post creation (`uploadTimeout` in client options) so requests don’t hang on 504 or slow networks.
- On 5xx/429 or “API returned null”, retry in your app (with backoff). See [API_REFERENCE.md](API_REFERENCE.md) for details.

## Important

This is an unofficial project. If the site’s developers change the API or add new protections, methods may temporarily stop working. Use responsibly and avoid request spam.

---

**Documentation:** [API_REFERENCE.md](API_REFERENCE.md) | **Code examples:** [examples/README.md](examples/README.md)
