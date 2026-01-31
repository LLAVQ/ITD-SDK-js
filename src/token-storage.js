/**
 * Utility for saving token to .env file
 */
import fs from 'fs';
import path from 'path';

/**
 * Updates ITD_ACCESS_TOKEN in .env file
 *
 * @param {string} newToken - New access token
 * @param {string} [envPath] - Path to .env (default process.cwd() + '/.env')
 * @returns {Promise<boolean>} True on success
 */
export async function saveAccessToken(newToken, envPath = null) {
    try {
        const targetPath = envPath ?? path.join(process.cwd(), '.env');

        if (!fs.existsSync(targetPath)) {
            console.warn('⚠️  .env file not found, token not saved');
            return false;
        }

        let content = fs.readFileSync(targetPath, 'utf8');

        const tokenRegex = /^ITD_ACCESS_TOKEN=.*$/m;

        if (tokenRegex.test(content)) {
            content = content.replace(tokenRegex, `ITD_ACCESS_TOKEN=${newToken}`);
        } else {
            content += `\nITD_ACCESS_TOKEN=${newToken}\n`;
        }

        fs.writeFileSync(targetPath, content, 'utf8');
        console.log('✅ Token saved to .env');
        return true;
    } catch (error) {
        console.error('❌ Error saving token to .env:', error.message);
        return false;
    }
}

/**
 * Saves cookies to .cookies file
 *
 * @param {string} newCookieHeader - New cookie header
 * @param {string} [cookiesPath] - Path to .cookies (default process.cwd() + '/.cookies')
 * @returns {Promise<boolean>} True on success
 */
export async function saveCookieHeader(newCookieHeader, cookiesPath = null) {
    try {
        const targetPath = cookiesPath ?? path.join(process.cwd(), '.cookies');

        fs.writeFileSync(targetPath, newCookieHeader, 'utf8');
        console.log('✅ Cookies saved to .cookies');
        return true;
    } catch (error) {
        console.error('❌ Error saving cookies to .cookies:', error.message);
        return false;
    }
}
