# Flow – Deploy upute

## Struktura
```
/home/prplus-flow/htdocs/flow.prplus.hr/
├── server.js          ← Express backend (port 3000)
├── package.json
├── client/            ← React source (Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/App.jsx
├── public/            ← auto-generirano: npm run build
└── data/
    └── flow.db        ← auto-generirano: SQLite baza
```

## Deploy (jednom)

```bash
# 1. SSH kao prplus-flow
ssh prplus-flow@168.119.212.215

# 2. Odi u htdocs
cd /home/prplus-flow/htdocs/flow.prplus.hr

# 3. Upload fileova (vidi ispod), onda:
npm install
npm run build

# 4. U CloudPanel → flow.prplus.hr → Node.js Settings:
#    Startup File: server.js
#    Klikni Restart
```

## Upload fileova
Uploadaj ZIP izvuci sadržaj direkt u:
/home/prplus-flow/htdocs/flow.prplus.hr/

Ili kopiraj file po file via SFTP (FileZilla / WinSCP).

## Update nakon izmjena
```bash
cd /home/prplus-flow/htdocs/flow.prplus.hr
# ako si mijenjao samo server.js:
# u CloudPanel → Restart App

# ako si mijenjao React (App.jsx):
npm run build
# pa Restart App u CloudPanel
```

## Backup baze
Baza je jedna datoteka:
/home/prplus-flow/htdocs/flow.prplus.hr/data/flow.db

Dodaj u restic ili copiraj negdje:
cp /home/prplus-flow/htdocs/flow.prplus.hr/data/flow.db /root/backup-flow-$(date +%F).db

## Zadana admin lozinka
admin2024
→ Promijeni odmah kroz UI → Admin → Postavke
