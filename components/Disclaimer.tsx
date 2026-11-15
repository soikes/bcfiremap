import './Disclaimer.css';

const DISCLAIMER_TEXT =
  'This map is a work in progress and for informational purposes only. Data may be incomplete or out of date. ' +
  'Always check with your municipality or local fire department for up-to-date information.';

/** A short notice centred at the bottom of the map saying the data may be wrong and where to check. */
export function Disclaimer() {
  return <p className="disclaimer">{DISCLAIMER_TEXT}</p>;
}
