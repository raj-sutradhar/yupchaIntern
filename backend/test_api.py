import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def test_twitter_api():
    TWITTER_CLONE_API_KEY = os.getenv("TWITTER_CLONE_API_KEY", "raj_d82cbbad1323484a3e4a4e6c06069c7c")
    TWITTER_CLONE_USERNAME = os.getenv("TWITTER_CLONE_USERNAME", "raj")
    TWITTER_CLONE_URL = os.getenv("TWITTER_CLONE_URL", "https://twitterclone-server-2xz2.onrender.com/post_tweet")
    
    print(f"Testing API with:")
    print(f"URL: {TWITTER_CLONE_URL}")
    print(f"API Key: {TWITTER_CLONE_API_KEY}")
    print(f"Username: {TWITTER_CLONE_USERNAME}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "username": TWITTER_CLONE_USERNAME,
                "text": "Test tweet from automation tool"
            }
            
            headers = {
                "api-key": TWITTER_CLONE_API_KEY,
                "Content-Type": "application/json"
            }
            
            response = await client.post(
                TWITTER_CLONE_URL,
                headers=headers,
                json=payload
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response Headers: {dict(response.headers)}")
            print(f"Response Body: {response.text}")
            
            if response.status_code in [200, 201]:
                print("✅ API test successful!")
            else:
                print("❌ API test failed!")
                
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_twitter_api())
