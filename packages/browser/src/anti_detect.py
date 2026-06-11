"""Anti-detection utilities: human-like delays, mouse movement, typing patterns."""

import asyncio
import random

from playwright.async_api import Page


async def human_delay(min_s: float = 1.0, max_s: float = 4.0) -> None:
    """Random delay between actions to mimic human behavior."""
    delay = random.uniform(min_s, max_s)
    await asyncio.sleep(delay)


async def human_type(page: Page, selector: str, text: str) -> None:
    """Type text character-by-character with variable speed."""
    await page.click(selector)
    await human_delay(0.3, 0.8)

    for char in text:
        delay = random.uniform(0.03, 0.08)  # 30-80ms per character
        await page.keyboard.type(char, delay=int(delay * 1000))
        # Occasional longer pause (thinking)
        if random.random() < 0.05:
            await asyncio.sleep(random.uniform(0.2, 0.6))


async def human_click(page: Page, selector: str) -> None:
    """Click an element with a natural mouse movement and delay."""
    await human_delay(0.5, 1.5)
    element = await page.query_selector(selector)
    if element:
        box = await element.bounding_box()
        if box:
            # Move mouse with slight randomness to target center
            target_x = box["x"] + box["width"] / 2 + random.uniform(-5, 5)
            target_y = box["y"] + box["height"] / 2 + random.uniform(-3, 3)
            await page.mouse.move(target_x, target_y, steps=random.randint(5, 15))
            await human_delay(0.1, 0.3)
    await page.click(selector)


async def human_scroll(page: Page, distance: int = 300) -> None:
    """Scroll down gradually with random pauses."""
    steps = random.randint(3, 8)
    per_step = distance // steps
    for _ in range(steps):
        await page.mouse.wheel(0, per_step + random.randint(-20, 20))
        await asyncio.sleep(random.uniform(0.2, 0.8))


async def warmup_browse(page: Page, duration_s: int = 30) -> None:
    """Simulate browsing behavior before applying (session warmup).

    Randomly scrolls, pauses, and moves the mouse for the given duration.
    """
    end_time = asyncio.get_event_loop().time() + duration_s
    while asyncio.get_event_loop().time() < end_time:
        action = random.choice(["scroll", "pause", "move"])
        if action == "scroll":
            await human_scroll(page, random.randint(100, 400))
        elif action == "pause":
            await asyncio.sleep(random.uniform(2, 5))
        elif action == "move":
            x = random.randint(100, 800)
            y = random.randint(100, 600)
            await page.mouse.move(x, y, steps=random.randint(3, 10))
