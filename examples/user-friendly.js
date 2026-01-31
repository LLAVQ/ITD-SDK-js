/**
 * ✨ Example 2: User-friendly methods
 *
 * Demonstrates the benefits of the SDK's convenience methods.
 * Shows how easy it is to work with data without complex requests.
 */

import { ITDClient } from 'itd-sdk-js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('✨ === User-friendly SDK methods ===\n');

    const client = new ITDClient();

    try {
        // Example 1: Subscription check — one line instead of a full request
        console.log('1️⃣  Subscription check:');
        const username = 'BobrishYa';
        const isFollowing = await client.isFollowing(username);
        console.log(`   Following ${username}: ${isFollowing ? '✅ Yes' : '❌ No'}`);
        console.log();

        // Example 2: Post statistics — simple and clear
        console.log('2️⃣  Post statistics:');
        const postId = '936bd898-f1f4-4fcd-a498-f3a7ee8e67bb'; // Replace with real ID
        const stats = await client.getPostStats(postId);
        if (stats) {
            console.log(`   Likes: ${stats.likes}`);
            console.log(`   Views: ${stats.views}`);
            console.log(`   Comments: ${stats.comments}`);
            console.log(`   Reposts: ${stats.reposts}`);
        } else {
            console.log('   Post not found');
        }
        console.log();

        // Example 3: Notifications check — quick and easy
        console.log('3️⃣  Notifications check:');
        const hasUnread = await client.hasUnreadNotifications();
        if (hasUnread) {
            const unread = await client.getUnreadNotifications(5);
            console.log(`   Unread: ${unread.notifications.length}`);
            unread.notifications.forEach((notif, i) => {
                console.log(`   ${i + 1}. ${notif.type} - ${notif.read ? '✅' : '🔔'}`);
            });
        } else {
            console.log('   No unread notifications');
        }
        console.log();

        // Example 4: User clan — simple
        console.log('4️⃣  User clan:');
        const myClan = await client.getMyClan();
        const userClan = await client.getUserClan(username);
        console.log(`   My clan: ${myClan}`);
        console.log(`   ${username} clan: ${userClan}`);
        console.log();

        // Example 5: Latest post — convenient
        console.log('5️⃣  User latest post:');
        const latestPost = await client.getUserLatestPost(username);
        if (latestPost) {
            console.log(`   Latest post: ${latestPost.content?.substring(0, 60)}...`);
            console.log(`   Likes: ${latestPost.likesCount}, Views: ${latestPost.viewsCount}`);
        } else {
            console.log('   No posts found');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();
