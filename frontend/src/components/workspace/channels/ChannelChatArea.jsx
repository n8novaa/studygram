import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HashIcon, ArrowDownIcon } from '../../common/Icons';
import { useToast } from '../../common/ToastContext';

import {
  sendChannelMessage,
  deleteChannelMessage,
  updateChannelMessage,
  addChannelMessageReaction,
  removeChannelMessageReaction,
} from '../../../services/workspaceChannelService';
import DeleteMessageModal from './messages/DeleteMessageModal';
import MessageComposer from './chat/MessageComposer';
import ChannelChatHeader from './layout/ChannelChatHeader';
import ChannelWelcome from './layout/ChannelWelcome';
import ChannelMessageList from './messages/ChannelMessageList';

function ChannelChatArea({
  workspace,
  channel,
  messages = [],
  loadingMessages,
  onRefresh,
  accessToken,
  currentUser,
  isAdmin,
  onEditChannel,
  showMembers,
  onToggleMembers,
  onToggleSidebar,
  onOpenMobileSidebar,
  onMessageSent,
  onMessageUpdated,
  onMessageDeleted,
  onMessageViewed,
}) {
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetMessageId = searchParams.get('message');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [deletingMessage, setDeletingMessage] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [reactingMessageId, setReactingMessageId] = useState(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
  const [moreMenuMessageId, setMoreMenuMessageId] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesStreamRef = useRef(null);
  const textareaRef = useRef(null);
  const handledTargetRef = useRef('');
  const targetHighlightTimeoutRef = useRef(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showChannelDescription, setShowChannelDescription] = useState(false);
  const descriptionPanelRef = useRef(null);
  const channelNameButtonRef = useRef(null);
  const previousMessageCountRef = useRef(messages.length);

  useEffect(() => {
  setShowChannelDescription(false);
}, [channel?.id]);

useEffect(() => {
  if (!showChannelDescription) return;

  function handleOutsideClick(event) {
    if (
      descriptionPanelRef.current &&
      !descriptionPanelRef.current.contains(event.target) &&
      !channelNameButtonRef.current?.contains(event.target)
    ) {
      setShowChannelDescription(false);
    }
  }

  function handleEscape(event) {
    if (event.key === 'Escape') {
      setShowChannelDescription(false);
    }
  }

  document.addEventListener('mousedown', handleOutsideClick);
  document.addEventListener('keydown', handleEscape);

  return () => {
    document.removeEventListener('mousedown', handleOutsideClick);
    document.removeEventListener('keydown', handleEscape);
  };
}, [showChannelDescription]);

  useEffect(() => {
    if (!channel?.id) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: 'auto',
    });

    setIsAtBottom(true);
  }, [channel?.id]);

  useEffect(() => {
    const previousCount = previousMessageCountRef.current;
    const currentCount = messages.length;

    // Keep the user's position when they are reading older messages.
    if (isAtBottom && currentCount !== previousCount) {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
      });
    }

    previousMessageCountRef.current = currentCount;
  }, [messages, isAtBottom]);

  useEffect(() => {
    if (!targetMessageId || loadingMessages) return;
    const targetMessage = messages.find(
      (message) => String(message.id) === targetMessageId,
    );
    if (!targetMessage) return;

    const targetKey = `${channel?.id}:${targetMessageId}`;
    if (handledTargetRef.current === targetKey) return;
    const element = document.getElementById(`message-${targetMessage.id}`);
    if (!element) return;

    handledTargetRef.current = targetKey;
    setHighlightedMessageId(targetMessage.id);
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetHighlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedMessageId(null);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete('message');
        return next;
      }, { replace: true });
    }, 1800);
  }, [messages, loadingMessages, targetMessageId, channel?.id, setSearchParams]);

  useEffect(() => () => {
    if (targetHighlightTimeoutRef.current) {
      window.clearTimeout(targetHighlightTimeoutRef.current);
    }
  }, []);

  function handleMessagesScroll() {
    const container = messagesStreamRef.current;

    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    setIsAtBottom(distanceFromBottom <= 80);
  }

  function handleInputChange(e) {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }

  async function handleSend(e) {
    if (e) e.preventDefault();
    const text = inputText.trim();

    if (!text) {
      addToast('Message cannot be empty.', 'error');
      return;
    }
    if (!channel) return;

    try {
      setSending(true);
      const newMsg = await sendChannelMessage(
        accessToken,
        workspace.id,
        channel.id,
        text,
        replyingTo?.id
      );
      setInputText('');
      setReplyingTo(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      onMessageSent(newMsg);

      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    } catch (err) {
      addToast(err?.message || 'Failed to send message.', 'error');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleDeleteMessage(message) {
    setDeletingMessage(message);
  }

  async function confirmDeleteMessage() {
    if (!deletingMessage || !channel) return;

    try {
      setDeleting(true);
      await deleteChannelMessage(
        accessToken,
        workspace.id,
        channel.id,
        deletingMessage.id
      );
      addToast('Message deleted.', 'info');
      onMessageDeleted(deletingMessage.id);
      setDeletingMessage(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleEditMessage(messageId) {
    if (!channel) return;
    const text = editingText.trim();

    if (!text) {
      addToast('Message cannot be empty.', 'error');
      return;
    }

    try {
      const updatedMsg = await updateChannelMessage(
        accessToken,
        workspace.id,
        channel.id,
        messageId,
        text
      );
      setEditingMsgId(null);
      setEditingText('');
      onMessageUpdated(updatedMsg);
      addToast('Message edited.', 'success');
    } catch (err) {
      addToast(err?.message || 'Failed to edit message.', 'error');
    }
  }

  function handleCopyMessage(msg) {
    navigator.clipboard.writeText(msg.body);
    setCopiedMsgId(msg.id);
    addToast('Message copied to clipboard.', 'success');
    setTimeout(() => {
      setCopiedMsgId(null);
    }, 2000);
  }

  async function handleReaction(msg, emoji) {
    if (!channel || reactingMessageId === msg.id) return;

    try {
      setReactingMessageId(msg.id);
      const existingReaction = msg.reactions?.find(
        (reaction) => reaction.user?.username === currentUser?.username
      );

      if (existingReaction?.emoji === emoji) {
        await removeChannelMessageReaction(
          accessToken,
          workspace.id,
          channel.id,
          msg.id
        );
        addToast('Reaction removed.', 'info');
      } else {
        await addChannelMessageReaction(
          accessToken,
          workspace.id,
          channel.id,
          msg.id,
          emoji
        );
        addToast('Reaction added.', 'success');
      }

      await onRefresh();
    } catch (err) {
      addToast(err?.message || 'Failed to update reaction.', 'error');
    } finally {
      setReactingMessageId(null);
    }
  }

  function handleQuickEmoji(emoji) {
    setInputText((prev) => prev + emoji);
    textareaRef.current?.focus();
  }

  const processedMessages = useMemo(() => {
    return messages.map((msg, index) => {
      const msgUser = msg.user?.username || 'user';
      const msgDate = new Date(msg.created);
      const dateKey = msgDate.toDateString();
      const prevMsg = index > 0 ? messages[index - 1] : null;
      const prevDateKey = prevMsg ? new Date(prevMsg.created).toDateString() : null;
      const prevUser = prevMsg ? (prevMsg.user?.username || 'user') : null;
      const prevTime = prevMsg ? new Date(prevMsg.created).getTime() : 0;
      const showDateDivider = index === 0 || dateKey !== prevDateKey;
      const isSameAuthor = index > 0 && prevUser === msgUser;
      const timeDiff = index > 0 ? msgDate.getTime() - prevTime : Infinity;
      const isGrouped =
        !showDateDivider && isSameAuthor && timeDiff < 5 * 60 * 1000;

      return {
        ...msg,
        renderKey: msg.id || `msg-${index}`,
        msgUser,
        msgDate,
        showDateDivider,
        isGrouped,
      };
    });
  }, [messages]);

  if (!channel) {
    return (
      <section className="channel-chat-pane">
        <div className="channel-empty-state">
          <HashIcon size={36} />
          <h4>No Channel Selected</h4>
          <p>Choose a channel from the left sidebar to start chatting.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="channel-chat-pane" aria-label={`Chat for #${channel.name}`}>
      <ChannelChatHeader
        channel={channel}
        isAdmin={isAdmin}
        showMembers={showMembers}
        onRefresh={onRefresh}
        onEditChannel={onEditChannel}
        onToggleMembers={onToggleMembers}
        onOpenMobileSidebar={onOpenMobileSidebar}
        onToggleSidebar={onToggleSidebar}
        showChannelDescription={showChannelDescription}
        onToggleChannelDescription={() =>
          setShowChannelDescription((prev) => !prev)
        }
        channelNameButtonRef={channelNameButtonRef}
      />

      {showChannelDescription && (
        <div
          ref={descriptionPanelRef}
          className="channel-description-panel"
          role="region"
          aria-label={`${channel.name} description`}
        >
          <p>{channel.description || 'No description available.'}</p>
        </div>
      )}

      <div
        className="channel-messages-stream"
        ref={messagesStreamRef}
        onScroll={handleMessagesScroll}
      >
        <ChannelWelcome channel={channel} />
        <ChannelMessageList
          workspace={workspace}
          messages={messages}
          processedMessages={processedMessages}
          loadingMessages={loadingMessages}
          currentUser={currentUser}
          isAdmin={isAdmin}
          editingMsgId={editingMsgId}
          editingText={editingText}
          setEditingText={setEditingText}
          setEditingMsgId={setEditingMsgId}
          setMoreMenuMessageId={setMoreMenuMessageId}
          copiedMsgId={copiedMsgId}
          moreMenuMessageId={moreMenuMessageId}
          reactionPickerMessageId={reactionPickerMessageId}
          setReactionPickerMessageId={setReactionPickerMessageId}
          reactingMessageId={reactingMessageId}
          highlightedMessageId={highlightedMessageId}
          setHighlightedMessageId={setHighlightedMessageId}
          onEditMessage={handleEditMessage}
          onCopyMessage={handleCopyMessage}
          onDeleteMessage={handleDeleteMessage}
          onReaction={handleReaction}
          onReply={setReplyingTo}
          messagesEndRef={messagesEndRef}
          messageScrollRootRef={messagesStreamRef}
          onMessageViewed={onMessageViewed}
        />
      </div>

        {!isAtBottom && (
        <button
          type="button"
          className="chat-scroll-to-bottom"
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          aria-label="Scroll to latest messages"
          title="Latest messages"
        >
          <ArrowDownIcon size={18} className="chat-scroll-icon" />
          
        </button>
      )}

      <MessageComposer
        channel={channel}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        inputText={inputText}
        sending={sending}
        textareaRef={textareaRef}
        handleSend={handleSend}
        handleInputChange={handleInputChange}
        handleKeyDown={handleKeyDown}
        handleQuickEmoji={handleQuickEmoji}
      />

      {deletingMessage && (
        <DeleteMessageModal
          message={deletingMessage}
          onClose={() => setDeletingMessage(null)}
          onConfirm={confirmDeleteMessage}
          busy={deleting}
        />
      )}
    </section>
  );
}

export default ChannelChatArea;
