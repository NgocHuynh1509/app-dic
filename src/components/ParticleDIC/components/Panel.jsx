export default function Panel({ title, className = "", children }) {
  return (
    <section className={`panel ${className}`}>
      <h2 className="panel-title">{title}</h2>
      {children}
    </section>
  );
}
