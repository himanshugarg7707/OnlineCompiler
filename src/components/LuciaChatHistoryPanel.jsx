import { Clock3, MessageSquarePlus, Pencil, Trash2, X } from 'lucide-react';
import './LuciaChatHistoryPanel.css';

export default function LuciaChatHistoryPanel({ chats = [], activeChatId, open, onClose, onNewChat, onOpenChat, onDeleteChat, onRenameChat }) {
  return (
    <aside className={`lucia-history-panel ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="lucia-history-header">
        <div><Clock3 size={15} /><strong>Chat history</strong><span>{chats.length}</span></div>
        <button type="button" onClick={onClose} aria-label="Close chat history"><X size={15} /></button>
      </div>
      <button type="button" className="lucia-history-new" onClick={onNewChat}>
        <MessageSquarePlus size={15} /> New chat
      </button>
      <div className="lucia-history-list">
        {chats.length === 0 ? (
          <p className="lucia-history-empty">Your saved conversations will appear here.</p>
        ) : chats.map((chat) => (
          <div className={`lucia-history-item ${chat.id === activeChatId ? 'active' : ''}`} key={chat.id}>
            <button type="button" className="lucia-history-item-main" onClick={() => onOpenChat(chat.id)}>
              <strong>{chat.title || 'New Lucia chat'}</strong>
              <span>{new Date(chat.updatedAt || Date.now()).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {chat.messages?.length || 0} messages</span>
            </button>
            <button type="button" className="lucia-history-item-action" title="Rename conversation" aria-label={`Rename ${chat.title || 'conversation'}`} onClick={() => {
              const title = window.prompt('Rename conversation', chat.title || 'New Lucia chat');
              if (title?.trim()) onRenameChat(chat.id, title.trim());
            }}><Pencil size={13} /></button>
            <button type="button" className="lucia-history-item-action danger" title="Delete conversation" aria-label={`Delete ${chat.title || 'conversation'}`} onClick={() => {
              if (window.confirm(`Delete “${chat.title || 'New Lucia chat'}” from chat history?`)) onDeleteChat(chat.id);
            }}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
    </aside>
  );
}
