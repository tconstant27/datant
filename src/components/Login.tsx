import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'envoye' | 'erreur'>('saisie')
  const [message, setMessage] = useState('')

  const envoyer = async (e: FormEvent) => {
    e.preventDefault()
    setEtat('envoi')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    if (error) {
      setEtat('erreur')
      setMessage(error.message)
    } else {
      setEtat('envoye')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-2xl border border-line bg-surface p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent font-display text-xl font-bold text-bg">
            N
          </div>
          <div className="flex flex-col">
            <h1 className="m-0 font-display text-xl font-bold">Nexus Data</h1>
            <span className="text-sm text-muted">Triforce Esport</span>
          </div>
        </div>

        {etat === 'envoye' ? (
          <p className="m-0 text-sm leading-relaxed text-text-2">
            Lien de connexion envoyé à <strong className="text-text">{email}</strong>. Ouvre-le{' '}
            <strong className="text-text">dans ce même navigateur</strong> pour te connecter.
          </p>
        ) : (
          <form onSubmit={envoyer} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm text-muted">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-11 rounded-lg border border-line-strong bg-input px-3 text-base text-text outline-none focus:border-accent"
              />
            </label>
            <button
              type="submit"
              disabled={etat === 'envoi'}
              className="min-h-11 cursor-pointer rounded-lg border-0 bg-accent text-sm font-semibold text-bg disabled:opacity-60"
            >
              {etat === 'envoi' ? 'Envoi…' : 'Recevoir un lien de connexion'}
            </button>
            {etat === 'erreur' && <p className="m-0 text-sm text-warn">{message}</p>}
          </form>
        )}
        <p className="m-0 text-xs text-muted">Accès réservé aux membres de l'équipe.</p>
      </div>
    </div>
  )
}
