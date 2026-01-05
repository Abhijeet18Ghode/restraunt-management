export default function Card({ 
  children, 
  title, 
  subtitle, 
  className = '',
  headerAction,
  ...props 
}) {
  return (
    <div className={`card ${className}`} {...props}>
      {(title || subtitle || headerAction) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          {headerAction && (
            <div>{headerAction}</div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}