// Data Dragon : CDN officiel de Riot pour les images et données du jeu (icônes, splash arts…)
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const CDN = 'https://ddragon.leagueoflegends.com'

type DDragon = {
  version: string
  noms: Record<string, string> // id technique (ex. MonkeyKing) -> nom affiché (ex. Wukong)
}

const Ctx = createContext<DDragon>({ version: '', noms: {} })

// L'API de partie renvoie quelques identifiants qui diffèrent de Data Dragon
const CORRECTIONS: Record<string, string> = { FiddleSticks: 'Fiddlesticks' }
const idDD = (champion: string) => CORRECTIONS[champion] ?? champion

export function DDragonProvider({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<DDragon>({ version: '', noms: {} })

  useEffect(() => {
    ;(async () => {
      try {
        const versions: string[] = await (await fetch(`${CDN}/api/versions.json`)).json()
        const version = versions[0]
        const data = await (await fetch(`${CDN}/cdn/${version}/data/fr_FR/champion.json`)).json()
        const noms: Record<string, string> = {}
        for (const c of Object.values<{ id: string; name: string }>(data.data)) noms[c.id] = c.name
        setEtat({ version, noms })
      } catch {
        // pas d'images si le CDN ne répond pas : le site reste utilisable
      }
    })()
  }, [])

  return <Ctx.Provider value={etat}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDDragon() {
  const { version, noms } = useContext(Ctx)
  return {
    pret: !!version,
    nom: (champion: string) => noms[idDD(champion)] ?? champion,
    icone: (champion: string) => (version ? `${CDN}/cdn/${version}/img/champion/${idDD(champion)}.png` : ''),
    splash: (champion: string) => `${CDN}/cdn/img/champion/splash/${idDD(champion)}_0.jpg`,
    profil: (iconId: number | null) =>
      version && iconId !== null ? `${CDN}/cdn/${version}/img/profileicon/${iconId}.png` : '',
  }
}
