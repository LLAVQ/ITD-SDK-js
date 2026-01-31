/**
 * 🔄 Example 3: Automatic token refresh
 *
 * Shows how the SDK automatically refreshes the token when it expires.
 * You just use the API — everything works out of the box!
 */

import { ITDClient } from 'itd-sdk-js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('🔄 === Automatic token refresh ===\n');

    const client = new ITDClient();
    // Token is read from .env automatically

    console.log('💡 SDK will refresh the token automatically when it expires!');
    console.log('   You just use the API — everything works out of the box\n');

    try {
        // Make several requests
        // If the token expires, the SDK automatically:
        // 1. Detects 401
        // 2. Refreshes token via refresh endpoint
        // 3. Retries the request
        // All of this happens automatically!

        console.log('📝 Request 1: Getting my profile...');
        const profile = await client.getMyProfile();
        console.log(`   ✅ Success! Username: ${profile.username}\n`);

        console.log('📝 Request 2: Getting my posts...');
        const posts = await client.getMyPosts(5);
        console.log(`   ✅ Success! Posts: ${posts.posts.length}\n`);

        console.log('📝 Request 3: Getting notifications...');
        const notifications = await client.getNotifications(5);
        if (notifications) {
            console.log(`   ✅ Success! Notifications: ${notifications.notifications.length}\n`);
        }

        console.log('🎉 All requests completed successfully!');
        console.log('   Token was refreshed automatically when needed.\n');

        console.log('🔍 Current token:');
        console.log(`   ${client.accessToken?.substring(0, 50)}...`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\n💡 Make sure:');
        console.error('   1. ITD_ACCESS_TOKEN is set in .env');
        console.error('   2. .cookies has refresh_token cookie');
        console.error('   3. Cookies have not expired');
    }
}

main();
