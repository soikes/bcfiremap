import './Toast.css';

interface Props {
  message: string;
}

/** A short message in a pale yellow box, announced to screen readers. */
export function Toast({ message }: Props) {
  return (
    <p className="toast" role="status">
      {message}
    </p>
  );
}
