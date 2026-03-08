import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { t } from '../i18n'
import type { League, Team, VoteRankingEntry } from '../lib/database.types'

function DraggableTeamList({
  teams,
  onReorder,
}: {
  teams: Team[]
  onReorder: (reordered: Team[]) => void
}) {
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const teamsRef = useRef(teams)
  teamsRef.current = teams
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  function commit() {
    const from = dragItem.current
    const to = dragOverItem.current
    dragItem.current = null
    dragOverItem.current = null
    setDraggingIdx(null)
    setDragOverIdx(null)
    if (from === null || to === null || from === to) return
    const reordered = [...teamsRef.current]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    onReorder(reordered)
  }

  function handlePointerDown(e: React.PointerEvent, index: number) {
    // Only respond to primary pointer (left mouse / first touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return

    e.preventDefault()
    dragItem.current = index
    dragOverItem.current = index
    setDraggingIdx(index)

    const onMove = (ev: PointerEvent) => {
      const elements = document.querySelectorAll('[data-team-index]')
      for (const el of elements) {
        const rect = el.getBoundingClientRect()
        if (ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
          const idx = Number(el.getAttribute('data-team-index'))
          if (dragOverItem.current !== idx) {
            dragOverItem.current = idx
            setDragOverIdx(idx)
          }
          break
        }
      }
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      commit()
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-1">
      {teams.map((team, index) => (
        <div
          key={team.id}
          data-team-index={index}
          className={`flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow select-none transition-all ${
            draggingIdx === index ? 'opacity-40 scale-95' : ''
          } ${
            dragOverIdx === index && draggingIdx !== index
              ? 'border-2 border-red-400'
              : 'border-2 border-transparent'
          }`}
        >
          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-sm font-bold shrink-0">
            {index + 1}
          </span>
          <span className="font-medium flex-1">{team.name}</span>
          <span
            className="text-gray-400 text-xl px-2 cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handlePointerDown(e, index)}
          >
            ☰
          </span>
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

function VoteForm({
  teams,
  league,
}: {
  teams: Team[]
  league: League
}) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!email.trim()) return
    setSubmitting(true)
    setError(null)

    const ranking: VoteRankingEntry[] = teams.map((team, index) => ({
      team_id: team.id,
      team_name: team.name,
      position: index + 1,
    }))

    const { error: fnError, data: fnData } = await supabase.functions.invoke('send-vote-confirmation', {
      body: { league_id: league.id, league_name: league.name, email: email.trim(), ranking },
    })

    setSubmitting(false)
    if (fnError) {
      setError(t('vote.errorSend'))
      return
    }
    const body = fnData as { error?: string } | null
    if (body?.error === 'already_voted') {
      setError(t('vote.errorAlreadyVoted'))
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="w-full max-w-md rounded-lg bg-green-50 border border-green-200 p-6 text-center">
        <p className="text-2xl mb-2">✉️</p>
        <h3 className="font-bold text-green-800 text-lg">{t('vote.successTitle')}</h3>
        <p className="text-green-700 text-sm mt-1">{t('vote.successMessage')}</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md rounded-lg bg-white shadow p-5">
      <h3 className="font-semibold text-gray-700 mb-1">{t('vote.title')}</h3>
      <p className="text-sm text-gray-400 mb-4">{t('vote.hint')}</p>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t('vote.emailLabel')}
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('vote.emailPlaceholder')}
        className="w-full rounded border px-3 py-2 mb-3 text-sm"
      />
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!email.trim() || submitting}
        className="w-full rounded bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 disabled:opacity-50"
      >
        {submitting ? t('common.loading') : t('vote.submit')}
      </button>
    </div>
  )
}

function StatsDialog({
  leagueId,
  leagueName,
  onClose,
}: {
  leagueId: string
  leagueName: string
  onClose: () => void
}) {
  const [rows, setRows] = useState<{ team_name: string; avg: number; votes: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('vote_tokens')
        .select('ranking')
        .eq('league_id', leagueId)
        .not('confirmed_at', 'is', null)

      if (!data || data.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      const totals: Record<string, { team_name: string; sum: number; count: number }> = {}
      for (const token of data) {
        for (const entry of token.ranking as VoteRankingEntry[]) {
          if (!totals[entry.team_id]) {
            totals[entry.team_id] = { team_name: entry.team_name, sum: 0, count: 0 }
          }
          totals[entry.team_id].sum += entry.position
          totals[entry.team_id].count += 1
        }
      }

      const aggregated = Object.values(totals)
        .map((t) => ({ team_name: t.team_name, avg: t.sum / t.count, votes: t.count }))
        .sort((a, b) => a.avg - b.avg || a.team_name.localeCompare(b.team_name))

      setRows(aggregated)
      setLoading(false)
    }
    load()
  }, [leagueId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-1">{t('league.statsTitle')}</h2>
        <p className="text-sm text-gray-400 mb-4">{leagueName}</p>

        {loading ? (
          <p className="text-gray-400 text-sm">{t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-400 text-sm">{t('league.statsEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {rows.map((row, i) => (
              <div key={row.team_name} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                <span className="w-7 h-7 flex items-center justify-center rounded-full bg-red-100 text-red-700 text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="font-medium text-gray-800 flex-1">{row.team_name}</span>
                <span className="text-xs text-gray-400">⌀ {row.avg.toFixed(1)} · {row.votes} {t('league.statsVotes')}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}

export default function LeaguePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [league, setLeague] = useState<League | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)

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

    if (!isAdmin) return

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
        <p className="text-gray-500">{t('league.notFound')}</p>
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
        <button
          onClick={() => setStatsOpen(true)}
          className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 sm:px-4 sm:py-2 sm:text-base"
        >
          {t('league.stats')}
        </button>
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
        {!user && league && teams.length > 0 && (
          <VoteForm teams={teams} league={league} />
        )}
      </div>

      {statsOpen && (
        <StatsDialog
          leagueId={league.id}
          leagueName={league.name}
          onClose={() => setStatsOpen(false)}
        />
      )}
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
