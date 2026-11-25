"""Construit data/hebergements.js à partir de l'extraction OpenStreetMap (_sources/).

Source : requête Overpass, hébergements (tourism = guest_house, hotel, chalet, apartment,
hostel, motel) dans un rayon de 15 km autour de La Colonie (Berry-Bouy).
On ne garde que ceux qui ont un nom ET un site web (website, contact:website ou url).

Usage : python3 -I outils/hebergements.py _sources/osm_hebergements_AAAA-MM-JJ.json
"""
import json
import math
import sys
from pathlib import Path

LA_COLONIE = (47.119256, 2.316309)       # IGN, lieu-dit « la Colonie », Berry-Bouy
EGLISE = (47.0832195, 2.4208280)         # OSM way/162300169, église Sainte-Barbe, Bourges

# Corrections de saisie OSM (casse, numérotation parasite)
CORRECTIONS_COMMUNE = {"saint doulchard": "Saint-Doulchard", "Vignoux sur Barangeon": "Vignoux-sur-Barangeon"}
CORRECTIONS_NOM = {"B&B Hôtel (1)": "B&B Hôtel"}

# Liens vérifiés le 2026-11-25 (curl) : domaines inexistants (NXDOMAIN)
SITES_CORRIGES = {
    # ancien domaine accorhotels.com mort ; même identifiant Accor 1888, page vérifiée
    "https://www.accorhotels.com/fr/hotel-1888-hotel-de-bourbon-mercure-bourges/index.shtml":
        "https://all.accor.com/hotel/1888/index.fr.shtml",
}
SITES_MORTS = {"http://www.pdj-hotel-bourges.com/", "http://www.le-prieure-hotel.com/"}  # Arcane, Le Prieuré : exclus

TYPES = {
    "hotel": "Hôtel",
    "motel": "Hôtel",
    "guest_house": "Gîte · chambre d'hôtes",
    "chalet": "Gîte",
    "apartment": "Location",
    "hostel": "Auberge",
}


def distance_km(a, b):
    r = 6371.0
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def main(src):
    raw = json.loads(Path(src).read_text(encoding="utf-8"))
    out, sans_site, sans_nom, morts = [], 0, 0, 0
    for e in raw["elements"]:
        t = e.get("tags", {})
        lat = e.get("lat", e.get("center", {}).get("lat"))
        lon = e.get("lon", e.get("center", {}).get("lon"))
        nom = t.get("name")
        site = t.get("website") or t.get("contact:website") or t.get("url")
        if not nom:
            sans_nom += 1
            continue
        if not site:
            sans_site += 1
            continue
        site = site.split(";")[0].strip()
        site = SITES_CORRIGES.get(site, site)
        if site in SITES_MORTS:
            morts += 1
            continue
        if not site.startswith(("http://", "https://")):
            site = "https://" + site
        typ = TYPES.get(t.get("tourism"), "Hébergement")
        if t.get("tourism") == "guest_house" and t.get("guest_house") == "bed_and_breakfast":
            typ = "Chambre d'hôtes"
        nom = CORRECTIONS_NOM.get(nom, nom)
        out.append({
            "nom": nom,
            "type": typ,
            "commune": CORRECTIONS_COMMUNE.get(t.get("addr:city", ""), t.get("addr:city", "")),
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "site": site,
            "distance_km": round(distance_km(LA_COLONIE, (lat, lon)), 1),
            "osm": f'{e["type"]}/{e["id"]}',
        })
    out.sort(key=lambda h: h["distance_km"])

    data = {
        "source": "© contributeurs OpenStreetMap (ODbL), extraction Overpass",
        "date_donnees": raw.get("osm3s", {}).get("timestamp_osm_base", ""),
        "lieux": [
            {"nom": "Église Sainte-Barbe", "lat": EGLISE[0], "lon": EGLISE[1]},
            {"nom": "La Colonie", "lat": LA_COLONIE[0], "lon": LA_COLONIE[1]},
        ],
        "hebergements": out,
    }
    dest = Path(__file__).resolve().parent.parent / "data" / "hebergements.js"
    dest.write_text(
        "// Fichier généré par outils/hebergements.py — ne pas modifier à la main.\n"
        "window.HEBERGEMENTS = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"{len(raw['elements'])} éléments OSM → {len(out)} gardés "
          f"({sans_site} sans site web, {sans_nom} sans nom, {morts} lien mort) → {dest}")
    for h in out:
        print(f'  {h["distance_km"]:5.1f} km  {h["type"]:24} {h["nom"][:40]:40} {h["commune"][:16]:16} {h["site"]}')


if __name__ == "__main__":
    main(sys.argv[1])
