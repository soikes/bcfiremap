import { useLayoutEffect, useRef, useState } from 'react';
import './Disclaimer.css';

const DISCLAIMER_TEXT =
  'This map is a work in progress and for informational purposes only. Data may be incomplete or out of date. ' +
  'Always check with your municipality or local fire department for up-to-date information.';

const EDGE_PX = 10;
const GAP_PX = 8;

interface Placement {
  bottom: number;
  besideButton: boolean;
}

/** Whether MapLibre's attribution is showing its text rather than only its collapsed "i" button. */
function attributionOpen(attribution: Element): boolean {
  const { classList } = attribution;
  if (classList.contains('maplibregl-attrib-empty')) return false;
  return !classList.contains('maplibregl-compact') || classList.contains('maplibregl-compact-show');
}

/** Where the notice sits inside `container`: just above the attribution while its text shows, else at the bottom beside the attribution button. */
function placementIn(container: Element): Placement {
  const attribution = container.querySelector('.maplibregl-ctrl-attrib');
  if (!attribution || !attributionOpen(attribution)) return { bottom: EDGE_PX, besideButton: true };
  const clearance = container.getBoundingClientRect().bottom - attribution.getBoundingClientRect().top;
  return { bottom: Math.max(clearance, 0) + GAP_PX, besideButton: false };
}

/** A short notice centred at the bottom of the map saying the data may be wrong and where to check, kept clear of MapLibre's attribution as it opens and closes. */
export function Disclaimer() {
  const ref = useRef<HTMLParagraphElement>(null);
  const [placement, setPlacement] = useState<Placement>({ bottom: EDGE_PX, besideButton: true });

  useLayoutEffect(() => {
    const container = ref.current?.parentElement;
    if (!container) return;
    const update = () =>
      setPlacement(current => {
        const next = placementIn(container);
        return next.bottom === current.bottom && next.besideButton === current.besideButton ? current : next;
      });
    update();
    const observer = new MutationObserver(update);
    observer.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <p
      ref={ref}
      className={placement.besideButton ? 'disclaimer disclaimer-beside-button' : 'disclaimer'}
      style={{ bottom: placement.bottom }}
    >
      {DISCLAIMER_TEXT}
    </p>
  );
}
