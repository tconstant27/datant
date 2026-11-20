// Data Dragon : CDN officiel de Riot pour les images et données du jeu (icônes, splash arts…)
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const CDN = 'https://ddragon.leagueoflegends.com'

type DDragon = {
  version: string
  noms: Record<string, string> // id technique (ex. MonkeyKing) -> nom affiché (ex. Wukong)
  parCle: Record<number, string> // clé numérique (ex. 62) -> id technique (ex. MonkeyKing)
  sorts: Record<number, { nom: string; image: string }> // sorts d'invocateur
  runes: Record<number, { nom: string; icone: string }> // runes et arbres de runes
}

const VIDE: DDragon = { version: '', noms: {}, parCle: {}, sorts: {}, runes: {} }
const Ctx = createContext<DDragon>(VIDE)

// L'API de partie renvoie quelques identifiants qui diffèrent de Data Dragon
const CORRECTIONS: Record<string, string> = { FiddleSticks: 'Fiddlesticks' }
const idDD = (champion: string) => CORRECTIONS[champion] ?? champion

export function DDragonProvider({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<DDragon>(VIDE)

  useEffect(() => {
    ;(async () => {
      try {
        const versions: string[] = await (await fetch(`${CDN}/api/versions.json`)).json()
        const version = versions[0]
        const base = `${CDN}/cdn/${version}/data/fr_FR`
        const [champs, invoc, arbres] = await Promise.all([
          fetch(`${base}/champion.json`).then((r) => r.json()),
          fetch(`${base}/summoner.json`).then((r) => r.json()),
          fetch(`${base}/runesReforged.json`).then((r) => r.json()),
        ])
        const noms: Record<string, string> = {}
        const parCle: Record<number, string> = {}
        for (const c of Object.values<{ id: string; key: string; name: string }>(champs.data)) {
          noms[c.id] = c.name
          parCle[Number(c.key)] = c.id
        }
        const sorts: DDragon['sorts'] = {}
        for (const s of Object.values<{ key: string; name: string; image: { full: string } }>(invoc.data)) {
          sorts[Number(s.key)] = { nom: s.name, image: s.image.full }
        }
        const runes: DDragon['runes'] = {}
        for (const arbre of arbres as {
          id: number
          name: string
          icon: string
          slots: { runes: { id: number; name: string; icon: string }[] }[]
        }[]) {
          runes[arbre.id] = { nom: arbre.name, icone: arbre.icon }
          for (const slot of arbre.slots) for (const r of slot.runes) runes[r.id] = { nom: r.name, icone: r.icon }
        }
        setEtat({ version, noms, parCle, sorts, runes })
      } catch {
        // pas d'images si le CDN ne répond pas : le site reste utilisable
      }
    })()
  }, [])

  return <Ctx.Provider value={etat}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDDragon() {
  const { version, noms, parCle, sorts, runes } = useContext(Ctx)
  return {
    pret: !!version,
    nom: (champion: string) => noms[idDD(champion)] ?? champion,
    idDepuisCle: (cle: number) => parCle[cle] ?? '',
    icone: (champion: string) => (version ? `${CDN}/cdn/${version}/img/champion/${idDD(champion)}.png` : ''),
    splash: (champion: string) => `${CDN}/cdn/img/champion/splash/${idDD(champion)}_0.jpg`,
    profil: (iconId: number | null) =>
      version && iconId !== null ? `${CDN}/cdn/${version}/img/profileicon/${iconId}.png` : '',
    objet: (itemId: number) => (version && itemId ? `${CDN}/cdn/${version}/img/item/${itemId}.png` : ''),
    sort: (id: number) =>
      version && sorts[id] ? { src: `${CDN}/cdn/${version}/img/spell/${sorts[id].image}`, nom: sorts[id].nom } : null,
    rune: (id: number) => (runes[id] ? { src: `${CDN}/cdn/img/${runes[id].icone}`, nom: runes[id].nom } : null),
    carte: version ? `${CDN}/cdn/${version}/img/map/map11.png` : '',
  }
}

// Noms des objets : chargés seulement quand une page en a besoin (fichier plus lourd)
let cacheObjets: Promise<Record<number, string>> | null = null

// eslint-disable-next-line react-refresh/only-export-components
export function useNomsObjets() {
  const { version } = useContext(Ctx)
  const [noms, setNoms] = useState<Record<number, string>>({})
  useEffect(() => {
    if (!version) return
    cacheObjets ??= fetch(`${CDN}/cdn/${version}/data/fr_FR/item.json`)
      .then((r) => r.json())
      .then((d) => {
        const res: Record<number, string> = {}
        for (const [id, o] of Object.entries<{ name: string }>(d.data)) res[Number(id)] = o.name
        return res
      })
      .catch(() => ({}))
    cacheObjets.then(setNoms)
  }, [version])
  return noms
}
