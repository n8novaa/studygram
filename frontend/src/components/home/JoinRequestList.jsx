import JoinRequestCard from './JoinRequestCard'


function JoinRequestList({
  requests,
  loading,
  processingRequestId,
  onApprove,
  onReject,
}) {
  return (
    <div className="request-list">

      {loading ? (

        <div className="home-state">

          <p>
            Loading join requests...
          </p>

        </div>

      ) : requests.length === 0 ? (

        <div className="home-state">

          <h3>
            No pending requests
          </h3>

          <p>
            Join requests for your workspaces
            will appear here.
          </p>

        </div>

      ) : (

        requests.map((request) => (

          <JoinRequestCard
            key={request.id}
            request={request}
            processing={
              processingRequestId === request.id
            }
            onApprove={onApprove}
            onReject={onReject}
          />

        ))

      )}

    </div>
  )
}


export default JoinRequestList