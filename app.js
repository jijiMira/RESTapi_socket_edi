const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const cors = require('cors');
app.use(cors());

app.use('/favicon.ico', (req, res, next) => {
    res.status(204).end(); // Répondre avec un statut "No Content" (204) sans contenu
});
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use(bodyParser.json());

const client = new Pool({
    host: '127.0.0.1',
    port: 5433,
    database: 'SQL_PG',
    user: 'postgres',
    password: 'your_pass',
});

client.connect();

function generateEdifact(orderData) {
    const edifactContent = `UNA:+.? '
    UNB+UNOC:3+SenderID+ReceiverID+YYMMDD:HHMM+ReferenceNumber'
    UNH+ReferenceNumber+ORDERS:D:96A:UN:EAN008'
    BGM+220+${orderData[0].OrderNumber}+9'
    DTM+4:${orderData[0].OrderDate}:102'
    NAD+BY+${orderData[0].CustomerId}::9'
    LIN+1++Item1:IN'
    PIA+1+UPC:8598456320123:EA'
    IMD+F+VANILLA ICE CREAM'
    QTY+21:10'
    UNS+S'
    CNT+1:1'
    UNT+7+ReferenceNumber'
    UNZ+ReferenceNumber'`;
    return edifactContent;
}

// Route POST
app.post("/:orderNumber", (req, res) => {
    const orderNumber = req.params.orderNumber;
    const { orderDate, customerId } = req.body;

    const sqlInsertQuery = `INSERT INTO "order" ("OrderNumber", "OrderDate", "CustomerId") VALUES ($1, $2, $3) RETURNING "Id"`;
    const values = [orderNumber, orderDate, customerId];
    
    client.query(sqlInsertQuery, values, (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'An error occurred while saving data to the database.' });
        } else {
            const insertedOrder = result.rows[0]; // Contient toutes les colonnes de la ligne insérée, y compris l'ID généré automatiquement
            res.json({ success: true, order: insertedOrder });
        }
    });
    

});

// Connexion au serveur de sockets
io.on('connection', (socket) => {
    console.log('User connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Route GET
app.get("/:orderId", (req, res) => {
    const orderId = req.params.orderId;
    const sqlquery = `SELECT * FROM "order" WHERE "Id" = $1`;
    const values = [orderId];

    client.query(sqlquery, values, (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'An error occurred while fetching data.' });
        } else {
            console.log(result.rows[0]);
            res.json({
                "order_date": result.rows[0].OrderDate,
                "ordernumber": result.rows[0].OrderNumber,
                "customerid": result.rows[0].CustomerId,
                "totalamount": result.rows[0].TotalAmount
            });

            const edifactContent = generateEdifact(result.rows);
            io.emit('message', edifactContent);
        }
    });
});

// Gestionnaire pour la route racine
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.listen(3000, () => {
    console.log('API server is running on http://localhost:3000');
});

server.listen(3001, () => {
    console.log('Socket server is running on port 3001');
});
