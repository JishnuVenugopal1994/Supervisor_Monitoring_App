import ResourcePanel from '../components/Resources';
import { useOperators, useMachines } from '../hooks/useResources';

export default function ResourcesPage() {
  useOperators();
  useMachines();
  return <ResourcePanel />;
}
