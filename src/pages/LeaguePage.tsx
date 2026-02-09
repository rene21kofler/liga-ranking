import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { t } from '../i18n'
import type { League, Team } from '../lib/database.types'

function DraggableTeamList({
  teams,
  onReorder,
}: {
  teams: Team[]
  onReorder: (reordered: Team[]) => void
}) {
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)

  function handleDragStart(index: number) {
    dragItem.current = index
    setDraggingIdx(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    dragOverItem.current = index
  }

  function handleDrop() {
    if (dragItem.current === null || dragOverItem.current === null) return
    if (dragItem.current === dragOverItem.current) {
      setDraggingIdx(null)
      return
    }
    const reordered = [...teams]
    const [moved] = reordered.splice(dragItem.current, 1)
    reordered.splice(dragOverItem.current, 0, moved)
    dragItem.current = null
    dragOverItem.current = null
    setDraggingIdx(null)
    onReorder(reordered)
  }

  function handleTouchStart(_e: React.TouchEvent, index: number) {
    dragItem.current = index
    setDraggingIdx(index)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (dragItem.current === null) return
    const touch = e.touches[0]
    const elements = document.querySelectorAll('[data-team-index]')
    for (const el of elements) {
      const rect = el.getBoundingClientRect()
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        const idx = Number(el.getAttribute('data-team-index'))
        dragOverItem.current = idx
        break
      }
    }
  }

  function handleTouchEnd() {
    handleDrop()
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-1">
      {teams.map((team, index) => (
        <div
          key={team.id}
          data-team-index={index}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={handleDrop}
          onDragEnd={() => setDraggingIdx(null)}
          onTouchStart={(e) => handleTouchStart(e, index)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow cursor-grab active:cursor-grabbing select-none transition-opacity ${
            draggingIdx === index ? 'opacity-50' : ''
          }`}
        >
          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-sm font-bold shrink-0">
            {index + 1}
          </span>
          <span className="font-medium">{team.name}</span>
          <span className="ml-auto text-gray-400">☰</span>
        </div>
      ))}
    </div>
  )
}

function EditLeagueDialog({
  league,
  existingTeams,
  onClose,
  onSaved,
}: {
  league: League
  existingTeams: Team[]
  onClose: () => void
  onSaved: () => void
}) {
  const [leagueName, setLeagueName] = useState(league.name)
  const [teamName, setTeamName] = useState('')
  const [teams, setTeams] = useState(existingTeams.map((t) => ({ id: t.id, name: t.name })))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addTeam() {
    const name = teamName.trim()
    if (name && !teams.some((t) => t.name === name)) {
      setTeams([...teams, { id: null as unknown as string, name }])
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

  async function handleSave() {
    setSaving(true)
    setError(null)

    // Update league name
    const { error: nameError } = await supabase
      .from('leagues')
      .update({ name: leagueName.trim() })
      .eq('id', league.id)

    if (nameError) {
      setError(nameError.message)
      setSaving(false)
      return
    }

    // Determine which teams to delete, keep, or add
    const existingIds = new Set(existingTeams.map((t) => t.id))
    const keptIds = new Set(teams.filter((t) => existingIds.has(t.id)).map((t) => t.id))
    const toDelete = existingTeams.filter((t) => !keptIds.has(t.id))
    const toAdd = teams.filter((t) => !existingIds.has(t.id))

    // Delete removed teams
    if (toDelete.length > 0) {
      const { error: delError } = await supabase
        .from('teams')
        .delete()
        .in('id', toDelete.map((t) => t.id))
      if (delError) {
        setError(delError.message)
        setSaving(false)
        return
      }
    }

    // Add new teams
    if (toAdd.length > 0) {
      const nextPosition = existingTeams.length + 1
      const rows = toAdd.map((t, i) => ({
        league_id: league.id,
        name: t.name,
        position: nextPosition + i,
      }))
      const { error: addError } = await supabase.from('teams').insert(rows)
      if (addError) {
        setError(addError.message)
        setSaving(false)
        return
      }
    }

    // Update names for kept teams (in case renamed in future)
    setSaving(false)
    onSaved()
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
        <h2 className="text-xl font-bold mb-4">{t('league.editTitle')}</h2>

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
                key={team.id ?? `new-${i}`}
                className="flex items-center justify-between px-3 py-2"
              >
                <span className="text-sm">{team.name}</span>
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
            onClick={handleSave}
            disabled={!leagueName.trim() || teams.length === 0 || saving}
            className="rounded bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? t('common.loading') : t('league.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LeaguePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [league, setLeague] = useState<League | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id) return
    const [leagueRes, teamsRes] = await Promise.all([
      supabase
        .from('leagues')
        .select('id, name, country_code, created_by, created_at')
        .eq('id', id)
        .single(),
      supabase
        .from('teams')
        .select('id, league_id, name, position, created_at')
        .eq('league_id', id)
        .order('position', { ascending: true }),
    ])
    if (leagueRes.data) setLeague(leagueRes.data)
    if (teamsRes.data) setTeams(teamsRes.data)
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleReorder(reordered: Team[]) {
    setTeams(reordered)

    const updates = reordered.map((team, index) =>
      supabase
        .from('teams')
        .update({ position: index + 1 })
        .eq('id', team.id)
    )
    await Promise.all(updates)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    )
  }

  if (!league) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Liga nicht gefunden</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center gap-4 px-4 py-3 bg-white shadow sm:px-8 sm:py-4">
        <button
          onClick={() => navigate('/')}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          {t('league.back')}
        </button>
        <h1 className="text-xl font-bold sm:text-2xl flex-1">{league.name}</h1>
        {isAdmin && (
          <button
            onClick={() => setEditOpen(true)}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 sm:px-4 sm:py-2 sm:text-base"
          >
            {t('league.edit')}
          </button>
        )}
      </header>

      <div className="flex-1 flex flex-col items-center p-6 gap-6">
        <h2 className="text-lg font-semibold text-gray-600">{t('league.ranking')}</h2>
        {teams.length > 0 ? (
          <DraggableTeamList teams={teams} onReorder={handleReorder} />
        ) : (
          <p className="text-gray-400">{t('league.noTeams')}</p>
        )}
      </div>

      {editOpen && (
        <EditLeagueDialog
          league={league}
          existingTeams={teams}
          onClose={() => setEditOpen(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  )
}
