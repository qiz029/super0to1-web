export function ProgramName({ name }: { name: string }) {
  return <span className="program-name">Super <strong>{name.replace(/^Super /, '')}</strong></span>
}
