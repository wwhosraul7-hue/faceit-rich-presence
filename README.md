# FACEIT Discord Rich Presence (cu scor live din CS2)

Arata pe profilul tau Discord: nivel FACEIT, ELO, diferenta de ELO, iar cat timp joci efectiv,
scorul LIVE (tu vs adversar), harta curenta si faza rundei - luate direct din CS2 prin
Game State Integration (GSI), sistemul oficial Valve pentru asta.

## Setup GitHub (o singura data, obligatoriu pentru badge-ul de nivel + notificarea de update)

Badge-ul de nivel FACEIT (iconita mica peste harta) si notificarea "versiune noua disponibila"
au nevoie de un repo GitHub public sau privat unde tii pozele si dai Release-uri.

1. Creeaza un repo gol pe [github.com/new](https://github.com/new) (orice nume, ex. `faceit-rpc`).
2. In [app-config.js](app-config.js), schimba linia:
   ```js
   const GITHUB_REPO = 'CHANGEME/CHANGEME';
   ```
   in `'username-ul-tau/numele-repo-ului'`.
3. Din acest folder:
   ```bash
   git remote add origin https://github.com/<username>/<repo>.git
   git branch -M main
   git push -u origin main
   ```
4. La fiecare versiune noua: schimba `"version"` din [package.json](package.json), `npm run dist`,
   apoi pe GitHub -> Releases -> "Draft a new release" -> pune un tag `vX.Y.Z` -> urca
   `dist\FaceitRPC-Tray.exe` ca asset -> Publish. Aplicatia verifica automat Release-ul cel
   mai recent si arata un banner cu link de descarcare cand exista o versiune mai noua.

Pana completezi pasul 2, aplicatia functioneaza normal, doar fara badge de nivel si fara
notificare de update (nu crapa, pur si simplu le sare).

## De ce ai nevoie

### 1. Aplicatie Discord
DISCORD_CLIENT_ID - aplicatia .exe (vezi mai jos) vine deja cu unul comun, completat automat;
nu trebuie sa-ti creezi cont/aplicatie proprie pe discord.com/developers decat daca vrei alt
branding pentru Rich Presence.

### 2. Cheie API FACEIT (obligatoriu, per persoana)
FACEIT_API_KEY - Server-side API Key din developers.faceit.com. Fiecare persoana care
foloseste aplicatia are nevoie de propria ei cheie (nu se poate partaja - risca sa loveasca
limita de request-uri sau sa fie blocata).

### 3. Fisierul de configurare GSI - obligatoriu pentru scor live

Daca folosesti aplicatia .exe cu interfata (vezi mai jos), fisierul `.cfg` se genereaza si se
poate instala automat in CS2 dintr-un singur click, din fereastra de Configurare.

Pentru instalare manuala (mod terminal / daca auto-instalarea nu gaseste folderul):
1. Ia fisierul gamestate_integration_faceitrpc.cfg (generat langa exe, sau din acest proiect).
2. Copiaza-l in folderul de configurari al CS2, de obicei:
   C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo\cfg\
   (daca ai instalat Steam in alta parte, cauta folderul csgo\cfg din instalarea jocului)
3. Tokenul din .env si cel din .cfg trebuie sa fie IDENTICE - aplicatia .exe le tine
   sincronizate automat; la editare manuala, verifica tu asta.
4. Reporneste CS2 daca era deja deschis (fisierul se citeste la pornirea jocului).

Nu trebuie nimic activat in joc - odata ce fisierul e in locul corect, CS2 trimite singur date
catre scriptul tau cat timp esti pe o harta (warmup, live, etc.).

## Instalare (mod terminal, pentru dezvoltare)

npm install
cp .env.example .env
# completeaza .env cu datele tale
npm start

Apoi deschide CS2 si intra pe o harta (warmup sau meci) - presence-ul de pe Discord ar trebui
sa arate scorul live in cateva secunde.

## Aplicatie .exe cu icon in tray (recomandat pentru uz zilnic)

Scriptul poate fi rulat si ca o aplicatie de sine statatoare, cu icon in system tray si
control Start/Stop, care porneste automat la fiecare login in Windows - nu mai trebuie
deschis un terminal.

### Cum se construieste exe-ul

npm install
npm run dist

Rezultatul apare in `dist\FaceitRPC-Tray.exe` (un singur fisier, ~90 MB, contine tot ce
trebuie - nu are nevoie de Node.js instalat pe masina care il ruleaza).

### Cum se foloseste (inclusiv daca dai aplicatia mai departe altcuiva)

1. Muta `FaceitRPC-Tray.exe` unde vrei (ex: `Documents\FaceitRPC\`) si porneste-l.
2. La prima pornire apare un icon portocaliu "F" in system tray SI se deschide automat
   fereastra de **Configurare** - nu trebuie editat niciun fisier text de mana.
3. In fereastra, completeaza:
   - **Cheia API FACEIT** (fiecare persoana ia a ei de pe developers.faceit.com - link direct
     in fereastra).
   - **Nickname FACEIT**.
   - Restul campurilor (Discord Application ID, interval, port, token GSI) sunt deja
     completate cu valori care functioneaza - le poti lasa asa (sunt sub "Setari avansate").
   - Poti alege si o **culoare pentru badge-ul de nivel FACEIT** (portocaliu/albastru/mov) -
     iconita mica ce apare peste harta pe Rich Presence.
4. Apasa **"Instaleaza automat fisierul GSI in CS2"** - cauta singur folderul CS2 (inclusiv pe
   alte drive-uri/librarii Steam) si copiaza fisierul acolo. Daca nu il gaseste, iti spune sa
   il copiezi manual (vezi sectiunea de mai sus).
5. Apasa **"Salveaza si porneste"** - scrie `.env` + `.cfg`, iar presence-ul porneste automat.

### Interfata (click stanga pe icon-ul din tray)

Click stanga pe icon deschide un panou mic langa tray (nu un meniu clasic Windows):
- **Start / Stop** - buton mare, porneste/opreste actualizarea presence-ului.
- **Configurare** - deschide fereastra de mai sus, ca sa schimbi datele oricand.
- **Pornire automata la boot** - comutator; bifat implicit de la prima rulare.
- **Deschide folderul de configurare** - deschide folderul cu `.env`, `.cfg` si cache.
- **RO / EN** (sus-dreapta) - schimba limba interfetei (panou + fereastra de configurare).
- **Iesire** (jos) - opreste presence-ul si inchide aplicatia.
- Cand exista o versiune noua pe GitHub, apare un banner sus in panou cu link de descarcare.

Click-dreapta pe icon ramane si un meniu clasic minimal (Configurare / Iesire), ca rezerva.

Daca muti exe-ul in alt folder dupa ce ai activat pornirea automata, redeschide-l o data
din noua locatie (sau debifeaza/rebifeaza optiunea din panou) ca sa se actualizeze calea
retinuta de Windows.

## Cum functioneaza afisarea (ordinea de prioritate)

1. Daca CS2 ruleaza si esti pe o harta -> arata scorul live (tu vs adversar) + harta + faza
   (Warmup / Meci in desfasurare / Pauza intre reprize / Meci terminat).
2. Daca nu joci acum, dar ai terminat un meci FACEIT in ultimele 15 minute -> arata scorul
   final din FACEIT + harta + buton catre camera de meci.
3. Altfel -> "In lobby / niciun meci activ".

## Limitari

- GSI arata scorul doar cat timp jocul CS2 ruleaza pe calculatorul pe care ai pornit scriptul.
- Faza de veto/selectie harti din FACEIT (inainte de a intra efectiv pe harta) nu trimite
  date prin GSI - abia cand harta se incarca in joc incepe sa apara scorul live.
- Scorul afisat e generic (CT/T normalizat ca "tu vs adversar"), fara detalii suplimentare
  (kills, HS% etc.) - pot fi adaugate daca vrei, GSI ofera si statistici per runda.

## Idei de extins pe viitor

- Adaugat K/D sau HS% in text, din datele GSI.
- Buton al doilea: "Vezi profilul FACEIT".
- Sunet/notificare cand creste sau scade ELO-ul.

Spune-mi daca vrei oricare din ideile de mai sus, sau daca vrei alt format pentru text.
