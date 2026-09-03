function JoinRequestCard({
  request,
  processing,
  onApprove,
  onReject,
}) {
  return (
    <article className="request-card">

      <div className="request-content">

        <div className="request-avatar">
          {request.user
            ?.charAt(0)
            ?.toUpperCase()}
        </div>

        <div className="request-details">

          <h3>
            {request.user}
          </h3>

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