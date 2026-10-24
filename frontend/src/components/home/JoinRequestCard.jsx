import "../../styles/components/home/join-request-card.css";
import UserAvatar from '../common/UserAvatar';

function JoinRequestCard({
  request,
  processing,
  onApprove,
  onReject,
}) {
  return (
    <article className="request-card">

      <div className="request-content">

        <UserAvatar
          src={request.avatar}
          displayName={request.display_name}
          username={request.user}
          className="request-avatar"
        />

        <div className="request-details">

          <h3>
            {request.display_name || request.user}
          </h3>
          {request.display_name && <span className="request-user-handle">@{request.user}</span>}

          <p>
            wants to join

            <strong>
              {' '}
              {request.workspaceName}
            </strong>
          </p>

        </div>

      </div>


      <div className="request-actions">

        <button
          className="button button-primary"
          type="button"
          onClick={() => onApprove(request)}
          disabled={processing}
        >
          {processing
            ? 'Processing...'
            : 'Accept'}
        </button>


        <button
          className="button button-secondary"
          type="button"
          onClick={() => onReject(request)}
          disabled={processing}
        >
          Reject
        </button>

      </div>

    </article>
  )
}


export default JoinRequestCard
