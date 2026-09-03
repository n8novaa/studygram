function CreateFolderForm({
  name,
  creating,
  onNameChange,
  onSubmit,
}) {
  return (
    <form
      className="workspace-files-create-form"
      onSubmit={onSubmit}
    >
      <input
        type="text"
        className="workspace-files-input"
        placeholder="Folder name"
        value={name}
        onChange={onNameChange}
        disabled={creating}
      />

      <button
        type="submit"
        className="workspace-button workspace-button-primary"
        disabled={
          creating ||
          !name.trim()
        }
      >
        {creating
          ? 'Creating...'
          : 'Create'}
      </button>
    </form>
  )
}

export default CreateFolderForm