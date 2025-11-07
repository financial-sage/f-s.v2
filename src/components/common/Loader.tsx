import React from 'react';

interface LoaderProps {
  size?: number;
  color?: string;
  className?: string;
}

export default function Loader({ size = 48, color = '#3b82f6', className = '' }: LoaderProps) {
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
        <g>
          <circle
            strokeDasharray="164.93361431346415 56.97787143782138"
            r="35"
            strokeWidth="10"
            stroke={color}
            fill="none"
            cy="50"
            cx="50"
          >
            <animateTransform
              keyTimes="0;1"
              values="0 50 50;360 50 50"
              dur="1s"
              repeatCount="indefinite"
              type="rotate"
              attributeName="transform"
            />
          </circle>
          <g />
        </g>
      </svg>
    </div>
  );
}
