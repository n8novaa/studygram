function WorkspaceEditForm({
  name,
  description,
  visibility,

  saving,
  formError,

  onNameChange,
  onDescriptionChange,
  onVisibilityChange,

  onSave,
  onCancel,
}) {
  return (
    <section className="workspace-detail-card">

      <div className="workspace-section-heading">

        <div>

          <span className="workspace-eyebrow">
            Workspace
          </span>

          <h2>
            Edit workspace
          </h2>

        </div>

      </div>


      <form
        className="workspace-edit-form"
        onSubmit={onSave}
      >

        <div className="workspace-detail-field">

          <label htmlFor="workspace-edit-name">
            Name
          </label>

          <input
            id="workspace-edit-name"
            type="text"
            value={name}
            onChange={onNameChange}
            disabled={saving}
          />

        </div>


        <div className="workspace-detail-field">

          <label htmlFor="workspace-edit-description">
            Description
          </label>

          <textarea
            id="workspace-edit-description"
            value={description}
            onChange={onDescriptionChange}
            rows="4"
            disabled={saving}
          />

        </div>


        <fieldset
          className="workspace-detail-fieldset"
          disabled={saving}
        >

          <legend>
            Visibility
          </legend>


          <label className="workspace-detail-radio">

            <input
              type="radio"
              name="workspace-visibility"
              value="public"
              checked={
                visibility === 'public'
              }
              onChange={
                onVisibilityChange
              }
            />

            <span>

              <strong>
                Public
              </strong>

              <small>
                Anyone can join immediately.
              </small>

            </span>

          </label>


          <label className="workspace-detail-radio">

            <input
              type="radio"
              name="workspace-visibility"
              value="private"
              checked={
                visibility === 'private'
              }
              onChange={
                onVisibilityChange
              }
            />

            <span>

              <strong>
                Private
              </strong>

              <small>
                Users need admin approval
                to join.
              </small>

            </span>

          </label>

        </fieldset>


        {formError && (
          <div className="workspace-detail-form-error">
            {formError}
          </div>
        )}


        <div className="workspace-edit-actions">

          <button
            type="button"
            className="workspace-secondary-button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>


          <button
            type="submit"
            className="workspace-primary-button"
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : 'Save Changes'}
          </button>

        </div>

      </form>

    </section>
  )
}


export default WorkspaceEditForm