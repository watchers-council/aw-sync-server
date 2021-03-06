const { archive } = require(`../../drive`)
const koaRouter = require(`koa-router`)
const { URL } = require(`url`)
const moment = require(`moment-timezone`)
const debug = require(`debug`)(`qnzl:aw-sync:get`)
const auth = require(`@qnzl/auth`)

const router = new koaRouter()

const getEvents = async (ctx, next) => {
  let { id } = ctx.params
  let { date } = ctx.query

  debug(`got request for getting events`)

  if (!id) {
    ctx.response.status = 400

    return next()
  }

  try {
    let eventPromises

    if (date) {
      date = date.split(` `)[0]
      const dateTimestamp = moment(date).format(`YYYY-MM-DD`)
      const dayBeforeTimestamp = moment(date).subtract(1, `day`).format(`YYYY-MM-DD`)
      const dayAfterTimestamp = moment(date).add(1, `day`).format(`YYYY-MM-DD`)

      const mustMatchDates = [ dayBeforeTimestamp, dateTimestamp, dayAfterTimestamp ]

      eventPromises = mustMatchDates.map(async (date) => {
        debug(`read /${id}/${date}`)
        try {
          const data = await archive.preadFile(`/${id}/${date}`)

          return data
        } catch (e) {
          return null
        }
      })
    } else {
      const files = await archive.preaddir(`/${id}`)

      eventPromises = files.map(async (file) => {
        debug(`read /${id}/${file}`)
        try {
          const data = await archive.preadFile(`/${id}/${file}`)

          return data
        } catch (e) {
          return null
        }
      })
    }

    debug(`got ${eventPromises.length} files of data`)

    const events = await Promise.all(eventPromises)

    console.log("EVENTS:", events)
    // Extract and parse file contents into one big array
    resolvedData = events.filter(Boolean).map(JSON.parse)
    resolvedData = [].concat(...resolvedData)

    let filteredData = resolvedData

    if (date) {
      // Basic filter so response only includes requested events
      const dateString = `${date}T12:00:00Z`

      const startOfDay = moment(dateString).tz(`America/New_York`).startOf(`day`)
      const endOfDay = moment(dateString).tz(`America/New_York`).endOf(`day`)

      filteredData = resolvedData.filter((event) => {
        const eventTimestamp = moment(event.timestamp).tz(`America/New_York`)

        return eventTimestamp.isBetween(startOfDay, endOfDay)
      })
    }

    ctx.status = 200
    ctx.body = filteredData

    return next()
  } catch (e) {
    console.log(`Got error: `, e)
    ctx.status = 500

    return next(e)
  }
}

module.exports = getEvents

