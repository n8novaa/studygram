import "../../styles/components/workspace/create-form.css";

function WorkspaceCreateForm({
  name,
  description,
  visibility,
  creating,
  createError,
  onNameChange,
  onDescriptionChange,
  onVisibilityChange,
  onSubmit,
}) {
  return (
    <section className="workspace-create">

      <div className="workspace-create-header">

        <div>
          <h2>Create workspace</h2>

          <p>
            Create a shared space for your study group.
          </p>
        </div>

      </div>


      <form
        className="workspace-form"
        onSubmit={onSubmit}
      >

        <div className="workspace-field">

          <label htmlFor="workspace-name">
            Workspace name
          </label>

          <input
            id="workspace-name"
            type="text"
            value={name}
            onChange={onNameChange}
            placeholder="e.g. Python Study Group"
            disabled={creating}
            autoFocus
          />

        </div>


        <div className="workspace-field">

          <label htmlFor="workspace-description">
            Description
            <span>Optional</span>
          </label>

          <textarea
            id="workspace-description"
            value={description}
            onChange={onDescriptionChange}
            placeholder="What will your workspace be used for?"
            rows="4"
            disabled={creating}
          />

        </div>


        <fieldset
          className="workspace-visibility"
          disabled={creating}
        >

          <legend>Workspace visibility</legend>

          <div className="workspace-visibility-options">

            <label
              className={`workspace-visibility-option ${
                visibility === 'public'
                  ? 'selected'
                  : ''
              }`}
            >

              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={onVisibilityChange}
              />

              <div className="workspace-option-icon">
                ◉
              </div>

              <div className="workspace-visibility-option-content">

                <span className="workspace-visibility-option-title">
                  Public
                </span>

                <span className="workspace-visibility-option-description">
                  Anyone can discover and join
                  immediately.
                </span>

              </div>

              <span className="workspace-option-check">
                ✓
              </span>

            </label>


            <label
              className={`workspace-visibility-option ${
                visibility === 'private'
                  ? 'selected'
                  : ''
              }`}
            >

              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === 'private'}
                onChange={onVisibilityChange}
              />

              <div className="workspace-option-icon">
                ◉
              </div>

              <div className="workspace-visibility-option-content">

                <span className="workspace-visibility-option-title">
                  Private
                </span>

                <span className="workspace-visibility-option-description">
                  Anyone can discover it, but joining
                  requires admin approval.
                </span>

              </div>

              <span className="workspace-option-check">
                ✓
              </span>

            </label>

          </div>

        </fieldset>


        {createError && (
          <div className="workspace-form-error">
            {createError}
          </div>
        )}


        <div className="workspace-form-actions">

          <button
            type="submit"
            className="workspace-button"
            disabled={creating}
          >
            {creating
              ? 'Creating...'
              : 'Create Workspace'}
          </button>

        </div>

      </form>

    </section>
  )
}


export default WorkspaceCreateForm