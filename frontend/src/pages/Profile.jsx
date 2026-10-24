import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/common/ToastContext';
import { LockIcon, ShieldIcon } from '../components/common/Icons';
import UserAvatar from '../components/common/UserAvatar';
import ProfilePhotoCropper from '../components/common/ProfilePhotoCropper';
import { getProfile, updateProfile } from '../services/profileService';
import '../styles/pages/profile.css';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function Profile() {
  const { accessToken, user, updateUser } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);
  const photoTriggerRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [cropFile, setCropFile] = useState(null);

  const hasChanges = Boolean(profile) && (
    displayName.trim() !== (profile.display_name || '')
    || bio.trim() !== (profile.bio || '')
    || Boolean(selectedPhoto)
    || removePhoto
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getProfile(accessToken)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message || 'Could not load your profile.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [accessToken, loadAttempt]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function handlePhotoChange(event) {
    const [photo] = event.target.files || [];
    if (!photo) return;
    if (!ACCEPTED_AVATAR_TYPES.includes(photo.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (photo.size > MAX_AVATAR_SIZE) {
      setError('Profile photos cannot exceed 5 MB.');
      event.target.value = '';
      return;
    }
    setError('');
    setCropFile(photo);
    event.target.value = '';
  }

  function handleCropCancel() {
    setCropFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleCropConfirm(croppedPhoto) {
    setSelectedPhoto(croppedPhoto);
    setPhotoPreview(URL.createObjectURL(croppedPhoto));
    setRemovePhoto(false);
    setCropFile(null);
  }

  function handleRemovePhoto() {
    setSelectedPhoto(null);
    setPhotoPreview('');
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDiscardChanges() {
    setDisplayName(profile?.display_name || '');
    setBio(profile?.bio || '');
    setSelectedPhoto(null);
    setPhotoPreview('');
    setRemovePhoto(false);
    setError('');
    setCropFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const formData = new FormData();
    formData.append('display_name', displayName.trim());
    formData.append('bio', bio.trim());
    if (selectedPhoto) formData.append('avatar', selectedPhoto);
    if (removePhoto) formData.append('remove_avatar', 'true');

    try {
      const updated = await updateProfile(accessToken, formData);
      setProfile(updated);
      setDisplayName(updated.display_name || '');
      setBio(updated.bio || '');
      setSelectedPhoto(null);
      setPhotoPreview('');
      setRemovePhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      updateUser({ profile: { display_name: updated.display_name, avatar: updated.avatar } });
      addToast('Your profile has been updated.', 'success');
    } catch (requestError) {
      setError(requestError.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  const avatarUrl = photoPreview || (removePhoto ? '' : profile?.avatar);

  return (
    <section className="profile-page">
      <header className="profile-page-header">
        <div>
          <h1>Your profile</h1>
          <p>Manage your profile details and sign-in account in one place.</p>
        </div>
      </header>

      {cropFile && (
        <ProfilePhotoCropper
          file={cropFile}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
          returnFocusRef={photoTriggerRef}
        />
      )}

      {loading ? (
        <div className="profile-loading" role="status">Loading your profile…</div>
      ) : !profile ? (
        <div className="profile-load-error" role="alert">
          <p>{error || 'Could not load your profile.'}</p>
          <button
            type="button"
            className="profile-secondary-button"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="profile-settings-layout">
          <div className="profile-settings-main">
            <form className="profile-card" onSubmit={handleSubmit}>
              <div className="profile-card-heading">
                <div>
                  <h2>Personal details</h2>
                  <p>Your name and photo help other members recognize you.</p>
                </div>
              </div>

              <div className="profile-photo-section">
                <UserAvatar
                  src={avatarUrl}
                  displayName={displayName.trim() || user?.profile?.display_name}
                  username={user?.username}
                  className="profile-photo-preview"
                  loading="eager"
                  viewable
                />
                <div className="profile-photo-controls">
                  <strong>Profile photo</strong>
                  <span>Use a clear image. JPEG, PNG, or WebP, up to 5 MB.</span>
                  <div className="profile-photo-actions">
                    <button ref={photoTriggerRef} type="button" className="profile-secondary-button" onClick={() => fileInputRef.current?.click()}>
                      {avatarUrl ? 'Change photo' : 'Upload photo'}
                    </button>
                    {(profile?.avatar || selectedPhoto) && !removePhoto && (
                      <button type="button" className="profile-text-button" onClick={handleRemovePhoto}>
                        Remove photo
                      </button>
                    )}
                  </div>
                  {selectedPhoto && <small className="profile-photo-pending-upload">New photo will be used when you save.</small>}
                  {removePhoto && <small className="profile-photo-pending-removal">Photo will be removed when you save.</small>}
                  <input
                    ref={fileInputRef}
                    className="profile-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    aria-label="Choose a profile photo"
                  />
                </div>
              </div>

              <div className="profile-form-grid">
                <label className="profile-field">
                  <span>Display name</span>
                  <input
                    type="text"
                    maxLength={80}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder={user?.username || 'Your name'}
                    autoComplete="name"
                  />
                  <small>Shown with your messages and member listing.</small>
                </label>

                <label className="profile-field profile-field-wide">
                  <span>About you <span className="profile-optional">Optional</span></span>
                  <textarea
                    rows={4}
                    maxLength={280}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="Share a little about what you’re studying"
                  />
                  <small className="profile-bio-count">{bio.length}/280</small>
                </label>
              </div>

              {error && <p className="profile-error" role="alert">{error}</p>}

              <footer className="profile-form-footer">
                <span>{hasChanges ? 'You have unsaved changes.' : 'Your profile details are up to date.'}</span>
                <div className="profile-form-actions">
                  {hasChanges && (
                    <button type="button" className="profile-cancel-button" onClick={handleDiscardChanges} disabled={saving}>
                      Discard
                    </button>
                  )}
                  <button type="submit" className="profile-save-button" disabled={saving || !hasChanges}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </footer>
            </form>
          </div>

          <aside className="profile-settings-aside" aria-label="Account and security settings">
            <section className="profile-side-card">
              <div className="profile-side-heading">
                <span className="profile-side-icon"><LockIcon size={16} /></span>
                <div><h2>Account details</h2><p>Private sign-in information</p></div>
              </div>
              <dl className="profile-account-list">
                <div>
                  <dt>Username</dt>
                  <dd>{profile?.username || user?.username || '—'}</dd>
                </div>
                <div>
                  <dt>Email for account recovery</dt>
                  <dd>{profile?.email || user?.email || 'No email on file'}</dd>
                </div>
              </dl>
              <p className="profile-security-note">
                <LockIcon size={13} /> Email and username can’t be changed from profile settings.
              </p>
            </section>

            <section className="profile-side-card profile-security-card">
              <div className="profile-side-heading">
                <span className="profile-side-icon"><ShieldIcon size={16} /></span>
                <div><h2>Password &amp; security</h2><p>Keep your account protected</p></div>
              </div>
              <p className="profile-security-copy">If you need to update your password, request a secure reset link sent to the email on your account.</p>
              <Link className="profile-reset-link" to="/forgot-password">Request a password reset</Link>
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}

export default Profile;
