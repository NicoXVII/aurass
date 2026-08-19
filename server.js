const express = require('express');
const session = require('express-session');
const path = require('path');
const { Pool } = require('pg'); // Client per il database PostgreSQL Cloud

const app = express();
const PORT = process.env.PORT || 3000;

// STRINGA DI CONNESSIONE A SUPABASE
// ⚠️ SOSTITUISCI 'la_tua_password_vera' CON LA PASSWORD DEL TUO DATABASE!
const DATABASE_URL="postgresql://postgres.trjnbaxrtyqmmiwvqkha:Nicolino070408@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

// Connessione al Cloud Database
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Richiesto da Supabase per connessioni sicure
});

// Creazione automatica della tabella Prenotazioni se non esiste
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS prenotazioni (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                telefono VARCHAR(30) NOT NULL,
                servizio VARCHAR(100) NOT NULL,
                data VARCHAR(50) NOT NULL
            );
        `);
        console.log("🟢 Database Cloud Supabase collegato e tabella pronta!");
    } catch (err) {
        console.error("🔴 Errore di connessione al Database Cloud:", err);
    }
}
initDB();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'chiave_segreta_aurass_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 4 }
}));

function checkAuth(req, res, next) {
    if (req.session && req.session.isLoggedIn) return next();
    res.redirect('/admin/login');
}

/* --- ROTTE PUBBLICHE --- */
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/prenota', (req, res) => res.sendFile(path.join(__dirname, 'public', 'prenota.html')));

// Salvataggio nuova prenotazione sul Database Cloud
// Salvataggio nuova prenotazione con schermata di conferma ad impatto estetico
app.post('/api/prenota', async (req, res) => {
    const { nome, telefono, servizio, data } = req.body;
    
    try {
        await pool.query(
            'INSERT INTO prenotazioni (nome, telefono, servizio, data) VALUES ($1, $2, $3, $4)',
            [nome, telefono, servizio, data]
        );

        // Formattazione data visibile
        const dataFormattata = new Date(data).toLocaleString('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Testo precompilato per WhatsApp
        const testoWa = encodeURIComponent(`Ciao! Ho appena prenotato sul sito per il giorno ${dataFormattata} (${servizio}). Nome: ${nome}`);

        res.send(`
            <!DOCTYPE html>
            <html lang="it">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Prenotazione Confermata | Aurass</title>
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700&family=Playfair+Display:ital,wght@0,600;1,400&display=swap" rel="stylesheet">
                <style>
                    :root {
                        --bg-color: #0f1115;
                        --card-bg: #171a21;
                        --accent-gold: #c5a059;
                        --text-main: #f3f4f6;
                        --text-muted: #9ca3af;
                        --border-color: #262a36;
                    }
                    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
                    body {
                        background-color: var(--bg-color);
                        color: var(--text-main);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    .receipt-card {
                        background: var(--card-bg);
                        border: 1px solid var(--border-color);
                        border-radius: 20px;
                        padding: 40px 30px;
                        max-width: 450px;
                        width: 100%;
                        text-align: center;
                        box-shadow: 0 25px 50px rgba(0,0,0,0.5);
                        position: relative;
                        overflow: hidden;
                    }
                    .receipt-card::before {
                        content: '';
                        position: absolute;
                        top: 0; left: 0; right: 0;
                        height: 5px;
                        background: linear-gradient(90deg, transparent, var(--accent-gold), transparent);
                    }
                    .icon-check {
                        width: 70px; height: 70px;
                        background: rgba(197, 160, 89, 0.1);
                        border: 2px solid var(--accent-gold);
                        border-radius: 50%;
                        display: flex; align-items: center; justify-content: center;
                        margin: 0 auto 20px;
                        font-size: 2rem; color: var(--accent-gold);
                    }
                    h1 { font-family: 'Playfair Display', serif; color: #fff; font-size: 1.8rem; margin-bottom: 8px; }
                    p.subtitle { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 25px; }
                    
                    .details-box {
                        background: rgba(255, 255, 255, 0.02);
                        border: 1px dashed var(--border-color);
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 25px;
                        text-align: left;
                    }
                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 12px;
                        font-size: 0.9rem;
                    }
                    .detail-row:last-child { margin-bottom: 0; }
                    .detail-label { color: var(--text-muted); }
                    .detail-value { color: #fff; font-weight: 600; text-align: right; }
                    
                    .btn-group { display: flex; flex-direction: column; gap: 12px; }
                    .btn {
                        display: inline-block;
                        padding: 14px;
                        border-radius: 10px;
                        text-decoration: none;
                        font-weight: 600;
                        font-size: 0.9rem;
                        transition: all 0.3s ease;
                    }
                    .btn-wa { background: #25D366; color: #fff; }
                    .btn-wa:hover { background: #20ba5a; }
                    .btn-home { background: transparent; color: var(--text-muted); border: 1px solid var(--border-color); }
                    .btn-home:hover { color: #fff; border-color: var(--accent-gold); }
                </style>
            </head>
            <body>
                <div class="receipt-card">
                    <div class="icon-check">✓</div>
                    <h1>Prenotazione Ricevuta!</h1>
                    <p class="subtitle">Ti aspettiamo in salone. Ecco il riepilogo:</p>

                    <div class="details-box">
                        <div class="detail-row">
                            <span class="detail-label">Cliente</span>
                            <span class="detail-value">${nome}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Servizio</span>
                            <span class="detail-value">${servizio}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Data e Ora</span>
                            <span class="detail-value" style="color:var(--accent-gold);">${dataFormattata}</span>
                        </div>
                    </div>

                    <div class="btn-group">
                        <a href="https://wa.me/393331234567?text=${testoWa}" target="_blank" class="btn btn-wa">
                            💬 Avvisa il Barbiere su WhatsApp
                        </a>
                        <a href="/" class="btn btn-home">Torna alla Home</a>
                    </div>
                </div>
            </body>
            </html>
        `);

    } catch (err) {
        console.error(err);
        res.status(500).send("Errore durante il salvataggio della prenotazione.");
    }
});
/* --- ROTTE AREA RISERVATA STAFF --- */
app.get('/admin/login', (req, res) => {
    if (req.session && req.session.isLoggedIn) return res.redirect('/admin/dashboard');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === 'admin') {
        req.session.isLoggedIn = true;
        return res.redirect('/admin/dashboard');
    }
    // Se la password è sbagliata, ricarica la pagina inviando il parametro di errore
    res.redirect('/admin/login?error=true');
});

app.get('/admin/dashboard', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API per ottenere la lista delle prenotazioni dal Database Cloud
app.get('/api/admin/prenotazioni', checkAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM prenotazioni ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
});

// API per CANCELLARE una prenotazione dal Database Cloud
app.post('/admin/prenotazioni/delete', checkAuth, async (req, res) => {
    const id = parseInt(req.body.id);
    try {
        await pool.query('DELETE FROM prenotazioni WHERE id = $1', [id]);
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Errore durante l'eliminazione.");
    }
});

// API per MODIFICARE una prenotazione sul Database Cloud
app.post('/admin/prenotazioni/update', checkAuth, async (req, res) => {
    const { id, nome, telefono, servizio, data } = req.body;
    try {
        await pool.query(
            'UPDATE prenotazioni SET nome = $1, telefono = $2, servizio = $3, data = $4 WHERE id = $5',
            [nome, telefono, servizio, data, parseInt(id)]
        );
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Errore durante l'aggiornamento.");
    }
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

app.listen(PORT, () => console.log(`Server Aurass avviato su http://localhost:${PORT}`));