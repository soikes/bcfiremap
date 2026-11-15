import './LoadSpinner.css';

interface Props {
  active: boolean;
}

/** A small spinning ring, visible only while `active` (it keeps its space when idle so the search bar doesn't change width), with a label for screen readers. */
export function LoadSpinner({ active }: Props) {
  return active ? (
    <span className="load-spinner" role="status" aria-label="Loading ban data" />
  ) : (
    <span className="load-spinner load-spinner-idle" aria-hidden="true" />
  );
}
