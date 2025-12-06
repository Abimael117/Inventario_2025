import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          borderRadius: '4px',
          background: '#3F51B5', // Corresponde al color primario
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white" // Color del ícono
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: '22px', height: '22px' }}
        >
          <path d="M8.38 4.63A8.53 8.53 0 1 0 19.37 15.6" />
          <path d="M15.63 19.37A8.53 8.53 0 1 0 4.63 8.4" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
