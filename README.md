# FACEIT Discord Rich Presence (cu scor live din CS2)

Arata pe profilul tau Discord: nivel FACEIT, ELO, diferenta de ELO, iar cat timp joci efectiv,
scorul LIVE (tu vs adversar), harta curenta si faza rundei - luate direct din CS2 prin
Game State Integration (GSI), sistemul oficial Valve pentru asta.

## Setup GitHub (o singura data, obligatoriu pentru badge-ul de nivel + notificarea de update)

Badge-ul de nivel FACEIT (iconita mica peste harta) si notificarea "versiune noua disponibila"
au nevoie de un repo GitHub **public** unde tii pozele si dai Release-uri (trebuie sa fie
public - `raw.githubusercontent.com` si `api.github.com` nu raspund fara autentificare pentru
repo-uri private, deci badge-ul si update-check-ul nu ar functiona pe un repo privat).

1. Creeaza un repo gol pe [github.com/new](https://github.com/new) (orice nume, ex. `faceit-rpc`) - **public**.
2. In [src/app-config.js](src/app-config.js), schimba linia:
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
4. La fiecare versiune noua:
   1. Schimba `"version"` din [package.json](package.json) (ex. `1.1.0`).
   2. `npm run dist:all` (construieste ambele variante: instalator NSIS + portable).
   3. Pe GitHub -> Releases -> "Draft a new release" -> tag `vX.Y.Z` -> urca din `dist\`:
      `FaceitRPC-Setup.exe`, `FaceitRPC-Tray.exe`, **si** `latest.yml` (fisierul YAML e
      obligatoriu - fara el, auto-update-ul real nu gaseste versiunea noua) -> Publish.

   Cine a instalat cu `FaceitRPC-Setup.exe` primeste update-ul **automat** (se descarca
   singur, iar la click pe bannerul din panou aplicatia reporeste si se actualizeaza).
   Cine foloseste `FaceitRPC-Tray.exe` portabil primeste doar o notificare cu link -
   trebuie sa descarce manual versiunea noua (variantele portabile nu se pot auto-inlocui).

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
1. Ia fisierul gamestate_integration_faceitrpc.cfg (generat langa exe, sau din
   [templates/](templates/) daca rulezi din proiect).
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
cp templates/.env.example .env
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
npm run dist:all

Rezultatul apare in `dist\`:
- **`FaceitRPC-Setup.exe`** - instalator normal (Start Menu, scurtatura pe desktop,
  dezinstalare din Control Panel ca orice aplicatie Windows). **Recomandat** - e singura
  varianta care se poate actualiza singura (vezi sectiunea GitHub de mai sus).
- **`FaceitRPC-Tray.exe`** - varianta portabila, un singur fisier, fara instalare. Utila
  daca nu vrei/nu poti instala nimic, dar update-urile trebuie descarcate manual.

(`npm run dist` construieste doar portable, `npm run dist:nsis` doar instalatorul.)

### Cum se foloseste (inclusiv daca dai aplicatia mai departe altcuiva)

1. Ruleaza `FaceitRPC-Setup.exe` (sau `FaceitRPC-Tray.exe` daca preferi portabil).
2. La prima pornire apare un icon portocaliu "F" in system tray SI se deschide automat
   fereastra de **Configurare** - nu trebuie editat niciun fisier text de mana.
3. In fereastra, completeaza:
   - **Cheia API FACEIT** (fiecare persoana ia a ei de pe developers.faceit.com - link direct
     in fereastra).
   - **Nickname FACEIT**.
   - Restul campurilor (Discord Application ID, interval, port, token GSI) sunt deja
     completate cu valori care functioneaza - le poti lasa asa (sunt sub "Setari avansate").
4. Apasa **"Instaleaza automat fisierul GSI in CS2"** - cauta singur folderul CS2 (inclusiv pe
   alte drive-uri/librarii Steam) si copiaza fisierul acolo. Daca nu il gaseste, iti spune sa
   il copiezi manual (vezi sectiunea de mai sus).
5. Apasa **"Salveaza si porneste"** - scrie `.env` + `.cfg`, iar presence-ul porneste automat.

### Interfata (click stanga pe icon-ul din tray)

Click stanga pe icon deschide un panou mic langa tray (nu un meniu clasic Windows):
- **Start / Stop** - buton mare, porneste/opreste actualizarea presence-ului.
- **Record sesiune** - "3W - 1L azi", cate meciuri ai castigat/pierdut de cand ai deschis
  aplicatia (se reseteaza in fiecare zi).
- **Grafic ELO** - evolutia ultimelor ~20 de meciuri, sub forma de linie.
- **Configurare** - deschide fereastra de mai sus, ca sa schimbi datele oricand. Acolo
  gasesti si **ultimele 5 meciuri** (harta, scor, victorie/infrangere).
- **Pornire automata la boot** - comutator; bifat implicit de la prima rulare.
- **Sunet la Start/Stop** - comutator, dezactivat implicit; plus un sunet separat, mai
  festiv, cand urci de nivel FACEIT.
- **Deschide folderul de configurare** - deschide folderul cu `.env`, `.cfg` si cache.
- **RO / EN** (sus-dreapta) - schimba limba interfetei (panou + fereastra de configurare).
- **Iesire** (jos) - opreste presence-ul si inchide aplicatia.
- Cand exista o versiune noua: banner sus in panou - descarca automat si te lasa sa
  repornesti cu un click (instalator) sau iti da un link de descarcare (portable).

Click-dreapta pe icon ramane si un meniu clasic minimal (Configurare / Iesire), ca rezerva.

Primesti si o **notificare Windows** cand se schimba ELO-ul sau cand urci de nivel dupa un
meci, chiar daca nu te uiti pe Discord in momentul respectiv.

Daca folosesti varianta portabila si o muti in alt folder dupa ce ai activat pornirea
automata, redeschide-o o data din noua locatie (sau debifeaza/rebifeaza optiunea din panou)
ca sa se actualizeze calea retinuta de Windows.

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

## Structura proiectului

    src/        - toata logica (main.js = fereastra/tray, presence.js = FACEIT+Discord+GSI,
                  restul = module mici, cate un rol fiecare: config-store, i18n, update-check...)
    renderer/   - HTML/CSS/JS pentru cele doua ferestre (panoul din tray si Configurare)
    build/      - iconita aplicatiei + scripturile care au generat-o (icon, badge-uri, sunete)
    assets/     - logo + iconitele de nivel FACEIT si sunetele (hostuite pe GitHub pentru Discord,
                  sau incluse in exe pentru sunete - vezi assets/README.md)
    templates/  - fisiere de pornire pentru modul terminal (.env.example, .cfg-ul pentru CS2)
    releases/   - build-uri urcate manual (Git LFS) ca alternativa daca atasarea din chat nu merge
    dist/       - unde apar exe-urile dupa `npm run dist:all` (nu e in git, se regenereaza)

## Idei de extins pe viitor

- Adaugat K/D sau HS% in text, din datele GSI.
- Buton al doilea: "Vezi profilul FACEIT".
- Sunet/notificare cand creste sau scade ELO-ul.

Spune-mi daca vrei oricare din ideile de mai sus, sau daca vrei alt format pentru text.
