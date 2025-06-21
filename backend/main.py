from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from typing import Optional, List
import json
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
import asyncio
import uuid
import aiofiles

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Twitter Automation API")

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
        "https://*.pages.dev",
        "https://*.netlify.app","*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# File paths for persistent storage
DRAFTS_FILE = "data/drafts.json"
POSTED_TWEETS_FILE = "data/posted_tweets.json"
SCHEDULED_TWEETS_FILE = "data/scheduled_tweets.json"

# Ensure data directory exists
os.makedirs("data", exist_ok=True)

# Storage management functions
async def load_json_file(file_path: str) -> dict:
    """Load data from JSON file"""
    try:
        if os.path.exists(file_path):
            async with aiofiles.open(file_path, 'r') as f:
                content = await f.read()
                return json.loads(content) if content.strip() else {}
        return {}
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return {}

async def save_json_file(file_path: str, data: dict):
    """Save data to JSON file"""
    try:
        async with aiofiles.open(file_path, 'w') as f:
            await f.write(json.dumps(data, indent=2, default=str))
    except Exception as e:
        print(f"Error saving {file_path}: {e}")

async def get_drafts():
    """Get all drafts from file"""
    return await load_json_file(DRAFTS_FILE)

async def save_drafts(drafts: dict):
    """Save drafts to file"""
    await save_json_file(DRAFTS_FILE, drafts)

async def get_posted_tweets():
    """Get all posted tweets from file"""
    return await load_json_file(POSTED_TWEETS_FILE)

async def save_posted_tweets(posted_tweets: dict):
    """Save posted tweets to file"""
    await save_json_file(POSTED_TWEETS_FILE, posted_tweets)

async def get_scheduled_tweets():
    """Get all scheduled tweets from file"""
    return await load_json_file(SCHEDULED_TWEETS_FILE)

async def save_scheduled_tweets(scheduled_tweets: dict):
    """Save scheduled tweets to file"""
    await save_json_file(SCHEDULED_TWEETS_FILE, scheduled_tweets)

# Models
class GenerateTweetRequest(BaseModel):
    topic: str
    hashtags: Optional[str] = ""
    tone: Optional[str] = "engaging"

class PostTweetRequest(BaseModel):
    content: str

class SaveDraftRequest(BaseModel):
    content: str
    hashtags: Optional[str] = ""
    tone: Optional[str] = "engaging"

class ScheduleTweetRequest(BaseModel):
    content: str
    scheduled_time: str  # ISO format datetime string

class TweetResponse(BaseModel):
    content: str
    hashtags: list[str]

class DraftTweet(BaseModel):
    id: str
    content: str
    hashtags: str
    tone: str
    created_at: str
    updated_at: str

class PostedTweet(BaseModel):
    id: str
    content: str
    posted_at: str
    status: str

class ScheduledTweet(BaseModel):
    id: str
    content: str
    scheduled_time: str
    created_at: str
    status: str  # "pending", "posted", "failed"

# Configuration from environment
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL")
TWITTER_CLONE_API_KEY = os.getenv("TWITTER_CLONE_API_KEY")
TWITTER_CLONE_USERNAME = os.getenv("TWITTER_CLONE_USERNAME")
TWITTER_CLONE_URL = os.getenv("TWITTER_CLONE_URL")
PORT = int(os.getenv("PORT", 8000))

def get_current_utc_time():
    """Get current UTC time as timezone-aware datetime"""
    return datetime.now(timezone.utc)

def parse_datetime_string(datetime_str: str):
    """Parse datetime string and ensure it's timezone-aware"""
    try:
        # Try parsing with timezone info first
        if datetime_str.endswith('Z'):
            return datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        elif '+' in datetime_str or datetime_str.endswith(('00:00', '30:00')):
            return datetime.fromisoformat(datetime_str)
        else:
            # If no timezone info, assume UTC
            dt = datetime.fromisoformat(datetime_str)
            return dt.replace(tzinfo=timezone.utc)
    except ValueError as e:
        raise ValueError(f"Invalid datetime format: {datetime_str}. Use ISO format with timezone info.")

