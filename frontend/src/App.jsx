"use client";

import { createSignal, Show, For, onMount, createEffect } from "solid-js";
import toast, { Toaster } from "solid-toast";

const API_BASE_URL = "http://localhost:8000";

const HASHTAG_SUGGESTIONS = [
  "#tech",
  "#ai",
  "#startup",
  "#innovation",
  "#coding",
  "#webdev",
  "#javascript",
  "#python",
  "#react",
  "#nodejs",
  "#productivity",
  "#entrepreneur",
  "#business",
  "#marketing",
  "#design",
  "#ux",
];

const TONE_OPTIONS = [
  { value: "engaging", label: "Engaging", emoji: "✨" },
  { value: "professional", label: "Professional", emoji: "💼" },
  { value: "casual", label: "Casual", emoji: "😊" },
  { value: "humorous", label: "Humorous", emoji: "😄" },
  { value: "inspirational", label: "Inspirational", emoji: "🚀" },
];

const TABS = [
  { id: "generate", label: "Generate", emoji: "✨" },
  { id: "drafts", label: "Drafts", emoji: "📝" },
  { id: "scheduled", label: "Scheduled", emoji: "⏰" },
  { id: "posted", label: "Posted", emoji: "📤" },
];

function FloatingOrb({
  delay = 0,
  size = 200,
  position = { top: "10%", left: "-5%" },
  color = "blue",
}) {
  return (
    <div
      class={`floating-orb floating-orb-${color}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        top: position.top,
        left: position.left,
        right: position.right,
        bottom: position.bottom,
        "animation-delay": `${delay}s`,
      }}
    />
  );
}

function GridPattern() {
  return (
    <div class="grid-pattern">
      <div class="grid-lines"></div>
    </div>
  );
}

function App() {
  // Animation states
  const [isLoaded, setIsLoaded] = createSignal(false);
  const [headerVisible, setHeaderVisible] = createSignal(false);
  const [contentVisible, setContentVisible] = createSignal(false);

  // Main state
  const [activeTab, setActiveTab] = createSignal("generate");
  const [topic, setTopic] = createSignal("");
  const [selectedHashtags, setSelectedHashtags] = createSignal([]);
  const [customHashtags, setCustomHashtags] = createSignal("");
  const [selectedTone, setSelectedTone] = createSignal("engaging");
  const [generatedTweet, setGeneratedTweet] = createSignal("");
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [isPosting, setIsPosting] = createSignal(false);
  const [isEditing, setIsEditing] = createSignal(false);
  const [editedTweet, setEditedTweet] = createSignal("");
  const [successMessage, setSuccessMessage] = createSignal("");
  const [errorMessage, setErrorMessage] = createSignal("");

  // Drafts state
  const [drafts, setDrafts] = createSignal([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = createSignal(false);
  const [editingDraftId, setEditingDraftId] = createSignal(null);
  const [editingDraftContent, setEditingDraftContent] = createSignal("");

  // Posted tweets state
  const [postedTweets, setPostedTweets] = createSignal([]);
  const [isLoadingPosted, setIsLoadingPosted] = createSignal(false);

  // Scheduled tweets state
  const [scheduledTweets, setScheduledTweets] = createSignal([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = createSignal(false);
  const [scheduledTime, setScheduledTime] = createSignal("");

  // Posting state for individual drafts
  const [postingDraftId, setPostingDraftId] = createSignal(null);

  // Initialize animations on mount
  onMount(() => {
    setTimeout(() => setIsLoaded(true), 100);
    setTimeout(() => setHeaderVisible(true), 300);
    setTimeout(() => setContentVisible(true), 600);
  });

  // Load data when tabs change
  createEffect(() => {
    const tab = activeTab();
    if (tab === "drafts") {
      loadDrafts();
    } else if (tab === "posted") {
      loadPostedTweets();
    } else if (tab === "scheduled") {
      loadScheduledTweets();
    }
  });

  // Auto-refresh scheduled tweets every 30 seconds
  onMount(() => {
    const interval = setInterval(() => {
      if (activeTab() === "scheduled") {
        loadScheduledTweets();
      }
    }, 30000);

    return () => clearInterval(interval);
  });

  const showToast = (message, type = "success") => {
    if (type === "success") {
      toast.success(message, {
        duration: 4000,
        position: "top-right",
      });
    } else if (type === "error") {
      toast.error(message, {
        duration: 5000,
        position: "top-right",
      });
    } else {
      toast(message, {
        duration: 4000,
        position: "top-right",
      });
    }
  };

  const toggleHashtag = (hashtag) => {
    setSelectedHashtags((prev) =>
      prev.includes(hashtag)
        ? prev.filter((h) => h !== hashtag)
        : [...prev, hashtag]
    );
  };

  const generateTweet = async () => {
    if (!topic().trim()) {
      setErrorMessage("Please enter a topic to generate a tweet");
      showToast("Please enter a topic to generate a tweet", "error");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const allHashtags = [
        ...selectedHashtags(),
        ...customHashtags()
          .split(" ")
          .filter((h) => h.startsWith("#")),
      ];

      const response = await fetch(`${API_BASE_URL}/generate-tweet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic(),
          hashtags: allHashtags.join(" "),
          tone: selectedTone(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate tweet");
      }

      const data = await response.json();
      setGeneratedTweet(data.content);
      setEditedTweet(data.content);
      showToast("✨ Tweet generated successfully!");
    } catch (error) {
      const errorMsg = `Error generating tweet: ${error.message}`;
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveDraft = async () => {
    const content = isEditing() ? editedTweet() : generatedTweet();
    if (!content.trim()) {
      const errorMsg = "No content to save as draft";
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/save-draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content,
          hashtags: [
            ...selectedHashtags(),
            ...customHashtags()
              .split(" ")
              .filter((h) => h.startsWith("#")),
          ].join(" "),
          tone: selectedTone(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save draft");
      }

      const successMsg = "✅ Draft saved successfully!";
      setSuccessMessage(successMsg);
      showToast(successMsg);
      loadDrafts();
    } catch (error) {
      const errorMsg = `Error saving draft: ${error.message}`;
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
    }
  };

  const loadDrafts = async () => {
    setIsLoadingDrafts(true);
    try {
      const response = await fetch(`${API_BASE_URL}/drafts`);
      if (!response.ok) {
        throw new Error("Failed to load drafts");
      }
      const data = await response.json();
      setDrafts(data.drafts);
    } catch (error) {
      const errorMsg = `Error loading drafts: ${error.message}`;
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const loadPostedTweets = async () => {
    setIsLoadingPosted(true);
    try {
      const response = await fetch(`${API_BASE_URL}/posted-tweets`);
      if (!response.ok) {
        throw new Error("Failed to load posted tweets");
      }
      const data = await response.json();
      setPostedTweets(data.posted_tweets);
    } catch (error) {
      const errorMsg = `Error loading posted tweets: ${error.message}`;
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsLoadingPosted(false);
    }
  };

  const loadScheduledTweets = async () => {
    setIsLoadingScheduled(true);
    try {
      const response = await fetch(`${API_BASE_URL}/scheduled-tweets`);
      if (!response.ok) {
        throw new Error("Failed to load scheduled tweets");
      }
      const data = await response.json();
      setScheduledTweets(data.scheduled_tweets);
    } catch (error) {
      const errorMsg = `Error loading scheduled tweets: ${error.message}`;
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsLoadingScheduled(false);
    }
  };

  const postTweet = async (content = null, draftId = null) => {
    const tweetContent =
      content || (isEditing() ? editedTweet() : generatedTweet());

    if (!tweetContent.trim()) {
      const errorMsg = "No tweet content to post";
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
      return;
    }

    if (tweetContent.length > 280) {
      const errorMsg = "Tweet is too long (over 280 characters)";
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
      return;
    }

    // Set posting state
    if (draftId) {
      setPostingDraftId(draftId);
    } else {
      setIsPosting(true);
    }
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/post-tweet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: tweetContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const successMsg = "🚀 Successfully posted to Twitter Clone!";
      setSuccessMessage(successMsg);
      showToast(successMsg);

      // Refresh posted tweets
      loadPostedTweets();

      // If posting from draft, remove it from drafts and refresh
      if (draftId) {
        await deleteDraft(draftId, false); // Don't show delete toast
        loadDrafts();
      } else {
        // Reset form after successful post from generate tab
        setTimeout(() => {
          setTopic("");
          setSelectedHashtags([]);
          setCustomHashtags("");
          setGeneratedTweet("");
          setEditedTweet("");
          setIsEditing(false);
          setSuccessMessage("");
        }, 3000);
      }
    } catch (error) {
      const errorMsg = `Error posting tweet: ${error.message}`;
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      if (draftId) {
        setPostingDraftId(null);
      } else {
        setIsPosting(false);
      }
    }
  };

  const scheduleTweet = async () => {
    const content = isEditing() ? editedTweet() : generatedTweet();

    if (!content.trim()) {
      const errorMsg = "No content to schedule";
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
      return;
    }

    if (!scheduledTime()) {
      const errorMsg = "Please select a time to schedule the tweet";
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
      return;
    }

    try {
      // Convert local datetime to UTC ISO string
      const localDateTime = new Date(scheduledTime());
      const utcDateTime = localDateTime.toISOString();

      const response = await fetch(`${API_BASE_URL}/schedule-tweet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content,
          scheduled_time: utcDateTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const successMsg = data.message;
      setSuccessMessage(successMsg);
      showToast(successMsg);
      setScheduledTime("");
      loadScheduledTweets();
    } catch (error) {
      const errorMsg = `Error scheduling tweet: ${error.message}`;
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
    }
  };

  const deleteDraft = async (draftId, showToastMsg = true) => {
    try {
      const response = await fetch(`${API_BASE_URL}/drafts/${draftId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete draft");
      }

      loadDrafts();
      if (showToastMsg) {
        showToast("🗑️ Draft deleted successfully");
      }
    } catch (error) {
      const errorMsg = `Error deleting draft: ${error.message}`;
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
    }
  };

  const startEditingDraft = (draft) => {
    setEditingDraftId(draft.id);
    setEditingDraftContent(draft.content);
  };

  const cancelEditingDraft = () => {
    setEditingDraftId(null);
    setEditingDraftContent("");
  };

  const saveEditedDraft = async (draftId) => {
    if (!editingDraftContent().trim()) {
      showToast("Draft content cannot be empty", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/drafts/${draftId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: editingDraftContent(),
          hashtags: "", // Keep existing hashtags or update as needed
          tone: "engaging", // Keep existing tone or update as needed
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update draft");
      }

      setEditingDraftId(null);
      setEditingDraftContent("");
      loadDrafts();
      showToast("✅ Draft updated successfully!");
    } catch (error) {
      const errorMsg = `Error updating draft: ${error.message}`;
      showToast(errorMsg, "error");
    }
  };

  const cancelScheduledTweet = async (scheduledId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/scheduled-tweets/${scheduledId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to cancel scheduled tweet");
      }

      loadScheduledTweets();
      showToast("❌ Scheduled tweet cancelled successfully");
    } catch (error) {
      const errorMsg = `Error cancelling scheduled tweet: ${error.message}`;
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
    }
  };

  const deleteTweet = () => {
    setGeneratedTweet("");
    setEditedTweet("");
    setIsEditing(false);
    setSuccessMessage("");
    setErrorMessage("");
    showToast("🗑️ Tweet deleted");
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditedTweet(generatedTweet());
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedTweet(generatedTweet());
  };

  const saveEdit = () => {
    setGeneratedTweet(editedTweet());
    setIsEditing(false);
    showToast("✅ Tweet updated");
  };

  const getCharacterCount = (content = null) => {
    const text = content || (isEditing() ? editedTweet() : generatedTweet());
    return text.length;
  };

  const getCharacterCountClass = (content = null) => {
    const count = getCharacterCount(content);
    if (count > 280) return "error";
    if (count > 250) return "warning";
    return "";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // At least 1 minute in the future
    // Return in local timezone format for the datetime-local input
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div class={`container ${isLoaded() ? "loaded" : ""}`}>
      {/* Toast Notifications */}
      <Toaster />

      {/* Background Effects */}
      <div class="bg-gradient" />
      <GridPattern />

      {/* Floating Orbs */}
      <FloatingOrb
        delay={0}
        size={300}
        position={{ top: "5%", left: "-10%" }}
        color="blue"
      />
      <FloatingOrb
        delay={-3}
        size={200}
        position={{ top: "40%", right: "-8%" }}
        color="purple"
      />
      <FloatingOrb
        delay={-6}
        size={150}
        position={{ bottom: "10%", left: "5%" }}
        color="pink"
      />
      <FloatingOrb
        delay={-9}
        size={100}
        position={{ top: "70%", left: "80%" }}
        color="cyan"
      />

      {/* Header */}
      <div class={`header ${headerVisible() ? "visible" : ""}`}>
        <div class="badge animate-in">
          <div class="badge-glow"></div>
          <span class="badge-icon">🤖</span>
          <span class="badge-text">AI-Powered Automation</span>
        </div>

        <div class="title-container">
          <h1 class="main-title">
            <span class="title-word" style="animation-delay: 0.1s">
              Twitter
            </span>
            <span class="title-word" style="animation-delay: 0.2s">
              Automation
            </span>
          </h1>
          <h2 class="subtitle">
            <span class="subtitle-word" style="animation-delay: 0.3s">
              Dashboard
            </span>
          </h2>
        </div>

        <p class="description animate-in" style="animation-delay: 0.4s">
          Complete automation suite for generating, managing, scheduling, and
          posting tweets with AI assistance.
        </p>

        <div class="stats-grid animate-in" style="animation-delay: 0.5s">
          <div class="stat-card">
            <div class="stat-number">∞</div>
            <div class="stat-label">AI Generated</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">24/7</div>
            <div class="stat-label">Automation</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">⚡</div>
            <div class="stat-label">Lightning Fast</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div class={`main-content ${contentVisible() ? "visible" : ""}`}>
        {/* Tab Navigation */}
        <div class="tab-navigation animate-in" style="animation-delay: 0.6s">
          <div class="tab-nav-bg"></div>
          <For each={TABS}>
            {(tab, index) => (
              <button
                class={`tab-btn ${activeTab() === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                style={`animation-delay: ${0.7 + index() * 0.1}s`}
              >
                <span class="tab-emoji">{tab.emoji}</span>
                <span class="tab-label">{tab.label}</span>
                <div class="tab-indicator"></div>
              </button>
            )}
          </For>
        </div>

        <div class="automation-card animate-in" style="animation-delay: 0.8s">
          <div class="card-glow"></div>

          {/* Success/Error Messages */}
          <Show when={successMessage()}>
            <div class="success-message animate-in">
              <div class="message-icon">🎉</div>
              <div class="message-content">
                <strong>Success!</strong>
                <br />
                {successMessage()}
                <Show when={activeTab() === "generate"}>
                  <br />
                  <a
                    href="https://twitter-clone-ui.pages.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="message-link"
                  >
                    View your post on Twitter Clone →
                  </a>
                </Show>
              </div>
            </div>
          </Show>

          <Show when={errorMessage()}>
            <div class="error-message animate-in">
              <div class="message-icon">⚠️</div>
              <div class="message-content">
                <strong>Error</strong>
                <br />
                {errorMessage()}
              </div>
            </div>
          </Show>

          {/* Generate Tab */}
          <Show when={activeTab() === "generate"}>
            <div class="tab-content">
              {/* Topic Input */}
              <div
                class="form-section animate-in"
                style="animation-delay: 0.9s"
              >
                <label class="form-label" for="topic">
                  <span class="label-icon">💭</span>
                  <span class="label-text">
                    What would you like to tweet about?
                  </span>
                </label>
                <div class="input-wrapper">
                  <textarea
                    id="topic"
                    class="input-field textarea-field"
                    placeholder="Enter your topic, idea, or message. Be specific for better AI-generated content..."
                    value={topic()}
                    onInput={(e) => setTopic(e.target.value)}
                  />
                  <div class="input-glow"></div>
                </div>
              </div>

              {/* Hashtag Selection */}
              <div
                class="form-section animate-in"
                style="animation-delay: 1.0s"
              >
                <label class="form-label">
                  <span class="label-icon">🏷️</span>
                  <span class="label-text">Popular Hashtags</span>
                </label>
                <div class="hashtag-grid">
                  <For each={HASHTAG_SUGGESTIONS}>
                    {(hashtag, index) => (
                      <span
                        class={`hashtag-tag ${
                          selectedHashtags().includes(hashtag) ? "selected" : ""
                        }`}
                        onClick={() => toggleHashtag(hashtag)}
                        style={`animation-delay: ${1.1 + index() * 0.05}s`}
                      >
                        <span class="hashtag-text">{hashtag}</span>
                        <div class="hashtag-glow"></div>
                      </span>
                    )}
                  </For>
                </div>
              </div>

              {/* Custom Hashtags */}
              <div
                class="form-section animate-in"
                style="animation-delay: 1.2s"
              >
                <label class="form-label" for="custom-hashtags">
                  <span class="label-icon">✏️</span>
                  <span class="label-text">Custom Hashtags</span>
                </label>
                <div class="input-wrapper">
                  <input
                    id="custom-hashtags"
                    type="text"
                    class="input-field"
                    placeholder="Add your own hashtags (e.g., #myproject #launch #innovation)"
                    value={customHashtags()}
                    onInput={(e) => setCustomHashtags(e.target.value)}
                  />
                  <div class="input-glow"></div>
                </div>
              </div>

              {/* Tone Selection */}
              <div
                class="form-section animate-in"
                style="animation-delay: 1.3s"
              >
                <label class="form-label">
                  <span class="label-icon">🎭</span>
                  <span class="label-text">Choose Your Tone</span>
                </label>
                <div class="tone-grid">
                  <For each={TONE_OPTIONS}>
                    {(tone, index) => (
                      <button
                        class={`tone-btn ${
                          selectedTone() === tone.value ? "active" : ""
                        }`}
                        onClick={() => setSelectedTone(tone.value)}
                        style={`animation-delay: ${1.4 + index() * 0.1}s`}
                      >
                        <span class="tone-emoji">{tone.emoji}</span>
                        <span class="tone-label">{tone.label}</span>
                        <div class="tone-glow"></div>
                      </button>
                    )}
                  </For>
                </div>
              </div>

              {/* Generate Button */}
              <div
                class="generate-section animate-in"
                style="animation-delay: 1.5s"
              >
                <button
                  class="generate-btn"
                  onClick={generateTweet}
                  disabled={isGenerating() || !topic().trim()}
                >
                  <div class="btn-content">
                    <Show
                      when={isGenerating()}
                      fallback={
                        <>
                          <span class="btn-icon">✨</span>
                          <span class="btn-text">Generate AI Tweet</span>
                        </>
                      }
                    >
                      <div class="loading">
                        <div class="spinner"></div>
                        <span>Generating your perfect tweet...</span>
                      </div>
                    </Show>
                  </div>
                  <div class="btn-glow"></div>
                </button>
              </div>

              {/* Tweet Preview */}
              <Show when={generatedTweet()}>
                <div class="tweet-preview animate-in">
                  <div class="preview-header">
                    <h3 class="preview-title">
                      <span class="preview-icon">🐦</span>
                      <span class="preview-text">Tweet Preview</span>
                    </h3>
                  </div>

                  <Show
                    when={!isEditing()}
                    fallback={
                      <div class="edit-mode">
                        <div class="input-wrapper">
                          <textarea
                            class="input-field textarea-field"
                            value={editedTweet()}
                            onInput={(e) => setEditedTweet(e.target.value)}
                          />
                          <div class="input-glow"></div>
                        </div>
                        <div class={`char-counter ${getCharacterCountClass()}`}>
                          {getCharacterCount()}/280 characters
                        </div>
                        <div class="action-grid" style="margin-top: 20px;">
                          <button
                            class="action-btn save-btn"
                            onClick={saveEdit}
                          >
                            <span class="btn-icon">💾</span>
                            <span class="btn-text">Save</span>
                          </button>
                          <button
                            class="action-btn cancel-btn"
                            onClick={cancelEditing}
                          >
                            <span class="btn-icon">❌</span>
                            <span class="btn-text">Cancel</span>
                          </button>
                        </div>
                      </div>
                    }
                  >
                    <div class="tweet-content">{generatedTweet()}</div>
                    <div class={`char-counter ${getCharacterCountClass()}`}>
                      {getCharacterCount()}/280 characters
                    </div>
                  </Show>

                  <Show when={!isEditing()}>
                    <div class="schedule-section">
                      <label class="form-label" for="schedule-time">
                        <span class="label-icon">⏰</span>
                        <span class="label-text">
                          Schedule for later (optional)
                        </span>
                      </label>
                      <div class="input-wrapper">
                        <input
                          id="schedule-time"
                          type="datetime-local"
                          class="input-field"
                          value={scheduledTime()}
                          min={getMinDateTime()}
                          onInput={(e) => setScheduledTime(e.target.value)}
                        />
                        <div class="input-glow"></div>
                      </div>
                    </div>

                    <div class="action-grid-extended">
                      <button
                        class="action-btn edit-btn"
                        onClick={startEditing}
                      >
                        <span class="btn-icon">✏️</span>
                        <span class="btn-text">Edit</span>
                      </button>
                      <button class="action-btn save-btn" onClick={saveDraft}>
                        <span class="btn-icon">💾</span>
                        <span class="btn-text">Save Draft</span>
                      </button>
                      <button
                        class="action-btn delete-btn"
                        onClick={deleteTweet}
                      >
                        <span class="btn-icon">🗑️</span>
                        <span class="btn-text">Delete</span>
                      </button>
                      <Show
                        when={scheduledTime()}
                        fallback={
                          <button
                            class="action-btn post-btn"
                            onClick={() => postTweet()}
                            disabled={isPosting() || getCharacterCount() > 280}
                          >
                            <Show
                              when={isPosting()}
                              fallback={
                                <>
                                  <span class="btn-icon">🚀</span>
                                  <span class="btn-text">Post Now</span>
                                </>
                              }
                            >
                              <div class="loading">
                                <div class="spinner"></div>
                                <span>Posting...</span>
                              </div>
                            </Show>
                          </button>
                        }
                      >
                        <button
                          class="action-btn schedule-btn"
                          onClick={scheduleTweet}
                        >
                          <span class="btn-icon">⏰</span>
                          <span class="btn-text">Schedule Tweet</span>
                        </button>
                      </Show>
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          </Show>

          {/* Drafts Tab */}
          <Show when={activeTab() === "drafts"}>
            <div class="tab-content">
              <div class="tab-header animate-in">
                <h3 class="tab-title">
                  <span class="tab-icon">📝</span>
                  <span class="tab-text">Draft Tweets</span>
                </h3>
                <p class="tab-description">Manage your saved tweet drafts</p>
              </div>

              <Show when={isLoadingDrafts()}>
                <div class="loading-state animate-in">
                  <div class="spinner large"></div>
                  <span>Loading drafts...</span>
                </div>
              </Show>

              <Show when={!isLoadingDrafts() && drafts().length === 0}>
                <div class="empty-state animate-in">
                  <span class="empty-emoji">📝</span>
                  <h4 class="empty-title">No drafts yet</h4>
                  <p class="empty-description">
                    Generate and save tweets to see them here
                  </p>
                </div>
              </Show>

              <div class="tweets-list">
                <For each={drafts()}>
                  {(draft, index) => (
                    <div
                      class="tweet-item animate-in"
                      style={`animation-delay: ${index() * 0.1}s`}
                    >
                      <div class="tweet-glow"></div>
                      <Show
                        when={editingDraftId() !== draft.id}
                        fallback={
                          <div class="edit-mode">
                            <div class="input-wrapper">
                              <textarea
                                class="input-field textarea-field"
                                value={editingDraftContent()}
                                onInput={(e) =>
                                  setEditingDraftContent(e.target.value)
                                }
                              />
                              <div class="input-glow"></div>
                            </div>
                            <div
                              class={`char-counter ${getCharacterCountClass(
                                editingDraftContent()
                              )}`}
                            >
                              {editingDraftContent().length}/280 characters
                            </div>
                            <div class="tweet-actions">
                              <button
                                class="action-btn save-btn"
                                onClick={() => saveEditedDraft(draft.id)}
                              >
                                <span class="btn-icon">💾</span>
                                <span class="btn-text">Save</span>
                              </button>
                              <button
                                class="action-btn cancel-btn"
                                onClick={cancelEditingDraft}
                              >
                                <span class="btn-icon">❌</span>
                                <span class="btn-text">Cancel</span>
                              </button>
                            </div>
                          </div>
                        }
                      >
                        <div class="tweet-content">{draft.content}</div>
                        <div class="tweet-meta">
                          <span class="tweet-date">
                            Created: {formatDate(draft.created_at)}
                          </span>
                          <div
                            class={`char-counter ${getCharacterCountClass(
                              draft.content
                            )}`}
                          >
                            {getCharacterCount(draft.content)}/280
                          </div>
                        </div>
                        <div class="tweet-actions">
                          <button
                            class="action-btn edit-btn"
                            onClick={() => startEditingDraft(draft)}
                          >
                            <span class="btn-icon">✏️</span>
                            <span class="btn-text">Edit</span>
                          </button>
                          <button
                            class="action-btn post-btn"
                            onClick={() => postTweet(draft.content, draft.id)}
                            disabled={postingDraftId() === draft.id}
                          >
                            <Show
                              when={postingDraftId() === draft.id}
                              fallback={
                                <>
                                  <span class="btn-icon">🚀</span>
                                  <span class="btn-text">Post</span>
                                </>
                              }
                            >
                              <div class="loading">
                                <div class="spinner"></div>
                                <span>Posting...</span>
                              </div>
                            </Show>
                          </button>
                          <button
                            class="action-btn delete-btn"
                            onClick={() => deleteDraft(draft.id)}
                          >
                            <span class="btn-icon">🗑️</span>
                            <span class="btn-text">Delete</span>
                          </button>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Scheduled Tab */}
          <Show when={activeTab() === "scheduled"}>
            <div class="tab-content">
              <div class="tab-header animate-in">
                <h3 class="tab-title">
                  <span class="tab-icon">⏰</span>
                  <span class="tab-text">Scheduled Tweets</span>
                </h3>
                <p class="tab-description">
                  Tweets scheduled for automatic posting
                </p>
              </div>

              <Show when={isLoadingScheduled()}>
                <div class="loading-state animate-in">
                  <div class="spinner large"></div>
                  <span>Loading scheduled tweets...</span>
                </div>
              </Show>

              <Show
                when={!isLoadingScheduled() && scheduledTweets().length === 0}
              >
                <div class="empty-state animate-in">
                  <span class="empty-emoji">⏰</span>
                  <h4 class="empty-title">No scheduled tweets</h4>
                  <p class="empty-description">
                    Schedule tweets from the Generate tab to see them here
                  </p>
                </div>
              </Show>

              <div class="tweets-list">
                <For each={scheduledTweets()}>
                  {(scheduled, index) => (
                    <div
                      class={`tweet-item ${
                        scheduled.status === "failed" ? "failed" : ""
                      } animate-in`}
                      style={`animation-delay: ${index() * 0.1}s`}
                    >
                      <div class="tweet-glow"></div>
                      <div class="tweet-content">{scheduled.content}</div>
                      <div class="tweet-meta">
                        <span class="tweet-date">
                          Scheduled: {formatDate(scheduled.scheduled_time)}
                        </span>
                        <span class={`status-badge ${scheduled.status}`}>
                          {scheduled.status === "pending" && "⏳ Pending"}
                          {scheduled.status === "posted" && "✅ Posted"}
                          {scheduled.status === "failed" && "❌ Failed"}
                        </span>
                      </div>
                      <Show when={scheduled.status === "pending"}>
                        <div class="tweet-actions">
                          <button
                            class="action-btn delete-btn"
                            onClick={() => cancelScheduledTweet(scheduled.id)}
                          >
                            <span class="btn-icon">❌</span>
                            <span class="btn-text">Cancel</span>
                          </button>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Posted Tab */}
          <Show when={activeTab() === "posted"}>
            <div class="tab-content">
              <div class="tab-header animate-in">
                <h3 class="tab-title">
                  <span class="tab-icon">📤</span>
                  <span class="tab-text">Posted Tweets</span>
                </h3>
                <p class="tab-description">Your successfully posted tweets</p>
              </div>

              <Show when={isLoadingPosted()}>
                <div class="loading-state animate-in">
                  <div class="spinner large"></div>
                  <span>Loading posted tweets...</span>
                </div>
              </Show>

              <Show when={!isLoadingPosted() && postedTweets().length === 0}>
                <div class="empty-state animate-in">
                  <span class="empty-emoji">📤</span>
                  <h4 class="empty-title">No posted tweets yet</h4>
                  <p class="empty-description">Post tweets to see them here</p>
                </div>
              </Show>

              <div class="tweets-list">
                <For each={postedTweets()}>
                  {(posted, index) => (
                    <div
                      class="tweet-item posted animate-in"
                      style={`animation-delay: ${index() * 0.1}s`}
                    >
                      <div class="tweet-glow"></div>
                      <div class="tweet-content">{posted.content}</div>
                      <div class="tweet-meta">
                        <span class="tweet-date">
                          Posted: {formatDate(posted.posted_at)}
                        </span>
                        <span class="status-badge posted">
                          {posted.status === "posted_scheduled"
                            ? "⏰ Scheduled Post"
                            : "✅ Posted"}
                        </span>
                      </div>
                      <div class="tweet-actions">
                        <a
                          href="https://twitter-clone-ui.pages.dev"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="action-btn view-btn"
                        >
                          <span class="btn-icon">👁️</span>
                          <span class="btn-text">View</span>
                        </a>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}

export default App;
