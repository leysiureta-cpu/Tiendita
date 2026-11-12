function SectionPlaceholder({ section }) {
  const Icon = section.icon

  return (
    <section className="section-page">
      <header className="page-header">
        <p className="eyebrow">MINI SÚPER / {section.label.toUpperCase()}</p>
        <h1>{section.label}</h1>
      </header>

      <div className="placeholder-card">
        <span className="placeholder-icon">
          <Icon size={28} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <h2>Sección en preparación</h2>
        <p>
          La sección de {section.label.toLowerCase()} estará disponible
          próximamente.
        </p>
      </div>
    </section>
  )
}

export default SectionPlaceholder
