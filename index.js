const express = require('express')
const fetch = require('node-fetch')
const app = express()

const apiKey = 'd859b3f2d19d0f2d84d5f8fe9631c20a';
const apiLink = 'https://api.openweathermap.org/data/2.5/weather?units=metric&lang=ru&';

const responseFailed = {
    cod: "404",
    message: "Couldn't reach weather server"
}

app.listen(3000, () => console.log("Server started!"))
app.use(express.static('public'))
app.use(express.json())

app.get('/weather/city', async (request, response) => {
    const city = request.query.q
    const weather = await getWeatherByName(city)
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.json(weather != null ? weather : responseFailed)
})

app.get('/weather/coordinates', async (request, response) => {
    const latitude = request.query.lat
    const longitude = request.query.lon
    const weather = await getWeatherByCoords(latitude, longitude)
    console.log(weather)
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.json(weather != null ? weather : responseFailed)   
})

app.get('/weather/id', async (request, response) => {
    const id = request.query.q
    const weather = await getWeatherByID(id)
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.json(weather != null ? weather : responseFailed)   
})

async function getWeather(url){
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

function getWeatherByName(cityName){
    requestURL = apiLink + 'q=' + encodeURI(cityName) + '&appid=' + apiKey;
    return getWeather(requestURL);
}

function getWeatherByID(cityID){
    requestURL = apiLink + 'id=' + encodeURI(cityID) + '&appid=' + apiKey;
    return getWeather(requestURL);
}

function getWeatherByCoords(latitude, longitude){
    requestURL = apiLink + 'lat=' + encodeURI(latitude) + '&lon=' + encodeURI(longitude) + '&appid=' + apiKey;
    return getWeather(requestURL);
}