import re
import os
import csv
from pathlib import Path
from datetime import datetime
from statistics import mean, stdev

class TentativeTest:
    """Représente une seule tentative d'un test (un bloc entre deux 📂)."""
    def __init__(self, titre, contenu, categorie, nom_fichier):
        self.titre      = titre
        self.categorie  = categorie
        self.nom        = nom_fichier
        self.contenu    = contenu

        if "Facile"  in titre: self.diff = "FACILE"
        elif "Moyen" in titre: self.diff = "MOYEN"
        else:                  self.diff = "DIFFICILE"

        m = re.search(r"Test(\d+)", titre)
        self.num_test = int(m.group(1)) if m else 0

        self._parse()

    def _parse(self):
        self.nb_actions = len(re.findall(r"Action \d+", self.contenu))
        self.reussi     = "Objectif atteint !" in self.contenu
        self.abandonne  = any(x in self.contenu for x in ["LLM abandonne", "Abandon"])
        self.nb_clears  = len(re.findall(r"CLEAR", self.contenu))

        vals = re.findall(r"Question \d+ : (correcte|incorrecte)", self.contenu)
        if vals:
            self.score_val    = round(vals.count("correcte") / len(vals) * 100, 1)
            self.nb_questions = len(vals)
        else:
            self.score_val    = None
            self.nb_questions = 0

        ts_bruts = re.findall(r"\d{1,2}:\d{2}:\d{2}(?:\s*[APap][Mm])?", self.contenu)

        def parse_ts(s):
            s = s.strip()
            for fmt in ('%I:%M:%S %p', '%I:%M:%S%p', '%H:%M:%S'):
                try:
                    return datetime.strptime(s, fmt)
                except ValueError:
                    continue
            return None

        ts_parsed = [t for t in (parse_ts(s) for s in ts_bruts) if t is not None]

        if len(ts_parsed) >= 2:
            diff = (ts_parsed[-1] - ts_parsed[0]).total_seconds()
            self.duree_s = diff if diff >= 0 else None
        else:
            self.duree_s = None

    def est_valide(self):
        return self.nb_actions >= 1


class AnalyseurFichier:
    def __init__(self, chemin_fichier, categorie):
        self.chemin    = Path(chemin_fichier)
        self.nom       = self.chemin.stem
        self.categorie = categorie
        self.tentatives = []

    def analyser(self):
        try:
            texte = self.chemin.read_text(encoding='utf-8', errors='ignore')
        except Exception as e:
            print(f"Erreur lecture {self.nom}: {e}")
            return []

        motif  = r'📂 (Test\d+ (?:Facile|Moyen|Difficile))'
        parties = re.split(motif, texte)

        blocs = []
        for i in range(1, len(parties), 2):
            titre   = parties[i]
            contenu = parties[i+1] if i+1 < len(parties) else ""
            if blocs and blocs[-1][0] == titre:
                contenu_prec = blocs[-1][1]
                a_clear      = bool(re.search(r'CLEAR', contenu_prec))
                est_vide     = not bool(re.search(r'Action \d+', contenu_prec))
                if a_clear or est_vide:
                    blocs[-1] = (titre, contenu_prec + contenu)
                    continue

            blocs.append((titre, contenu))

        for titre, contenu in blocs:
            t = TentativeTest(titre, contenu, self.categorie, self.nom)
            if t.est_valide():
                self.tentatives.append(t)
                
        return self.tentatives


