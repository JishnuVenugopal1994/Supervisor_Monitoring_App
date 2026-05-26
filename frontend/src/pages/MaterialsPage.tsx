import MaterialList from '../components/Materials';
import { useMaterials } from '../hooks/useResources';

export default function MaterialsPage() {
  useMaterials();
  return <MaterialList />;
}
