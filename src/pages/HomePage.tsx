import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { t } from '../i18n'
import type { League } from '../lib/database.types'

function Flag({ country }: { country: 'de' | 'at' | 'ch' }) {
  if (country === 'de') {
    return (
      <div className="w-32 h-20 rounded shadow overflow-hidden">
        <div className="h-1/3 bg-black" />
        <div className="h-1/3 bg-red-600" />
        <div className="h-1/3 bg-yellow-400" />
      </div>
    )
  }
  if (country === 'at') {
    return (
      <div className="w-32 h-20 rounded shadow overflow-hidden">
        <div className="h-1/3 bg-red-600" />
        <div className="h-1/3 bg-white" />
        <div className="h-1/3 bg-red-600" />
      </div>
    )
  }
  return (
    <div className="w-20 h-20 rounded shadow overflow-hidden bg-red-600 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[20%] bg-white rounded-sm" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] h-[60%] bg-white rounded-sm" />
    </div>
  )
}

const countries = [
  { code: 'de' as const, labelKey: 'country.de' as const, tab: 'D' },
  { code: 'at' as const, labelKey: 'country.at' as const, tab: 'A' },
  { code: 'ch' as const, labelKey: 'country.ch' as const, tab: 'CH' },
]

function SmallFlag({ country }: { country: 'de' | 'at' | 'ch' }) {
  if (country === 'de') {
    return (
      <span className="inline-block w-6 h-4 rounded-sm overflow-hidden align-middle">
        <span className="block h-1/3 bg-black" />
        <span className="block h-1/3 bg-red-600" />
        <span className="block h-1/3 bg-yellow-400" />
      </span>
    )
  }
  if (country === 'at') {
    return (
      <span className="inline-block w-6 h-4 rounded-sm overflow-hidden align-middle">
        <span className="block h-1/3 bg-red-600" />
        <span className="block h-1/3 bg-white" />
        <span className="block h-1/3 bg-red-600" />
      </span>
    )
  }
  return (
    <span className="inline-block w-4 h-4 rounded-sm overflow-hidden bg-red-600 relative align-middle">
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[20%] bg-white rounded-[0.5px]" />
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] h-[60%] bg-white rounded-[0.5px]" />
    </span>
  )
}

function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef(0)

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) {
      if (dx < 0) onSwipeLeft()
      else onSwipeRight()
    }
  }

  return { onTouchStart, onTouchEnd }
}

