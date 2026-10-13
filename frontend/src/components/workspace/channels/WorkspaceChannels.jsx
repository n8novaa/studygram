import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import {
  getWorkspaceChannels,
  getChannelMessages,
  connectWorkspaceChannel,
} from '../../../services/workspaceChannelService';
import ChannelSidebar from './sidebar/ChannelSidebar';
import ChannelChatArea from './ChannelChatArea';
import ChannelMemberList from './sidebar/ChannelMemberList';
import CreateChannelModal from './modals/CreateChannelModal';
import EditChannelModal from './modals/EditChannelModal';
import { useToast } from '../../common/ToastContext';
import '../../../styles/components/workspace/channels/index.css';

function WorkspaceChannels({ workspace, isAdmin }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { accessToken, user } = useAuth();
  const { addToast } = useToast();

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);

  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [showMembers, setShowMembers] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);

  const workspaceId = workspace?.id;

  useEffect(() => {
    const requestedId = Number(searchParams.get('channel'));
    if (!requestedId) return;
    const requestedChannel = channels.find((channel) => channel.id === requestedId);
    if (requestedChannel && requestedChannel.id !== activeChannel?.id) {
      setActiveChannel(requestedChannel);
    }
  }, [channels, searchParams, activeChannel?.id]);

  // 1. Fetch channels list
  const loadChannels = useCallback(async () => {
    if (!accessToken || !workspaceId) return;

    try {
      setLoadingChannels(true);
      const data = await getWorkspaceChannels(accessToken, workspaceId);
      setChannels(data);

      setActiveChannel((current) => {
        if (!current && data.length > 0) {
          return data[0];
        }
        if (current) {
          const matched = data.find((c) => c.id === current.id);
          return matched || (data.length > 0 ? data[0] : null);
        }
        return null;
      });
    } catch (err) {
      addToast(err?.message || 'Failed to load channels.', 'error');
    } finally {
      setLoadingChannels(false);
    }
  }, [accessToken, workspaceId, addToast]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // 2. Fetch messages for the active channel
  const loadMessages = useCallback(
    async (channelId) => {
      if (!accessToken || !workspaceId || !channelId) return;

      try {
        setLoadingMessages(true);
        const data = await getChannelMessages(accessToken, workspaceId, channelId);
        setMessages((current) => mergeMessages(current, data));
      } catch (err) {
        addToast(err?.message || 'Failed to load messages.', 'error');
      } finally {
        setLoadingMessages(false);
      }
    },
    [accessToken, workspaceId, addToast]
  );

  const activeChannelId = activeChannel?.id;

  useEffect(() => {
    if (!activeChannelId || !accessToken || !workspaceId) {
      setMessages([]);
      setRealtimeStatus('disconnected');
      return undefined;
    }

    let disposed = false;
    let socket = null;
    let reconnectTimer = null;
    let fallbackTimer = null;
    let reconnectAttempt = 0;
    let fallbackEnabled = true;
    let syncingHistory = false;
    let pendingEvents = [];
    let syncQueue = Promise.resolve();

    setMessages([]);
    setRealtimeStatus('connecting');
    const initialLoad = loadMessages(activeChannelId);

    const applyRealtimeEvent = (payload) => {
      if (payload.type === 'message.deleted') {
        setMessages((current) => current.filter((message) => message.id !== payload.message_id));
      } else if (payload.message) {
        setMessages((current) => mergeMessages(current, [payload.message]));
      }
    };

    const refreshMessages = () => {
      syncQueue = syncQueue.catch(() => {}).then(async () => {
        if (disposed) return;
        syncingHistory = true;
        try {
          const data = await getChannelMessages(accessToken, workspaceId, activeChannelId);
          if (!disposed) setMessages(data);
        } catch {
          // The socket or the next fallback sync will recover the connection.
        } finally {
          syncingHistory = false;
          const events = pendingEvents;
          pendingEvents = [];
          events.forEach(applyRealtimeEvent);
        }
      });
      return syncQueue;
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      setRealtimeStatus('reconnecting');
      const delay = Math.min(1000 * (2 ** reconnectAttempt), 15000);
      reconnectAttempt += 1;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    async function connect() {
      try {
        const nextSocket = await connectWorkspaceChannel(
          accessToken,
          workspaceId,
          activeChannelId,
        );
        if (disposed) {
          nextSocket.close();
          return;
        }
        socket = nextSocket;
        socket.onopen = () => {
          reconnectAttempt = 0;
          setRealtimeStatus('connected');
          initialLoad.then(refreshMessages);
        };
        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (syncingHistory) pendingEvents.push(payload);
            else applyRealtimeEvent(payload);
          } catch {
            // Ignore malformed events; a reconnect/history sync recovers state.
          }
        };
        socket.onerror = () => socket?.close();
        socket.onclose = () => {
          if (disposed) return;
          setRealtimeStatus('reconnecting');
          scheduleReconnect();
        };
      } catch (error) {
        if (disposed) return;
        if ([401, 403].includes(error?.status)) {
          fallbackEnabled = false;
          setRealtimeStatus('disconnected');
          return;
        }
        setRealtimeStatus('reconnecting');
        scheduleReconnect();
      }
    }

    connect();
    fallbackTimer = window.setInterval(() => {
      if (fallbackEnabled && (!socket || socket.readyState !== WebSocket.OPEN)) refreshMessages();
    }, 15000);

    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (fallbackTimer) window.clearInterval(fallbackTimer);
      socket?.close();
    };
  }, [accessToken, workspaceId, activeChannelId, loadMessages]);

  // Handlers for channel management
  function handleChannelCreated(newChannel) {
    setChannels((prev) => [...prev, newChannel]);
    setActiveChannel(newChannel);
    window.dispatchEvent(new Event('studygram:workspace-navigation-change'));
  }

  function handleChannelUpdated(updatedChannel) {
    setChannels((prev) =>
      prev.map((c) => (c.id === updatedChannel.id ? updatedChannel : c))
    );
    if (activeChannel?.id === updatedChannel.id) {
      setActiveChannel(updatedChannel);
    }
    window.dispatchEvent(new Event('studygram:workspace-navigation-change'));
  }

  function handleChannelDeleted(deletedChannelId) {
    setChannels((prev) => {
      const filtered = prev.filter((c) => c.id !== deletedChannelId);
      if (activeChannel?.id === deletedChannelId) {
        setActiveChannel(filtered.length > 0 ? filtered[0] : null);
      }
      window.dispatchEvent(new Event('studygram:workspace-navigation-change'));
      return filtered;
    });
  }

  function handleMessageSent(newMsg) {
    setMessages((prev) => mergeMessages(prev, [newMsg]));
  }

  function handleMessageUpdated(updatedMsg) {
    setMessages((prev) => mergeMessages(prev, [updatedMsg]));
  }

  function handleMessageDeleted(msgId) {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  }

  const currentMember = workspace?.members?.find(
    (m) => (typeof m.user === 'string' ? m.user : m.user?.username) === user?.username
  );
  const isOwner = workspace?.owner === user?.username;

  return (
    <div
      className={`workspace-channels-layout ${
        showMembers ? 'with-members-open' : ''
      } ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
    >
      {/* 1. Left: Discord Channels Sidebar */}
      <ChannelSidebar
        channels={channels}
        activeChannel={activeChannel}
        onSelectChannel={(ch) => {
          setActiveChannel(ch);
          setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set('section', 'channels');
            next.set('channel', String(ch.id));
            return next;
          });
          setMobileSidebarOpen(false);
        }}
        isAdmin={isAdmin}
        onCreateChannel={() => setShowCreateModal(true)}
        onEditChannel={(ch) => setEditingChannel(ch)}
        currentUser={user}
        currentMemberRole={currentMember?.role}
        isOwner={isOwner}
        loading={loadingChannels}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <ChannelChatArea
        workspace={workspace}
        channel={activeChannel}
        messages={messages}
        loadingMessages={loadingMessages}
        realtimeStatus={realtimeStatus}
        onRefresh={() => activeChannelId && loadMessages(activeChannelId)}
        accessToken={accessToken}
        currentUser={user}
        isAdmin={isAdmin}
        onEditChannel={(ch) => setEditingChannel(ch)}
        showMembers={showMembers}
        onToggleSidebar={() => {
          if (window.matchMedia('(max-width: 680px)').matches) {
            setMobileSidebarOpen((prev) => !prev);
          } else {
            setSidebarCollapsed((prev) => !prev);
          }
        }}
        onToggleMembers={() => setShowMembers((prev) => !prev)}
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        onMessageSent={handleMessageSent}
        onMessageUpdated={handleMessageUpdated}
        onMessageDeleted={handleMessageDeleted}
      />

      {/* 3. Right: Collapsible Members Sidebar */}
      {showMembers && (
        <ChannelMemberList
          members={workspace?.members || []}
          ownerUsername={workspace?.owner}
          onClose={() => setShowMembers(false)}
        />
      )}

      {/* Modal: Create Channel */}
      {showCreateModal && (
        <CreateChannelModal
          workspaceId={workspace.id}
          accessToken={accessToken}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleChannelCreated}
        />
      )}

      {/* Modal: Edit Channel */}
      {editingChannel && (
        <EditChannelModal
          workspaceId={workspace.id}
          channel={editingChannel}
          accessToken={accessToken}
          onClose={() => setEditingChannel(null)}
          onUpdated={handleChannelUpdated}
          onDeleted={handleChannelDeleted}
        />
      )}
    </div>
  );
}

function mergeMessages(current, incoming) {
  const byId = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return [...byId.values()].sort((a, b) => (
    new Date(a.created).getTime() - new Date(b.created).getTime()
    || a.id - b.id
  ));
}

export default WorkspaceChannels;
