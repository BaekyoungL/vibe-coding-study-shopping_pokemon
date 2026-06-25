import { BrowserRouter, Routes, Route } from 'react-router-dom'
import routes from './routes'
import { CartProvider } from './context/CartContext'

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          {routes.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
        </Routes>
      </BrowserRouter>
    </CartProvider>
  )
}

export default App
