import WorkOrderList from '../components/WorkOrders';
import { useWorkOrders } from '../hooks/useWorkOrders';

export default function WorkOrdersPage() {
  useWorkOrders();
  return <WorkOrderList />;
}
