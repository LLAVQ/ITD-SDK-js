/**
 * 🚀 QUICK START — ITD SDK
 *
 * This example shows the main SDK features with detailed comments.
 * Ideal for anyone new to the library.
 *
 * BEFORE RUNNING:
 * 1. Install dependencies: npm install
 * 2. Copy .env.example to .env and set ITD_ACCESS_TOKEN
 * 3. Create .cookies and paste browser cookies into it
 * 4. Run: node examples/quick-start.js
 */

import { ITDClient } from 'itd-sdk-js';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

async function quickStart() {
    console.log('🚀 === ITD SDK - Quick Start ===\n');

    // ============================================
    // STEP 1: Create client
    // ============================================
    console.log('📦 Step 1: Creating client...\n');

    // Create client instance
    // The client automatically:
    // - Loads config from .env (ITD_BASE_URL, ITD_USER_AGENT, etc.)
    // - Loads cookies from .cookies
    // - Configures automatic token refresh
    const client = new ITDClient();

    console.log('✅ Client created\n');

    // ============================================
    // STEP 2: Auth setup
    // ============================================
    console.log('🔐 Step 2: Checking auth...\n');

    // Token is read from .env automatically. If missing — try refresh from .cookies
    if (!client.accessToken && client.hasRefreshToken()) {
        console.log('   No token in .env, getting it via refresh from .cookies...\n');
        const ok = await client.ensureAuthenticated();
        if (!ok) {
            console.log('❌ Failed to get token from refresh_token\n');
            return;
        }
    }
    if (!client.accessToken) {
        console.log('❌ No token. Add ITD_ACCESS_TOKEN to .env or refresh_token to .cookies\n');
        console.log('📋 How to get a token:');
        console.log('1. Open итд.com in the browser and log in');
        console.log('2. DevTools (F12) → Network → copy Cookie into .cookies');
        console.log('3. Or copy accessToken from /api/v1/auth/refresh response into .env\n');
        return;
    }
    console.log('✅ Auth configured\n');

    // ============================================
    // STEP 3: Get current user info
    // ============================================
    console.log('👤 Step 3: Getting current user info...\n');

    const myProfile = await client.getMyProfile();

    if (myProfile) {
        console.log('✅ Profile loaded:');
        console.log(`   Name: ${myProfile.displayName}`);
        console.log(`   Username: @${myProfile.username}`);
        console.log(`   Clan (emoji): ${myProfile.avatar}`);
        console.log(`   Followers: ${myProfile.followersCount || 0}`);
        console.log(`   Following: ${myProfile.followingCount || 0}`);
        console.log(`   Posts: ${myProfile.postsCount || 0}\n`);
    } else {
        console.log('⚠️  Failed to get profile (token may be invalid)\n');
        return;
    }

    // ============================================
    // STEP 4: Get user posts
    // ============================================
    console.log('📰 Step 4: Getting user posts...\n');

    const username = myProfile.username;
    const postsResult = await client.getPosts(username, 5, 'new');

    if (postsResult && postsResult.posts.length > 0) {
        console.log(`✅ Found ${postsResult.posts.length} posts\n`);

        const firstPost = postsResult.posts[0];
        console.log('📝 First post:');
        console.log(`   ID: ${firstPost.id}`);
        console.log(`   Text: ${(firstPost.content || 'No text').substring(0, 100)}...`);
        console.log(`   Likes: ${firstPost.likesCount || 0}`);
        console.log(`   Comments: ${firstPost.commentsCount || 0}`);
        console.log(`   Views: ${firstPost.viewsCount || 0}`);
        console.log(`   Date: ${new Date(firstPost.createdAt).toLocaleString()}\n`);

        const postId = firstPost.id;

        // ============================================
        // STEP 5: Like post
        // ============================================
        console.log('❤️  Step 5: Liking first post...\n');

        const likeResult = await client.likePost(postId);

        if (likeResult) {
            console.log(`✅ Liked! Total likes: ${likeResult.likesCount}\n`);
        } else {
            console.log('⚠️  Failed to like (may already be liked)\n');
        }

        // ============================================
        // STEP 6: Get comments
        // ============================================
        console.log('💬 Step 6: Getting post comments...\n');

        const commentsResult = await client.getComments(postId, 5, 'new');

        if (commentsResult && commentsResult.comments.length > 0) {
            console.log(`✅ Found ${commentsResult.comments.length} comments\n`);

            const firstComment = commentsResult.comments[0];
            console.log('💬 First comment:');
            console.log(`   Author: @${firstComment.author.username}`);
            console.log(`   Text: ${(firstComment.content || '').substring(0, 80)}...`);
            console.log(`   Likes: ${firstComment.likesCount || 0}\n`);
        } else {
            console.log('📝 No comments yet\n');
        }

        // ============================================
        // STEP 7: Add comment
        // ============================================
        console.log('✍️  Step 7: Adding comment to post...\n');

        const commentText = 'Great post! 👍';
        const newComment = await client.addComment(postId, commentText);

        if (newComment) {
            console.log(`✅ Comment added! ID: ${newComment.id}\n`);
        } else {
            console.log('⚠️  Failed to add comment\n');
        }
    } else {
        console.log('📝 No posts found\n');
    }

    // ============================================
    // STEP 8: Get another user's profile
    // ============================================
    console.log('🔍 Step 8: Getting another user profile...\n');

    const otherUsername = 'nowkie';
    const otherProfile = await client.getUserProfile(otherUsername);

    if (otherProfile) {
        console.log(`✅ Profile @${otherUsername}:`);
        console.log(`   Name: ${otherProfile.displayName}`);
        console.log(`   Clan: ${otherProfile.avatar}`);
        console.log(`   Followers: ${otherProfile.followersCount || 0}`);
        console.log(`   Posts: ${otherProfile.postsCount || 0}`);
        console.log(`   Verified: ${otherProfile.verified ? '✅' : '❌'}\n`);
    } else {
        console.log(`⚠️  User @${otherUsername} not found\n`);
    }

    // ============================================
    // STEP 9: Search users
    // ============================================
    console.log('🔎 Step 9: Searching users...\n');

    const searchQuery = 'itd';
    const searchResult = await client.searchUsers(searchQuery, 3);

    if (searchResult && searchResult.length > 0) {
        console.log(`✅ Found ${searchResult.length} users\n`);
        searchResult.forEach((user, index) => {
            console.log(`   ${index + 1}. @${user.username} - ${user.displayName} (${user.followersCount} followers)`);
        });
        console.log();
    } else {
        console.log('📝 No users found\n');
    }

    // ============================================
    // STEP 10: Get notifications
    // ============================================
    console.log('🔔 Step 10: Getting notifications...\n');

    const notificationsResult = await client.getNotifications(5, 0);

    if (notificationsResult && notificationsResult.notifications.length > 0) {
        console.log(`✅ Found ${notificationsResult.notifications.length} notifications\n`);

        const firstNotification = notificationsResult.notifications[0];
        console.log('🔔 First notification:');
        console.log(`   Type: ${firstNotification.type || 'N/A'}`);
        console.log(`   Read: ${firstNotification.read ? '✅' : '❌'}`);
        console.log(`   Date: ${new Date(firstNotification.createdAt).toLocaleString()}\n`);
    } else {
        console.log('📭 No notifications\n');
    }

    // ============================================
    // STEP 11: Get trending hashtags
    // ============================================
    console.log('🏷️  Step 11: Getting trending hashtags...\n');

    const hashtagsResult = await client.getTrendingHashtags(5);

    if (hashtagsResult && hashtagsResult.hashtags.length > 0) {
        console.log(`✅ Found ${hashtagsResult.hashtags.length} hashtags\n`);
        hashtagsResult.hashtags.forEach((hashtag, index) => {
            console.log(`   ${index + 1}. #${hashtag.name} - ${hashtag.postsCount} posts`);
        });
        console.log();
    } else {
        console.log('📝 No hashtags found\n');
    }

    // ============================================
    // STEP 12: Get popular posts (feed)
    // ============================================
    console.log('🔥 Step 12: Getting popular posts...\n');

    const popularPosts = await client.getFeedPopular(3);

    if (popularPosts && popularPosts.posts.length > 0) {
        console.log(`✅ Found ${popularPosts.posts.length} popular posts\n`);

        const topPost = popularPosts.posts[0];
        console.log('🔥 Top post:');
        console.log(`   Author: @${topPost.author.username}`);
        console.log(`   Likes: ${topPost.likesCount}`);
        console.log(`   Views: ${topPost.viewsCount}`);
        console.log(`   Text: ${(topPost.content || 'No text').substring(0, 60)}...\n`);
    } else {
        console.log('📝 No popular posts found\n');
    }

    // ============================================
    // DONE
    // ============================================
    console.log('✅ === Quick Start complete! ===\n');
    console.log('📚 What next?');
    console.log('1. Read API_REFERENCE.md for the full method list');
    console.log('2. Try other examples in examples/');
    console.log('3. Build your project with ITD SDK!\n');
}

(async () => {
    try {
        await quickStart();
    } catch (error) {
        console.error('\n❌ ERROR:');
        console.error(error.message);

        if (error.response) {
            console.error('\n📋 Error details:');
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }

        console.error('\n💡 Things to check:');
        console.error('1. ITD_ACCESS_TOKEN is set in .env');
        console.error('2. .cookies exists and contains refresh_token');
        console.error('3. Update token in .env from browser (DevTools → Network → /api/v1/auth/refresh)');
        console.error('4. Update cookies in .cookies from browser\n');

        process.exit(1);
    }
})();