class GenerateurRapport:
    def __init__(self, dossier_racine):
        self.racine     = Path(dossier_racine)
        self.tentatives = []

    def compiler(self):
        for nom_dos, cat in [("humain", "HUMAIN"), ("llm", "LLM")]:
            chemin_dos = self.racine / nom_dos
            if not chemin_dos.exists():
                print(f"⚠️  Dossier '{nom_dos}' absent.")
                continue
            for f in sorted(chemin_dos.glob("*.txt")):
                analyseur = AnalyseurFichier(f, cat)
                self.tentatives.extend(analyseur.analyser())

    def afficher_tentatives(self):
        if not self.tentatives:
            print("\n⚠️  Aucune tentative valide trouvée.")
            return

        col = {"agent":22,"type":7,"test":6,"diff":10,"actions":8,"duree":8,"reussi":8,"abandon":8}
        sep = "-" * 100
        print("\n-- DÉTAIL PAR TENTATIVE " + "-" * 76)
        print(
            f"{'AGENT':<{col['agent']}} | {'TYPE':<{col['type']}} | {'TEST':<{col['test']}} | "
            f"{'NIVEAU':<{col['diff']}} | {'ACTIONS':<{col['actions']}} | {'DURÉE(s)':<{col['duree']}} | "
            f"{'RÉUSSI':<{col['reussi']}} | {'ABANDON':<{col['abandon']}} | VALID.%"
        )
        print(sep)
        for t in self.tentatives:
            duree = f"{t.duree_s:.0f}" if t.duree_s is not None else "N/A"
            val   = f"{t.score_val:.0f}%" if t.score_val is not None else "—"
            print(
                f"{t.nom:<{col['agent']}} | {t.categorie:<{col['type']}} | "
                f"Test{t.num_test:<{col['test']-4}} | {t.diff:<{col['diff']}} | "
                f"{t.nb_actions:<{col['actions']}} | {duree:<{col['duree']}} | "
                f"{'✓' if t.reussi else '✗':<{col['reussi']}} | "
                f"{'✓' if t.abandonne else '—':<{col['abandon']}} | {val}"
            )

    def afficher_agregat(self):
        from collections import defaultdict
        groupes = defaultdict(list)
        for t in self.tentatives:
            groupes[(t.nom, t.categorie, t.diff)].append(t)

        sep = "-" * 110
        print("\n-- AGRÉGAT PAR AGENT & NIVEAU " + "-" * 70)
        print(
            f"{'AGENT':<22} | {'TYPE':<7} | {'NIVEAU':<10} | {'TENTA.':<7} | "
            f"{'RÉUSSIES':<9} | {'ACT. MOY':<9} | {'ÉC-TYPE':<8} | {'DUR. MOY':<9} | VALID. MOY"
        )
        print(sep)
        for (nom, cat, diff) in sorted(groupes.keys()):
            tents    = groupes[(nom, cat, diff)]
            n        = len(tents)
            reussies = sum(t.reussi for t in tents)
            actions  = [t.nb_actions for t in tents]
            act_moy  = f"{mean(actions):.1f}"
            act_std  = f"{stdev(actions):.1f}" if n > 1 else "—"
            durees   = [t.duree_s for t in tents if t.duree_s is not None]
            dur_moy  = f"{mean(durees):.0f}s" if durees else "N/A"
            vals     = [t.score_val for t in tents if t.score_val is not None]
            val_moy  = f"{mean(vals):.1f}%" if vals else "—"
            print(
                f"{nom:<22} | {cat:<7} | {diff:<10} | {n:<7} | "
                f"{reussies}/{n:<6} | {act_moy:<9} | {act_std:<8} | {dur_moy:<9} | {val_moy}"
            )

    def exporter_csv_tentatives(self, chemin_sortie=None):
        if chemin_sortie is None:
            chemin_sortie = self.racine / "tentatives_detail.csv"

        colonnes = [
            "agent", "type", "num_test", "niveau",
            "nb_actions", "duree_s", "reussi", "abandonne",
            "nb_clears", "score_validation_pct", "nb_questions"
        ]
        with open(chemin_sortie, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=colonnes)
            writer.writeheader()
            for t in self.tentatives:
                writer.writerow({
                    "agent"               : t.nom,
                    "type"                : t.categorie,
                    "num_test"            : t.num_test,
                    "niveau"              : t.diff,
                    "nb_actions"          : t.nb_actions,
                    "duree_s"             : round(t.duree_s, 1) if t.duree_s is not None else "",
                    "reussi"              : int(t.reussi),
                    "abandonne"           : int(t.abandonne),
                    "nb_clears"           : t.nb_clears,
                    "score_validation_pct": t.score_val if t.score_val is not None else "",
                    "nb_questions"        : t.nb_questions,
                })
        print(f"CSV tentatives  → {chemin_sortie}")
    def exporter_csv_agregat(self, chemin_sortie=None):
        if chemin_sortie is None:
            chemin_sortie = self.racine / "agregat_par_niveau.csv"

        from collections import defaultdict
        groupes = defaultdict(list)
        for t in self.tentatives:
            groupes[(t.nom, t.categorie, t.diff)].append(t)

        colonnes = [
            "agent", "type", "niveau",
            "nb_tentatives", "nb_reussites", "taux_reussite_pct",
            "actions_moy", "actions_ecart_type",
            "duree_moy_s", "duree_ecart_type_s",
            "score_val_moy_pct"
        ]
        with open(chemin_sortie, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=colonnes)
            writer.writeheader()
            for (nom, cat, diff) in sorted(groupes.keys()):
                tents    = groupes[(nom, cat, diff)]
                n        = len(tents)
                reussies = sum(t.reussi for t in tents)
                actions  = [t.nb_actions for t in tents]
                durees   = [t.duree_s for t in tents if t.duree_s is not None]
                vals     = [t.score_val for t in tents if t.score_val is not None]
                writer.writerow({
                    "agent"                : nom,
                    "type"                 : cat,
                    "niveau"               : diff,
                    "nb_tentatives"        : n,
                    "nb_reussites"         : reussies,
                    "taux_reussite_pct"    : round(reussies / n * 100, 1),
                    "actions_moy"          : round(mean(actions), 2),
                    "actions_ecart_type"   : round(stdev(actions), 2) if n > 1 else "",
                    "duree_moy_s"          : round(mean(durees), 1) if durees else "",
                    "duree_ecart_type_s"   : round(stdev(durees), 1) if len(durees) > 1 else "",
                    "score_val_moy_pct"    : round(mean(vals), 1) if vals else "",
                })
        print(f"CSV agrégat     → {chemin_sortie}")


if __name__ == "__main__":
    racine = os.path.dirname(os.path.abspath(__file__))
    rapport = GenerateurRapport(racine)
    rapport.compiler()

    rapport.afficher_tentatives()
    rapport.afficher_agregat()
    rapport.exporter_csv_tentatives()
    rapport.exporter_csv_agregat()