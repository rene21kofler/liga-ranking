import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function HomePage() {
  const { user, isAdmin, loading } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 gap-6">
      {!user ? (
        <>
          <h1 className="text-4xl font-bold">Hello you</h1>
          <button
            onClick={() => navigate('/login')}
            className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Log In
          </button>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-bold">Hello, {user.email}</h1>
          {isAdmin && (
            <button className="rounded bg-red-600 px-8 py-4 text-xl font-bold text-white hover:bg-red-700">
              Admin
            </button>
          )}
          <button
            onClick={handleLogout}
            className="rounded border border-gray-400 px-6 py-2 text-gray-700 hover:bg-gray-100"
          >
            Log Out
          </button>
        </>
      )}
    </div>
  )
}
