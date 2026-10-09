import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  getRooms,
  createRoom,
  deleteRoom,
  getRoomMessages,
  sendRoomMessage,
  deleteMessage,
} from '../services/roomService';
import { formatRelativeTime } from '../utils/dateUtils';
import {
  MessagesIcon,
  PlusIcon,
  SendIcon,
  TrashIcon,
  RefreshIcon,
  CloseIcon,
} from '../components/common/Icons';
import { useToast } from '../components/common/ToastContext';
import ConfirmModal from '../components/common/ConfirmModal';
import '../styles/pages/messages.css';

function Messages() {
  const { accessToken, user } = useAuth();
  const { addToast } = useToast();

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);

  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [searchRoomQuery, setSearchRoomQuery] = useState('');

  // Create room modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTopic, setNewRoomTopic] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [createModalError, setCreateModalError] = useState('');

  // Delete room confirm modal
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && showCreateModal && !creatingRoom) {
        setShowCreateModal(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal, creatingRoom]);

  // Load Rooms list
  const loadRooms = useCallback(async () => {
    if (!accessToken) return;

    try {
      setLoadingRooms(true);
      const roomsData = await getRooms(accessToken, searchRoomQuery);
      const list = Array.isArray(roomsData) ? roomsData : roomsData?.results ?? [];
      setRooms(list);

      // Auto-select first room if none selected
      setSelectedRoom((current) => {
        if (!current && list.length > 0) {
          return list[0];
        }
        return current;
      });
    } catch (err) {
      addToast(err?.message || 'Failed to load study rooms.', 'error');
    } finally {
      setLoadingRooms(false);
    }
  }, [accessToken, searchRoomQuery, addToast]);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      loadRooms();
    }
    return () => {
      isMounted = false;
    };
  }, [loadRooms]);

  // Load Messages for Selected Room
  const loadMessages = useCallback(async (roomId) => {
    if (!accessToken || !roomId) return;

    try {
      setLoadingMessages(true);
      const data = await getRoomMessages(accessToken, roomId);
      setMessages(Array.isArray(data) ? data : data?.results ?? []);
    } catch (err) {
      addToast(err?.message || 'Failed to load messages.', 'error');
    } finally {
      setLoadingMessages(false);
    }
  }, [accessToken, addToast]);

  const selectedRoomId = selectedRoom?.id;

  useEffect(() => {
    if (selectedRoomId) {
      loadMessages(selectedRoomId);

      const interval = setInterval(() => {
        getRoomMessages(accessToken, selectedRoomId)
          .then((data) => {
            setMessages(Array.isArray(data) ? data : data?.results ?? []);
          })
          .catch(() => {});
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [accessToken, selectedRoomId, loadMessages]);

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!messageInput.trim() || !selectedRoom || sending) return;

    const text = messageInput.trim();
    setMessageInput('');

    try {
      setSending(true);
      const newMsg = await sendRoomMessage(accessToken, selectedRoom.id, text);
      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      addToast(err.message || 'Failed to send message.', 'error');
      setMessageInput(text);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteMessage(msgId) {
    try {
      await deleteMessage(accessToken, msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      addToast('Message deleted.', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to delete message.', 'error');
    }
  }

  async function handleCreateRoom(e) {
    e.preventDefault();
    if (!newRoomName.trim() || !newRoomTopic.trim()) {
      setCreateModalError('Room name and topic are required.');
      return;
    }

    try {
      setCreatingRoom(true);
      setCreateModalError('');

      const created = await createRoom(accessToken, {
        name: newRoomName.trim(),
        topic_name: newRoomTopic.trim(),
        description: newRoomDesc.trim(),
      });

      addToast(`Study Room "${newRoomName.trim()}" created!`, 'success');
      setNewRoomName('');
      setNewRoomTopic('');
      setNewRoomDesc('');
      setShowCreateModal(false);

      await loadRooms();
      setSelectedRoom(created);
    } catch (err) {
      setCreateModalError(err.message || 'Failed to create room.');
    } finally {
      setCreatingRoom(false);
    }
  }

  async function handleDeleteRoom() {
    if (!selectedRoom) return;

    try {
      setDeletingRoom(true);
      await deleteRoom(accessToken, selectedRoom.id);
      addToast(`Room "${selectedRoom.name}" deleted.`, 'info');
      setShowDeleteRoomModal(false);
      setSelectedRoom(null);
      await loadRooms();
    } catch (err) {
      addToast(err.message || 'Failed to delete room.', 'error');
    } finally {
      setDeletingRoom(false);
    }
  }

  return (
    <main className="messages-page">
      {/* Left: Study Rooms Directory */}
      <aside className="rooms-sidebar">
        <div className="rooms-sidebar-header">
          <h2>Study Rooms</h2>
          <button
            type="button"
            className="workspace-btn-action workspace-btn-primary"
            style={{ height: '32px', padding: '0 10px', fontSize: '12px' }}
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon size={14} /> New Room
          </button>
        </div>

        <div className="rooms-search-box">
          <input
            type="text"
            className="rooms-search-input"
            value={searchRoomQuery}
            onChange={(e) => setSearchRoomQuery(e.target.value)}
            placeholder="Search study topics..."
          />
        </div>

        <div className="rooms-list">
          {loadingRooms ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="spinner" />
            </div>
          ) : rooms.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No study rooms found. Create one to get started!
            </div>
          ) : (
            rooms.map((room) => {
              const isSelected = selectedRoom?.id === room.id;

              return (
                <button
                  key={room.id}
                  type="button"
                  className={`room-item-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="room-item-top">
                    <span className="room-item-name">{room.name}</span>
                    {room.topic?.name && (
                      <span className="room-topic-pill">{room.topic.name}</span>
                    )}
                  </div>
                  <div className="room-item-meta">
                    <span>Host: @{room.host?.username || room.host}</span>
                    <span>{room.participant_count || 1} online</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Right: Active Discussion Stream */}
      <section className="discussion-panel">
        {selectedRoom ? (
          <>
            {/* Header */}
            <div className="discussion-header">
              <div className="discussion-header-left">
                <div>
                  <h3 className="discussion-room-title">{selectedRoom.name}</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                    Topic: <strong>{selectedRoom.topic?.name || 'General'}</strong> &bull; Host: @{selectedRoom.host?.username || selectedRoom.host}
                  </p>
                </div>
              </div>

              <div className="discussion-header-right">
                <button
                  type="button"
                  className="item-action-btn"
                  onClick={() => loadMessages(selectedRoom.id)}
                  title="Refresh conversation"
                >
                  <RefreshIcon size={14} />
                </button>

                {selectedRoom.host?.username === user?.username && (
                  <button
                    type="button"
                    className="item-action-btn btn-delete"
                    onClick={() => setShowDeleteRoomModal(true)}
                    title="Delete study room"
                  >
                    <TrashIcon size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Messages Stream */}
            <div className="messages-stream">
              {loadingMessages && messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
                  <span className="spinner" />
                </div>
              ) : messages.length === 0 ? (
                <div className="empty-discussion-state">
                  <MessagesIcon size={36} />
                  <p style={{ margin: 0 }}>No messages yet in this study room.</p>
                  <span style={{ fontSize: '12px' }}>Start the conversation below!</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelf = msg.user?.username === user?.username;

                  return (
                    <div
                      key={msg.id}
                      className={`message-bubble ${isSelf ? 'is-self' : ''}`}
                    >
                      <div className="message-avatar">
                        {(msg.user?.username || 'U').charAt(0).toUpperCase()}
                      </div>

                      <div className="message-content">
                        <div className="message-header">
                          <span className="message-author">
                            @{msg.user?.username}
                          </span>
                          <span className="message-time">
                            {formatRelativeTime(msg.created)}
                          </span>

                          {isSelf && (
                            <button
                              type="button"
                              className="message-delete-btn"
                              onClick={() => handleDeleteMessage(msg.id)}
                              title="Delete message"
                            >
                              <TrashIcon size={12} />
                            </button>
                          )}
                        </div>

                        <div className="message-body">{msg.body}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Composer */}
            <form className="message-composer" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="message-input"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={`Message #${selectedRoom.name}...`}
                disabled={sending}
              />
              <button
                type="submit"
                className="message-send-btn"
                disabled={sending || !messageInput.trim()}
                aria-label="Send Message"
              >
                <SendIcon size={16} />
              </button>
            </form>
          </>
        ) : (
          <div className="empty-discussion-state">
            <MessagesIcon size={44} />
            <h3>Select or create a study room</h3>
            <p>Engage with fellow learners in live topic discussions.</p>
          </div>
        )}
      </section>

      {/* Delete Room Confirm Modal */}
      {showDeleteRoomModal && selectedRoom && (
        <ConfirmModal
          title="Delete Study Room"
          message={`Are you sure you want to delete "${selectedRoom.name}"? All messages in this room will be permanently lost.`}
          confirmText="Delete Room"
          variant="danger"
          loading={deletingRoom}
          onConfirm={handleDeleteRoom}
          onCancel={() => setShowDeleteRoomModal(false)}
        />
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="modal-dialog">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(99,102,241,0.15)',
                  color: '#818cf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <MessagesIcon size={18} />
                </div>
                <div>
                  <h3>Create Study Room</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                    Start a new live discussion channel
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="workspace-field">
                <label htmlFor="room-name">Room Name *</label>
                <input
                  id="room-name"
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. Data Structures Prep"
                  required
                  disabled={creatingRoom}
                />
              </div>

              <div className="workspace-field">
                <label htmlFor="room-topic">Topic / Subject *</label>
                <input
                  id="room-topic"
                  type="text"
                  value={newRoomTopic}
                  onChange={(e) => setNewRoomTopic(e.target.value)}
                  placeholder="e.g. Computer Science, Calculus, Biology"
                  required
                  disabled={creatingRoom}
                />
              </div>

              <div className="workspace-field">
                <label htmlFor="room-desc">Description (Optional)</label>
                <textarea
                  id="room-desc"
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="Briefly state the goal of this study room..."
                  rows="2"
                  disabled={creatingRoom}
                />
              </div>

              {createModalError && (
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--danger-text)',
                  fontSize: '13px',
                }}>
                  {createModalError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="workspace-btn-action workspace-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creatingRoom}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="workspace-btn-action workspace-btn-primary"
                  disabled={creatingRoom}
                >
                  {creatingRoom ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Messages;