const express = require('express')
const fetch = require('node-fetch')
const token = require('rand-token')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const app = express()

const apiKey = 'd859b3f2d19d0f2d84d5f8fe9631c20a'
const apiLink = 'https://api.openweathermap.org/data/2.5/weather?units=metric&lang=ru&'
const clientLink = 'https://somov7.github.io'

const Datastore = require('nedb')
const database = new Datastore({ filename: 'database/.database', autoload: true })

const corsOptions = {
    origin: clientLink,
    credentials: true,
    methods: 'GET, POST, DELETE, OPTIONS',
    headers: 'Origin, X-Requested-With, Content-Type, Accept'
}

const cookieOptions = {
    maxAge: 1000 * 60 * 60 * 24 * 90, // 90 days 
    sameSite: "None",
    secure: true
}

const responseFailed = {
    success: false,
    message: "Couldn't retrieve information from weather server"
}

app.use(express.static('public'))
app.use(express.json())
app.options(cors(corsOptions))
app.use(function (request, response, next) {
    response.header('Access-Control-Allow-Origin', clientLink)
    response.header('Access-Control-Allow-Credentials', true)
    response.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE')
    if (request.method == 'OPTIONS') {
        response.send(200);
    }
    else {
        next()
    }
})
app.use(cookieParser())
app.listen(3000, () => console.log("Server started!"))

/* endpoints */

app.get('/weather/city', cors(corsOptions), async (request, response) => {
    const city = request.query.q
    const weatherResponse = await getWeatherByName(city)
    console.log('get by city name called')
    
    response.json(weatherResponse)
})

app.get('/weather/coordinates', cors(corsOptions), async (request, response) => {
    const latitude = request.query.lat
    const longitude = request.query.lon
    const weatherResponse = await getWeatherByCoords(latitude, longitude)
    console.log('get by coords called')

    response.json(weatherResponse)
})

app.get('/weather/id', cors(corsOptions), async (request, response) => {
    const id = request.query.q
    const weatherResponse = await getWeatherByID(id)
    console.log('get by id called')

    response.json(weatherResponse)
})

app.get('/favourites', cors(corsOptions), (request, response) => {
    let cities = []
    let userKey = request.cookies.userKey
    console.log('get favs called')
    console.log(userKey)

    database.find({ userToken: userKey }, function(error, docs) {
        if (error != null) {
            response.json({ success: false, message: error })
        }
        else if (docs.length == 0) {
            response.json({ success: true, cities: []})
        }
        else {
            response.cookie('userKey', userKey, cookieOptions)
            response.json({ success: true, cities: docs[0].cities })
        }
    })
})

app.post('/favourites', cors(corsOptions), async (request, response) => {
    const city = request.query.q
    const weatherResponse = await getWeatherByName(city)
    let userKey = request.cookies.userKey
    if(typeof(userKey) == 'undefined') {
        userKey = token.generate(20)
    }
    console.log('post called')
    console.log(userKey)

    if(weatherResponse.success) {   
        database.find({ userToken: userKey, cities: { $elemMatch: weatherResponse.weather.id } }, function(error, docs) {
            if (error != null) {
                response.json({ success: false, message: error })
            }
            else if(docs.length > 0) {
                response.cookie('userKey', userKey, cookieOptions).json({ success: true, duplicate: true })
            } 
            else {
                database.update({ userToken: userKey }, { $addToSet: { cities: weatherResponse.weather.id } }, { upsert: true }, function() {
                    if (error != null) {
                        response.json({ success: false, message: error })
                    } 
                    else {
                        response.cookie('userKey', userKey, cookieOptions)
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

app.delete('/favourites', cors(corsOptions), (request, response) => {
    const id = Number(request.query.q)
    console.log('delete called')
    let userKey = request.cookies.userKey
    console.log(userKey)

    if(!Number.isInteger(id)) {
        response.json({ success: false, message: 'Incorrect query' })
    }
    else if (!userKey) {
        response.json({ success: false, message: 'User undefined' })
    }
    else {
        database.find({ userToken: userKey, cities: { $elemMatch : id } }, function(error, docs) {
            if(error != null) {
                response.json({ success: false, message: error })
            }
            else if(docs.length == 0) {
                response.json({ success: false, message: 'City id is not in the list' })
            }
            else {
                database.update({ userToken: userKey }, { $pull: { cities: id } }, function(error, numAffected, affectedDocuments, upsert) {
                    if(error != null) {
                        response.json({ success: false, message: error })
                    } 
                    else {
                        response.cookie('userKey', userKey, cookieOptions)
                        response.json({ success: true })
                    }
                }) 
            }
        }) 
    }
})

/* weather api stuff */

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