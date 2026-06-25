import MainPage from '../pages/MainPage'
import RegisterPage from '../pages/RegisterPage'
import LoginPage from '../pages/LoginPage'
import AdminPage from '../pages/AdminPage'
import ProductManagePage from '../pages/ProductManagePage'
import ProductFormPage from '../pages/ProductFormPage'
import ProductDetailPage from '../pages/ProductDetailPage'
import MyOrdersPage from '../pages/MyOrdersPage'
import AdminOrdersPage from '../pages/AdminOrdersPage'
import AdminUsersPage from '../pages/AdminUsersPage'
import AdminStatsPage from '../pages/AdminStatsPage'

const routes = [
  { path: '/', element: <MainPage /> },
  { path: '/products/:id', element: <ProductDetailPage /> },
  { path: '/my/orders',   element: <MyOrdersPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/admin', element: <AdminPage /> },
  { path: '/admin/products', element: <ProductManagePage /> },
  { path: '/admin/products/new', element: <ProductFormPage /> },
  { path: '/admin/products/:id/edit', element: <ProductFormPage /> },
  { path: '/admin/orders', element: <AdminOrdersPage /> },
  { path: '/admin/users', element: <AdminUsersPage /> },
  { path: '/admin/stats', element: <AdminStatsPage /> },
]

export default routes
