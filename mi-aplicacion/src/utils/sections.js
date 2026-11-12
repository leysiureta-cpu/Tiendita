import {
  BarChart3,
  Boxes,
  Package,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'

const sections = [
  { path: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { path: '/productos', label: 'Productos', icon: Package },
  { path: '/inventario', label: 'Inventario', icon: Boxes },
  { path: '/categorias', label: 'Categorías', icon: Tags },
  { path: '/clientes', label: 'Clientes', icon: Users },
  { path: '/proveedores', label: 'Proveedores', icon: Truck },
  { path: '/compras', label: 'Compras', icon: ShoppingBag },
  { path: '/reportes', label: 'Reportes', icon: BarChart3 },
  { path: '/caja', label: 'Caja', icon: Wallet },
  { path: '/configuracion', label: 'Configuración', icon: Settings2 },
]

export default sections
