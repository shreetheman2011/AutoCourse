export default function Logo({ size = 'large' }: { size?: 'small' | 'large' }) {
  const sizeClasses = {
    large: 'text-6xl md:text-7xl',
    small: 'text-2xl md:text-3xl',
  }

  return (
    <div className="flex items-center justify-center">
      <h1
        className={`${sizeClasses[size]} font-black tracking-tight`}
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '-0.02em',
          textShadow: '0 0 30px rgba(102, 126, 234, 0.3)',
        }}
      >
        <span className="font-extrabold" style={{ fontFamily: 'Georgia, serif' }}>
          auto
        </span>
        <span className="font-black" style={{ fontFamily: 'Arial, sans-serif' }}>
          course
        </span>
      </h1>
    </div>
  )
}

