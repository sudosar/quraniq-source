import fs from 'fs';

const BUG_REPORT_ENDPOINT = "https://script.google.com/macros/s/AKfycbweqp0QSloeKXyHxIAkwCzihJljrJeIrc8XPQBVK8F4oIsJzzbIVnYre976b_rVCRRL/exec";

async function testSubmitBigger() {
    console.log("Generating 12MB blank image data...");
    const hugeBase64 = "data:image/jpeg;base64," + "A".repeat(12 * 1024 * 1024);

    const payload = {
        description: "Test bug report with >10MB screenshot",
        screenshot: hugeBase64,
        screenshotError: null,
        userAgent: "Node.js Custom Script",
        screenSize: "1920x1080",
        url: "http://localhost",
        timestamp: new Date().toISOString(),
        gameMode: "test",
        darkMode: true,
        scriptVersion: "1.2.0",
        debugData: {}
    };

    try {
        const response = await fetch(BUG_REPORT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log("Status:", response.status);
        console.log("Response Text:", text);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testSubmitBigger();
