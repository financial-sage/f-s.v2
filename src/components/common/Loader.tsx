import React from 'react';

interface LoaderProps {
  size?: number;
  primaryColor?: string;
  secondaryColor?: string;
  className?: string;
}

export default function Loader({ 
  size = 48, 
  primaryColor = '#0099e5',
  secondaryColor = '#ff4c4c',
  className = '' 
}: LoaderProps) {
  return (
    <div className={`inline-block ${className}`} style={{ width: size, height: size }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid"
        width={size}
        height={size}
        style={{ shapeRendering: 'auto', display: 'block', background: 'transparent' }}
      >
        <style>
          {`
            @keyframes barAnimate {
              0%, 4% { transform: scale(0.91); }
              8% { transform: scale(0.91); animation-timing-function: cubic-bezier(0.69,0.60,0.35,0.27); }
              14% { transform: scale(0.93); }
              18% { transform: scale(0.94); }
              22% { transform: scale(0.96); animation-timing-function: cubic-bezier(0.67,0.66,0.34,0.33); }
              26% { transform: scale(0.97); }
              30% { transform: scale(0.99); }
              34% { transform: scale(1.01); animation-timing-function: cubic-bezier(0.65,0.71,0.32,0.38); }
              40% { transform: scale(1.02); animation-timing-function: cubic-bezier(0.64,0.74,0.31,0.41); }
              46% { transform: scale(1.03); animation-timing-function: cubic-bezier(0.60,0.91,0.23,0.63); }
              50%, 54% { transform: scale(1.03); }
              58% { transform: scale(1.03); animation-timing-function: cubic-bezier(0.69,0.60,0.35,0.27); }
              64% { transform: scale(1.01); }
              68% { transform: scale(1.00); }
              72% { transform: scale(0.98); animation-timing-function: cubic-bezier(0.67,0.66,0.34,0.33); }
              76% { transform: scale(0.97); animation-timing-function: cubic-bezier(0.66,0.68,0.33,0.35); }
              82% { transform: scale(0.94); animation-timing-function: cubic-bezier(0.65,0.71,0.32,0.38); }
              88% { transform: scale(0.92); animation-timing-function: cubic-bezier(0.65,0.73,0.31,0.40); }
              94%, 100% { transform: scale(0.91); animation-timing-function: cubic-bezier(0.63,0.80,0.28,0.48); }
            }
          `}
        </style>
        <g transform="scale(0.8)" style={{ transformOrigin: '50px 50px' }}>
          {/* Barra 1 */}
          <g style={{ 
            transformOrigin: '50px 50px', 
            animation: 'barAnimate 1s linear -0.583333s infinite'
          }}>
            <path d="M7.5 48h16.541v40.595H7.5z" fill={primaryColor} />
          </g>
          
          {/* Barra 2 */}
          <g style={{ 
            transformOrigin: '50px 50px', 
            animation: 'barAnimate 1s linear -0.666667s infinite'
          }}>
            <path d="M29.554 45h16.541v43.595H29.554z" fill={primaryColor} />
          </g>
          
          {/* Barra 3 */}
          <g style={{ 
            transformOrigin: '50px 50px', 
            animation: 'barAnimate 1s linear -0.75s infinite'
          }}>
            <path d="M51.608 44h16.541v44.595H51.608z" fill={primaryColor} />
          </g>
          
          {/* Barra 4 */}
          <g style={{ 
            transformOrigin: '50px 50px', 
            animation: 'barAnimate 1s linear -0.833333s infinite'
          }}>
            <path d="M73.662 25h16.541v63.595H73.662z" fill={primaryColor} />
          </g>
          
          {/* Línea de gráfico */}
          <g style={{ 
            transformOrigin: '50px 50px', 
            animation: 'barAnimate 1s linear -0.916667s infinite'
          }}>
            <path 
              d="M7.5 55.054l20.216-20.216 20.676 20.676 32.136-32.136" 
              stroke={secondaryColor}
              strokeWidth="14"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
          
          {/* Flecha */}
          <g style={{ 
            transformOrigin: '50px 50px', 
            animation: 'barAnimate 1s linear -1s infinite'
          }}>
            <path 
              d="M64.843 11.402l27.66 27.661-.003-27.658z" 
              fill={secondaryColor}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
