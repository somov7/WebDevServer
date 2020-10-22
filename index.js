const express = require('express')
const fetch = require('node-fetch')
const token = require('rand-token')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const app = express()

const apiKey = 'd859b3f2d19d0f2d84d5f8fe9631c20a';
const apiLink = 'https://api.openweathermap.org/data/2.5/weather?units=metric&lang=ru&';

const Datastore = require('nedb')
const database = new Datastore({ filename: 'database/.database', autoload: true })

const responseFailed = {
    success: false,
    message: "Couldn't retrieve information from weather server"
}

app.options('/favourites', cors())
app.listen(3000, () => console.log("Server started!"))
app.use(express.static('public'))
app.use(express.json())

/* endpoints */

app.get('/weather/city', async (request, response) => {
    const city = request.query.q
    const weatherResponse = await getWeatherByName(city)
    console.log('get by city name called')
    
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.json(weatherResponse)
})

app.get('/weather/coordinates', async (request, response) => {
    const latitude = request.query.lat
    const longitude = request.query.lon
    const weatherResponse = await getWeatherByCoords(latitude, longitude)
    console.log('get by coords called')

    response.setHeader('Access-Control-Allow-Origin', '*')
    response.json(weatherResponse)
})

app.get('/weather/id', async (request, response) => {
    const id = request.query.q
    const weatherResponse = await getWeatherByID(id)
    console.log('get by id called')

    response.setHeader('Access-Control-Allow-Origin', '*')
    response.json(weatherResponse)
})

app.get('/favourites', (request, response) => {
    const user = 'user'
    let cities = []
    console.log('get favs called')

    response.setHeader('Access-Control-Allow-Origin', '*')
    database.find({ userToken: user }, function(error, docs) {
        if(error != null) {
            response.json({ success: false, message: error })
        }
        else {
            response.json({ success: true, cities: docs[0].cities })
        }
    })
})

app.post('/favourites', async (request, response) => {
    const user = 'user'
    const city = request.query.q
    const weatherResponse = await getWeatherByName(city)
    console.log('post called')

    response.setHeader('Access-Control-Allow-Origin', '*')
    if(weatherResponse.success) {   
        database.find({ userToken: user, cities: { $elemMatch: weatherResponse.weather.id } }, function(error, docs) {
            if (error != null) {
                response.json({ success: false, message: error })
            }
            else if(docs.length > 0) {
                response.json({ success: true, duplicate: true })
            } 
            else {
                database.update({ userToken: user }, { $addToSet: { cities: weatherResponse.weather.id } }, { upsert: true }, function() {
                    if (error != null) {
                        response.json({ success: false, message: error })
                    } 
                    else {
                        response.json(weatherResponse)
                    }
                })
            }
        })
    }
    else {
        response.json(responseFailed)
    }
})

app.delete('/favourites', (request, response) => {
    const user = 'user'
    const id = Number(request.query.q)
    console.log('delete called')
    
    response.setHeader('Access-Control-Allow-Origin', '*')
    if(!Number.isInteger(id)) {
        response.json({ success: false, message: 'Incorrect query' })
    }
    else {
        database.find({ userToken: user, cities: { $elemMatch : id } }, function(error, docs) {
            if(error != null) {
                response.json({ success: false, message: error })
            }
            else if(docs.length == 0) {
                response.json({ success: false, message: 'City id is not in the list' })
            }
            else {
                database.update({ userToken: user }, { $pull: { cities: id } }, function(error, numAffected, affectedDocuments, upsert) {
                    if(error != null) {
                        response.json({ success: false, message: error })
                    } 
                    else {
                        response.json({ success: true })
                    }
                }) 
            }
        }) 
    }
})

async function getWeather(url){
    try {
        const response = await fetch(url);
        try {
            const data = await response.json();
            if(data.cod >= 300)
                return { success: false, message: data.message }
            return { success: true, weather: data }
        }
        catch (error) {
            return responseFailed
        }
    }
    catch (error) {
        return { success: false, message: error }
    }
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