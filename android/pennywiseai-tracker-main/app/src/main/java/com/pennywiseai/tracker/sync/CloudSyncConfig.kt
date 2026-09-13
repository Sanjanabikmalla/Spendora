package com.pennywiseai.tracker.sync

/**
 * Configuration for PennyWise Cloud & Web Synchronization
 */
object CloudSyncConfig {
    // Default local network / emulator endpoint. On physical device on Wi-Fi, change to your machine's IP (e.g., http://192.168.0.x:5000/api)
    // or standard localhost for emulator (http://192.168.0.5:5000/api)
    const val DEFAULT_SYNC_URL = "http://192.168.0.5:5000/api/transactions/sync"
    
    // Shared PennyWise Demo User ID
    const val DEFAULT_USER_ID = "user_pennywise_01"
    
    // Header keys
    const val HEADER_AUTHORIZATION = "Authorization"
    const val HEADER_CONTENT_TYPE = "Content-Type"
}
