const STORAGE_KEY = 'fullcode_lucia_chat_history_v1';
const MAX_CHATS = 40;
const MAX_MESSAGES_PER_CHAT = 120;

export function loadChatHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const chats = Array.isArray(parsed.chats) ? parsed.chats : [];
    return {
      chats: chats.slice(0, MAX_CHATS).filter((chat) => chat && typeof chat.id === 'string' && Array.isArray(chat.messages)),
      activeChatId: typeof parsed.activeChatId === 'string' ? parsed.activeChatId : null,
    };
  } catch {
    return { chats: [], activeChatId: null };
  }
}

export function persistChatHistory(chats, activeChatId) {
  try {
    const compact = chats.slice(0, MAX_CHATS).map((chat) => ({
      ...chat,
      messages: chat.messages.slice(-MAX_MESSAGES_PER_CHAT),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats: compact, activeChatId }));
    return true;
  } catch (error) {
    console.warn('[Lucia] Could not save chat history:', error);
    return false;
  }
}
