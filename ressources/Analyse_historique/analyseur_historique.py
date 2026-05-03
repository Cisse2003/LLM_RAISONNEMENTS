import re
import os
from pathlib import Path
from datetime import datetime
from statistics import median

class AnalyseurRecherche:
    def __init__(self, chemin_fichier, categorie):
        self.chemin = Path(chemin_fichier)
        self.nom = self.chemin.stem
        self.categorie = categorie
        self.stats = {}

    def analyser(self):
        try:
            with open(self.chemin, 'r', encoding='utf-8', errors='ignore') as f:
                texte = f.read()
        except Exception as e:
            print(f"Erreur de lecture sur {self.nom}: {e}")
            return None

        # 1. On Détecte l'icône dossier 📂 afin de faire le découpage
        motif_bloc = r'📂 (Test\d+ (?:Facile|Moyen|Difficile))'
        parties = re.split(motif_bloc, texte)

        data_diff = {
            "FACILE": {"obj": 0, "val": 0, "total": 0, "actions": 0, "abandons": 0},
            "MOYEN": {"obj": 0, "val": 0, "total": 0, "actions": 0, "abandons": 0},
            "DIFFICILE": {"obj": 0, "val": 0, "total": 0, "actions": 0, "abandons": 0}
        }

        # Analyse des blocs de tests répétés
        for i in range(1, len(parties), 2):
            titre = parties[i]
            contenu = parties[i+1]
            diff_key = "FACILE" if "Facile" in titre else "MOYEN" if "Moyen" in titre else "DIFFICILE"

            if "Action" in contenu or "🤖" in contenu or "Humain" in contenu:
                data_diff[diff_key]["total"] += 1

                if "Objectif atteint !" in contenu:
                    data_diff[diff_key]["obj"] += 1
                if "Validation réussie !" in contenu:
                    data_diff[diff_key]["val"] += 1
                if any(x in contenu for x in ["LLM abandonne", "🏳", "Abandon"]):
                    data_diff[diff_key]["abandons"] += 1

                actions_bloc = len(re.findall(r"Action \d+", contenu))
                data_diff[diff_key]["actions"] += actions_bloc

        # extractions globales
        toutes_actions = re.findall(r"Action \d+", texte)
        clears = re.findall(r"CLEAR", texte)
        solutions_tentees = re.findall(r"SOLUTION:", texte)
        validations = re.findall(r"Question \d+ : (correcte|incorrecte)", texte)
        timestamps = re.findall(r"(\d{2}:\d{2}:\d{2})", texte)

        #Calcul de la vitesse médiane
        fmt = '%H:%M:%S'
        deltas = []
        for j in range(len(timestamps) - 1):
            try:
                t1 = datetime.strptime(timestamps[j], fmt)
                t2 = datetime.strptime(timestamps[j+1], fmt)
                diff_t = (t2 - t1).total_seconds()
                if 0 < diff_t < 300: # On ignore les pauses de plus de 5min
                    deltas.append(diff_t)
            except: continue

        score_comp = (validations.count("correcte") / len(validations) * 100) if validations else 0

        self.stats = {
            "nom": self.nom,
            "cat": self.categorie,
            "total_actions": len(toutes_actions),
            "resets": len(clears),
            "solutions": len(solutions_tentees),
            "compréhension": f"{score_comp:.1f}%",
            "vitesse": f"{median(deltas):.1f}s" if deltas else "N/A",
            "par_diff": data_diff
        }
        return self.stats

class GenerateurRapport:
    def __init__(self, dossier_racine):
        self.racine = Path(dossier_racine)
        self.resultats = []

    def compiler(self):
        # Scan des deux sous dossiers : humain et llm
        cibles = [("humain", "HUMAIN"), ("llm", "LLM")]

        for nom_dos, cat in cibles:
            chemin_dos = self.racine / nom_dos
            if chemin_dos.exists():
                fichiers = list(chemin_dos.glob("*.txt"))
                for f in fichiers:
                    analyseur = AnalyseurRecherche(f, cat)
                    res = analyseur.analyser()
                    if res:
                        self.resultats.append(res)
            else:
                print(f"⚠️ Dossier '{nom_dos}' absent.")

    def afficher(self):
        if not self.resultats:
            print("\n❌ Aucun fichier trouvé dans /humain ou /llm.")
            return

        # Tableau 1 : Vue d'ensemble
        print("\n" + "═"*110)
        print(f"{'TYPE':<8} | {'NOM DU TEST':<20} | {'ACTIONS':<8} | {'RESETS':<7} | {'SOLUTIONS':<10} | {'VIT. MED'}")
        print("─"*110)

        self.resultats.sort(key=lambda x: x['cat'], reverse=True) # LLM d'abord
        for r in self.resultats:
            print(f"{r['cat']:<8} | {r['nom']:<20} | {r['total_actions']:<8} | {r['resets']:<7} | {r['solutions']:<10} | {r['vitesse']}")

        # Tableau 2 : Détails techniques par difficulté
        print("\n" + "═"*110)
        print(f"{'AGENT (TYPE)':<30} | {'NIVEAU':<10} | {'SUCCÈS (OBJ)':<15} | {'ABANDONS'}")
        print("─"*110)
        for r in self.resultats:
            for diff, data in r['par_diff'].items():
                if data['total'] > 0:
                    agent = f"{r['nom']} ({r['cat']})"
                    succes = f"{data['obj']}/{data['total']}"
                    print(f"{agent:<30} | {diff:<10} | {succes:<15} | {data['abandons']}")

if __name__ == "__main__":
    repertoire_travail = os.path.dirname(os.path.abspath(__file__))
    rapport = GenerateurRapport(repertoire_travail)
    rapport.compiler()
    rapport.afficher()