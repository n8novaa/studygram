import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const VIEWPORT_SIZE = 256;
const OUTPUT_SIZE = 512;

function makeCroppedFile(image, zoom, position) {
  const scale = Math.max(VIEWPORT_SIZE / image.naturalWidth, VIEWPORT_SIZE / image.naturalHeight) * zoom;
  const renderedWidth = image.naturalWidth * scale;
  const renderedHeight = image.naturalHeight * scale;
  const left = (VIEWPORT_SIZE - renderedWidth) / 2 + position.x;
  const top = (VIEWPORT_SIZE - renderedHeight) / 2 + position.y;
  const sourceX = Math.max(0, -left / scale);
  const sourceY = Math.max(0, -top / scale);
  const sourceWidth = Math.min(VIEWPORT_SIZE / scale, image.naturalWidth - sourceX);
  const sourceHeight = Math.min(VIEWPORT_SIZE / scale, image.naturalHeight - sourceY);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context || sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('Could not prepare this image for upload.');
  }
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not prepare this image for upload.'));
        return;
      }
      resolve(new File([blob], 'profile-photo.png', { type: 'image/png' }));
    }, 'image/png');
  });
}

export default function ProfilePhotoCropper({ file, onCancel, onConfirm, returnFocusRef }) {
  const [imageUrl, setImageUrl] = useState('');
  const [imageSize, setImageSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCancelRef = useRef(onCancel);
  const processingRef = useRef(processing);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const baseScale = imageSize
    ? Math.max(VIEWPORT_SIZE / imageSize.width, VIEWPORT_SIZE / imageSize.height)
    : 1;
  const imageWidth = imageSize ? imageSize.width * baseScale * zoom : 0;
  const imageHeight = imageSize ? imageSize.height * baseScale * zoom : 0;
  const previewRatio = 84 / VIEWPORT_SIZE;

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setImageUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  useEffect(() => {
    onCancelRef.current = onCancel;
    processingRef.current = processing;
  }, [onCancel, processing]);

  useEffect(() => {
    const returnFocusElement = returnFocusRef?.current;
    closeButtonRef.current?.focus();
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!processingRef.current) onCancelRef.current();
      }
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled)');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      returnFocusElement?.focus();
    };
  }, [returnFocusRef]);

  function clampPosition(next, nextZoom = zoom) {
    if (!imageSize) return next;
    const width = imageSize.width * baseScale * nextZoom;
    const height = imageSize.height * baseScale * nextZoom;
    const maxX = Math.max(0, (width - VIEWPORT_SIZE) / 2);
    const maxY = Math.max(0, (height - VIEWPORT_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function handleZoom(event) {
    const nextZoom = Number(event.target.value);
    setZoom(nextZoom);
    setPosition((current) => clampPosition(current, nextZoom));
  }

  function handlePointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, position };
  }

  function handlePointerMove(event) {
    if (!dragRef.current) return;
    setPosition(clampPosition({
      x: dragRef.current.position.x + event.clientX - dragRef.current.x,
      y: dragRef.current.position.y + event.clientY - dragRef.current.y,
    }));
  }

  function handlePointerUp() { dragRef.current = null; }

  async function confirmCrop() {
    if (!imageRef.current || !imageSize) return;
    setProcessing(true);
    setError('');
    try {
      await onConfirm(await makeCroppedFile(imageRef.current, zoom, position));
    } catch (cropError) {
      setError(cropError.message || 'Could not crop this image.');
      setProcessing(false);
    }
  }

  const imageStyle = {
    width: imageWidth,
    height: imageHeight,
    left: `calc(50% + ${position.x}px)`,
    top: `calc(50% + ${position.y}px)`,
  };

  return createPortal(
    <div className="profile-crop-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !processing) onCancel();
    }} onClick={(event) => event.stopPropagation()}>
      <section ref={dialogRef} className="profile-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-crop-title">
        <header><div><h2 id="profile-crop-title">Adjust your photo</h2><p>Drag to reposition, then zoom to frame your avatar.</p></div>
          <button ref={closeButtonRef} type="button" className="profile-crop-close" onClick={onCancel} disabled={processing} aria-label="Cancel photo crop">×</button>
        </header>
        <div className="profile-crop-workspace">
          <div
            className="profile-crop-viewport"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            aria-label="Drag the photo to adjust the crop"
          >
            <img ref={imageRef} src={imageUrl || undefined} alt="Crop preview" style={imageStyle}
              onLoad={(event) => {
                setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
                setError('');
              }}
              onError={() => setError('This image could not be opened. Choose another file.')} />
            <span className="profile-crop-circle" aria-hidden="true" />
          </div>
          <div className="profile-crop-preview-column">
            <span>Preview</span>
            <div className="profile-crop-live-preview">
              <img src={imageUrl || undefined} alt="Final avatar preview" style={{
                width: imageWidth * previewRatio,
                height: imageHeight * previewRatio,
                left: `calc(50% + ${position.x * previewRatio}px)`,
                top: `calc(50% + ${position.y * previewRatio}px)`,
              }} />
            </div>
            <label className="profile-crop-zoom">Zoom
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={handleZoom} aria-label="Zoom photo" />
            </label>
          </div>
        </div>
        {error && <p className="profile-crop-error" role="alert">{error}</p>}
        <footer>
          <button type="button" className="profile-secondary-button" onClick={onCancel} disabled={processing}>Cancel</button>
          <button type="button" className="profile-save-button" onClick={confirmCrop} disabled={!imageSize || processing}>
            {processing ? 'Preparing…' : 'Use this photo'}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
