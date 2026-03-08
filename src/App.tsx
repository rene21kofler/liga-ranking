import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import LeaguePage from './pages/LeaguePage'
import ConfirmVotePage from './pages/ConfirmVotePage'

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/league/:id', element: <LeaguePage /> },
  { path: '/confirm/:token', element: <ConfirmVotePage /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