function CreateLeagueDialog({
  countryCode,
  countryLabel,
  onClose,
  onCreated,
}: {
  countryCode: string
  countryLabel: string
  onClose: () => void
  onCreated: () => void
}) {
  const { user } = useAuth()
  const [leagueName, setLeagueName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [teams, setTeams] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addTeam() {
    const name = teamName.trim()
    if (name && !teams.includes(name)) {
      setTeams([...teams, name])
      setTeamName('')
    }
  }

  function removeTeam(index: number) {
    setTeams(teams.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTeam()
    }
  }

  async function handleCreate() {
    if (!user) return
    setSaving(true)
    setError(null)

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .insert({ name: leagueName.trim(), country_code: countryCode, created_by: user.id })
      .select('id')
      .single()

    if (leagueError || !league) {
      setError(leagueError?.message ?? 'Failed to create league')
      setSaving(false)
      return
    }

    const teamRows = teams.map((name, i) => ({ league_id: league.id, name, position: i + 1 }))
    const { error: teamsError } = await supabase.from('teams').insert(teamRows)

    if (teamsError) {
      setError(teamsError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4">
          {t('league.dialogTitle', { country: countryLabel })}
        </h2>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('league.name')}
        </label>
        <input
          type="text"
          value={leagueName}
          onChange={(e) => setLeagueName(e.target.value)}
          placeholder={t('league.namePlaceholder')}
          className="w-full rounded border px-3 py-2 mb-4"
          autoFocus
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('league.teams')}
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('league.teamPlaceholder')}
            className="flex-1 rounded border px-3 py-2"
          />
          <button
            onClick={addTeam}
            disabled={!teamName.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {t('common.add')}
          </button>
        </div>

        {teams.length > 0 && (
          <ul className="mb-4 max-h-48 overflow-y-auto divide-y divide-gray-100 rounded border">
            {teams.map((team, i) => (
              <li
                key={i}
                className="flex items-center justify-between px-3 py-2"
              >
                <span className="text-sm">{team}</span>
                <button
                  onClick={() => removeTeam(i)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  {t('common.remove')}
                </button>
              </li>
            ))}
          </ul>
        )}
        {teams.length === 0 && (
          <p className="mb-4 text-sm text-gray-400">{t('league.noTeams')}</p>
        )}

        {error && <p className="mb-3 text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={!leagueName.trim() || teams.length === 0 || saving}
            className="rounded bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? t('common.loading') : t('league.create')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { user, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [leagues, setLeagues] = useState<League[]>([])

  const fetchLeagues = useCallback(async () => {
    const { data } = await supabase
      .from('leagues')
      .select('id, name, country_code, created_by, created_at')
      .order('created_at', { ascending: true })
    if (data) setLeagues(data)
  }, [])

  useEffect(() => {
    fetchLeagues()
  }, [fetchLeagues])

  const swipeHandlers = useSwipe(
    () => setActiveTab((i) => Math.min(i + 1, countries.length - 1)),
    () => setActiveTab((i) => Math.max(i - 1, 0)),
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    )
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const { code, labelKey } = countries[activeTab]
  const label = t(labelKey)
  const countryLeagues = leagues.filter((l) => l.country_code === code)

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between px-4 py-3 bg-white shadow sm:px-8 sm:py-4">
        <h1 className="text-xl font-bold sm:text-2xl">{t('app.title')}</h1>
        {!user ? (
          <button
            onClick={() => navigate('/login')}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 sm:px-4 sm:py-2 sm:text-base"
          >
            {t('auth.login')}
          </button>
        ) : (
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-gray-700 text-sm hidden sm:inline">{user.email}</span>
            <button
              onClick={handleLogout}
              className="rounded border border-gray-400 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 sm:px-4 sm:py-2 sm:text-base"
            >
              {t('auth.logout')}
            </button>
          </div>
        )}
      </header>

      <div className="text-center py-4 sm:py-8">
        <h2 className="text-2xl font-bold sm:text-3xl">
          {user
            ? t('home.greetingUser', { email: user.email ?? '' })
            : t('home.greeting')}
        </h2>
      </div>

      <div className="flex border-b border-gray-200 bg-white">
        {countries.map(({ code, tab }, index) => (
          <button
            key={code}
            onClick={() => setActiveTab(index)}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-bold transition-colors sm:text-base ${
              activeTab === index
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <SmallFlag country={code} />
            {tab}
          </button>
        ))}
      </div>

      <div
        className="flex-1 flex flex-col items-center gap-6 p-6"
        {...swipeHandlers}
      >
        <Flag country={code} />
        <h3 className="text-xl font-semibold sm:text-2xl">{label}</h3>
        {isAdmin && (
          <button
            onClick={() => setDialogOpen(true)}
            className="rounded bg-red-600 px-6 py-3 text-lg font-bold text-white hover:bg-red-700"
          >
            {t('league.addNew')}
          </button>
        )}
        {countryLeagues.length > 0 && (
          <div className="w-full max-w-sm flex flex-col gap-2">
            {countryLeagues.map((league) => (
              <button
                key={league.id}
                onClick={() => navigate(`/league/${league.id}`)}
                className="rounded-lg bg-white px-4 py-3 shadow text-center font-semibold hover:bg-gray-100 transition-colors"
              >
                {league.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {dialogOpen && (
        <CreateLeagueDialog
          countryCode={code}
          countryLabel={label}
          onClose={() => setDialogOpen(false)}
          onCreated={fetchLeagues}
        />
      )}
    </div>
  )
}
