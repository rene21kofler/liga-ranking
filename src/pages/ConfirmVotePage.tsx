import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { t } from '../i18n'
import type { VoteToken } from '../lib/database.types'

type Status = 'loading' | 'success' | 'already_confirmed' | 'expired' | 'invalid'

export default function ConfirmVotePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [voteToken, setVoteToken] = useState<VoteToken | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }
    confirmVote(token)
  }, [token])

  async function confirmVote(tokenValue: string) {
    const { data, error } = await supabase
      .from('vote_tokens')
      .select('*')
      .eq('token', tokenValue)
      .single()

    if (error || !data) {
      setStatus('invalid')
      return
    }

    const record = data as VoteToken

    if (record.confirmed_at) {
      setVoteToken(record)
      setStatus('already_confirmed')
      return
    }

    if (new Date(record.expires_at) < new Date()) {
      setStatus('expired')
      return
    }

    const { error: updateError } = await supabase
      .from('vote_tokens')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('token', tokenValue)

    if (updateError) {
      setStatus('invalid')
      return
    }

    setVoteToken(record)
    setStatus('success')
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">{t('confirm.loading')}</p>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow text-center">
          <p className="text-2xl mb-3">⏰</p>
          <h1 className="text-xl font-bold mb-2 text-gray-800">{t('confirm.expired')}</h1>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded bg-red-600 px-6 py-2 text-white font-medium hover:bg-red-700"
          >
            {t('confirm.backHome')}
          </button>
        </div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow text-center">
          <p className="text-2xl mb-3">❌</p>
          <h1 className="text-xl font-bold mb-2 text-gray-800">{t('confirm.invalid')}</h1>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded bg-red-600 px-6 py-2 text-white font-medium hover:bg-red-700"
          >
            {t('confirm.backHome')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <div className="text-center mb-6">
          <p className="text-3xl mb-3">{status === 'already_confirmed' ? '✅' : '🎉'}</p>
          <h1 className="text-2xl font-bold text-gray-800">
            {status === 'already_confirmed'
              ? t('confirm.alreadyConfirmed')
              : t('confirm.successTitle')}
          </h1>
          {status === 'success' && (
            <p className="text-gray-500 mt-1 text-sm">{t('confirm.successMessage')}</p>
          )}
        </div>

        {voteToken && (
          <>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {t('confirm.ranking')} — {voteToken.league_name}
            </h2>
            <div className="flex flex-col gap-1 mb-6">
              {voteToken.ranking.map((entry) => (
                <div
                  key={entry.team_id}
                  className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3"
                >
                  <span className="w-7 h-7 flex items-center justify-center rounded-full bg-red-100 text-red-700 text-sm font-bold shrink-0">
                    {entry.position}
                  </span>
                  <span className="font-medium text-gray-800">{entry.team_name}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => navigate('/')}
          className="w-full rounded bg-red-600 px-6 py-2 text-white font-medium hover:bg-red-700"
        >
          {t('confirm.backHome')}
        </button>
      </div>
    </div>
  )
}
