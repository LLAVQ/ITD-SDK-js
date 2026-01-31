/**
 * Token handling with multiple requests
 *
 * Demonstrates proper handling of token expiration
 * when publishing several posts with delays between them
 */

import { ITDClient } from '../src/client.js';
import dotenv from 'dotenv';

dotenv.config();

async function publishMultiplePosts() {
    const client = new ITDClient();

    console.log('📝 Publishing multiple posts with token check\n');

    // Check for refresh_token
    if (!client.hasRefreshToken()) {
        console.error('❌ WARNING: refresh_token not found in cookies!');
        console.error('💡 Solution:');
        console.error('   1. Open итд.com in the browser and log in');
        console.error('   2. Open DevTools (F12) → Network');
        console.error('   3. Find any request to итд.com');
        console.error('   4. Copy the Cookie header value');
        console.error('   5. Paste into .cookies in the project root');
        console.error('   6. Ensure Cookie contains refresh_token\n');
        console.error('⚠️  Without refresh_token the token will not refresh automatically!\n');
    } else {
        console.log('✅ Refresh token found — token will refresh automatically\n');
    }

    const posts = [
        { text: 'First post', image: 'image1.jpg' },
        { text: 'Second post', image: 'image2.jpg' },
        { text: 'Third post', image: 'image3.jpg' }
    ];

    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        console.log(`📝 Publishing post ${i + 1}/${posts.length}...`);

        try {
            // IMPORTANT: Validate and refresh token before each request
            // Especially important when there are long gaps between requests
            const tokenValid = await client.validateAndRefreshToken();

            if (!tokenValid) {
                console.error(`❌ Token invalid and refresh failed`);
                console.error(`   Skipping post: ${post.text}`);
                continue;
            }

            const result = await client.createPost(post.text, post.image);

            if (result) {
                console.log(`✅ Post ${i + 1} published: ${result.id}\n`);
            } else {
                console.error(`❌ Failed to publish post ${i + 1}\n`);
            }

        } catch (error) {
            console.error(`❌ Error publishing post ${i + 1}: ${error.message}\n`);
        }

        if (i < posts.length - 1) {
            console.log('⏳ Waiting before next post...\n');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log('✅ All posts processed');
}

async function main() {
    try {
        await publishMultiplePosts();
    } catch (error) {
        console.error('❌ Critical error:', error.message);
        process.exit(1);
    }
}

main();
