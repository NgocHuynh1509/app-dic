import "./StatusBar.css";

interface Props {
  currentMethod: string;
  currentOutput: string;
  totalSpecimens: number;
  totalSelected: number;
}

export default function StatusBar({
  currentMethod,
  currentOutput,
  totalSpecimens,
  totalSelected,
}: Props) {
  return (
    <footer className="status-bar">
      <span>
        <strong>Current Method:</strong> {currentMethod}
      </span>
      <span>
        <strong>Current Output:</strong> {currentOutput}
      </span>
      <span>
        <strong>Total Specimens:</strong> {totalSpecimens}
      </span>
      <span>
        <strong>Total Selected:</strong> {totalSelected}
      </span>
    </footer>
  );
}
