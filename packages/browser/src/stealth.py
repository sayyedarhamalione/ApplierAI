"""Playwright stealth configuration and anti-detection patches."""

from playwright.async_api import BrowserContext


async def apply_stealth_config(context: BrowserContext) -> None:
    """Apply stealth patches to a Playwright browser context.

    Patches:
    - navigator.webdriver = false
    - Chrome runtime properties
    - Permissions query behavior
    - Plugin/mime type spoofing
    """
    await context.add_init_script("""
        // Override navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });

        // Fake Chrome runtime
        window.chrome = {
            runtime: {},
            loadTimes: function() {},
            csi: function() {},
        };

        // Override permissions query
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications'
                ? Promise.resolve({ state: Notification.permission })
                : originalQuery(parameters)
        );

        // Fake plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });

        // Fake languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
    """)
