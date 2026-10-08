interface PlaceholderPanelProps {
  title: string;
}

export default function PlaceholderPanel({ title }: PlaceholderPanelProps) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "#6b7684" }}>
      <h3>{title}</h3>
      <p>This section is not implemented yet.</p>
    </div>
  );
}