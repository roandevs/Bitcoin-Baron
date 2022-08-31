const irc = require("irc")
const fs = require('fs')
const path = require('path')
const request = require('request-promise')
let file_log = true
const options = {
  key: fs.readFileSync('file.key'),
  cert: fs.readFileSync('file.crt'),
}
let reminders = {}
let bot_logs_setup = false
let bot = new irc.Client('irc.example.com', 'bitcoinbaron', {
    channels: ['#crypto'],
    name: 'bitcoinbaron',
    userName: 'bitcoinbaron',
    ircname: 'bitcoinbaron',
    debug: true,
    port: 6697,
    secure: options,
    selfSigned: true,
    certExpired: false
})
//todo: reply in dm 
// convert how many doges are in a dollar (.usd doge)
bot.addListener('message', async (from, _, message) => {
    try{
        if(message.startsWith('.')){
            const split_message = message.split(' ')
            const crypto_alias = split_message[0].split('.')[1]
            if(crypto_alias.toUpperCase() === 'HELP'){
                const coinbase_api_request = await request('https://api.coinbase.com/v2/exchange-rates')
                const all_cryptos = JSON.parse(coinbase_api_request)
                let all_cryptos_aliases = ''
                for(let rate in all_cryptos.data.rates){
                    all_cryptos_aliases += `${rate}, `
                }
                bot.say('#crypto', `here are all the exchange rate aliases: ${all_cryptos_aliases} \n \n`)
                bot.say('#crypto', 'to set a reminder for crypto checks, do i.e. .remind [first currency] [second currency] [second_currency price]. for example, .remind btc usd 9000 will remind me when the bitcoin price hits equivalent of $9000 or higher/lower (depending on the current price in comparison to the check).')
            }
            else if(crypto_alias.toUpperCase() === 'REMINDERS'){
                let reminder_count = 0
                for(let reminder in reminders){
                    if(reminders[reminder].user == from){
                        reminder_count += 1
                        bot.say('#crypto', `reminder for ${reminders[reminder].currency} to be checked if ${reminders[reminder].comparison} than ${reminders[reminder].check_price} ${reminders[reminder].check_currency}`)
                    }
                    if(reminder_count === 0){
                        bot.say('#crypto', 'no reminders at the moment')
                    } 
                }
            }
            else if(crypto_alias.toUpperCase() === 'DOGE'){
                const fiat_currency = split_message[1]
                const request_options = {
                    uri: 'https://pro-api.coinmarketcap.com/v1/tools/price-conversion',
                    headers: {
                        'X-CMC_PRO_API_KEY': '2ccdc8d7-76e4-44fe-9c4b-a05b1e79c996',
                        "Accept": "application/json"
                    },
                    qs: {
                        'symbol': 'DOGE',
                        'amount': 1,
                        'convert': fiat_currency
                    },
                    json: true
                }
                const api_req = await request(request_options)
                if(api_req.status.error_message){
                    bot.say('#crypto', 'There *was* an error the API. Check logs for more details.') 
                    bot_log(api_req)
                }
                else{
                    for(let obj in api_req.data.quote){
                        bot.say('#crypto', `current doge coin price is ${api_req.data.quote[obj].price}`)
                    }
                }
            }
            else if(crypto_alias.toUpperCase() === 'KDA'){
                const fiat_currency = split_message[1]
                const request_options = {
                    uri: 'https://pro-api.coinmarketcap.com/v1/tools/price-conversion',
                    headers: {
                        'X-CMC_PRO_API_KEY': '2ccdc8d7-76e4-44fe-9c4b-a05b1e79c996',
                        "Accept": "application/json"
                    },
                    qs: {
                        'symbol': 'KDA',
                        'amount': 1,
                        'convert': fiat_currency
                    },
                    json: true
                }
                const api_req = await request(request_options)
                if(api_req.status.error_message){
                    bot.say('#crypto', 'There *was* an error the API. Check logs for more details.') 
                    bot_log(api_req)
                }
                else{
                    for(let obj in api_req.data.quote){
                        bot.say('#crypto', `current kda coin price is ${api_req.data.quote[obj].price}`)
                    }
                }
            }
            else if(crypto_alias.toUpperCase() === 'REMIND'){
                if(!split_message[1] || !split_message[2] || !split_message[3]){
                    bot.say('#crypto', 'you need to say it in the correct format, use .help for help.')
                }
                else{
                    const currency = split_message[1]
                    const second_currency = split_message[2]
                    const price = split_message[3]
                    if(currency !== '' && currency !== ' ' && second_currency !== '' && second_currency !== ' ' && split_message[1]){
                        const coinbase_api_req = await request(`https://api.coinbase.com/v2/exchange-rates?&currency=${currency.toUpperCase()}`)
                        const coinbase_api_req_2 = await request(`https://api.coinbase.com/v2/exchange-rates?&currency=${second_currency.toUpperCase()}`)
                        if(coinbase_api_req && coinbase_api_req_2){
                            if(Number(price)){
                                const response = JSON.parse(coinbase_api_req)
                                if(response.data.rates[second_currency.toUpperCase()]){
                                    if(Number(response.data.rates[second_currency.toUpperCase()]) > Number(price)){
                                        const id = Math.random().toString(26).slice(2)
                                        reminders[id] = {
                                            user: from,
                                            currency: currency.toUpperCase(), 
                                            comparison: 'lower', 
                                            check_currency: second_currency.toUpperCase(), 
                                            check_price: Number(price)
                                        }
                                        bot.say('#crypto', `i will remind you when ${currency.toUpperCase()} reaches the equivalent of ${price} ${second_currency.toUpperCase()} or lower`)
                                    }
                                    else{
                                        const id = Math.random().toString(26).slice(2)
                                        reminders[id] = {
                                            user: from,
                                            currency: currency.toUpperCase(), 
                                            comparison: 'higher', 
                                            check_currency: second_currency.toUpperCase(), 
                                            check_price: Number(price)
                                        }
                                        bot.say('#crypto', `i will remind you when ${currency.toUpperCase()} reaches the equivalent of ${price} ${second_currency.toUpperCase()} or higher`)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            else{
                const fiat_currency = split_message[1]
                const coinbase_api_req = await request(`https://api.coinbase.com/v2/exchange-rates?&currency=${crypto_alias.toUpperCase()}`)
                const response = JSON.parse(coinbase_api_req)
                if(fiat_currency !== '' && fiat_currency !== ' ' && split_message[1]){
                    if(response.data.rates[fiat_currency.toUpperCase()]){
                        if(fiat_currency.toUpperCase() === 'USD'){
                            bot.say('#crypto', `current ${crypto_alias} price is $${response.data.rates[fiat_currency.toUpperCase()]}`)
                        }
                        else if(fiat_currency.toUpperCase() === 'GBP'){
                            bot.say('#crypto', `current ${crypto_alias} price is £${response.data.rates[fiat_currency.toUpperCase()]}`)
                        }
                        else if(fiat_currency.toUpperCase() === 'EUR'){
                            bot.say('#crypto', `current ${crypto_alias} price is €${response.data.rates[fiat_currency.toUpperCase()]}`)
                        }
                        else{
                            bot.say('#crypto', `current ${crypto_alias} price is ${response.data.rates[fiat_currency.toUpperCase()]}`)
                        }
                    }
                    else{
                        bot.say('#crypto', `alias wasn't found so using default USD currency. use .help for allowed exchange rate aliases.`)
                        bot.say('#crypto', `current ${crypto_alias} price is $${response.data.rates.USD}`)
                    }
                }
                else{
                    bot.say('#crypto', `current ${crypto_alias} price is $${response.data.rates.USD}`)
                }
            }
        }

    }
    catch(e){
        if(e.statusCode === 400){
            bot.say('#crypto', `invalid cryptocurrency, use .help for allowed exchange rate aliases.`)
        }
        else{
            bot_log(e.message) 
        }
    }    
})

bot.addListener('registered', async () => {
    bot.join('#crypto')
    await check_reminders(reminders)
})

async function check_reminders(reminders){
    try{
        for(let reminder in reminders){
            const coinbase_api_req = await request(`https://api.coinbase.com/v2/exchange-rates?&currency=${reminders[reminder].currency.toUpperCase()}`)
            const response = JSON.parse(coinbase_api_req)
            if(reminders[reminder].comparison === 'lower'){
                if(Number(response.data.rates[reminders[reminder].check_currency.toUpperCase()]) <= Number(reminders[reminder].check_price)){
                    bot.say('#crypto', `${reminders[reminder].user}, the price for ${reminders[reminder].currency.toUpperCase()} has hit ${response.data.rates[reminders[reminder].check_currency]} ${reminders[reminder].check_currency}`)
                    delete reminders[reminder]
                }
            }
            else if(reminders[reminder].comparison === 'higher'){
                if(Number(response.data.rates[reminders[reminder].check_currency.toUpperCase()]) >= Number(reminders[reminder].check_price)){
                    bot.say('#crypto', `${reminders[reminder].user}, the price for ${reminders[reminder].currency.toUpperCase()} has hit ${response.data.rates[reminders[reminder].check_currency]} ${reminders[reminder].check_currency}`)
                    delete reminders[reminder]
                }
            }
        }
    }
    catch(e){
        bot_log(e.message)
    }  
    setTimeout(check_reminders, 5000, reminders);
}

function bot_log(message){
    if(file_log){
        if(!bot_logs_setup){
            setup_bot_logs()
        }
        const date = String(new Date())
        const log_message = `${date}: ${message} \n`
        fs.appendFileSync(path.join(__dirname, './logs/bot.log'), log_message)
    }
}

function setup_bot_logs(){
    if (!fs.existsSync(path.join(__dirname, './logs'))) {
        fs.mkdirSync(path.join(__dirname, './logs'))
    }
    if (!fs.existsSync(path.join(__dirname, './logs/bot.log'))) {
        fs.open(path.join(__dirname, './logs/bot.log'), 'w', (err, file) => {
            if(err){
                error(err)
            }
        })
    }
    bot_logs_setup = true
}
