import { HashIcon } from '../../../common/Icons';

function ChannelWelcome({ channel }) {
  return (
    <div className="channel-welcome-hero">
      <div className="welcome-hash-circle">
        <HashIcon size={28} />
      </div>
      <h3>Welcome to #{channel.name}!</h3>
      <p>
        This is the start of the <strong>#{channel.name}</strong> channel.{' '}
        {channel.description
          ? `Topic: ${channel.description}`
          : 'Collaborate and study together with your workspace members.'}
      </p>
    </div>
  );
}

export default ChannelWelcome;
