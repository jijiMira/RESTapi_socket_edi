const axios = require('axios');
const io = require('socket.io-client');
const socket = io('http://localhost:3001');
const fs = require('fs');

function extractOrderInformation(edifactContent) {
    const orderData = {};

    // Assuming order number is always after "BGM+" and before "+"
    const orderNumberRegex = /BGM\+(\w+?)\+/;
    const orderNumberMatch = edifactContent.match(orderNumberRegex);
    orderData.ordernumber = orderNumberMatch ? orderNumberMatch[1] : '';

    // Assuming order date is always after "DTM+4:" and before ":"
    const orderDateRegex = /DTM\+4:(.*?)\:/;
    const orderDateMatch = edifactContent.match(orderDateRegex);
    orderData.orderdate = orderDateMatch ? orderDateMatch[1] : '';

    // Assuming customer ID is always after "NAD+BY+" and before ":"
    const customerIdRegex = /NAD\+BY\+(\w+?)\:/;
    const customerIdMatch = edifactContent.match(customerIdRegex);
    orderData.customerid = customerIdMatch ? customerIdMatch[1] : '';

    // Assuming id and totalamount are always after "UNT+7+" and before "+"
    const idTotalAmountRegex = /UNT\+7\+(\d+)\+(\d+\.\d+|\d+)'/;
    const idTotalAmountMatch = edifactContent.match(idTotalAmountRegex);

    if (idTotalAmountMatch) {
        orderData.id = idTotalAmountMatch[1];
        orderData.totalamount = idTotalAmountMatch[2];
    } else {
        orderData.id = '';
        orderData.totalamount = '';
    }
    return orderData;
}

const apiUrl = 'http://localhost:3000/4';

// Recevoir un message du serveur
socket.on('message', (data) => {
    try {
        const orderData = extractOrderInformation(data);
        fs.writeFileSync('order_data.json', JSON.stringify(orderData, null, 2));
        console.log('Order data written to order_data.json');
    } catch (error) {
        console.error('Error processing and writing order data:', error.message);
    }
});

axios.get(apiUrl)
    .then(response => {})
    .catch(error => {
        console.error('Error fetching data:', error.message);
    });
