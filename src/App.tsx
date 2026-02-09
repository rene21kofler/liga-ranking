import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import LeaguePage from './pages/LeaguePage'

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/league/:id', element: <LeaguePage /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