@app.get("/")
async def root():
    return {
        "message": "Twitter Automation API is running locally",
        "status": "healthy",
        "openrouter_configured": bool(OPENROUTER_API_KEY and len(OPENROUTER_API_KEY) > 10),
        "twitter_clone_configured": bool(TWITTER_CLONE_URL and TWITTER_CLONE_API_KEY),
        "model": OPENROUTER_MODEL,
        "environment_loaded": True
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": get_current_utc_time().isoformat()}

@app.get("/test-openrouter")
async def test_openrouter():
    """Test OpenRouter API with a simple request"""
    try:
        print(f"🔑 Testing OpenRouter API...")
        print(f"🔑 API Key: {OPENROUTER_API_KEY[:20]}... (length: {len(OPENROUTER_API_KEY)})")
        print(f"🤖 Model: {OPENROUTER_MODEL}")
        
        if not OPENROUTER_API_KEY or len(OPENROUTER_API_KEY) < 20:
            return {"success": False, "error": "API key is missing or too short"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "Twitter Automation Tool"
                },
                json={
                    "model": OPENROUTER_MODEL,
                    "messages": [{"role": "user", "content": "Say 'Hello World' in exactly 2 words."}],
                    "max_tokens": 10,
                    "temperature": 0.1
                }
            )
            
            print(f"📊 Status: {response.status_code}")
            response_text = response.text
            print(f"📄 Response: {response_text}")
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "status_code": response.status_code,
                    "content": result.get("choices", [{}])[0].get("message", {}).get("content", "No content"),
                    "model_used": result.get("model", "unknown")
                }
            else:
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "error": response_text
                }
                
    except Exception as e:
        print(f"💥 Error: {str(e)}")
        return {"success": False, "error": str(e)}

