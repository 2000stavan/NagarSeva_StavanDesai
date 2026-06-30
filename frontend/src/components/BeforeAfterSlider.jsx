import { useState, useRef, useEffect } from 'react';
import { handleImageError } from '../api/client';

export default function BeforeAfterSlider({ before, after, category }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
      setPosition(Math.max(5, Math.min(95, (x / rect.width) * 100)));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  if (!after) return <img src={before} onError={(e) => handleImageError(e, category)} alt="Issue" className="rounded-xl w-full h-64 object-cover" />;

  return (
    <div ref={containerRef} className="before-after-slider select-none">
      <img src={before} onError={(e) => handleImageError(e, category)} alt="Before" />
      <div className="after" style={{ width: `${position}%` }}>
        <img src={after} onError={(e) => handleImageError(e, category)} alt="After" style={{ width: `${100 / (position / 100)}%`, maxWidth: 'none' }} />
      </div>
      <div
        className="slider-handle"
        style={{ left: `${position}%` }}
        onMouseDown={() => { dragging.current = true; }}
        onTouchStart={() => { dragging.current = true; }}
      />
    </div>
  );
}
