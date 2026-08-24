export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="30" height="30" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2C10 2 2 10 2 20" stroke="#2F8FA6" strokeWidth="4" strokeLinecap="round" />
        <path d="M20 9C13 9 9 13 9 20" stroke="#7FC4D0" strokeWidth="4" strokeLinecap="round" />
        <path d="M14 15L28 20L14 25V15Z" fill="#E8963C" />
      </svg>
      {!compact && <span className="text-[17px] font-bold tracking-tight text-ink-800">VideoStream Hub</span>}
    </div>
  )
}
