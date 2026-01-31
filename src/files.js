/**
 * File operations module
 */
import fs from 'fs';
import FormData from 'form-data';

export class FilesManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Uploads file to server. POST /api/files/upload.
     * Supports images and audio (audio/ogg for voice comments).
     * Timeout — client.uploadTimeout (default 120 s). Returns null on error.
     *
     * @param {string} filePath - Path to file
     * @returns {Promise<Object|null>} { id, url, filename, mimeType, size } or null on error
     */
    async uploadFile(filePath) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Error: must be logged in');
            return null;
        }

        try {
            if (!fs.existsSync(filePath)) {
                console.error(`Error: file ${filePath} not found`);
                return null;
            }

            const uploadUrl = `${this.client.baseUrl}/api/files/upload`;

            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));

            const response = await this.axios.post(uploadUrl, formData, {
                timeout: this.client.uploadTimeout ?? 120000,
                headers: {
                    ...formData.getHeaders(),
                }
            });

            if (response.status === 200 || response.status === 201) {
                return response.data;
            } else {
                console.error(`File upload error: ${response.status} - ${JSON.stringify(response.data)}`);
                return null;
            }
        } catch (error) {
            console.error('Exception during file upload:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Gets file info. GET /api/files/{id}
     *
     * @param {string} fileId - File ID
     * @returns {Promise<Object|null>} { id, url, filename, mimeType, size, ... } or null
     */
    async getFile(fileId) {
        if (!await this.client.auth.checkAuth()) return null;
        try {
            const url = `${this.client.baseUrl}/api/files/${fileId}`;
            const response = await this.axios.get(url);
            if (response.status === 200) {
                return response.data?.data ?? response.data;
            }
            return null;
        } catch (error) {
            console.error('Error getting file:', error.message);
            return null;
        }
    }

    /**
     * Deletes file. DELETE /api/files/{id}
     *
     * @param {string} fileId - File ID
     * @returns {Promise<boolean>} True on success
     */
    async deleteFile(fileId) {
        if (!await this.client.auth.checkAuth()) return false;
        try {
            const url = `${this.client.baseUrl}/api/files/${fileId}`;
            const response = await this.axios.delete(url);
            return response.status === 200 || response.status === 204;
        } catch (error) {
            console.error('Error deleting file:', error.message);
            return false;
        }
    }
}