@app.get("/test-simple")
async def test_simple():
    """Simple test with minimal request"""
    try:
        print(f"🧪 Testing with minimal request...")
        
        if not OPENROUTER_API_KEY:
            return {"success": False, "error": "No API key found"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "Twitter Automation Tool"
                },
                json={
                    "model": "google/gemini-flash-1.5",
                    "messages": [
                        {"role": "user", "content": "Say hello"}
                    ],
                    "max_tokens": 50
                }
            )
            
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "response": result
                }
            else:
                return {
                    "success": False,
                    "status": response.status_code,
                    "error": response.text
                }
                
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/debug-api-key")
async def debug_api_key():
    """Debug API key loading"""
    try:
        print(f"🔍 Debugging API key...")
        print(f"🔑 Raw API Key from env: '{OPENROUTER_API_KEY}'")
        print(f"📏 API Key length: {len(OPENROUTER_API_KEY) if OPENROUTER_API_KEY else 0}")
        print(f"🔤 API Key starts with: {OPENROUTER_API_KEY[:10] if OPENROUTER_API_KEY else 'None'}...")
        print(f"🔤 API Key ends with: ...{OPENROUTER_API_KEY[-10:] if OPENROUTER_API_KEY else 'None'}")
        
        # Test with a very simple request
        if not OPENROUTER_API_KEY:
            return {"error": "API key is None"}
        
        # Check for common issues
        issues = []
        if len(OPENROUTER_API_KEY) < 50:
            issues.append("API key seems too short")
        if not OPENROUTER_API_KEY.startswith('sk-or-v1-'):
            issues.append("API key doesn't start with expected prefix")
        if ' ' in OPENROUTER_API_KEY:
            issues.append("API key contains spaces")
        if '\n' in OPENROUTER_API_KEY or '\r' in OPENROUTER_API_KEY:
            issues.append("API key contains newlines")
        
        return {
            "api_key_length": len(OPENROUTER_API_KEY),
            "api_key_prefix": OPENROUTER_API_KEY[:20],
            "api_key_suffix": OPENROUTER_API_KEY[-10:],
            "issues": issues,
            "model": OPENROUTER_MODEL
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.post("/generate-tweet")
async def generate_tweet(request: GenerateTweetRequest):
    try:
        print(f"\n🎯 === GENERATING TWEET ===")
        print(f"📝 Topic: {request.topic}")
        print(f"🏷️ Hashtags: {request.hashtags}")
        print(f"🎭 Tone: {request.tone}")
        print(f"🔑 API Key: {OPENROUTER_API_KEY[:20] if OPENROUTER_API_KEY else 'MISSING'}...")
        print(f"🤖 Model: {OPENROUTER_MODEL}")
        
        # Validate inputs
        if not request.topic or not request.topic.strip():
            raise HTTPException(status_code=400, detail="Topic cannot be empty")
        
        if not OPENROUTER_API_KEY:
            raise HTTPException(status_code=500, detail="OpenRouter API key is missing")
        
        if len(OPENROUTER_API_KEY) < 20:
            raise HTTPException(status_code=500, detail="OpenRouter API key appears to be invalid (too short)")
        
        # Create a simple, clear prompt optimized for Gemini
        prompt = f"""Write a {request.tone} tweet about: {request.topic}

Requirements:
- Maximum 280 characters
- Engaging and natural tone
- Include 1-2 relevant hashtags
- No quotes around the response

Tweet:"""
        
        print(f"📝 Prompt: {prompt}")
        
        # Make API call with proper headers for Gemini
        async with httpx.AsyncClient(timeout=45.0) as client:  # Increased timeout
            print("📡 Making OpenRouter API call...")
            
            payload = {
                "model": OPENROUTER_MODEL,
                "messages": [
                    {
                        "role": "system", 
                        "content": "You are a social media expert who writes engaging tweets. Respond with ONLY the tweet content, no quotes, no extra text, no explanations."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                "max_tokens": 150,  # Increased for Gemini
                "temperature": 0.7,
                "top_p": 0.9,
                "frequency_penalty": 0,
                "presence_penalty": 0
            }
            
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Twitter Automation Tool"
            }
            
            print(f"📦 Payload: {json.dumps(payload, indent=2)}")
            
            try:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload
                )
            except httpx.TimeoutException:
                print("⏰ Request timed out")
                raise HTTPException(status_code=408, detail="Request timeout - OpenRouter API took too long to respond")
            except httpx.RequestError as e:
                print(f"🌐 Network error: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Network error connecting to OpenRouter: {str(e)}")
            
            print(f"📊 Response Status: {response.status_code}")
            print(f"📄 Response Headers: {dict(response.headers)}")
            
            # Get response text for debugging
            response_text = response.text
            print(f"📄 Raw Response: {response_text}")
            
            if response.status_code != 200:
                print(f"❌ Error Response: {response_text}")
                
                # Try to parse error for better message
                try:
                    error_json = response.json()
                    error_message = error_json.get("error", {}).get("message", response_text)
                    error_code = error_json.get("error", {}).get("code", "unknown")
                    print(f"❌ Parsed Error: {error_message} (Code: {error_code})")
                except:
                    error_message = response_text
                
                # Handle specific error cases
                if response.status_code == 401:
                    raise HTTPException(status_code=500, detail="Invalid OpenRouter API key")
                elif response.status_code == 429:
                    raise HTTPException(status_code=500, detail="Rate limit exceeded. Please try again in a moment.")
                elif response.status_code == 400:
                    raise HTTPException(status_code=500, detail=f"Bad request to OpenRouter: {error_message}")
                else:
                    raise HTTPException(
                        status_code=500, 
                        detail=f"OpenRouter API error ({response.status_code}): {error_message}"
                    )
            
            # Parse response
            try:
                result = response.json()
                print(f"✅ Parsed JSON Response: {json.dumps(result, indent=2)}")
            except json.JSONDecodeError as e:
                print(f"❌ JSON Parse Error: {str(e)}")
                print(f"❌ Raw Response Text: {response_text}")
                raise HTTPException(status_code=500, detail="Invalid JSON response from OpenRouter API")
            
            # Extract content with better error handling
            if "choices" not in result:
                print(f"❌ No 'choices' in response: {result}")
                raise HTTPException(status_code=500, detail="Invalid response format from OpenRouter - no choices")
            
            if not result["choices"]:
                print(f"❌ Empty choices array: {result}")
                raise HTTPException(status_code=500, detail="Empty response from OpenRouter")
            
            choice = result["choices"][0]
            print(f"📋 First choice: {choice}")
            
            if "message" not in choice:
                print(f"❌ No 'message' in choice: {choice}")
                raise HTTPException(status_code=500, detail="Invalid choice format - no message")
            
            if "content" not in choice["message"]:
                print(f"❌ No 'content' in message: {choice['message']}")
                raise HTTPException(status_code=500, detail="Invalid message format - no content")
            
            generated_content = choice["message"]["content"]
            
            if not generated_content:
                print(f"❌ Empty content: {generated_content}")
                raise HTTPException(status_code=500, detail="Empty content from OpenRouter")
            
            generated_content = generated_content.strip()
            
            # Clean up the content (remove quotes if present)
            if generated_content.startswith('"') and generated_content.endswith('"'):
                generated_content = generated_content[1:-1]
            
            # Remove any "Tweet:" prefix if present
            if generated_content.lower().startswith('tweet:'):
                generated_content = generated_content[6:].strip()
            
            print(f"✅ Generated Content: {generated_content}")
            print(f"📏 Content Length: {len(generated_content)} characters")
            
            # Extract hashtags
            hashtags = [word for word in generated_content.split() if word.startswith('#')]
            print(f"🏷️ Extracted Hashtags: {hashtags}")
            
            return TweetResponse(content=generated_content, hashtags=hashtags)
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.post("/save-draft")
async def save_draft(request: SaveDraftRequest):
    try:
        draft_id = str(uuid.uuid4())
        current_time = get_current_utc_time().isoformat()
        
        draft = DraftTweet(
            id=draft_id,
            content=request.content,
            hashtags=request.hashtags,
            tone=request.tone,
            created_at=current_time,
            updated_at=current_time
        )
        
        # Load existing drafts and add new one
        drafts_storage = await get_drafts()
        drafts_storage[draft_id] = draft.dict()
        await save_drafts(drafts_storage)
        
        return {"success": True, "draft_id": draft_id, "message": "Draft saved successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving draft: {str(e)}")

@app.get("/drafts")
async def get_drafts_endpoint():
    try:
        drafts_storage = await get_drafts()
        drafts = list(drafts_storage.values())
        # Sort by updated_at descending
        drafts.sort(key=lambda x: x['updated_at'], reverse=True)
        return {"drafts": drafts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching drafts: {str(e)}")

@app.put("/drafts/{draft_id}")
async def update_draft(draft_id: str, request: SaveDraftRequest):
    try:
        drafts_storage = await get_drafts()
        
        if draft_id not in drafts_storage:
            raise HTTPException(status_code=404, detail="Draft not found")
        
        current_time = get_current_utc_time().isoformat()
        
        drafts_storage[draft_id].update({
            "content": request.content,
            "hashtags": request.hashtags,
            "tone": request.tone,
            "updated_at": current_time
        })
        
        await save_drafts(drafts_storage)
        
        return {"success": True, "message": "Draft updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating draft: {str(e)}")

@app.delete("/drafts/{draft_id}")
async def delete_draft(draft_id: str):
    try:
        drafts_storage = await get_drafts()
        
        if draft_id not in drafts_storage:
            raise HTTPException(status_code=404, detail="Draft not found")
        
        del drafts_storage[draft_id]
        await save_drafts(drafts_storage)
        
        return {"success": True, "message": "Draft deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting draft: {str(e)}")

@app.post("/post-tweet")
async def post_tweet(request: PostTweetRequest):
    try:
        print(f"\n🚀 === POSTING TWEET ===")
        print(f"📝 Content: {request.content}")
        
        # Post to Twitter Clone API
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "username": TWITTER_CLONE_USERNAME,
                "text": request.content
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
            
            if response.status_code not in [200, 201]:
                error_detail = f"Status: {response.status_code}, Response: {response.text}"
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Failed to post tweet: {error_detail}"
                )
            
            # Save to posted tweets
            posted_id = str(uuid.uuid4())
            posted_tweet = PostedTweet(
                id=posted_id,
                content=request.content,
                posted_at=get_current_utc_time().isoformat(),
                status="posted"
            )
            
            posted_tweets_storage = await get_posted_tweets()
            posted_tweets_storage[posted_id] = posted_tweet.dict()
            await save_posted_tweets(posted_tweets_storage)
            
            return {
                "success": True,
                "message": f"✅ Successfully posted to Twitter Clone!",
                "content": request.content,
                "verify_url": "https://twitter-clone-ui.pages.dev",
                "posted_id": posted_id
            }
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Request timeout - Twitter Clone API is slow to respond")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/posted-tweets")
async def get_posted_tweets_endpoint():
    try:
        posted_tweets_storage = await get_posted_tweets()
        posted = list(posted_tweets_storage.values())
        # Sort by posted_at descending
        posted.sort(key=lambda x: x['posted_at'], reverse=True)
        return {"posted_tweets": posted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching posted tweets: {str(e)}")

@app.post("/schedule-tweet")
async def schedule_tweet(request: ScheduleTweetRequest):
    try:
        # Parse and validate the scheduled time
        try:
            scheduled_datetime = parse_datetime_string(request.scheduled_time)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Check if the scheduled time is in the future
        current_time = get_current_utc_time()
        if scheduled_datetime <= current_time:
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
        
        scheduled_id = str(uuid.uuid4())
        scheduled_tweet = ScheduledTweet(
            id=scheduled_id,
            content=request.content,
            scheduled_time=scheduled_datetime.isoformat(),
            created_at=current_time.isoformat(),
            status="pending"
        )
        
        scheduled_tweets_storage = await get_scheduled_tweets()
        scheduled_tweets_storage[scheduled_id] = scheduled_tweet.dict()
        await save_scheduled_tweets(scheduled_tweets_storage)
        
        return {
            "success": True,
            "scheduled_id": scheduled_id,
            "message": f"Tweet scheduled successfully for {scheduled_datetime.strftime('%Y-%m-%d %H:%M:%S UTC')}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scheduling tweet: {str(e)}")

@app.get("/scheduled-tweets")
async def get_scheduled_tweets_endpoint():
    try:
        scheduled_tweets_storage = await get_scheduled_tweets()
        scheduled = list(scheduled_tweets_storage.values())
        # Sort by scheduled_time ascending
        scheduled.sort(key=lambda x: x['scheduled_time'])
        return {"scheduled_tweets": scheduled}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching scheduled tweets: {str(e)}")

@app.delete("/scheduled-tweets/{scheduled_id}")
async def cancel_scheduled_tweet(scheduled_id: str):
    try:
        scheduled_tweets_storage = await get_scheduled_tweets()
        
        if scheduled_id not in scheduled_tweets_storage:
            raise HTTPException(status_code=404, detail="Scheduled tweet not found")
        
        del scheduled_tweets_storage[scheduled_id]
        await save_scheduled_tweets(scheduled_tweets_storage)
        
        return {"success": True, "message": "Scheduled tweet cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cancelling scheduled tweet: {str(e)}")

# Background task to check and post scheduled tweets
async def check_scheduled_tweets():
    while True:
        try:
            current_time = get_current_utc_time()
            scheduled_tweets_storage = await get_scheduled_tweets()
            posted_tweets_storage = await get_posted_tweets()
            
            tweets_to_update = {}
            
            for scheduled_id, tweet_data in scheduled_tweets_storage.items():
                if tweet_data['status'] != 'pending':
                    continue
                
                try:
                    scheduled_time = parse_datetime_string(tweet_data['scheduled_time'])
                except ValueError:
                    print(f"Invalid datetime format for tweet {scheduled_id}: {tweet_data['scheduled_time']}")
                    continue
                
                if current_time >= scheduled_time:
                    try:
                        # Post the tweet
                        async with httpx.AsyncClient(timeout=30.0) as client:
                            payload = {
                                "username": TWITTER_CLONE_USERNAME,
                                "text": tweet_data['content']
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
                            
                            if response.status_code in [200, 201]:
                                # Mark as posted and move to posted tweets
                                tweets_to_update[scheduled_id] = 'posted'
                                
                                posted_id = str(uuid.uuid4())
                                posted_tweet = PostedTweet(
                                    id=posted_id,
                                    content=tweet_data['content'],
                                    posted_at=current_time.isoformat(),
                                    status="posted_scheduled"
                                )
                                
                                posted_tweets_storage[posted_id] = posted_tweet.dict()
                                
                                print(f"✅ Scheduled tweet posted successfully: {tweet_data['content'][:50]}...")
                            else:
                                # Mark as failed
                                tweets_to_update[scheduled_id] = 'failed'
                                print(f"❌ Failed to post scheduled tweet: {response.text}")
                                
                    except Exception as e:
                        # Mark as failed
                        tweets_to_update[scheduled_id] = 'failed'
                        print(f"❌ Error posting scheduled tweet: {str(e)}")
            
            # Update statuses and save files
            if tweets_to_update:
                for scheduled_id, new_status in tweets_to_update.items():
                    if scheduled_id in scheduled_tweets_storage:
                        scheduled_tweets_storage[scheduled_id]['status'] = new_status
                
                await save_scheduled_tweets(scheduled_tweets_storage)
                await save_posted_tweets(posted_tweets_storage)
            
        except Exception as e:
            print(f"Error in scheduled tweets checker: {str(e)}")
        
        # Check every 30 seconds
        await asyncio.sleep(30)

# Start the background task when the app starts
@app.on_event("startup")
async def startup_event():
    print("🚀 Starting Twitter Automation API...")
    print("📁 Initializing persistent storage...")
    
    # Initialize empty files if they don't exist
    for file_path in [DRAFTS_FILE, POSTED_TWEETS_FILE, SCHEDULED_TWEETS_FILE]:
        if not os.path.exists(file_path):
            await save_json_file(file_path, {})
    
    print("⏰ Starting scheduled tweets checker...")
    asyncio.create_task(check_scheduled_tweets())
    print("✅ Twitter Automation API is ready!")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Twitter Automation API locally...")
    print(f"🔑 OpenRouter API Key: {'✅ Configured' if OPENROUTER_API_KEY and len(OPENROUTER_API_KEY) > 10 else '❌ Missing'}")
    print(f"🤖 Model: {OPENROUTER_MODEL}")
    print(f"🐦 Twitter Clone URL: {TWITTER_CLONE_URL}")
    print(f"🔑 Twitter Clone API Key: {'✅ Configured' if TWITTER_CLONE_API_KEY else '❌ Missing'}")
    print("📡 Server will run on: http://localhost:8000")
    
    # Run with app string to enable reload
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
