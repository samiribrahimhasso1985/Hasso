'use client';

import dynamic from 'next/dynamic';
import './world.css';

// The 3D scene loads only on this page and only in the browser (lazy, no server rendering).
const WorldExperience = dynamic(() => import('../../components/world/WorldExperience'), {
  ssr: false,
  loading: () => <div className="world world-boot" />,
});

export default function WorldPage() {
  return <WorldExperience />;
}
