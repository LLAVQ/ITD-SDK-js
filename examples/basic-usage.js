/**
 * 📝 Example 1: Basic SDK usage
 *
 * Shows how simple it is to work with the API via convenient methods.
 */

import { ITDClient } from 'itd-sdk-js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('📝 === Basic SDK usage ===\n');

    // Create client (token is read from .env automatically)
    const client = new ITDClient();

    try {
        // Get own profile
        console.log('👤 Getting my profile...');
        const profile = await client.getMyProfile();
        console.log(`   Name: ${profile.displayName}`);
        console.log(`   Username: ${profile.username}`);
        console.log(`   Clan: ${profile.avatar}`);
        console.log(`   Followers: ${profile.followersCount}`);
        console.log();

        // Get trending posts
        console.log('🔥 Getting trending posts...');
        const trending = await client.getTrendingPosts(5);
        console.log(`   Posts found: ${trending.posts.length}`);
        if (trending.posts.length > 0) {
            const firstPost = trending.posts[0];
            console.log(`   First post: ${firstPost.content?.substring(0, 50)}...`);
            console.log(`   Likes: ${firstPost.likesCount}, Views: ${firstPost.viewsCount}`);
        }
        console.log();

        // Get own posts
        console.log('📄 Getting my posts...');
        const myPosts = await client.getMyPosts(3);
        console.log(`   My posts: ${myPosts.posts.length}`);
        myPosts.posts.forEach((post, i) => {
            console.log(`   ${i + 1}. ${post.content?.substring(0, 40)}... (${post.likesCount} likes)`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();
