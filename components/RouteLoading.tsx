import { Loader2 } from 'lucide-react';

const RouteLoading = ({ label = 'Loading market intelligence...' }: { label?: string }) => {
  return (
    <main className="main-container route-loading-shell">
      <div className="route-loading-spinner">
        <Loader2 size={24} className="animate-spin" />
        <span className="sr-only">{label}</span>
      </div>
    </main>
  );
};

export default RouteLoading;
