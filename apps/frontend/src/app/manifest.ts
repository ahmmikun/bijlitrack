import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BijliTrack - Smart Electricity Dashboard',
    short_name: 'BijliTrack',
    description: 'Track electricity bills, power outages & feeder status for all Pakistani DISCOs',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
