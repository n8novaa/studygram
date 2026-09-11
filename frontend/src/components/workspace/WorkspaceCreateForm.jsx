import { GlobeIcon, LockIcon, PlusIcon, CheckIcon } from '../common/Icons';
import '../../styles/components/workspace/create-form.css';

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
        <h2>Create a new workspace</h2>
        <p>Set up a shared space for lecture notes, study files, and group discussions.</p>
      </div>

      <form className="workspace-form" onSubmit={onSubmit}>
        <div className="workspace-field">
          <label htmlFor="workspace-name">Workspace name *</label>
          <input
            id="workspace-name"
            type="text"
            value={name}
            onChange={onNameChange}
            placeholder="e.g. Distributed Systems 401"
            disabled={creating}
            autoFocus
            required
          />
        </div>

        <div className="workspace-field">
          <label htmlFor="workspace-description">
            Description <span>Optional</span>
          </label>
          <textarea
            id="workspace-description"
            value={description}
            onChange={onDescriptionChange}
            placeholder="Describe the topics, group goals, or class schedule..."
            rows="3"
            disabled={creating}
          />
        </div>

        <fieldset className="workspace-visibility" disabled={creating}>
          <legend>Workspace Visibility</legend>

          <div className="workspace-visibility-options">
            <label
              className={`workspace-visibility-option ${
                visibility === 'public' ? 'selected' : ''
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
                <GlobeIcon size={20} />
              </div>
              <div className="workspace-visibility-option-content">
                <span className="workspace-visibility-option-title">Public</span>
                <span className="workspace-visibility-option-description">
                  Anyone can discover and join immediately.
                </span>
              </div>
              {visibility === 'public' && (
                <span className="workspace-option-check">
                  <CheckIcon size={16} />
                </span>
              )}
            </label>

            <label
              className={`workspace-visibility-option ${
                visibility === 'private' ? 'selected' : ''
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
                <LockIcon size={20} />
              </div>
              <div className="workspace-visibility-option-content">
                <span className="workspace-visibility-option-title">Private</span>
                <span className="workspace-visibility-option-description">
                  Visible in search, but joining requires admin approval.
                </span>
              </div>
              {visibility === 'private' && (
                <span className="workspace-option-check">
                  <CheckIcon size={16} />
                </span>
              )}
            </label>
          </div>
        </fieldset>

        {createError && (
          <div className="workspace-form-error">{createError}</div>
        )}

        <div className="workspace-form-actions">
          <button type="submit" className="workspace-button" disabled={creating}>
            {creating ? (
              <>
                <span className="spinner" /> Creating Workspace...
              </>
            ) : (
              <>
                <PlusIcon size={16} /> Create Workspace
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

export default WorkspaceCreateForm;