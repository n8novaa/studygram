import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import {
  getWorkspaceChannels,
  getChannelMessages,
} from '../../../services/workspaceChannelService';
import ChannelSidebar from './sidebar/ChannelSidebar';
import ChannelChatArea from './ChannelChatArea';
import ChannelMemberList from './sidebar/ChannelMemberList';
import CreateChannelModal from './modals/CreateChannelModal';
import EditChannelModal from './modals/EditChannelModal';
import { useToast } from '../../common/ToastContext';
import '../../../styles/components/workspace/channels/index.css';

function WorkspaceChannels({ workspace, isAdmin }) {
  const { accessToken, user } = useAuth();
  const { addToast } = useToast();

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);

  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);

  const workspaceId = workspace?.id;

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
        setMessages(data);
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
    if (activeChannelId) {
      loadMessages(activeChannelId);

      // Auto-poll for new messages every 4 seconds
      const timer = setInterval(() => {
        getChannelMessages(accessToken, workspaceId, activeChannelId)
          .then((data) => {
            setMessages(data);
          })
          .catch(() => {});
      }, 4000);

      return () => clearInterval(timer);
    } else {
      setMessages([]);
    }
  }, [accessToken, workspaceId, activeChannelId, loadMessages]);

  // Handlers for channel management
  function handleChannelCreated(newChannel) {
    setChannels((prev) => [...prev, newChannel]);
    setActiveChannel(newChannel);
  }

  function handleChannelUpdated(updatedChannel) {
    setChannels((prev) =>
      prev.map((c) => (c.id === updatedChannel.id ? updatedChannel : c))
    );
    if (activeChannel?.id === updatedChannel.id) {
      setActiveChannel(updatedChannel);
    }
  }

  function handleChannelDeleted(deletedChannelId) {
    setChannels((prev) => {
      const filtered = prev.filter((c) => c.id !== deletedChannelId);
      if (activeChannel?.id === deletedChannelId) {
        setActiveChannel(filtered.length > 0 ? filtered[0] : null);
      }
      return filtered;
    });
  }

  function handleMessageSent(newMsg) {
    setMessages((prev) => [...prev, newMsg]);
  }

  function handleMessageUpdated(updatedMsg) {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === updatedMsg.id
          ? updatedMsg
          : message
      )
    );
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

export default WorkspaceChannels;
