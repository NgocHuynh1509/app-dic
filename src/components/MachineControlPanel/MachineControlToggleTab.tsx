import "./MachineControlPanel.css";

interface Props {
  isOpen: boolean;
  onOpen: () => void;
}

export default function MachineControlToggleTab({ isOpen, onOpen }: Props) {
  if (isOpen) return null;

  return (
    <button className="mcp-tab" onClick={onOpen} title="Show machine control panel">
      <span>Machine Control</span>
    </button>
  );
}