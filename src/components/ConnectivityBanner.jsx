import { useConnectivity } from '../hooks/useConnectivity';
import './ConnectivityBanner.css';

export default function ConnectivityBanner() {
  const online = useConnectivity();

  return (
    <div className={`connectivity-banner ${online ? 'online' : 'offline'}`}>
      <span className="dot" />
      <span>{online ? 'Online' : 'Offline'}</span>
    </div>
  );
}
