import { useContext } from 'react';
import { RuntimeContext } from '@/runtime/context/RuntimeContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const context = useContext(RuntimeContext);
  
  // For now, just return children - authentication can be added later
  return <>{children}</>;
}